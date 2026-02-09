import { Notice, Plugin, TFile } from "obsidian";
import {
	DEFAULT_SETTINGS,
	PluginSettings,
	SettingsTab,
} from "./components/settings";
import { AccessTracker } from "./components/accessTracker";
import { FileMenuHandler } from "./components/fileMenuHandler";
import { IdleTimer } from "./components/idleTimer";
import { PasswordInputModal } from "./components/passwordInputModal";
import { ProtectionChecker } from "./components/protectionChecker";

export default class PasswordPlugin extends Plugin {
	settings: PluginSettings;
	toggleFlag: boolean;

	// 檔案保護元件
	protectionChecker: ProtectionChecker;
	accessTracker: AccessTracker;
	fileMenuHandler: FileMenuHandler;
	idleTimer: IdleTimer;

	// 追蹤前一個開啟的檔案
	private previousFile: TFile | null = null;

	// 防止在允許訪問後立即清除訪問權限
	private justAllowedAccess: Set<string> = new Set();

	async onload() { //the obsidian lifecycle
		await this.loadSettings();

		this.app.workspace.onLayoutReady(async () => {
			// 初始化元件
			this.protectionChecker = new ProtectionChecker(this.app);
			this.accessTracker = new AccessTracker(); // session
			this.fileMenuHandler = new FileMenuHandler(this.app, this);
			this.idleTimer = new IdleTimer();

			// 註冊右鍵選單
			this.fileMenuHandler.registerFileMenu();

			// 註冊檔案開啟事件 - 檢查保護狀態並要求密碼
			this.registerEvent(
				this.app.workspace.on('file-open', async (file) => {
					console.log('[Main] ========== file-open event triggered ==========');
					console.log('[Main] Current file:', file?.path || 'null (closing)');
					console.log('[Main] Previous file:', this.previousFile?.path || 'null');

					// 處理前一個檔案的閒置計時器
					if (this.previousFile) {
						console.log('[Main] Processing previous file:', this.previousFile.path);
						console.log('[Main] Is temporary access?', this.accessTracker.isTemporaryAccess(this.previousFile.path));

						// 只對臨時訪問的檔案處理
						if (this.accessTracker.isTemporaryAccess(this.previousFile.path)) {
							// 防止清除正在開啟的檔案的訪問權限
							const isSameFile = file && file.path === this.previousFile.path;
							console.log('[Main] Is same file?', isSameFile);

							// 檢查是否剛剛允許訪問
							const wasJustAllowed = this.justAllowedAccess.has(this.previousFile.path);
							console.log('[Main] Was just allowed?', wasJustAllowed);

							// 判斷分頁是否被關閉：file 為 null 或 previousFile 不在任何已開啟的分頁中
							const isTabClosing = !file || !this.app.workspace
								.getLeavesOfType('markdown')
								.some(leaf => (leaf.view as any)?.file?.path === this.previousFile!.path);
							console.log('[Main] Tab closing:', isTabClosing, ', autoEncryptOnClose:', this.settings.autoEncryptOnClose);

							if (isTabClosing && !isSameFile) {
								// 分頁關閉：無條件清除訪問狀態，不受 justAllowedAccess 影響
								this.accessTracker.clearAccess(this.previousFile.path);
								this.idleTimer.reset(this.previousFile.path);
								console.log('[Main] ✅ Access cleared (tab closed) for:', this.previousFile.path);
							} else if (this.settings.autoEncryptOnClose && !isSameFile && !wasJustAllowed) {
								// autoEncryptOnClose 開啟時切換檔案：清除訪問狀態
								this.accessTracker.clearAccess(this.previousFile.path);
								this.idleTimer.reset(this.previousFile.path);
								console.log('[Main] ✅ Access cleared (autoEncrypt) for:', this.previousFile.path);
							} else {
								// 切換分頁：只停止計時器，保持訪問狀態
								this.idleTimer.reset(this.previousFile.path);
								if (wasJustAllowed) {
									console.log('[Main] 🛡️  Protected from clearing (just allowed):', this.previousFile.path);
								} else {
									console.log('[Main] ⏸️  Switched away from (keeping access):', this.previousFile.path);
								}
							}

							// 清除 justAllowedAccess 標記
							this.justAllowedAccess.delete(this.previousFile.path);
						} else {
							console.log('[Main] ⚠️  Previous file is NOT temporary access, skipping protection logic');
						}
					}

					// 更新前一個檔案
					this.previousFile = file;

					// 如果沒有檔案，返回
					if (!file) {
						console.log('[Main] No file to open, exiting');
						return;
					}

					console.log('[Main] file-open event:', file.path);

					// 檢查檔案是否受保護
					const isProtected = await this.protectionChecker.isProtected(file);
					console.log('[Main] isProtected result:', isProtected);
					if (!isProtected) return;

					// 檢查是否已經驗證過密碼
					const alreadyAccessed = this.accessTracker.isAccessedThisSession(file.path);
					const isTemp = this.accessTracker.isTemporaryAccess(file.path);
					console.log('[Main] alreadyAccessed:', alreadyAccessed, 'isTemporaryAccess:', isTemp);
					console.log('[Main] All accessed files:', this.accessTracker.getAccessedFiles());

					if (alreadyAccessed) {
						// 已驗證，允許訪問
						console.log('[Main] File already accessed, allowing access');
						// 標記為剛剛允許訪問,防止立即被清除
						this.justAllowedAccess.add(file.path);
						// 切換回來時，重新啟動閒置計時器
						if (this.accessTracker.isTemporaryAccess(file.path)) {
							this.startIdleTimer(file);
						}
						return;
					}

					// 需要驗證密碼
					console.log('[Main] Requesting password for:', file.path);
					await this.requestPasswordForFile(file);
				})
			);

			// 監聽 layout 變化，偵測分頁被關閉時清除存取權限
			this.registerEvent(
				this.app.workspace.on('layout-change', () => {
					const openPaths = new Set(
						this.app.workspace.getLeavesOfType('markdown')
							.map(leaf => (leaf.view as any)?.file?.path)
							.filter(Boolean)
					);

					for (const filePath of this.accessTracker.getTemporaryAccess()) {
						if (!openPaths.has(filePath)) {
							console.log('[Main] 🔒 Tab closed detected via layout-change, clearing access for:', filePath);
							this.accessTracker.clearAccess(filePath);
							this.idleTimer.reset(filePath);
						}
					}
				})
			);

			// 註冊閒置事件
			this.registerDomEvent(document, 'mousemove', () => {
				if (this.previousFile) {
					this.idleTimer.reset(this.previousFile.path);
				}
			});

			this.registerDomEvent(document, 'keydown', () => {
				if (this.previousFile) {
					this.idleTimer.reset(this.previousFile.path);
				}
			});
		});

		// 添加設定頁面
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	/**
	 * 要求輸入密碼以訪問受保護文件
	 */
	async requestPasswordForFile(file: TFile): Promise<void> {
		// 檢查是否已設定密碼
		if (!this.settings.password) {
			new Notice("請先在設定中設定密碼");
			// 關閉文件
			this.app.workspace.getLeaf().detach();
			return;
		}

		// 顯示密碼輸入框
		console.log('[Main] 🔐 Opening password modal for:', file.path);
		const modal = new PasswordInputModal(
			this.app,
			async (inputPassword) => {
				console.log('[Main] 📝 Password submitted for:', file.path);
				// 驗證密碼：將輸入的密碼雜湊後與儲存的雜湊比對
				const inputHash = await this.hashPassword(inputPassword);
				const storedHash = this.settings.password;
				if (inputHash === storedHash) {
					// 密碼正確，標記為已訪問
					console.log('[Main] ✅ Password correct, marking as temporary access:', file.path);
					this.accessTracker.markAsTemporaryAccess(file.path);
					console.log('[Main] After marking, all accessed files:', this.accessTracker.getAccessedFiles());
					new Notice(`已驗證：${file.name}`);

					// 啟動閒置計時器
					this.startIdleTimer(file);

					// 重新打開檔案以正確渲染
					console.log('[Main] 🔄 Re-opening file:', file.path);
					await this.app.workspace.getLeaf().openFile(file);
					console.log('[Main] ✅ File re-opened successfully');
				} else {
					// 密碼錯誤
					console.log('[Main] ❌ Password incorrect for:', file.path);
					new Notice("密碼錯誤");
					// 關閉文件
					this.app.workspace.getLeaf().detach();
				}
			},
			() => {
				// 取消時關閉文件
				console.log('[Main] ❌ Password modal cancelled for:', file.path);
				new Notice("已取消");
				this.app.workspace.getLeaf().detach();
			}
		);
		console.log('[Main] 🔓 Password modal opened');
		modal.open();
	}

	/**
	 * 啟動閒置計時器
	 */
	startIdleTimer(file: TFile) {
		const idleTimeMinutes = parseInt(this.settings.autoLock) || 5;
		const idleTimeMs = idleTimeMinutes * 60 * 1000;

		console.log('[Main] Starting idle timer for:', file.path, 'duration:', idleTimeMs, 'ms');
		this.idleTimer.start(file.path, idleTimeMs, async () => {
			// 閒置時間到，清除訪問狀態
			console.log('[Main] ⏰ Idle timer triggered for:', file.path);
			this.accessTracker.clearAccess(file.path);
			new Notice(`${file.name} 已鎖定，需要重新驗證密碼`);

			// 如果當前正在查看這個文件，關閉它
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile?.path === file.path) {
				this.app.workspace.getLeaf().detach();
			}
		});
	}

	/**
	 * 將密碼雜湊為 SHA-256
	 */
	async hashPassword(password: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(password);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		// 清理
		if (this.idleTimer) {
			this.idleTimer.clearAll();
		}
		if (this.accessTracker) {
			this.accessTracker.clearAll();
		}
	}
}

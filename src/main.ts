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

		this.app.workspace.onLayoutReady(async () => { // refactor note1:其實我跟 obsidian 的 plugin 框架和 ts 都沒有很熟，這行跟 onload 的差異？為什麼有了外面的 onload 還需要這個？
			// 初始化元件
			this.protectionChecker = new ProtectionChecker(this.app);
			this.accessTracker = new AccessTracker(); // session
			this.fileMenuHandler = new FileMenuHandler(this.app, this);
			this.idleTimer = new IdleTimer();

			// 註冊右鍵選單
			this.fileMenuHandler.registerFileMenu();

			// 註冊檔案開啟事件 - 檢查保護狀態並要求密碼 
			// refactor note4:這個這麼長，雖然很多都是在寫 console，但分頁判斷邏輯感覺是一間獨立的事情，是不是應該自己獨立出去一個檔案? main 是不是簡潔一點比較好？
			// refactor note5: registerEvent 的用法是什麼？他是我命名的變數嗎？還是 obsidian 規範？
			this.registerEvent( // refactor note2:為什麼要使用 registerEvent？這是一個好的變數名稱嗎？但即使有 comment 我還是看不出來他在做什麼。 this 是在幹嘛？
				this.app.workspace.on('file-open', async (file) => {
					console.debug('[Main] ========== file-open event triggered ==========');
					console.debug('[Main] Current file:', file?.path || 'null (closing)');
					console.debug('[Main] Previous file:', this.previousFile?.path || 'null');

					// 處理前一個檔案的閒置計時器
					if (this.previousFile) {
						console.debug('[Main] Processing previous file:', this.previousFile.path);
						console.debug('[Main] Is temporary access?', this.accessTracker.isTemporaryAccess(this.previousFile.path));

						// 只對臨時訪問的檔案處理 --> refactor note7: 承接 note 4，應該是這邊開始獨立出去：if is temporyaccess --> 然後就接這邊的邏輯
						if (this.accessTracker.isTemporaryAccess(this.previousFile.path)) {
							// 防止清除正在開啟的檔案的訪問權限
							const isSameFile = file && file.path === this.previousFile.path;
							console.debug('[Main] Is same file?', isSameFile);

							// 檢查是否剛剛允許訪問
							const wasJustAllowed = this.justAllowedAccess.has(this.previousFile.path);
							console.debug('[Main] Was just allowed?', wasJustAllowed);

							// 判斷分頁是否被關閉：file 為 null 或 previousFile 不在任何已開啟的分頁中
							const isTabClosing = !file || !this.app.workspace
								.getLeavesOfType('markdown')
								.some(leaf => {
									const view = leaf.view as { file?: TFile };
									return view.file?.path === this.previousFile!.path;
								});
							console.debug('[Main] Tab closing:', isTabClosing, ', autoEncryptOnClose:', this.settings.autoEncryptOnClose);

							// refactor note6: 這個 if else 的邏輯感覺可以獨立出去一個 function 或者用 switch 會不會更好
							if (isTabClosing && !isSameFile) {
								// 分頁關閉：無條件清除訪問狀態，不受 justAllowedAccess 影響
								this.accessTracker.clearAccess(this.previousFile.path);
								this.idleTimer.stop(this.previousFile.path);
								console.debug('[Main] ✅ Access cleared (tab closed) for:', this.previousFile.path);
							} else if (this.settings.autoEncryptOnClose && !isSameFile && !wasJustAllowed) {
								// autoEncryptOnClose 開啟時切換檔案：清除訪問狀態
								this.accessTracker.clearAccess(this.previousFile.path);
								this.idleTimer.stop(this.previousFile.path); //這邊跟上一個 if 重複了欸？
								console.debug('[Main] ✅ Access cleared (autoEncrypt) for:', this.previousFile.path);
							} else {
								// 切換分頁：只停止計時器，保持訪問狀態
								this.idleTimer.stop(this.previousFile.path);
								if (wasJustAllowed) {
									console.debug('[Main] 🛡️  Protected from clearing (just allowed):', this.previousFile.path);
								} else {
									console.debug('[Main] ⏸️  Switched away from (keeping access):', this.previousFile.path);
								}
							}

							// 清除 justAllowedAccess 標記
							this.justAllowedAccess.delete(this.previousFile.path);
						} else {
							console.debug('[Main] ⚠️  Previous file is NOT temporary access, skipping protection logic');
						}
					}

					// 更新前一個檔案
					this.previousFile = file;

					// 如果沒有檔案，返回
					if (!file) {
						console.debug('[Main] No file to open, exiting');
						return;
					}

					console.debug('[Main] file-open event:', file.path);

					// 檢查檔案是否受保護
					// refactor note8: 為什麼在這裡檢查檔案是否受保護？這是對每一個新開啟的檔案都檢查嗎？那我們不是應該從最一開始先用 protectionChecker 去檢查 > 接著 檢查 temporary access（因為只有有 encrypt property 的才會有 temporary access） > 再接下來才是是否需要驗證 > 驗證
					const isProtected = await this.protectionChecker.isProtected(file);
					console.debug('[Main] isProtected result:', isProtected);
					if (!isProtected) return;

					// 檢查是否已經驗證過密碼
					const alreadyAccessed = this.accessTracker.isAccessedThisSession(file.path);
					const isTemp = this.accessTracker.isTemporaryAccess(file.path);
					console.debug('[Main] alreadyAccessed:', alreadyAccessed, 'isTemporaryAccess:', isTemp);
					console.debug('[Main] All accessed files:', this.accessTracker.getAccessedFiles());

					if (alreadyAccessed) {
						// 已驗證，允許訪問
						console.debug('[Main] File already accessed, allowing access');
						// 標記為剛剛允許訪問,防止立即被清除
						this.justAllowedAccess.add(file.path);
						// 切換回來時，重新啟動閒置計時器
						if (this.accessTracker.isTemporaryAccess(file.path)) {
							this.startIdleTimer(file);
						}
						return;
					}

					// 需要驗證密碼
					console.debug('[Main] Requesting password for:', file.path);
					await this.requestPasswordForFile(file);
				})
			);

			// refactor note9: 這個 layout-change 的監聽器是什麼時候會觸發？
			// refactor note10: 這個不能併到 file-open 的監聽器嗎？
			// 監聽 layout 變化，偵測分頁被關閉時清除存取權限
			this.registerEvent(
				this.app.workspace.on('layout-change', () => {
					const openPaths = new Set(
						this.app.workspace.getLeavesOfType('markdown')
							.map(leaf => {
								const view = leaf.view as { file?: TFile };
								return view.file?.path;
							})
							.filter(Boolean)
					);

					for (const filePath of this.accessTracker.getTemporaryAccess()) {
						if (!openPaths.has(filePath)) {
							console.debug('[Main] 🔒 Tab closed detected via layout-change, clearing access for:', filePath);
							this.accessTracker.clearAccess(filePath);
							this.idleTimer.stop(filePath);
						}
					}
				})
			);

			// 註冊閒置事件：用戶有操作時重新倒計時
			this.registerDomEvent(document, 'mousemove', () => {
				if (this.previousFile) {
					this.idleTimer.restart(this.previousFile.path);
				}
			});

			this.registerDomEvent(document, 'keydown', () => {
				if (this.previousFile) {
					this.idleTimer.restart(this.previousFile.path);
				}
			});
		});

		// 添加設定頁面
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	/**
	 * 要求輸入密碼以訪問受保護文件
	 */
	// refactor note11: 有沒有密碼的檢查是應該獨立的嗎？
	async requestPasswordForFile(file: TFile): Promise<void> {
		// 檢查是否已設定密碼
		if (!this.settings.password) {
			new Notice("請先在設定中設定密碼");
			// 關閉文件
			this.app.workspace.getLeaf().detach();
			return;
		}

		// 顯示密碼輸入框
		console.debug('[Main] 🔐 Opening password modal for:', file.path);
		const modal = new PasswordInputModal(
			this.app,
			async (inputPassword) => {
				// 驗證密碼：將輸入的密碼雜湊後與儲存的雜湊比對
				const inputHash = await this.hashPassword(inputPassword);
				const storedHash = this.settings.password;
				if (inputHash === storedHash) {
					// 密碼正確，標記為已訪問
					console.debug('[Main] ✅ Password correct, marking as temporary access:', file.path);
					this.accessTracker.markAsTemporaryAccess(file.path);
					console.debug('[Main] After marking, all accessed files:', this.accessTracker.getAccessedFiles());
					new Notice(`已驗證：${file.name}`);

					// 啟動閒置計時器
					this.startIdleTimer(file);

					// 重新打開檔案以正確渲染
					console.debug('[Main] 🔄 Re-opening file:', file.path);
					await this.app.workspace.getLeaf().openFile(file);
					console.debug('[Main] ✅ File re-opened successfully');
				} else {
					// 密碼錯誤
					console.debug('[Main] ❌ Password incorrect for:', file.path);
					new Notice("密碼錯誤");
					// 關閉文件
					this.app.workspace.getLeaf().detach();
				}
			},
			() => {
				// 取消時關閉文件
				console.debug('[Main] ❌ Password modal cancelled for:', file.path);
				new Notice("已取消");
				this.app.workspace.getLeaf().detach();
			}
		);
		console.debug('[Main] 🔓 Password modal opened');
		modal.open();
	}

	/**
	 * 啟動閒置計時器
	 */
	startIdleTimer(file: TFile) {
		const idleTimeMinutes = parseInt(this.settings.autoLock) || 5;
		const idleTimeMs = idleTimeMinutes * 60 * 1000;

		console.debug('[Main] Starting idle timer for:', file.path, 'duration:', idleTimeMs, 'ms');
		this.idleTimer.start(file.path, idleTimeMs, () => {
			// 閒置時間到，清除訪問狀態
			console.debug('[Main] ⏰ Idle timer triggered for:', file.path);
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
			await this.loadData() as PluginSettings
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

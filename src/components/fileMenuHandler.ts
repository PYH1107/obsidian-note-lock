import main from "../main";
import { App, TFile, Menu, Notice } from "obsidian";
import { PasswordInputModal } from "./passwordInputModal";

export class FileMenuHandler {
    app: App;
    plugin: main;

    constructor(app: App, plugin: main) {
        this.app = app;
        this.plugin = plugin;
    }

    /**
     * 註冊右鍵選單
     */
    registerFileMenu(): void {
        this.plugin.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (file instanceof TFile && file.extension === "md") {
                    this.addProtectionMenuItemsSync(menu, file);
                }
            })
        );
    }

    /**
     * 同步添加保護選單項目（先添加兩個選項，稍後異步檢查狀態）
     */
    private addProtectionMenuItemsSync(menu: Menu, file: TFile): void {
        menu.addSeparator();

        // 先添加加密選項
        const encryptItem = menu.addItem((item) => {
            item.setTitle("加密此檔案")
                .setIcon("lock")
                .onClick(async () => {
                    await this.handleMarkProtected(file);
                });
        });

        // 添加解密選項
        const decryptItem = menu.addItem((item) => {
            item.setTitle("永久解密此檔案")
                .setIcon("unlock")
                .onClick(async () => {
                    await this.handleRemoveProtection(file);
                });
        });

        // 異步檢查保護狀態並隱藏不需要的選項
        this.plugin.protectionChecker.isProtected(file).then(isProtected => {
            if (isProtected) {
                // 已加密，隱藏加密選項
                if (encryptItem && (encryptItem as any).dom) {
                    (encryptItem as any).dom.style.display = 'none';
                }
            } else {
                // 未加密，隱藏解密選項
                if (decryptItem && (decryptItem as any).dom) {
                    (decryptItem as any).dom.style.display = 'none';
                }
            }
        });
    }

    /**
     * 添加保護選單項目
     */
    private async addProtectionMenuItems(menu: Menu, file: TFile): Promise<void> {
        menu.addSeparator();

        // 檢查文件是否受保護
        const isProtected = await this.plugin.protectionChecker.isProtected(file);

        if (isProtected) {
            // 已受保護：顯示取消保護選項
            menu.addItem((item) => {
                item.setTitle("🔓 永久解密此檔案")
                    .setIcon("unlock")
                    .onClick(async () => {
                        await this.handleRemoveProtection(file);
                    });
            });
        } else {
            // 未受保護：顯示標記為受保護選項
            menu.addItem((item) => {
                item.setTitle("🔒 加密此檔案")
                    .setIcon("lock")
                    .onClick(async () => {
                        await this.handleMarkProtected(file);
                    });
            });
        }
    }

    /**
     * 處理標記為受保護
     */
    private async handleMarkProtected(file: TFile): Promise<void> {
        // 檢查是否已設定密碼
        if (!this.plugin.settings.password) {
            new Notice("⚠️ 請先在設定中設定密碼");
            return;
        }

        try {
            await this.plugin.protectionChecker.markAsProtected(file);
            new Notice(`✅ 已加密：${file.name}`);

            // 立即關閉檔案，防止未經驗證就查看
            const leaves = this.app.workspace.getLeavesOfType('markdown');
            for (const leaf of leaves) {
                if ((leaf.view as any).file?.path === file.path) {
                    leaf.detach();
                    break;
                }
            }
        } catch (error) {
            console.error('[FileMenuHandler] Error in handleMarkProtected:', error);
            new Notice(`❌ 加密失敗：${(error as Error).message}`);
        }
    }

    /**
     * 處理移除保護
     */
    private async handleRemoveProtection(file: TFile): Promise<void> {
        // 要求輸入密碼確認
        const modal = new PasswordInputModal(
            this.app,
            async (inputPassword) => {
                // 驗證密碼
                const globalPassword = this.plugin.getGlobalPassword();
                if (inputPassword === globalPassword) {
                    // 密碼正確，執行永久解密
                    try {
                        await this.plugin.protectionChecker.removeProtection(file);
                        this.plugin.accessTracker.clearAccess(file.path);
                        this.plugin.idleTimer.reset(file.path);

                        new Notice(`✅ 已解密：${file.name}`);
                    } catch (error) {
                        console.error('[FileMenuHandler] Error in handleRemoveProtection:', error);
                        new Notice(`❌ 解密失敗：${(error as Error).message}`);
                    }
                } else {
                    // 密碼錯誤
                    new Notice("❌ 密碼錯誤，無法解密");
                }
            },
            () => {
                // 取消
                new Notice("已取消解密");
            }
        );
        modal.open();
    }
}

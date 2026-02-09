import { App, TFile } from "obsidian";

/**
 * 檢查和管理文件的保護狀態（使用 frontmatter）
 */
export class ProtectionChecker {
    app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * 同步檢查文件是否受保護
     */
    isProtectedSync(file: TFile): boolean {
        try {
            const metadata = this.app.metadataCache.getFileCache(file);
            return metadata?.frontmatter?.protected === 'encrypted';
        } catch {
            return false;
        }
    }

    /**
     * 檢查文件是否受保護
     */
    async isProtected(file: TFile): Promise<boolean> {
        try {
            const metadata = this.app.metadataCache.getFileCache(file);
            const isProtected = metadata?.frontmatter?.protected === 'encrypted';
            console.debug('[ProtectionChecker] isProtected:', file.path, isProtected);
            return isProtected;
        } catch (error) {
            console.error('Error checking protection status:', error);
            return false;
        }
    }

    /**
     * 標記文件為受保護
     */
    async markAsProtected(file: TFile): Promise<void> {
        try {
            await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
                // 使用 bracket notation 確保不破壞現有結構
                frontmatter['protected'] = 'encrypted';
            });

            // 等待 metadata cache 更新
            await this.waitForMetadataUpdate(file);

            console.debug('[ProtectionChecker] File marked as protected:', file.path);
        } catch (error) {
            console.error('[ProtectionChecker] Error marking file as protected:', error);
            throw error;
        }
    }

    /**
     * 移除文件的保護狀態
     */
    async removeProtection(file: TFile): Promise<void> {
        try {
            await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
                delete frontmatter['protected'];
            });

            // 等待 metadata cache 更新
            await this.waitForMetadataUpdate(file);

            console.debug('[ProtectionChecker] Protection removed from file:', file.path);
        } catch (error) {
            console.error('[ProtectionChecker] Error removing protection:', error);
            throw error;
        }
    }

    /**
     * 等待 metadata cache 更新
     */
    private async waitForMetadataUpdate(file: TFile, timeout: number = 1000): Promise<void> {
        return new Promise((resolve) => {
            let resolved = false;

            // 監聽 metadata cache 變更
            const handler = this.app.metadataCache.on('changed', (changedFile) => {
                if (changedFile.path === file.path && !resolved) {
                    resolved = true;
                    this.app.metadataCache.offref(handler);
                    resolve();
                }
            });

            // 設定超時以防萬一
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.app.metadataCache.offref(handler);
                    resolve();
                }
            }, timeout);
        });
    }
}

/**
 * 追蹤受保護檔案的訪問狀態
 */
export class AccessTracker {
    // 本次會話中已驗證密碼的檔案
    private accessedThisSession: Set<string>;

    // 臨時訪問的檔案（需要重新驗證密碼）
    private temporaryAccess: Set<string>;

    constructor() {
        this.accessedThisSession = new Set<string>();
        this.temporaryAccess = new Set<string>();
    }

    /**
     * 標記檔案為「本次已訪問」
     */
    markAsAccessed(filePath: string): void {
        this.accessedThisSession.add(filePath);
    }

    /**
     * 標記檔案為臨時訪問（需要重新驗證）
     */
    markAsTemporaryAccess(filePath: string): void {
        this.temporaryAccess.add(filePath);
        this.accessedThisSession.add(filePath);
    }

    /**
     * 從臨時訪問列表中移除
     */
    removeTemporaryAccess(filePath: string): void {
        this.temporaryAccess.delete(filePath);
    }

    /**
     * 檢查檔案是否為臨時訪問
     */
    isTemporaryAccess(filePath: string): boolean {
        return this.temporaryAccess.has(filePath);
    }

    /**
     * 取得所有臨時訪問的檔案
     */
    getTemporaryAccess(): string[] {
        return Array.from(this.temporaryAccess);
    }

    /**
     * 取得所有本次訪問的檔案
     */
    getAccessedFiles(): string[] {
        return Array.from(this.accessedThisSession);
    }

    /**
     * 清除特定檔案的追蹤
     */
    clearAccess(filePath: string): void {
        this.accessedThisSession.delete(filePath);
        this.temporaryAccess.delete(filePath);
    }

    /**
     * 清除所有追蹤
     */
    clearAll(): void {
        this.accessedThisSession.clear();
        this.temporaryAccess.clear();
    }

    /**
     * 檢查檔案是否在本次會話中被訪問
     */
    isAccessedThisSession(filePath: string): boolean {
        return this.accessedThisSession.has(filePath);
    }
}

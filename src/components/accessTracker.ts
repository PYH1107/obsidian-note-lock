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
        console.debug('[AccessTracker] markAsAccessed:', filePath);
        this.accessedThisSession.add(filePath);
        console.debug('[AccessTracker] Current accessed files:', Array.from(this.accessedThisSession));
    }

    /**
     * 標記檔案為臨時訪問（需要重新驗證）
     */
    markAsTemporaryAccess(filePath: string): void {
        console.debug('[AccessTracker] markAsTemporaryAccess:', filePath);
        this.temporaryAccess.add(filePath);
        this.accessedThisSession.add(filePath);
        console.debug('[AccessTracker] Current temporary access:', Array.from(this.temporaryAccess));
        console.debug('[AccessTracker] Current accessed files:', Array.from(this.accessedThisSession));
    }

    /**
     * 從臨時訪問列表中移除
     */
    removeTemporaryAccess(filePath: string): void {
        console.debug('[AccessTracker] removeTemporaryAccess:', filePath);
        this.temporaryAccess.delete(filePath);
        console.debug('[AccessTracker] Current temporary access:', Array.from(this.temporaryAccess));
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
        console.debug('[AccessTracker] clearAccess:', filePath);
        console.debug('[AccessTracker] Stack trace:', new Error().stack);
        this.accessedThisSession.delete(filePath);
        this.temporaryAccess.delete(filePath);
        console.debug('[AccessTracker] After clear - accessed:', Array.from(this.accessedThisSession));
        console.debug('[AccessTracker] After clear - temporary:', Array.from(this.temporaryAccess));
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

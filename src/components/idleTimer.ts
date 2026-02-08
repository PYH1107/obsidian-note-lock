export class IdleTimer {
    private timers: Map<string, NodeJS.Timeout> = new Map();

    /**
     * 開始閒置計時器
     */
    start(filePath: string, idleMinutes: number, callback: () => void): void {
        // 清除舊計時器
        this.reset(filePath);

        // 設定新計時器
        const timer = setTimeout(callback, idleMinutes * 60 * 1000);
        this.timers.set(filePath, timer);
    }

    /**
     * 重置計時器
     */
    reset(filePath: string): void {
        const timer = this.timers.get(filePath);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(filePath);
        }
    }

    /**
     * 清除所有計時器
     */
    clearAll(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }
}

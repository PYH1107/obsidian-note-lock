interface TimerConfig {
    timer: ReturnType<typeof setTimeout>;
    duration: number;
    callback: () => void;
}

export class IdleTimer {
    private timers: Map<string, TimerConfig> = new Map();

    /**
     * 開始閒置計時器
     */
    start(filePath: string, idleTimeMs: number, callback: () => void): void {
        console.debug('[IdleTimer] Starting timer for:', filePath, 'duration:', idleTimeMs, 'ms');

        // 清除舊計時器
        this.stop(filePath);

        // 設定新計時器
        const timer = setTimeout(() => {
            console.debug('[IdleTimer] Timer callback executing for:', filePath);
            this.timers.delete(filePath);
            callback();
        }, idleTimeMs);

        this.timers.set(filePath, { timer, duration: idleTimeMs, callback });
        console.debug('[IdleTimer] Timer set successfully');
    }

    /**
     * 重啟計時器（用戶有操作時重新倒計時）
     */
    restart(filePath: string): void {
        const config = this.timers.get(filePath);
        if (config) {
            console.debug('[IdleTimer] Restarting timer for:', filePath);
            clearTimeout(config.timer);
            const newTimer = setTimeout(() => {
                console.debug('[IdleTimer] Timer callback executing for:', filePath);
                this.timers.delete(filePath);
                config.callback();
            }, config.duration);
            config.timer = newTimer;
        }
    }

    /**
     * 完全停止計時器
     */
    stop(filePath: string): void {
        const config = this.timers.get(filePath);
        if (config) {
            console.debug('[IdleTimer] Stopping timer for:', filePath);
            clearTimeout(config.timer);
            this.timers.delete(filePath);
        }
    }

    /**
     * 清除所有計時器
     */
    clearAll(): void {
        for (const config of this.timers.values()) {
            clearTimeout(config.timer);
        }
        this.timers.clear();
    }
}

import { App, Modal, Notice, Setting } from "obsidian";

/**
 * 簡單的密碼輸入模態視窗
 */
export class PasswordInputModal extends Modal {
    password: string = "";
    onSubmit: (password: string) => void | Promise<void>;
    onCancel?: () => void;
    private isSubmitting: boolean = false;  // 防止重複提交

    constructor(
        app: App,
        onSubmit: (password: string) => void | Promise<void>,
        onCancel?: () => void
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.onCancel = onCancel;
    }

    onOpen() {
        const { contentEl } = this;

        // 添加背景遮罩樣式
        const modalEl = contentEl.closest('.modal-container') as HTMLElement;
        if (modalEl) {
            modalEl.addClass('password-modal-backdrop');
        }

        // 模糊背景內容
        const appContainer = document.querySelector('.app-container') as HTMLElement;
        if (appContainer) {
            appContainer.addClass('app-container__lock_password');
        }

        contentEl.createEl("h2", { text: "🔒 輸入密碼" });

        new Setting(contentEl)
            .setName("密碼")
            .addText((text) => {
                text.inputEl.type = "password";
                text.inputEl.placeholder = "請輸入密碼";
                text.onChange((value) => {
                    this.password = value;
                });

                // 按 Enter 提交
                text.inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();  // 防止 Enter 鍵觸發其他事件
                        this.submit();
                    }
                });

                // 自動聚焦
                setTimeout(() => text.inputEl.focus(), 10);
            });

        // 按鈕區
        const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

        // 取消按鈕
        const cancelButton = buttonContainer.createEl("button", { text: "取消" });
        cancelButton.addEventListener("click", () => {
            this.close();
        });

        // 確認按鈕
        const submitButton = buttonContainer.createEl("button", {
            text: "確認",
            cls: "mod-cta",
        });
        submitButton.addEventListener("click", () => {
            this.submit();
        });
    }

    submit() {
        // 防止重複提交
        if (this.isSubmitting) {
            return;
        }

        if (!this.password) {
            new Notice("⚠️ 請輸入密碼");
            return;
        }

        this.isSubmitting = true;

        // 先關閉 modal,再執行回調
        this.close();
        void this.onSubmit(this.password);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();

        // 移除背景模糊
        const appContainer = document.querySelector('.app-container') as HTMLElement;
        if (appContainer) {
            appContainer.removeClass('app-container__lock_password');
        }

        // 非提交關閉（x 按鈕、Escape、取消按鈕）時觸發取消回調
        if (!this.isSubmitting && this.onCancel) {
            this.onCancel();
        }
    }
}

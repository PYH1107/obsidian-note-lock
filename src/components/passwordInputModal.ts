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
                        console.debug('[PasswordInputModal] ⌨️  Enter key pressed');
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
            console.debug('[PasswordInputModal] ❌ Cancel button clicked');
            this.close();
            if (this.onCancel) {
                this.onCancel();
            }
        });

        // 確認按鈕
        const submitButton = buttonContainer.createEl("button", {
            text: "確認",
            cls: "mod-cta",
        });
        submitButton.addEventListener("click", () => {
            console.debug('[PasswordInputModal] 🖱️  Submit button clicked');
            this.submit();
        });
    }

    submit() {
        console.debug('[PasswordInputModal] Submit called, isSubmitting:', this.isSubmitting);

        // 防止重複提交
        if (this.isSubmitting) {
            console.debug('[PasswordInputModal] ⚠️ Already submitting, ignoring');
            return;
        }

        if (!this.password) {
            console.debug('[PasswordInputModal] ❌ Password is empty');
            new Notice("⚠️ 請輸入密碼");
            return;
        }

        console.debug('[PasswordInputModal] ✅ Password valid, submitting');
        this.isSubmitting = true;

        // 先關閉 modal,再執行回調
        this.close();
        console.debug('[PasswordInputModal] 🔒 Modal closed, executing callback');
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
    }
}

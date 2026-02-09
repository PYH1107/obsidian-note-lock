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
            modalEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            modalEl.style.backdropFilter = 'blur(10px)';
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
                        console.log('[PasswordInputModal] ⌨️  Enter key pressed');
                        e.preventDefault();  // 防止 Enter 鍵觸發其他事件
                        this.submit();
                    }
                });

                // 自動聚焦
                setTimeout(() => text.inputEl.focus(), 10);
            });

        // 按鈕區
        const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.gap = "10px";
        buttonContainer.style.marginTop = "20px";

        // 取消按鈕
        const cancelButton = buttonContainer.createEl("button", { text: "取消" });
        cancelButton.addEventListener("click", () => {
            console.log('[PasswordInputModal] ❌ Cancel button clicked');
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
            console.log('[PasswordInputModal] 🖱️  Submit button clicked');
            this.submit();
        });
    }

    submit() {
        console.log('[PasswordInputModal] Submit called, isSubmitting:', this.isSubmitting);

        // 防止重複提交
        if (this.isSubmitting) {
            console.log('[PasswordInputModal] ⚠️ Already submitting, ignoring');
            return;
        }

        if (!this.password) {
            console.log('[PasswordInputModal] ❌ Password is empty');
            new Notice("⚠️ 請輸入密碼");
            return;
        }

        console.log('[PasswordInputModal] ✅ Password valid, submitting');
        this.isSubmitting = true;

        // 先關閉 modal,再執行回調
        this.close();
        console.log('[PasswordInputModal] 🔒 Modal closed, executing callback');
        this.onSubmit(this.password);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

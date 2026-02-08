import { App, Modal, Notice, Setting } from "obsidian";

/**
 * 簡單的密碼輸入模態視窗
 */
export class PasswordInputModal extends Modal {
    password: string = "";
    onSubmit: (password: string) => void;
    onCancel?: () => void;

    constructor(
        app: App,
        onSubmit: (password: string) => void,
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
            this.submit();
        });
    }

    submit() {
        if (!this.password) {
            new Notice("⚠️ 請輸入密碼");
            return;
        }

        this.close();
        this.onSubmit(this.password);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

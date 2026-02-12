import { App, Modal, Notice, Setting } from "obsidian";
import main from "../main";
import { hashPassword } from "./crypto";
import { t } from "../i18n";

export class ModalSetPassword extends Modal {
	plugin: main;
	value_oldpass: string;
	value_pass: string;
	value_repass: string;
	value_hint: string;
	onSubmit?: () => void;
	messageEl: HTMLElement;
	isChangingPassword: boolean;

	constructor(
		app: App,
		plugin: main,
		onSubmit?: () => void
	) {
		super(app);
		this.plugin = plugin;
		this.value_oldpass = "";
		this.value_pass = "";
		this.value_repass = "";
		this.value_hint = "";
		this.isChangingPassword = !!this.plugin.settings.password;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { modalEl, contentEl } = this;

		modalEl.classList.add("password_modal");

		contentEl.createEl("h1", { text: this.isChangingPassword ? t("modal_title_change_password") : t("modal_title_set_password") });

		// 提示訊息區域
		this.messageEl = contentEl.createDiv({ cls: "password_modal__message password_modal__message--info" });
		this.messageEl.setText(this.isChangingPassword ? t("modal_msg_enter_old_first") : t("modal_msg_enter_and_confirm"));

		const div_input = contentEl.createDiv({ cls: "password_modal__box" });

		// 舊密碼輸入（僅變更密碼時顯示）
		if (this.isChangingPassword) {
			new Setting(div_input).setName(t("modal_old_password")).setDesc(t("modal_old_password_desc")).addText((text) => {
				text.inputEl.type = "password";
				text.inputEl.placeholder = t("modal_old_password_placeholder");
				text.onChange((value) => {
					this.value_oldpass = value;
				});
				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						const nextInput = text.inputEl.parentElement?.parentElement?.nextElementSibling?.querySelector('input');
						if (nextInput) nextInput.focus();
					}
				});
			});
		}

		// 新密碼輸入
		new Setting(div_input).setName(this.isChangingPassword ? t("modal_new_password") : t("modal_password")).setDesc(t("modal_password_min_length")).addText((text) => {
			text.inputEl.type = "password";
			text.inputEl.placeholder = t("modal_password_placeholder");
			text.onChange((value) => {
				this.value_pass = value;
				this.updateMessage();
			});
			text.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					// 跳到下一個輸入框
					const nextInput = text.inputEl.parentElement?.parentElement?.nextElementSibling?.querySelector('input');
					if (nextInput) nextInput.focus();
				}
			});
		});

		// 確認密碼輸入
		new Setting(div_input).setName(t("modal_confirm_password")).setDesc(t("modal_confirm_password_desc")).addText((text) => {
			text.inputEl.type = "password";
			text.inputEl.placeholder = t("modal_confirm_password_placeholder");
			text.onChange((value) => {
				this.value_repass = value;
				this.updateMessage();
			});
			text.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					// 跳到下一個輸入框
					const nextInput = text.inputEl.parentElement?.parentElement?.nextElementSibling?.querySelector('input');
					if (nextInput) nextInput.focus();
				}
			});
		});

		// 密碼提示問題（可選）
		new Setting(div_input)
			.setName(t("modal_password_hint"))
			.setDesc(t("modal_password_hint_desc"))
			.addText((text) => {
				text.inputEl.placeholder = t("modal_password_hint_placeholder");
				text.onChange((value) => {
					this.value_hint = value;
				});
				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						void this.comparePassword();
					}
				});
			});

		const div_btns = contentEl.createDiv({ cls: "password_modal__btns" });

		new Setting(div_btns)
			.addButton((btn) =>
				btn
					.setButtonText(t("modal_confirm"))
					.setCta()
					.onClick(() => {
						void this.comparePassword();
					})
			)
			.addButton((btn) =>
				btn.setButtonText(t("modal_cancel")).onClick(() => {
					this.close();
				})
			);
	}

	private setMessageState(cls: string, text: string) {
		this.messageEl.className = "password_modal__message " + cls;
		this.messageEl.setText(text);
	}

	updateMessage() {
		if (!this.value_pass && !this.value_repass) {
			this.setMessageState("password_modal__message--info", t("msg_enter_password_and_confirm"));
			return;
		}

		if (!this.value_pass) {
			this.setMessageState("password_modal__message--error", t("msg_enter_password"));
			return;
		}

		if (!this.value_repass) {
			this.setMessageState("password_modal__message--warning", t("msg_confirm_password"));
			return;
		}

		if (this.value_pass !== this.value_repass) {
			this.setMessageState("password_modal__message--error", t("msg_passwords_not_match"));
			return;
		}

		if (this.value_pass.length < 1) {
			this.setMessageState("password_modal__message--error", t("msg_password_too_short"));
			return;
		}

		this.setMessageState("password_modal__message--success", t("msg_password_valid"));
	}

	async comparePassword() {
		// 驗證舊密碼（變更密碼時）
		if (this.isChangingPassword) {
			if (!this.value_oldpass) {
				this.setMessageState("password_modal__message--error", t("msg_enter_old_password"));
				return;
			}
			const oldHash = await hashPassword(this.value_oldpass);
			if (oldHash !== this.plugin.settings.password) {
				this.setMessageState("password_modal__message--error", t("msg_old_password_incorrect"));
				return;
			}
		}

		// 驗證新密碼
		if (!this.value_pass || this.value_pass.length < 1) {
			this.setMessageState("password_modal__message--error", t("msg_enter_password"));
			return;
		}

		if (this.value_pass !== this.value_repass) {
			this.setMessageState("password_modal__message--error", t("msg_passwords_not_match"));
			return;
		}

		// 使用 SHA-256 雜湊密碼
		const passwordHash = await hashPassword(this.value_pass);

		// 設定密碼（只儲存雜湊密碼）
		this.plugin.settings.password = passwordHash;

		// 儲存密碼提示問題（如果有）
		if (this.value_hint) {
			this.plugin.settings.passwordHint = this.value_hint;
		}

		await this.plugin.saveSettings();

		new Notice(t("msg_password_set"));

		// 呼叫 onSubmit 回調
		if (this.onSubmit) {
			this.onSubmit();
		}

		this.close();
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}

import { App, Modal, Notice, Setting } from "obsidian";
import main from "../main";

export class ModalSetPassword extends Modal {
	plugin: main;
	value_oldpass: string;
	value_pass: string;
	value_repass: string;
	value_hint: string;
	passwordType: 'obsidian' | 'file';
	onSubmit?: () => void;
	messageEl: HTMLElement;
	isChangingPassword: boolean;

	constructor(
		app: App,
		plugin: main,
		passwordType: 'obsidian' | 'file' = 'obsidian',
		onSubmit?: () => void
	) {
		super(app);
		this.plugin = plugin;
		this.passwordType = passwordType;
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

		contentEl.createEl("h1", { text: this.isChangingPassword ? "變更密碼" : "設定密碼" });

		// 提示訊息區域
		this.messageEl = contentEl.createDiv({ cls: "password_modal__message password_modal__message--info" });
		this.messageEl.setText(this.isChangingPassword ? "請先輸入舊密碼" : "請輸入密碼並確認");

		const div_input = contentEl.createDiv({ cls: "password_modal__box" });

		// 舊密碼輸入（僅變更密碼時顯示）
		if (this.isChangingPassword) {
			new Setting(div_input).setName("舊密碼").setDesc("請輸入目前的密碼").addText((text) => {
				text.inputEl.type = "password";
				text.inputEl.placeholder = "輸入舊密碼";
				text.onChange((value) => {
					this.value_oldpass = value;
				});
				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						const nextInput = text.inputEl.parentElement?.parentElement?.nextElementSibling?.querySelector('input');
						if (nextInput) (nextInput as HTMLInputElement).focus();
					}
				});
			});
		}

		// 新密碼輸入
		new Setting(div_input).setName(this.isChangingPassword ? "新密碼" : "密碼").setDesc("長度至少 1 個字元").addText((text) => {
			text.inputEl.type = "password";
			text.inputEl.placeholder = "輸入密碼";
			text.onChange((value) => {
				this.value_pass = value;
				this.updateMessage();
			});
			text.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					// 跳到下一個輸入框
					const nextInput = text.inputEl.parentElement?.parentElement?.nextElementSibling?.querySelector('input');
					if (nextInput) (nextInput as HTMLInputElement).focus();
				}
			});
		});

		// 確認密碼輸入
		new Setting(div_input).setName("確認密碼").setDesc("再次輸入相同密碼").addText((text) => {
			text.inputEl.type = "password";
			text.inputEl.placeholder = "確認密碼";
			text.onChange((value) => {
				this.value_repass = value;
				this.updateMessage();
			});
			text.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					// 跳到下一個輸入框
					const nextInput = text.inputEl.parentElement?.parentElement?.nextElementSibling?.querySelector('input');
					if (nextInput) (nextInput as HTMLInputElement).focus();
				}
			});
		});

		// 密碼提示問題（可選）
		new Setting(div_input)
			.setName("密碼提示問題（可選）")
			.setDesc("忘記密碼時顯示的提示")
			.addText((text) => {
				text.inputEl.placeholder = "例如：我的寵物名字？";
				text.onChange((value) => {
					this.value_hint = value;
				});
				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						this.comparePassword();
					}
				});
			});

		const div_btns = contentEl.createDiv({ cls: "password_modal__btns" });

		new Setting(div_btns)
			.addButton((btn) =>
				btn
					.setButtonText("確認")
					.setCta()
					.onClick(() => {
						this.comparePassword();
					})
			)
			.addButton((btn) =>
				btn.setButtonText("取消").onClick(() => {
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
			this.setMessageState("password_modal__message--info", "請輸入密碼並確認");
			return;
		}

		if (!this.value_pass) {
			this.setMessageState("password_modal__message--error", "❌ 請輸入密碼");
			return;
		}

		if (!this.value_repass) {
			this.setMessageState("password_modal__message--warning", "⚠️ 請確認密碼");
			return;
		}

		if (this.value_pass !== this.value_repass) {
			this.setMessageState("password_modal__message--error", "❌ 兩次密碼不一致");
			return;
		}

		if (this.value_pass.length < 1) {
			this.setMessageState("password_modal__message--error", "❌ 密碼長度至少 1 個字元");
			return;
		}

		this.setMessageState("password_modal__message--success", "✅ 密碼格式正確");
	}

	async hashPassword(password: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(password);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	async comparePassword() {
		// 驗證舊密碼（變更密碼時）
		if (this.isChangingPassword) {
			if (!this.value_oldpass) {
				this.setMessageState("password_modal__message--error", "❌ 請輸入舊密碼");
				return;
			}
			const oldHash = await this.hashPassword(this.value_oldpass);
			if (oldHash !== this.plugin.settings.password) {
				this.setMessageState("password_modal__message--error", "❌ 舊密碼不正確");
				return;
			}
		}

		// 驗證新密碼
		if (!this.value_pass || this.value_pass.length < 1) {
			this.setMessageState("password_modal__message--error", "❌ 請輸入密碼");
			return;
		}

		if (this.value_pass !== this.value_repass) {
			this.setMessageState("password_modal__message--error", "❌ 兩次密碼不一致");
			return;
		}

		// 使用 SHA-256 雜湊密碼
		const passwordHash = await this.hashPassword(this.value_pass);

		// 設定密碼（只儲存雜湊密碼）
		this.plugin.settings.password = passwordHash;

		// 儲存密碼提示問題（如果有）
		if (this.value_hint) {
			this.plugin.settings.passwordHint = this.value_hint;
		}

		await this.plugin.saveSettings();

		//set the flag to true if our requirements are met.
		this.plugin.toggleFlag = true;

		new Notice("✅ 密碼已設定");

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

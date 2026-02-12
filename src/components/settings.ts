import main from "../main";
import { ModalSetPassword } from "./modalSetPassword";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { t } from "../i18n";

export interface PluginSettings {
	// 密碼設定
	password: string; // SHA-256 雜湊密碼（用於驗證）
	passwordHint: string; // 密碼提示問題
	autoLock: number;
	autoEncryptOnClose: boolean;
}

export const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	password: "",
	passwordHint: "",
	autoLock: 5,
	autoEncryptOnClose: false,
};

export class SettingsTab extends PluginSettingTab {
	plugin: main;

	constructor(app: App, plugin: main) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		// ========== 1. 密碼設定 ==========
		new Setting(containerEl)
			.setName(t("settings_password_heading"))
			.setHeading();

		// 設定/變更密碼按鈕
		new Setting(containerEl)
			.setName(t("settings_set_password"))
			.setDesc(
				this.plugin.settings.password
					? t("settings_password_set_desc")
					: t("settings_password_not_set_desc")
			)
			.addButton((button) =>
				button
					.setButtonText(this.plugin.settings.password ? t("settings_change_password") : t("settings_set_password"))
					.onClick(() => {
						const modal = new ModalSetPassword(
							this.app,
							this.plugin,
							() => {
								new Notice(t("msg_password_set"));
								this.display();
							}
						);
						modal.open();
					})
			);

		// ========== 2. 進階設定 ==========
		//refactor note 5: lack clear explanations, and what does "new" mean?
		new Setting(containerEl)
			.setName(t("settings_advanced_heading"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("settings_idle_lock_name"))
			.setDesc(t("settings_idle_lock_desc"))
			.addText((text) => {
				text.setValue(String(this.plugin.settings.autoLock)).onChange(
					async (value) => {
						const parsed = parseInt(value);
						if (!isNaN(parsed) && parsed > 0) {
							this.plugin.settings.autoLock = parsed;
							await this.plugin.saveSettings();
						}
					}
				);
			});

		// ========== 3. 檔案級加密設定 ==========
		//refactor note 7: lack clear explanations, same as 5. 就算是 i8n 也要寫清楚吧
		new Setting(containerEl)
			.setName(t("settings_file_encryption_heading"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("settings_auto_encrypt_on_close_name"))
			.setDesc(t("settings_auto_encrypt_on_close_desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoEncryptOnClose)
					.onChange(async (value) => {
						this.plugin.settings.autoEncryptOnClose = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

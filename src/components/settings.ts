import main from "../main";
import { ModalSetPassword } from "./modalSetPassword";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";

export interface PluginSettings {
	// 密碼設定
	password: string; // 雜湊密碼（用於驗證）
	originalPassword: string; // 原始密碼（用於加密）
	globalPasswordHash: string;
	passwordHint: string; // 密碼提示問題
	animations: boolean;
	autoLock: string;
	autoEncryptOnClose: boolean;
}

export const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	password: "",
	originalPassword: "",
	globalPasswordHash: "",
	passwordHint: "",
	animations: true,
	autoLock: "5",
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
		this.containerEl.createEl("h2", {
			text: "🔐 密碼設定",
		});

		// 設定/變更密碼按鈕
		new Setting(containerEl)
			.setName("設定密碼")
			.setDesc(
				this.plugin.settings.password
					? "✅ 密碼已設定。點擊按鈕可變更密碼。"
					: "⚠️ 尚未設定密碼。請先設定密碼以使用加密功能。"
			)
			.addButton((button) =>
				button
					.setButtonText(this.plugin.settings.password ? "變更密碼" : "設定密碼")
					.onClick(async () => {
						const modal = new ModalSetPassword(
							this.app,
							this.plugin,
							'obsidian', // passwordType
							async () => {
								new Notice("✅ 密碼已設定");
								this.display();
							}
						);
						modal.open();
					})
			);

		// ========== 2. 進階設定 ==========
		this.containerEl.createEl("h2", {
			text: "⚙️ 進階設定",
		});

		new Setting(containerEl)
			.setName("閒置自動鎖定時間（分鐘）")
			.setDesc(
				"閒置多少分鐘後自動重新加密已解密的檔案（設定為 0 表示停用）"
			)
			.addText((text) => {
				text.setValue(this.plugin.settings.autoLock).onChange(
					async (value) => {
						if (/^\d+$/.test(value)) {
							this.plugin.settings.autoLock = value;
							await this.plugin.saveSettings();
						}
					}
				);
			});

		// ========== 3. 檔案級加密設定 ==========
		this.containerEl.createEl("h2", {
			text: "📄 檔案級加密設定",
		});

		new Setting(containerEl)
			.setName("關閉檔案時自動加密")
			.setDesc("切換到其他檔案時自動加密前一個檔案")
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

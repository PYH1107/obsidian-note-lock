#!/bin/bash

# Obsidian Note Protection 插件部署腳本
# 使用方法：./deploy.sh

set -e  # 遇到錯誤立即停止

echo "🔨 使用 Docker 編譯插件..."

# 清理本地的 node_modules（避免 Linux/macOS 平台衝突）
if [ -d "node_modules" ]; then
    echo "🧹 清理本地 node_modules..."
    rm -rf node_modules
fi

# 在 Docker 容器內編譯
docker run --rm -v /Users/pyh/Desktop/obsidian-note-protection:/app obsidian-note-protection sh -c "npm install && npm run build"

echo "✅ 編譯完成！"

# 你的 Obsidian Vault 路徑
VAULT_PATH="$HOME/Documents/Pan's Version"

# 插件目錄
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/obsidian-note-protection"

# 檢查 Vault 是否存在
if [ ! -d "$VAULT_PATH" ]; then
    echo "❌ 錯誤：找不到 Obsidian Vault 路徑：$VAULT_PATH"
    exit 1
fi

# 建立插件目錄（如果不存在）
mkdir -p "$PLUGIN_DIR"

echo "📦 複製檔案到 Obsidian..."

# 複製必要檔案
cp main.js "$PLUGIN_DIR/"
cp manifest.json "$PLUGIN_DIR/"
cp styles.css "$PLUGIN_DIR/"

echo "✅ 部署完成！"
echo "📍 插件位置：$PLUGIN_DIR"
echo ""
echo "🔄 請在 Obsidian 中重新載入插件："
echo "   方法 1: 按 Cmd+Option+I 開啟開發者工具，執行："
echo "           app.plugins.disablePlugin('obsidian-note-protection')"
echo "           app.plugins.enablePlugin('obsidian-note-protection')"
echo "   方法 2: 直接重啟 Obsidian"

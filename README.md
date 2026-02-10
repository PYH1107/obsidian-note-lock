# Obsidian Note Protection

## 功能



## Quick Start

### Docker

```bash
# 啟動開發環境
docker compose up -d

# 進入容器
docker exec -it obsidian-protected-note-dev /bin/sh

# 在容器內安裝依賴並建置
npm install
npm run build
```

### Local

```bash
npm install
npm run build
```

## 檔案結構

```
.
├── AGENTS.md
├── deploy.sh
├── docker-compose.yml
├── Dockerfile
├── esbuild.config.mjs
├── eslint.config.mts
├── LICENSE
├── main.js
├── manifest.json
├── package-lock.json
├── package.json
├── README.md
├── src
│   ├── components
│   │   ├── accessTracker.ts
│   │   ├── fileMenuHandler.ts
│   │   ├── idleTimer.ts
│   │   ├── modalSetPassword.ts
│   │   ├── passwordInputModal.ts
│   │   ├── protectionChecker.ts
│   │   ├── settings.ts
│   │   └── svgIcons.ts
│   └── main.ts
├── styles.css
├── tsconfig.json
├── version-bump.mjs
└── versions.json
```


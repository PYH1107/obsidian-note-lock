# 使用 Node.js 22 作為基礎映像
FROM node:22-alpine

# 設定工作目錄
WORKDIR /app

# 安裝基本工具
RUN apk add --no-cache git

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製所有專案檔案
COPY . .

# 暴露開發伺服器端口（如果需要）
EXPOSE 3000

# 預設指令：開啟 shell
CMD ["/bin/sh"]

# 影刀(Centaur Loop)Self-Hosted 镜像
# Node 22 + ffmpeg + Chromium + Noto CJK 字体,可一键 docker compose up 跑起来
# 内部跑 vite dev server(因为 /api/video/render middleware 是 dev-only,生产 build 会丢)

FROM node:22-bookworm-slim

# 阶段 1:系统依赖
#   ffmpeg                    — 影刀视频管线 + hyperframes 抽帧封面
#   chromium                  — hyperframes 渲染 fallback(主要还是 hyperframes 自己 bundled 的)
#   fonts-noto-cjk + emoji    — 中文字幕不掉字
#   ca-certificates           — npm/HTTPS
#   git                       — npm 偶尔需要拉 git 包
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    chromium \
    fonts-noto-cjk \
    fonts-noto-cjk-extra \
    fonts-noto-color-emoji \
    ca-certificates \
    git \
    curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# hyperframes 用的 Chrome 在 Docker 里要 --no-sandbox
# 同时让它知道使用系统 Chromium(可选,默认仍走 bundled)
ENV CHROMIUM_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=false \
    NODE_ENV=development

WORKDIR /app

# 阶段 2:依赖安装(利用 docker layer cache:package*.json 不变就不重装)
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# 阶段 3:拷贝项目源码
COPY . .

# 阶段 4:预拉 hyperframes 的 bundled Chrome(让首次 render 不卡漫长下载)
# 失败不阻塞(可能版本里没这个子命令,默认会在首次 render 时下载)
RUN npx --yes hyperframes@0.6.12 doctor 2>&1 | head -20 || true \
 && mkdir -p public/generated

# 5180 是影刀 vite.config.ts 里设定的端口
EXPOSE 5180

# dumb-init 让 SIGTERM 正确传到 npm/node 进程,docker compose down 干净
ENTRYPOINT ["dumb-init", "--"]

# vite dev server 必须 --host 0.0.0.0 才能从容器外访问
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5180"]

# 影刀 · Self-Host 部署指南

> 把影刀打包成单容器跑在你自己机器(或 VPS)上。
> 因为影刀的本地素材联动只能在用户本地工作,**这是产品的正确部署形态,不是 SaaS**。

## 一句话起步

```bash
docker compose up -d
```

然后浏览器开 [http://localhost:5180](http://localhost:5180) 就用。

停服务:`docker compose down`

## 前置

| 工具 | 最低版本 | 备注 |
|---|---|---|
| Docker | 20+ | macOS 装 Docker Desktop;Linux 装 docker-engine + docker-compose-plugin |
| 内存 | 4 GB+ | hyperframes 渲染峰值 1-2 GB |
| 磁盘 | 3 GB | image 含 Node 22 + Chromium + ffmpeg + Noto CJK 字体 |

## 镜像里有什么

| 组件 | 用途 |
|---|---|
| Node 22 (Debian bookworm-slim) | 跑 vite + 影刀 |
| **ffmpeg** | 影刀视频管线 + hyperframes 抽帧封面 |
| **chromium + Noto CJK 字体** | hyperframes headless 渲染 + 中文字幕不掉字 |
| **dumb-init** | 让 `docker compose down` 干净退出 |
| hyperframes 0.6.12(npm) | composition → mp4 引擎 |

镜像 build 时会 `npx hyperframes doctor` 顺便预热环境检测,正常构建用时 5-10 分钟。

## 端口 & 数据卷

| 项 | 宿主机 | 容器 | 说明 |
|---|---|---|---|
| Port | `5180` | `5180` | vite dev server,**改了 docker-compose.yml 也得改 vite.config.ts** |
| Volume | `./public/generated/` | `/app/public/generated` | 渲染产物持久化,关容器视频还在 |

## 本地素材文件夹联动(可选)

影刀三个关键点之一是**本地素材池**。要让影刀混剪你自己的素材:

1. 把素材放在宿主机一个固定目录,如 `/Users/你/Movies/yingdao-assets/`
2. 编辑 `docker-compose.yml`,取消"本地素材文件夹联动"那段注释,改成你的路径
3. `docker compose up -d --force-recreate`

容器内 `compositions/short-video-demo/assets/` 就变成你的本地素材池了。改 composition 的 `<video src="./assets/your.mp4">` 即可引用。

## 开发模式(改代码立即生效)

```bash
# 在 docker-compose.yml 取消三个 src/compositions/vite.config.ts 挂载的注释
docker compose up -d
# 改 ~/yingdao-agent/src/ 下的代码 → 浏览器 HMR 立即更新
```

## 触发渲染验证

```bash
curl -X POST http://localhost:5180/api/video/render \
  -H "Content-Type: application/json" \
  -d '{
    "script": {
      "title": "AI Agent · 闭环治理",
      "hook": "Cron 让 Agent 醒来,Workflow 让它执行,Centaur Loop 让它进化",
      "platform": "Bilibili",
      "cta": "Star 我们的仓库"
    }
  }'
```

返回的 JSON 里 `adapter: "hyperframes"` 就是正常工作。`./public/generated/yingdao-auto-remix-demo.mp4` 是产物。

调试用快速 ffmpeg 路径:body 加 `"adapter": "ffmpeg"`。

## 常见问题

### Chrome 启不起来

hyperframes 0.6.12 在容器里通常自动 `--no-sandbox`。如果报 `Failed to launch the browser process`,在 `docker-compose.yml` 加:

```yaml
environment:
  - HF_BROWSER_FLAGS=--no-sandbox --disable-dev-shm-usage
```

### 渲染慢

第一次 render 包括 Chrome 启动 + 字体下载,约 45-90 秒。后续会快(字体 cache 在 `~/.cache/hyperframes/`,在容器里 = `/root/.cache/hyperframes`)。要持久化字体 cache,加 volume:

```yaml
volumes:
  - hyperframes-cache:/root/.cache/hyperframes

volumes:
  hyperframes-cache:
```

### 跨机器分发镜像

```bash
docker save yingdao-agent:local | gzip > yingdao.tar.gz
# 拷到另一台机器
docker load < yingdao.tar.gz
docker compose up -d
```

## 部署到 VPS / 云

把整个仓库 + docker-compose 文件传到云主机,装 docker,`docker compose up -d` 就完事。但**真正能用还得考虑**:

- 域名 + HTTPS:套 caddy / nginx-proxy 反代
- 鉴权:影刀没有内置 auth,公网暴露要加 basic auth 或 cloudflare access
- 本地素材联动:云上没有"用户本地素材",此功能在云部署下失效
- 多用户隔离:渲染产物会覆盖,需要按 cycleId 分目录(代码层改造)

简言之:**影刀的正确形态就是 self-host,不是 SaaS**。

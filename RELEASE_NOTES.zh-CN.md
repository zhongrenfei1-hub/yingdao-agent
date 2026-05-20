# 影刀 · 发布笔记

> 影刀(Yingdao Agent)= Centaur Loop 工作台 + 短视频增长 Agent + hyperframes 视频管线
> 一切本地跑、self-hosted、Docker 一行起服。

---

## 2026-05 · stage-15 ~ stage-23 · 大幅度产品化

这一波集中把影刀从「demo loop」升级到「真能跑、真能上手」的产品形态。

### 📦 stage-15 · 一键发布包

`short-video-publish-packager` 端到端落地。每跑完一轮 cycle 自动生成:

- 抖音 / TikTok / 小红书 3 平台 × (标题 + 正文 + 标签 + 建议发布时间 + A/B 变体)
- 6 项合规清单(音乐授权 / 人像授权 / 商标 / 平台敏感词 / ...)
- 6 项 24h 观察指标(播放 / 完播率 / 互动率 / 涨粉 / ...)

UI 每平台一卡 + 单字段一键复制 + 复制全部。

### 🚀 stage-16 · 快速制作工作台

跟 Loop chat-first 并列的"快速制作"tab,跳过 cycle / plan-review / awaiting_* 抽象,
一屏完成 4 步生产:**写脚本 → AI 提示词 → 混剪 → 发布包**。
左输入 / 中进度 / 右产出三栏布局,新用户无门槛上手。

### 📁 stage-17 · 本地素材真接入混剪

文件拖入 → 上传到 `compositions/local-asset-remix/assets/uploads/<sid>/` →
hyperframes 用真用户素材渲染 9:16 mp4。

- 多文件 multipart(busboy 解析)
- mp4 / webm / mov / jpg / png / webp 白名单
- 3 槽位 + 50MB / 文件 限制
- 没传素材自动 fallback 到 demo composition,不卡流程

### 🎨 stage-18 · UI 视觉重做

`VideoPreviewPanel` 从"死黑 + 红警告"重做成浅色 + iris 紫 accent + 友好占位。
不动功能,纯视觉。

### 🔌 stage-19 · 浏览器里直接填 API key

右下角浮按下拉里新增"自定义 OpenAI-compat API"表单,**不再需要编辑 .env.local 重启**:

- 4 个一键预设:OpenAI / DeepSeek / Gemini / Claude / 智谱 BigModel / 通义 DashScope
- Base URL / API Key(密码 + 眼睛切换)/ Model / 标签
- "测试连接" GET /models 验证 + 列出端点真实可用模型清单
- "保存并启用"立即生效,顶部按钮变 iris 紫显示当前 model 名
- 配了 customRuntime 就只走它,失败显眼报错不悄悄 fallback demo

### 🤖 stage-20 · PM 产品经理访谈流

用户进来不再直接被当作 cycle goal。AI 扮 PM 反问关键问题:

> 主题 → 受众 → 卖点 → 平台 → 调性

凑齐后输出 brief,用户回「**开干**」/「行」/「ok」/「冲」/「干」即启 cycle。
信息不够继续访谈、给的不对继续告诉它哪儿要改。

### 🖼️ stage-21 · 文章配图爬虫

右下角浮按多了"配图"按钮 — 输入关键词调 `/api/scrape/images` →
纯 HTTP + cheerio 解析 Bing 图片搜索 → 24 张图网格 →
**点缩略图复制原图 URL 到剪贴板**,粘到公众号编辑器即用。
不引入 Puppeteer / Python,Docker 镜像零增重。

### 🗂️ stage-22 · CycleOutputPanel 产出聚合

之前 cycle 产出散落在 chat 流里("看着都不知道输出的内容是哪个")。
现在右栏一个紫色"本轮产出"大面板,聚合显示:

- 当前 cycle stage + 编号
- 本轮目标
- 5 个工具的实时进度(等待 / 生成中 / 草稿就绪 / 已通过)
- 最新视频预览
- 完整发布包(复用 stage-15 的 PublishPackPanel)

老的 cycle map + memory shelf + dev video preview 收口到折叠"⚙️ 进阶视图"。

### 🐳 stage-23 · Docker 渲染坑修复

修了 hyperframes 0.6.12 在 docker 容器里 puppeteer launch system chromium 直接挂的问题:

- Dockerfile build 阶段提前装 chrome-headless-shell(@puppeteer/browsers)
- vite middleware 自动读 `/app/.hyperframes-browser-path` 注入 `HYPERFRAMES_BROWSER_PATH`
- 删了误用的 `--docker` flag(它的语义是"用 docker 跑 chrome",不是"我在 docker 里")

**端到端 `docker compose up -d --build` 一行起服 + `/api/video/render` 真出 mp4。**

### 🧪 stage-24 · smoke test 脚本

`scripts/smoke-test.sh`:`docker compose up -d` 后一行 `npm run smoke`
验证 7 个 endpoint 端到端通过(health / 首页 / runtime/scan / scrape/images
/ assets/upload / video/render)。

### ⏱ stage-25 · QuickMakeWorkbench step elapsed timer

每个 running 步骤旁加实时秒数 + ETA 提示("LLM 通常 5-30s" / "docker
software WebGL · 预计 1.5-4 分钟出 5s 视频"),解决"等 4 分钟没反馈"痛点。

### 📚 stage-26 · QUICK_START 文档

`docs/QUICK_START.zh-CN.md`:5 步走 5 分钟新手 onboarding,带常见问题排查表。

### 🤖 stage-27 · CI hyperframes composition lint

`.github/workflows/ci.yml` 补 4 个 composition 的 hyperframes lint 0/0 check。

### ⏱ stage-28 · CycleOutputPanel task timer

Loop 工作台 5 个 task 也加 elapsed timer。前端轻量记 task running 起始时间,
不动 core 类型。

### 💚 stage-29 · /api/_health + docker healthcheck

新 health endpoint;docker-compose healthcheck 每 30s 自动 ping,失败 3 次
unhealthy → restart 介入。

### 📋 stage-30 · 飞轮日志补齐 stage-18a~29

00_FLYWHEEL.md 阶段规划表+变更日志补齐,飞轮宪章重新完整可追溯。

### 🎯 stage-31~32 · PM brief 数据贯穿全链

ScriptInput / ScriptJson 加 audience / tone / sellingPoints 字段;
short-video-script-writer 的 LLM prompt 强制使用 PM 访谈的目标受众和调性。

### ⏱ stage-33 · render 超时强杀保护

`YINGDAO_RENDER_TIMEOUT_MS`(默认 10 min)→ SIGKILL 子进程,防 Chrome
hang 让 vite 卡死。

### 📚 stage-34 · SELF_HOST troubleshooting 6 项

把 stage-23 踩过的 docker 坑文档化给未来部署者:Chrome launch 失败 /
--docker flag 误用 / 路径错乱 / 翻译插件白屏 / Chrome target closed 等。

### 🚀 stage-35 · image scrape 5min 内存缓存

防 Bing 反爬 + 重复查询秒返;缓存超 50 条丢最早,不依赖 Redis。

### 🎬 stage-36 · 样品生成器 + GitHub 上的真实产物

`scripts/generate-sample.sh` 一键跑 /api/video/render + 拷贝产物到
`docs/sample-output/` + 自动写 README.md。GitHub 访客直接看 637KB mp4。

### 🏷 stage-37~38 · README 顶部 sample 链接 + npm scripts

npm run smoke / sample / docker:up / down / logs;README 内联 sample 封面。

### 🔌 stage-39 · ScriptJson 跟 ScriptInput 类型对齐

完整链路类型贯穿:LLM → tryParseScript → ScriptJson → renderDemoRemixVideo
POST → ScriptInput → scriptToHyperframesVariables。

### 📚 stage-40 · PRD 5 分钟概览版

35KB PRD 太长,`docs/PRD_SUMMARY.zh-CN.md` 给"想用/想投/想抄"的人
5 分钟读完。

### 🤖 stage-41 · Loop 工作台默认欢迎语换影刀语境

去掉 centaur-loop fork 来的 SEO 旧文案,改成 PM 风格欢迎语 + 4 种内容类型示例。

### 🎨 stage-42 · README inline sample 封面

GitHub 首页加载就看到 9:16 真实渲染封面。

### 📋 stage-43~44 · PR template + CONTRIBUTING 影刀飞轮约定

外部贡献者一看就懂 commit 格式 + 每圈打钩 00_FLYWHEEL.md + typecheck +
build + smoke + hyperframes lint 硬性动作。

### 🏷 stage-45 · README 加 v0.1.0 release badge + Docker badge

quick links 覆盖 QUICK_START / PRD_SUMMARY / Self-Host。

### 🧹 stage-46 · .gitignore 补 dev 产物

.claude / chrome-headless-shell / assets/uploads / .cache / /tmp/yingdao-*。

### 🧪 stage-47 · vitest 单测框架 + publishPack 11 项单测 + 接 CI

工程基础设施:`npm test` 跑 11 项 publishPack parse/serialize/format
测试,1.4s 完成;CI workflow 加 "Unit tests" step;push/PR 自动跑。

### 📋 stage-48 · RELEASE_NOTES 补齐 stage-24~47

之前只到 stage-23,把后续 24 圈完整补齐:smoke / timers / QUICK_START /
CI lint / health / 飞轮日志 / brief 数据贯穿 / render timeout 等。

### 🧪 stage-49 · npm run lint:compositions 本地跑 4 个 composition lint

跟 CI 同款,push 前本地能验证 hyperframes lint 0/0。

### ⚡ stage-50 · short-video-pitch render fps 30→24

docker software WebGL 渲染长视频易崩,pitch composition 帧数 465 → 372
(-20%),稳定性提升。

### ✨ stage-51 · App 顶部加 HeroBanner

参考产品 landing 的 hero 模式 + 影刀 iris 紫色板:badge + h1 大字 +
副文案 + 4 能力卡片(快速制作 / Loop 工作台 / 发布包 / 本地素材)。

### 🐱 stage-52 · 影刀 logo(白猫咪 + 紫色腮红)

从用户自己另一个 repo 共享 brand asset。512×512 PNG,
HeroBanner 顶部 + favicon + apple-touch-icon。

### 🎨 stage-53 · 整体视觉重做

浅紫氛围渐变 + 大 logo header + underline tab + 现代化 CSS vars
(--iris-50/100/200/500/600/700)。

### 🎯 stage-54~57 · 设计 token 跟火花视觉对齐

- iris 紫 10 阶 Tailwind color scale + shadcn 标准圆角 0.625rem 阶梯
- QuickMakeWorkbench / LoopConversationWorkbench / LoopChatView /
  RuntimeDropdown 主操作色从 terracotta 统一切到 iris-600
- 错误态保留 terracotta 作语义色,不一刀切

### 🎙 stage-58 · Edge TTS endpoint

接微软 neural TTS(rany2/edge-tts GPL-3 pip 包,运行时依赖):

- Dockerfile 加 python3 + pip install edge-tts
- scripts/tts-edge.py 自己写的 wrapper(asyncio + Communicate API)
- POST /api/tts/edge { text, voice? } → 写 mp3 到 public/generated/
- 实测 11 字中文 6 秒出 19KB mp3,音质比 Kokoro 明显提升
- smoke test 加 TTS 验证项,现在 8 项全绿

### 📤 stage-59 · 合规 deep link 自动发布

PublishPackPanel 每平台加"📤 发到 XX"按钮(stage-15 留下的合规
自动发布路径):

- 点击 → 复制完整文案到剪贴板 + window.open 跳官方创作者后台
- 6 个平台:抖音 / TikTok / 小红书 / 快手 / 视频号 / B 站
- 合规零账号风险(不走 OAuth / 不绕 TOS / 不爬 RPA)
- 用户登录后台 + 粘文案 + 选视频 + 点发布,3 个动作完事

### 🎬 stage-60 · Edge TTS 接到 short-video-pitch 旁白

让 production 主出口 short-video-pitch composition 用 Edge TTS
neural 旁白替代固定 Kokoro,音质大提升:

- composition variables 加 narrationUrl + script 动态注入 audio src
- vite middleware 在 pitch 分支:script 有 voiceover → 调
  scripts/tts-edge.py 生成 mp3 写到 composition 目录 → 作为
  narrationUrl variable 传给 hyperframes
- YINGDAO_TTS_VOICE env 控制 voice(默认 XiaoxiaoNeural)
- edge-tts 失败时 console.warn 自动 fallback Kokoro,不阻塞渲染

### 📋 stage-61~62 · 飞轮日志补齐

RELEASE_NOTES stage-48~60 + 00_FLYWHEEL.md 主表 stage-30~61 全部上表。

### 🎤 stage-63 · TtsPanel 多 voice 试听浮按

右下角紫色 mono 浮按 [tts]:8 个中文 neural voice(晓晓/晓伊/云扬/
云希/云健/晓梦/晓贝/晓敏粤)+ 输入文案 + 自动播放 + "保存默认"
写 localStorage。

### 🎙 stage-64 · fasterwhisper ASR endpoint(MoneyPrinterPlus 同款)

POST /api/asr/whisper(multipart 上传音视频 ≤ 100MB)→ Python wrapper
spawn faster-whisper(MIT pip 包 · CPU int8 · VAD 过滤 · beam=5)→
返回 segments 带时间戳。base 模型首次按需下载 ~145MB。端到端测:
TTS 19KB mp3 反向识别 ✓。

### 🎨 stage-65 · UI 设计四环 · Hero 重做 + 全局未来主义字体

Vibe 关键词:极简 / 高级 / 未来主义 / 锐利字 / 微动画

- JetBrains Mono 字体加载 + tailwind fontFamily.mono +
  letterSpacing.tightest/.sharp
- index.css 全局 antialiasing + font-feature-settings + 4 utility:
  grain-grid(细网格 dot pattern)/ text-sharp / num-stat / lift-hover
- HeroBanner 重做:mono badge + 锐字 h1 + 数字 stat 横排
  (40+ commits / 8 smoke / 11 unit / 6 platforms)+ 4 能力卡 +
  紫色光晕 + grain texture

### 🎯 stage-66~67 · Refine + Design 蔓延全局

- lift-hover 蔓延:QuickMakeWorkbench StepRow / PublishPackPanel
  平台卡 / CycleOutputPanel Block 全部 hover 上抬
- 3 个浮按 mono uppercase:[image] [tts] [当前 model],右下角
  一字排开

### ⌨️ stage-68 · Hero 终端命令风 sub-line

深色 mono 终端块 + iris 紫光标 ▌ 闪烁:`$ docker compose up -d ▌`
让命令行不只是文档,而是产品 demo 的第一帧。

### 🎬 stage-69~70 · 锐字 + 优雅动画

- nav 三链接全部 mono uppercase tracking-0.18em(github / docs / 语言)
- TabButton 用 framer-motion layoutId=tab-underline · spring 380/32
  · iris glow
- AnimatePresence 包 workbench 主区:tab 切换 fade-up 退出 + fade-down
  入场,220ms cubic-bezier

### 🔢 stage-71 · Stat 数字 count-up

打开页面 4 个数字从 0 跳到目标值 · 1.4s · cubic-bezier · 产品
"在脉动"的上瘾微反馈。

### ✨ stage-72 · 4 能力卡 stagger 入场

motion variants 父容器 staggerChildren 0.08s + delay 0.15s,
4 张卡依次 fade-up 落位,跟 stage-71 count-up 节奏对齐。

---

## 协作模式 / 飞轮节奏

影刀走"四环飞轮"工作法:**Build → Sell → Test → Fix**,每圈一个 commit。
commit message 格式:`feat(stage-N): xxx · yyy`,飞轮宪章在 `00_FLYWHEEL.md`。

## 自部署

```bash
git clone https://github.com/zhongrenfei1-hub/yingdao-agent.git
cd yingdao-agent
docker compose up -d --build       # 首次 ~15min,以后 < 30s
# 浏览器开 http://localhost:5180
```

填一个 Google AI Studio key(或 DeepSeek / OpenAI / 智谱)→ 选模型 → 保存 → 开始做内容。

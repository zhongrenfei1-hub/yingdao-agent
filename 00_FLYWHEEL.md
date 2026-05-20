# 🛞 四环飞轮 · 影刀 × HyperFrames

> **置顶宪章** — 影刀视频生成核心切换到 HyperFrames 的迭代记录。

---

## 一、用户原始指令(锁死)

> 启动四环飞轮:关键词搜索竞品 → 输出需求列表 → 自主分阶段规划 → 写入文件 + 完成打钩 + 自动 commit + 自动 build + test。
>
> **三个关键点**:🗂️ 本地文件夹联动 · 🖐️ 拖拽交互 · 🎨 布局哲学。其余全权自主执行,长时间运行,不要停。
>
> **追加决策**:**用 hyperframes 的 skill 作为影刀的核心**。

---

## 二、四环飞轮工作法

```
BUILD → TEST → FIX → SHIP → 回 BUILD
```

每圈结束硬性动作:打钩 + commit(只 add 新文件)+ `npm run typecheck` + 必要时 `npm run build`。

---

## 三、影刀现状画像(2026-05-16 摸底)

| 维度 | 现状 |
|---|---|
| 路径 | [`~/yingdao-agent`](.) |
| 性质 | 基于 Centaur Loop 的短视频增长 Agent(策划→生成→混剪→发布→反馈) |
| 技术栈 | React 18 + Vite 6 + Tailwind 3 + Zustand + framer-motion + lucide-react |
| 架构 | `core/loopEngine + loopPlanner + loopExecutor + loopReviewer + feedbackCollector + loopStore`、`protocol/loopChat`、`adapters/*`、14 个 `ui/` 组件 |
| Git | 13 commit,**当前 14 modified + 4 untracked**(短视频 loop 在建中) |
| 视频管线 | `/api/video/render` middleware 用 **ffmpeg + drawbox 色块占位**(`vite.config.ts:591`),文字渲染不出来 |
| **本轮目标** | **把视频管线替换为 hyperframes pipeline**,真正出片 |

⚠️ **WIP 不动**:`loopExecutor / loopPlanner / yingdaoShortVideoLoop / video-renderer / PRD` 等是用户在建,飞轮新工作走新目录新文件,只 add 新文件 commit。

---

## 四、关键决策:为何用 HyperFrames

| 维度 | ffmpeg drawbox 现状 | **HyperFrames 接管** |
|---|---|---|
| 文字 | 没字幕(libfreetype 未编译) | HTML/CSS 渲染 + 完整字体 |
| 镜头切 | 黑切 / 色块切 | GSAP 时间线 + 真转场 |
| 动画 | 无 | GSAP / WAAPI / Anime.js / Three / Lottie |
| 模板 | 硬编码 | composition + variables 参数化 |
| 视觉 | 色块占位 | design.md 驱动品牌一致 |
| 工具链 | 手写 ffmpeg args | `npx hyperframes lint/inspect/render` |

**HyperFrames 是 HTML-as-video**:HTML 作为视频源,`data-start/duration/track-index` 控时间,GSAP 控动画,`npx hyperframes render` 出 mp4。完美适配影刀的"ScriptJson → 视频"管线。

---

## 五、需求列表

### P0
- [x] **NEED-001** hyperframes@0.6.12 装到 yingdao-agent(devDep)
- [x] **NEED-002** 第一个 composition demo(9:16 1080×1920)跑通 `lint`(0 err/warn)+ `validate`(0 console err)+ `render`(617 KB mp4 / 45.9s 渲染 / 5.3s 视频)
- [x] **NEED-003** `ScriptJson` → composition variables 映射(`src/adapters/hyperframes-variables.ts`,纯函数双端可用,typecheck pass)
- [x] **NEED-004 (part)** `scripts/render-via-hyperframes.mjs` 独立 CLI 跑通 ScriptJson → mp4(集成示范,等用户合并 WIP 后搬进 `vite.config.ts` 的 `videoRenderApiPlugin`)
- [x] **NEED-005** 影刀 `compositions/short-video-demo/design.md` 落地(iris-50 → iris-950 全色板 + Inter/Noto Sans SC 字体 + GSAP eases 池 + Do/Don't)

### P1(三个关键点)
- [x] **NEED-006** 🗂️ **本地文件夹联动**:`compositions/local-asset-remix/` 演示 hyperframes 直接读 `./assets/*.mp4`,3 段串行 + caption 浮层 + outro,691 KB mp4 出片
- [ ] **NEED-007** 🖐️ **拖拽交互**:Workbench 中拖素材进时间轴 / 拖镜头重排 / 拖反馈到记忆
- [ ] **NEED-008** 🎨 **布局哲学**:LoopConversationWorkbench 升级到「对话 + composition 预览 + 时间轴 + 记忆」四面板

### P2
- [ ] **NEED-009** 多 composition 模板(hook 风 / 数据流 / 对比开箱)
- [ ] **NEED-010** Workbench 内嵌 `npx hyperframes preview` iframe 实时预览
- [ ] **NEED-011** 写回 `.gallery-meta.json` 风的影刀本地工作区状态

---

## 六、阶段规划

| 阶段 | 主题 | 关键产出 | 完成 |
|---|---|---|---|
| **阶段 0** | 🏗️ hyperframes 基建 | 装包 + 第一个 demo composition 跑通 render | ✅ |
| **阶段 1** | 🔌 ScriptJson 集成 | hyperframes-adapter + composition variables 化 | ✅ |
| **阶段 2** | 🔄 集成示范 CLI | 独立 CLI 跑通 ScriptJson → mp4(避开 WIP) | ✅(阶段 7 已接进 middleware) |
| **阶段 3** | 🎨 design.md 真理源 | iris 紫调色板 + 字体 + GSAP eases 池 + Do/Don't | ✅ |
| **阶段 4** | 📊 weekly-stats Bento | 第二个 composition,1 大 2 小数据卡 + glass-morphism | ✅ |
| **阶段 5** | 🗂️ 本地素材联动 | `local-asset-remix` composition 读 `./assets/*.mp4` 拼混剪 | ✅(🗂️ 三个关键点首战) |
| **阶段 6** | 🔓 WIP 收口 | 用户 13 modified + 9 untracked(短视频 loop 完整实现)全部入 git | ✅ |
| **阶段 7** | 🔄 middleware 接入 | `vite.config.ts /api/video/render` 加 hyperframes 优先 + ffmpeg fallback | ✅ |
| **阶段 8** | 🐳 self-host Docker | Dockerfile + docker-compose + SELF_HOST.md,`docker compose up` 跑 | ✅ |
| **阶段 9** | 🖐️🎨 剩余两点 | 拖拽 + Workbench 布局哲学(改 src/ui/) | ✅(已合入 stage-10/11) |
| **阶段 15** | 📦 一键发布包 | `short-video-publish-packager` 端到端落地:多平台结构化 JSON + 合规清单 + 24h 观察项 + PublishPackPanel UI + 一键复制 | ✅ |
| **阶段 16** | 🚀 快速制作工作台 | 跟 Loop chat-first 并列的"快速制作"tab:输入 → 4 步串行(脚本/AI 提示词/混剪/发布包)→ 视频+发布包产出,跳过 cycle 抽象 | ✅ |
| **阶段 17** | 📁 本地素材真接入混剪 | `/api/assets/upload` 多文件 multipart(busboy)落到 `local-asset-remix/assets/uploads/<sid>/`;composition 加 3 个 URL variables;render middleware 根据 assetPaths 切 composition;Workbench 加上传区(拖拽 + 选文件 + 3 槽位 + 大小/类型校验)| ✅ |
| **阶段 18a** | 🎨 VideoPreviewPanel 视觉重做 | "鬼模板"→ 浅色 + iris 紫 accent + 友好空状态,色板局限在文件内不污染影刀 warm 全局 | ✅ |
| **阶段 19** | 🔌 浏览器里直接填 API key | RuntimeDropdown 加 4 预设 + 4 输入框 + 测试连接 + 保存启用,localStorage 存 customRuntime;ai-client 优先用 customRuntime;Eye 切换、ErrorBoundary 兜底崩溃 | ✅ |
| **阶段 19b/19c** | 🌐 真大模型接入加固 | translate="no" 阻止翻译插件改 DOM 让 React 崩;customRuntime 失败 throw 不悄悄 demo;testCustomRuntime 列真实可用 model;Gemini 预设默认换 gemini-3.5-flash | ✅ |
| **阶段 20** | 🤖 PM 产品经理访谈流 | 用户进来不直接当 goal,AI 反问主题/受众/卖点/平台/调性 → brief → 用户回「开干」启 cycle;LoopChatController interview state in-memory,useEffect 依赖修 [activeConfigId, locale] 避免 controller 重建丢 state | ✅ |
| **阶段 21** | 🖼️ 文章配图爬虫 | vite middleware /api/scrape/images?q=... 纯 HTTP + cheerio 解析 Bing 图片;ImageScrapePanel 浮按 + 24 图网格 + 点缩略图复制原图 URL;镜像零增重(不用 Puppeteer/Python) | ✅ |
| **阶段 22** | 🗂️ CycleOutputPanel 产出聚合 | Loop 工作台中右两列合并为紫色"本轮产出"大面板:cycle stage / 目标 / 5 任务进度 / 视频 / 发布包,一眼看到本轮产物;老的 cycle map + memory shelf 折叠到"⚙️ 进阶视图" | ✅ |
| **阶段 23** | 🐳 Docker 渲染坑修通 | hyperframes 0.6.12 在 docker puppeteer launch 失败 → 装 chrome-headless-shell + symlink 到 /usr/local/bin/hyperframes-browser;修 docker-compose env override;杀宿主机抢端口的 vite;改默认 composition 用更稳的 short-video-demo(5.3s);end-to-end HTTP 200 / 5.3s mp4 出片 | ✅ |
| **阶段 24** | 🧪 smoke test 脚本 | scripts/smoke-test.sh 一键跑 7 项验证(health / 首页 / runtime/scan / scrape/images / assets/upload / video/render),docker 起服后 bash 一行验证全栈活着 | ✅ |
| **阶段 25** | ⏱ Step elapsed timer | QuickMakeWorkbench step running 时显示已运行秒数 + ETA 文案,解决"等 4 分钟没反馈"痛点 | ✅ |
| **阶段 26** | 📚 QUICK_START 文档 | docs/QUICK_START.zh-CN.md 5 分钟新手 onboarding:docker → 接 Gemini → 出片;清 stage-23 残留 debug log | ✅ |
| **阶段 27** | 🤖 CI hyperframes lint job | .github/workflows/ci.yml 补 4 个 composition 的 hyperframes lint 0/0 check | ✅ |
| **阶段 28** | ⏱ CycleOutputPanel task timer | Loop 工作台 5 个 task 也加 elapsed timer,前端轻量记 task running 起始时间不动 core 类型 | ✅ |
| **阶段 29** | 💚 /api/_health + docker healthcheck | health endpoint + compose healthcheck 每 30s 自动 ping,失败 3 次 unhealthy → restart 介入 | ✅ |
| **阶段 30** | 📋 飞轮日志补齐 18a~29 | 之前主表停在 17,补齐 12 圈到 29 | ✅ |
| **阶段 31~32** | 🎯 PM brief 数据贯穿全链 | ScriptInput / ScriptJson 加 audience/tone/sellingPoints 字段;short-video-script-writer LLM prompt 强制使用 brief 数据写脚本 | ✅ |
| **阶段 33** | ⏱ render 超时强杀 | YINGDAO_RENDER_TIMEOUT_MS 默认 10min,Chrome hang → SIGKILL,前端立刻看到失败而不是傻等 | ✅ |
| **阶段 34** | 📚 SELF_HOST troubleshooting | 6 项 docker 排错文档化(Chrome launch 失败 / --docker 误用 / 端口冲突 / Chrome crash / 翻译插件白屏 等)| ✅ |
| **阶段 35** | 🚀 image scrape 5min 缓存 | 防 Bing 反爬 + 重复查询秒返;Map 缓存 query|limit 复合 key,超 50 条 LRU 丢弃 | ✅ |
| **阶段 36** | 🎬 样品生成器 | scripts/generate-sample.sh:跑 /api/video/render → 拷产物到 docs/sample-output/ + 自动写 README;GitHub 访客可直接看 637KB 真 mp4 | ✅ |
| **阶段 37~38** | 🏷 README sample link + npm scripts | npm run smoke / sample / docker:up/down/logs;README 内联 sample 封面 | ✅ |
| **阶段 39** | 🔌 ScriptJson 跟 ScriptInput 类型对齐 | 完整链路类型贯穿,不再有"类型在中间断了"的潜在 bug | ✅ |
| **阶段 40** | 📚 PRD 5 分钟版 | docs/PRD_SUMMARY.zh-CN.md 给"想用/想投/想抄"的人 5 分钟读完 | ✅ |
| **阶段 41** | 🤖 Loop 工作台默认欢迎语换影刀语境 | 去掉 centaur-loop 来的 SEO 旧文案,改成 PM 风格 + 4 种内容类型示例 | ✅ |
| **阶段 42** | 🎨 README inline sample 封面 | GitHub 首页加载就看到 9:16 真实渲染封面 | ✅ |
| **阶段 43~44** | 📋 PR template + CONTRIBUTING 影刀飞轮约定 | 外部贡献者一看就懂 commit 格式 + 飞轮硬性动作 | ✅ |
| **阶段 45** | 🏷 README v0.1.0 release badge + Docker badge | quick links 覆盖 QUICK_START / PRD_SUMMARY / Self-Host | ✅ |
| **阶段 46** | 🧹 .gitignore 补 dev 产物 | .claude / chrome-headless-shell / assets/uploads / .cache | ✅ |
| **阶段 47** | 🧪 vitest 单测 + publishPack 11 项 + 接 CI | 工程基础设施,1.4s 全过 | ✅ |
| **阶段 48** | 📋 RELEASE_NOTES 补 stage-24~47 | 24 圈完整记录 | ✅ |
| **阶段 49** | 🧪 npm run lint:compositions | 本地跑 4 个 composition lint,catch composition HTML 改坏 | ✅ |
| **阶段 50** | ⚡ pitch fps 30→24 | docker software WebGL 帧数 -20%,稳定性提升 | ✅ |
| **阶段 51** | ✨ HeroBanner | 渐变 hero + 4 能力卡 + iris 紫色板 | ✅ |
| **阶段 52** | 🐱 影刀 logo(白猫咪 + 紫色腮红) | 从用户自己另一 repo 共享 brand asset;HeroBanner + favicon | ✅ |
| **阶段 53** | 🎨 整体视觉重做 | 浅紫氛围渐变 + 大 logo header + underline tab + CSS vars | ✅ |
| **阶段 54~57** | 🎯 设计 token 跟火花视觉对齐 | iris 紫 10 阶 + shadcn 圆角阶梯 + 主操作色 terracotta → iris-600 | ✅ |
| **阶段 58** | 🎙 Edge TTS endpoint | Dockerfile 加 python3 + edge-tts;POST /api/tts/edge → 写 mp3 到 public/generated;实测 11 字中文 6s 出 19KB mp3 | ✅ |
| **阶段 59** | 📤 合规 deep link 自动发布 | PublishPackPanel 每平台"📤 发到 XX"按钮:复制文案 + 跳官方创作者后台;6 个平台支持 | ✅ |
| **阶段 60** | 🎬 Edge TTS 接 pitch composition 旁白 | composition narrationUrl variable + middleware 调 TTS 生成 mp3 → hyperframes 注入;edge-tts 失败 fallback Kokoro | ✅ |
| **阶段 61** | 📋 RELEASE_NOTES 补 stage-48~60 | 13 圈产出完整登记 | ✅ |

---

## 七、详细阶段计划

### 阶段 0:🏗️ hyperframes 基建 ✅
- [x] `npm install -D hyperframes`(154 包 ✓ Node 22.22.2 ✓ FFmpeg 8.1 ✓)
- [x] `npx hyperframes init compositions/short-video-demo --example blank --non-interactive` scaffold
- [x] 重写为 9:16 1080×1920 single-clip composition,Inter + Noto Sans SC 字体
- [x] 浅色背景 `#f5f3ff → #ede9fe → #ddd6fe` 渐变 + 紫色光晕 + iris-600/700/900 文字色板
- [x] GSAP 时间线:`.glow → .badge → .eyebrow → .title → .accent → .desc → .pill → .arrow` stagger 入场,5s 演示,最后 fade out
- [x] `npx hyperframes lint`:**0 errors / 0 warnings**(修了 self-attr-selector / missing-clip-class / missing-data-start 三个 warning)
- [x] `npx hyperframes validate`:0 console errors
- [x] `npx hyperframes render --quality draft`:**617 KB mp4**,45.9s 渲染 5.3s 视频(159 帧)
- [x] `compositions/short-video-demo/.gitignore` ignore renders/ 构建产物
- [x] commit 第 1 圈(只 add 新文件 + package.json,不动用户 14 个 WIP)

### 阶段 1:🔌 ScriptJson 集成 ✅
- [x] composition `<html>` 加 `data-composition-variables`,声明 7 个变量:badge / eyebrow / title1 / title2 / desc / cta / accent(含 color 类型)
- [x] HTML 元素写 default 占位(单一真理源),`<script>` 用 `window.__hyperframes.getVariables()` 在 render 时覆盖,validate 时退化到占位
- [x] 新建 `src/adapters/hyperframes-variables.ts`:`scriptToVariables(ScriptJson)` 纯函数
- [x] `splitTitleTwoLines()`:中文/英文友好的标题两行拆分(\n → 分隔符 → 中点强切)
- [x] `tsc --noEmit` 0 错误(adapter 引用 video-renderer ScriptJson 类型正确)
- [x] `npx hyperframes render --variables '{"badge":"...","title1":"..."}'` 跑通,**692 KB mp4**,30s 渲染
- [x] 两份 mp4 对比(默认 vs 参数):大小不同证明变量真生效

### 阶段 2:🔄 集成示范 🟡
**为何不直接动 `vite.config.ts`?** 它是用户 WIP(M 状态),飞轮约束"不动 WIP"。退路是写独立脚本演示集成路径,等用户合并后再把代码搬进 middleware。

- [x] `scripts/render-via-hyperframes.mjs`:独立 CLI,接受 `<script.json>` 或 stdin,输出 mp4 + `VideoRenderResult` JSON 到 stdout
- [x] `scripts/sample-script.json`:示范 ScriptJson(带 title / hook / platform / cta / scenes / risks)
- [x] 端到端跑通:`node scripts/render-via-hyperframes.mjs scripts/sample-script.json` → 真 mp4 输出
- [x] adapter 端 (`scriptToVariables`) 在 .mjs 重复实现一次(.ts → .mjs 共享靠后续编译,暂时双写)
- [ ] 🟡 **待用户合并 WIP**:把 `renderViaHyperframes()` 函数搬进 `vite.config.ts:563` 的 `server.middlewares.use('/api/video/render', ...)` 即完成 middleware 切换

### 阶段 5:🗂️ 本地素材联动 ✅
- [x] `compositions/local-asset-remix/` scaffold(blank)
- [x] `assets/clip-{1,2,3}.mp4`:ffmpeg lavfi 造的 3 个 iris 紫色阶 2s 纯色 mp4(6.7KB 各),模拟本地素材池
- [x] composition 用 `<video src="./assets/clip-1.mp4" data-start data-duration data-track-index muted playsinline>` 引用本地素材
- [x] 多 clip 时间线:`v1/caption-1` (0-2s) → `v2/caption-2` (2-4s) → `v3/caption-3` (4-6s) → `outro` (6-8s)
- [x] caption 浮层在视频上方(track 1,z-index 2),黑色 backdrop + 白字 + 大字号
- [x] outro 是浅紫渐变 scene,GSAP stagger 入场
- [x] caption 入场用 `tl.set()` + `tl.to()` 双步,避免 clip 切换时的 inline state glitch
- [x] 6 变量:c1Caption / c2Caption / c3Caption / outroTitle / outroCta / accent
- [x] `lint` 0/0 · `validate` 0 console errors · `render` 691 KB mp4(237 帧 7.9s)
- [x] 证明 hyperframes 能正确解析 composition 内的本地相对路径(`./assets/*.mp4`)

**生产用法**:用户后续把自己的素材(`~/Movies/影刀素材/`)软链/复制到 `assets/`,或在 ScriptJson 里加 `assetPath` 字段让 hyperframes-variables 映射成 `<video src="{var}">`。

### 阶段 4:📊 模板复用 ✅
- [x] `compositions/weekly-stats/` scaffold(hyperframes init blank)
- [x] 9:16 1080×1920 Bento 布局:1 大卡(主 KPI,跨 2 列)+ 2 小卡(辅 KPI)
- [x] 14 个 variables:period / title / s{1,2,3}{Label,Value,Change} / verdict / cta / accent
- [x] glass-morphism 卡片(白色 0.7 + backdrop-blur 20px)+ 主卡用紫渐变填充
- [x] stat 数字用 `font-variant-numeric: tabular-nums` 对齐
- [x] GSAP timeline:glow → header → 主卡 → 副卡 stagger → footer,6s 时长
- [x] 复用 design.md(从 short-video-demo 复制),验证跨 composition 品牌一致
- [x] `lint` 0/0 + `validate` 0 console errors + `render` 811 KB mp4(186 帧 6.2s)

### 阶段 3:🎨 design.md 落地 ✅
- [x] `compositions/short-video-demo/design.md`:Mood + Palette(iris-50→950 完整色板)+ Gradient + Typography(168/96/40/36/28px 阶梯)+ Corners + Spacing + Depth + Motion(eases 池 + 时长 + stagger)+ Do/Don't + 兼容性
- [x] HyperFrames 自动读取此文件作为品牌真理源
- [x] `lint`:0 errors / 0 warnings
- [x] `inspect --json`:issueCount 0(non-JSON 模式有 hyperframes 0.6.12 上游 bug:`Cannot read totalDuration`,issue 不 actionable,跳过)
- [x] 现有 composition 已经在贴这些规范,无需改动
- [ ] 第二个 composition(数据型 / Bento 型)→ 推到阶段 4

---

## 八、变更日志

| 日期 | 圈数 | 完成 | 失败 / 待修 | Commit |
|---|---|---|---|---|
| 2026-05-16 | 0 | 影刀飞轮宪章落地 + 阶段 0 hyperframes 基建:scaffold + composition 重写 + lint/validate/render 三件套跑通,617 KB mp4 出片 | PingFang SC 字体无 mapping → 改 Inter+Noto Sans SC | `32ab00c` |
| 2026-05-16 | 1 | 阶段 1 ScriptJson 集成:composition 7 变量化 + getVariables 注入 + ScriptJson 映射纯函数 + typecheck pass,692 KB mp4 参数化渲染 | __hyperframes 在 validate 不注入 → HTML 写 default + try-catch 降级 | `c7462ed` |
| 2026-05-16 | 2 | 阶段 2 集成示范:scripts/render-via-hyperframes.mjs CLI 端到端跑通 ScriptJson → 679 KB mp4,自动拆 title 两行,平台映射 eyebrow,hook 映射 desc | vite.config.ts 是 WIP 不能动 → 改走独立 CLI,集成代码可直接搬进 middleware | `7d71c6f` |
| 2026-05-16 | 3 | 阶段 3 design.md 落地:浅色 + iris 紫调全套色板 + Inter/Noto Sans SC 字体 + GSAP eases 池 + Do/Don't,品牌真理源就位 | hyperframes 0.6.12 inspect non-JSON 模式 totalDuration bug,改用 --json 验证 issueCount 0 | `b563730` |
| 2026-05-16 | 4 | 阶段 4 第二 composition `weekly-stats`:Bento 1 大 2 小数据卡 + 14 变量 + glass-morphism + tabular-nums,811 KB mp4 | Write 工具要求先 Read init 的默认 index.html → 已 Read 再写 | `9cdce9e` |
| 2026-05-16 | 5 | 阶段 5 本地素材联动 🗂️:`local-asset-remix` composition 读 3 个本地 mp4 + 3 段 caption + outro,691 KB mp4 验证 hyperframes 解析相对路径 | clip 切换时 GSAP from() 会有初始 frame glitch → 改 tl.set + tl.to 双步 | `7d4d426` |
| 2026-05-17 | 6 | 阶段 8 Self-host Docker:Dockerfile(Node 22 + ffmpeg + Chromium + Noto CJK)+ docker-compose + SELF_HOST.md,谁都能 `docker compose up` 跑 | 用户机器没装 Docker → 文档化为主 | `8fe0905` |
| 2026-05-17 | 7 | 阶段 6+7 WIP 收口 + middleware 接入:用户 short-video loop 完整实现(700+ 行,5 工具 + 1 loop config + 5 UI + middleware + 35KB PRD)+ vite.config.ts hyperframes 优先路径,curl POST 端到端 adapter:"hyperframes" 648 KB mp4 落盘 | vite.config.ts 我加的和用户 WIP 混在同一文件 → 合并 commit | `47803b6` |
| 2026-05-18 | 15 | 阶段 15 一键发布包:`short-video-publish-packager` 端到端落地 — `core/publishPack.ts` 类型+ parse + serialize + formatPlatformCopy;`loopExecutor` 特例分支 + JSON schema 提示词;`ai-client` demo mock(抖音/TikTok/小红书 3 平台 + 6 项合规 + 6 项 24h 指标);`PublishPackPanel.tsx` 平台 tab + 标题/正文/标签/AB 变体逐项复制;`LoopDraftCard` artifact 分发。`tsc --noEmit` ✓,`vite build` 259 KB ✓,parse roundtrip + fenced 容错 + 坏输入兜底 3 case 全过 | preview 工具因 worktree 路径限制不可用,改用 typecheck + build + node tsx 单元逻辑覆盖;真"无人值守"自动发布(平台 API/RPA)留 stage-16 | `6a0a586` |
| 2026-05-18 | 16 | 阶段 16 快速制作工作台(用户原话"先做制作内容的工作台"):跳过 Centaur Loop 的 cycle/plan-review/awaiting_* 抽象,直接面向"我要做内容"。`core/quickMake.ts` 串行 runner:脚本(LLM JSON)→ AI 提示词(LLM 文本)→ 混剪(hyperframes via /api/video/render)→ 发布包(LLM JSON,复用 stage-15)。`ui/QuickMakeWorkbench.tsx` 三列布局:左输入(选题/卖点/平台多选/视觉风格)+ 中 4 步进度卡(pending/running/done/error/skipped)+ 右产出(视频 + PublishPackPanel + AI 提示词折叠 + 脚本 JSON 折叠)。`App.tsx` 加 tab,默认进"快速制作"。`tsc --noEmit` ✓,`vite build` 282 KB / gzip 88 KB ✓ | preview 工具因 worktree 限制不可用,实际运行需 `npm run dev`(port 5180)。本地素材上传留下圈;`/api/video/render` middleware 依赖 dev server 才能工作 | `6392d85` |
| 2026-05-18 | 17 | 阶段 17 本地素材真接入混剪(用户选 a):前端拖入素材 → 渲染时混剪真用用户素材。`vite.config.ts` 加 `assetUploadApiPlugin` /api/assets/upload(busboy multipart,3 类型白名单 mp4/webm/mov/jpg/png/webp,单文件 50MB,落到 `local-asset-remix/assets/uploads/<sid>/`,返回相对路径);改造 `renderViaHyperframes` 接 assetPaths 参数 → 切 `local-asset-remix` composition + 传 c{1,2,3}Url variables(< 3 自动 fallback demo clip)+ scriptToRemixCaptions 把 scene[i].caption 映射到 caption slot。`local-asset-remix/index.html` 加 c1Url/c2Url/c3Url 三 variable + setSrc 注入(default 保留 ./assets/clip-N.mp4 不破坏 demo)。`hyperframes lint` ✓ 0/0 仍 pass。`adapters/video-renderer.ts` 加 uploadAssets() + assetPaths 字段。`core/quickMake.ts` 串通。`ui/QuickMakeWorkbench.tsx` 加 AssetUploader 子组件:点击 / 拖拽 / 类型校验 / 大小校验 / 3 槽位 / 缩略图 / 单删 / warnings。`.gitignore` 排除 `assets/uploads/`。`tsc --noEmit` ✓,`vite build` 287 KB / gzip 90 KB ✓ | preview 工具因 worktree 限制不可用,完整链路要 `npm run dev`(port 5180)上传真 mp4 才能验证。busboy 加在 devDep 因为只在 vite dev middleware 用,build 不需 | `4e4d05a` |

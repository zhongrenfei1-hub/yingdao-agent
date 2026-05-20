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

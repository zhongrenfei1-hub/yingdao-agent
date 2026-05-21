# 🤝 接力人交接文档 · 用户 qiu(gentergumina@gmail.com)

> 下一个 AI 进来先读这 200 行,再决定要不要 deep dive 到各项目的 `00_FLYWHEEL.md`。
> 文档基于 2026-05-21 时点的状态。如果 git log 比这个新,优先信 git log。

---

## 一、一句话用户画像

中文母语开发者 / 创作者,做两个独立项目(影刀 + 美术模版网站),审美偏浅紫 + 极简,飞轮式迭代(每圈一个 commit),交流偏短句、不喜欢长篇大论的报告,**大方向他拍板,细节你自决**。

---

## 二、立即了解的 8 件事

| # | 事 | 拒绝什么 |
|---|---|---|
| 1 | **中文优先** · 回复 / 任务列表 / 章节标题一律中文 | 整句英文输出 |
| 2 | **审美** · 浅色 + iris 紫(`#7c3aed`)调色板 | 暗色主题、灰黑色 UI、过度未来主义装饰 |
| 3 | **个人作品 demo 用自己的**,数据再少也不替换"为了好看" | 把用户 commit 历史换成 mock 数据 |
| 4 | **不要长篇大论报告** · 简洁结构化表格化 | 段落式叙述、重复总结 |
| 5 | **影刀协作规则** · 大方向他拍板,细节你自决 · 每圈 1 commit + 不超过 3 行选项 | 5-7 项打钩清单丢给用户 |
| 6 | **macOS 13 + Intel Mac** · 系统 Python 3.9.6 / Homebrew 5.1.11 in `/usr/local/bin/brew` | 假设 Apple Silicon / Python 3.10+ |
| 7 | **Hermes Agent 在 `~/.hermes`** · 自定义 aipaibox provider + claude-opus-4-7 | 替换默认配置 |
| 8 | **本地装了 colima + docker**(stage-23 装的) · macOS 13 兼容,influence 范围 = 影刀 docker self-host | Docker Desktop |

---

## 三、项目 A · 美术模版网站(已部署 · 暂时冻结)

> 用户 2026-05-20 后没再动过这个,主线精力在影刀。stage-7 之后没新 stage。

| 字段 | 值 |
|---|---|
| 路径 | `~/美术模版网站/` |
| 应用代码 | `~/美术模版网站/app/`(Vite + React 19 + TS + Tailwind 4) |
| 部署 | Vercel,项目名 `app`,scope `zhongrenfei1-hubs-projects` |
| 生产 URL | https://app-4ygxbjv92-zhongrenfei1-hubs-projects.vercel.app |
| 当前进度 | stage-7(跨设备同步 `.gallery-meta.json` 读写) |
| 飞轮宪章 | [`~/美术模版网站/00_FLYWHEEL.md`](美术模版网站/00_FLYWHEEL.md) |

**用户最后留下的痛点**:"不人性化"(未明指 — 等他截图或列我猜的痛点让他打钩)。

---

## 四、项目 B · 影刀 yingdao-agent(主线 · 公开 repo · ~75 commit)

| 字段 | 值 |
|---|---|
| 路径 | `~/yingdao-agent/` |
| GitHub | **https://github.com/zhongrenfei1-hub/yingdao-agent** · PUBLIC · v0.1.0 release |
| 性质 | 基于 Centaur Loop 的短视频增长 Agent · self-hosted 本地工作台 |
| 技术栈 | React 18 + Vite 6 + TS + Tailwind 3 + Zustand + framer-motion + hyperframes 0.6.12 + vitest + busboy + cheerio + python3(edge-tts + faster-whisper) |
| 部署形态 | **Docker self-host** 一键起服 · `docker compose up -d --build` |
| 端口 | 5180(容器内 + 宿主机) |
| 视频引擎 | hyperframes(HTML-as-video · chrome-headless-shell + GSAP) |
| TTS | Edge TTS(stage-58) · Kokoro fallback(stage-13b 老版) |
| ASR | faster-whisper base(stage-64) |

### 4.1 当前能力清单(stage-15 ~ 75 完整 ✓)

| 类 | 能力 |
|---|---|
| 🚀 工作台 | 快速制作 tab(4 步串行)+ Loop 工作台 tab(PM 访谈 + cycle)+ tab 切换动画 |
| 🤖 AI | PM 产品经理访谈(主题/受众/卖点/平台/调性)→ brief → 回「开干」启 cycle |
| 🎬 视频 | hyperframes 真出 9:16 mp4 · short-video-demo(5.3s 默认稳)/ short-video-pitch(15.5s TTS 旁白)/ local-asset-remix(用户素材) |
| 🎙 语音 | Edge TTS(微软 neural)/api/tts/edge · 8 个中文 voice 试听浮按 · 接到 pitch composition narration |
| 🎙 字幕 | faster-whisper /api/asr/whisper · multipart 上传音视频 → segments 带时间戳 · base 模型按需下载 |
| 📦 发布 | 抖音/TikTok/小红书/快手/视频号/B 站 6 平台发布包 · 标题 + caption + AB 变体 + 合规清单 + 24h 观察 |
| 📤 合规发布 | 每平台「发到 XX」按钮:复制文案 + 跳官方创作者后台(deep link,不绕 TOS) |
| 🖼️ 配图 | Bing 图片爬虫 /api/scrape/images · cheerio + 5min 缓存 · 24 图网格 + 点缩略图复制原图 URL |
| 📁 本地素材 | 拖入 mp4/png → /api/assets/upload(busboy multipart)→ 落到 composition/uploads/ → composition variables 注入 |
| 🔌 LLM | 浏览器里直接填 API key 浮按(localStorage),4 预设(OpenAI / DeepSeek / Gemini / Claude / 智谱 / 通义)+ 测试连接 + 列真实可用 model |
| 🐱 logo | 白猫咪 + 紫色腮红(`public/yingdao-logo.png` · 从用户另一 repo `aitoearn-web` 搬过来) |
| 🧪 测试 | smoke 8 项 + vitest 11 项 + GitHub Action CI(typecheck/test/build/composition lint × 4) |

### 4.2 关键命令

```bash
cd ~/yingdao-agent

# 一键起服(首次 ~15 min,后续 < 30s)
npm run docker:up
# 浏览器开 http://localhost:5180

# 关 / 看日志
npm run docker:down
npm run docker:logs

# 测试
npm test                  # vitest 11 项
npm run smoke             # 7+1 项 endpoint + 真渲染验证 · 4-5 min
npm run sample            # 跑一遍 /api/video/render,产物拷到 docs/sample-output/
npm run lint:compositions # 4 个 composition hyperframes lint 0/0

# 单独玩 composition
cd ~/yingdao-agent/compositions/short-video-pitch
npx hyperframes lint
npx hyperframes render --quality draft --output renders/test.mp4

# curl 端到端
curl -X POST http://localhost:5180/api/video/render \
  -H "Content-Type: application/json" \
  -d '{"script":{"title":"测试","hook":"...","platform":"抖音","cta":"试试"}}'

curl -X POST http://localhost:5180/api/tts/edge \
  -H "Content-Type: application/json" \
  -d '{"text":"你好","voice":"zh-CN-XiaoxiaoNeural"}'

curl -X POST http://localhost:5180/api/asr/whisper \
  -F "file=@/path/to/audio.mp3" -F "model=base" -F "language=zh"
```

### 4.3 关键文件位置速查

| 文件 | 干嘛 |
|---|---|
| `00_FLYWHEEL.md` | 飞轮宪章 + 每圈打钩 + 变更日志(commit hash)。**改任何代码前先看** |
| `RELEASE_NOTES.zh-CN.md` | stage-15 ~ 72 完整描述 · 给新人 / 想看变化的人 |
| `docs/QUICK_START.zh-CN.md` | 5 分钟新手 onboarding |
| `docs/PRD_SUMMARY.zh-CN.md` | 35KB PRD 的 5 分钟版 |
| `YINGDAO_AGENT_PRD.zh-CN.md` | 完整 PRD,主战略锁死(本地优先 / PM 访谈 / hyperframes) |
| `SELF_HOST.md` | Docker 部署 + 6 项排错(stage-23 踩的坑) |
| `vite.config.ts` | **大量** vite middleware:`/api/_health` `/api/runtime/*` `/api/video/render` `/api/assets/upload` `/api/scrape/images` `/api/tts/edge` `/api/asr/whisper`,800+ 行 |
| `Dockerfile` | Node 22 + ffmpeg + chromium + chrome-headless-shell + Noto CJK + Python 3 + edge-tts + faster-whisper |
| `src/App.tsx` | 顶部 header / nav / Hero / Tab 切换 / 三浮按挂载 |
| `src/ui/QuickMakeWorkbench.tsx` | 快速制作 tab 主组件 · 左输入 / 中进度 / 右产出 三栏 |
| `src/protocol/loopChat.ts` | PM 访谈 + cycle 启动 · interview state in-memory · CONFIRM_PATTERNS |
| `src/adapters/customRuntime.ts` | localStorage 存 baseUrl/apiKey/model + 测试 + invoke |
| `compositions/short-video-pitch/index.html` | 主出口 composition(15.5s TTS) |
| `scripts/tts-edge.py` | Edge TTS Python wrapper |
| `scripts/asr-whisper.py` | faster-whisper Python wrapper |
| `scripts/smoke-test.sh` | 7+1 项端到端验证 |
| `scripts/generate-sample.sh` | 生成 docs/sample-output/yingdao-sample.mp4 |

---

## 五、协作模式 / 沟通模式

| 用户说 | 你应该做 |
|---|---|
| "继续" / "推下一圈" | 推下一圈飞轮,不要再问选项 |
| "停" / "暂停" | 收尾 + commit + 等下次 |
| "x" / "随便" / "都可以" / "你来" / "你说呢" | **你拿主意,做最高 ROI 的一项**,不要再问 |
| "X 不行" / "X 不好" | **不要问"具体哪里"**,直接列 5-7 个我猜的痛点让他打钩 |
| "做一份 X 文档" | 直接动手写,放合理位置,写完给路径 |
| "怎么用" / "怎么部署" | 给操作步骤 + 命令,**不重复讲整个项目历史** |
| 中英混合的"a/b/c" 选项 | 用户回 "a" 或 "ab" 都是选项 ID,直接干 |

### 5.1 飞轮节奏(用户的核心工作模式)

- 每圈 ≈ 1 个 commit
- commit message 用 `feat(stage-N): xxx · yyy` 格式,含本圈做了什么 / 验证证据 / 副作用
- 完成阶段在 `00_FLYWHEEL.md` 打钩(主表 + 变更日志同步)
- 章节标题用 `mcp__ccd_session__mark_chapter` 划分,方便回溯

### 5.2 影刀特有协作规则(来自 user memory)

- 大方向用户拍板,细节你自决
- 每圈用 1 句话 + 不超过 3 行表格让他点头
- 影刀的整体定位(短视频增长 Agent / Centaur Loop / hyperframes / 本地工作台 self-hosted)是锁死的轴,不需要每次重新解释
- 用户的"四环飞轮"指令(`BUILD / SELL / TEST / FIX 同步并发`)或"UI 设计四环飞轮"(`Design / Showcase / Test / Refine`)= 全自动模式,**只输出行动和结果,不解释,不问下一步,长时间自主跑**

---

## 六、本机环境速查

| 工具 | 路径 / 版本 |
|---|---|
| Node | `/usr/local/bin/node` v22.22.2(用户用 Hermes 装的) |
| npm | 10.9.7 |
| Python 系统 | `/usr/bin/python3` 3.9.6(太老) |
| Python uv 管理 | `~/.kokoro-venv/bin/python` 3.12.13 + kokoro-onnx + soundfile |
| FFmpeg | `/usr/local/bin/ffmpeg` 8.1 |
| Homebrew | `/usr/local/bin/brew` 5.1.11(Intel Mac) |
| Vercel CLI | `npx vercel`,token 在 `~/Library/Application Support/com.vercel.cli/auth.json` |
| Kokoro 模型 | `~/.kokoro-models/{kokoro-v1.0.fp16.onnx, voices-v1.0.bin}` |
| Hyperframes | `npx --yes hyperframes@0.6.12`,Chrome bundled 在 `~/.cache/hyperframes/` |
| espeak-ng | 已装(Kokoro 中文 phonemize 必需) |
| **colima** | `/usr/local/bin/colima`(stage-23 装,影刀 docker self-host 用)·`colima start --cpu 2 --memory 4 --disk 30` |
| **docker** | `/usr/local/bin/docker`(stage-23 装) |

---

## 七、用户主目录其他项目快速识别

```
~/yingdao-agent             ← 影刀(主线 · 本文档项目 B)
~/美术模版网站              ← 美术模版网站(项目 A)
~/huohua/project/aitoearn-web ← 火花 / aitoearn.ai(用户另一同赛道项目 · Next.js + shadcn,
                              影刀的 logo 就是从这里搬过来的;两个 repo brand asset 共享)
~/cashlens-hk-audit         ← Cashlens 香港审计部署版(独立)
~/excel-balance-template    ← Excel 多币种余额表生成器(独立)
~/海荣香港                  ← 香港审计流水分析工作区(独立)
~/香港审计工具              ← 银行流水进账统计(独立)
~/四环飞轮 工作流          ← Build/Sell/Test/Fix 全自动产品开发飞轮(独立)
~/openwarp                  ← 开源项目(独立)
~/my-video                  ← 个人视频项目(独立)
```

详见 [`~/.claude/projects/-Users-qiu-------/memory/reference_qiu_projects.md`](.claude/projects/-Users-qiu-------/memory/reference_qiu_projects.md)。

---

## 八、影刀当前 / 最近的待办(2026-05-21 时点)

### 已知 TODO

- [ ] **UI 重做迭代** · 用户 2026-05-21 说"算了 用影刀的 UI 吧",刚把 stage-65~74 一波未来主义重做回滚到 stage-64 状态(影刀原 warm + iris 风)
- [ ] **YINGDAO_LIGHT_RENDER=0** 切到 short-video-pitch(15.5s + TTS)在 docker 真跑通(stage-50 降 fps 24,stage-60 接 Edge TTS,但默认还是 demo composition)
- [ ] **TtsPanel 保存的 voice** 实际接到 docker container env YINGDAO_TTS_VOICE(stage-63 留下,只写 localStorage)
- [ ] **ASR 字幕接到 hyperframes** · 让 short-video-pitch 真有"卡拉 OK 字幕"(用 ASR segments 时间戳)
- [ ] **多 worker 加速渲染** · colima 升到 4 CPU 后 hyperframes worker 可以从 1 拉到 2
- [ ] **抖音 / TikTok 官方 OAuth** · 真"一键发布"(stage-15 留的合规路线 A,需要用户申请开放平台资质)

### 已闭环不需要追

- ✅ Docker 6 个坑全修通(chrome-headless-shell + symlink + env / 端口冲突 / shell escape / 翻译插件白屏)
- ✅ 设计 token 跟火花对齐(iris 紫 10 阶 + 圆角阶梯 0.625rem)
- ✅ PM brief 数据贯穿全链(audience/tone/sellingPoints → ScriptInput → composition variables)

---

## 九、接力人快速 onboard(5 分钟)

```bash
# 1. 看本文档(完成 ✓ 你正在看)

# 2. 看 git log 最近 commit
cd ~/yingdao-agent && git log --oneline | head -20

# 3. 起服 + 跑 smoke 验证全栈活着
npm run docker:up
npm run smoke   # 8 项全绿 · 5 分钟

# 4. 看本轮飞轮宪章(主表 + 变更日志)
cat 00_FLYWHEEL.md | head -130

# 5. 美术模版网站不深入,只在用户问到时再 read 具体文件
```

**不要**:全文件 Read 多文件 / 重新介绍项目定位 / 长篇大论报告。

---

## 十、Skills / 工具

- `hyperframes` / `hyperframes-cli` / `hyperframes-media` — 视频渲染
- `higgsfield-generate` / `higgsfield-product-photoshoot` / `higgsfield-soul-id` — AI 图片/视频生成(用户在做不同视频形式时可能用到)
- `update-config` — Claude Code settings.json
- `caveman` — 极致省 token 模式
- 完整列表见 `/Users/qiu/.claude/` 下 skill 目录

---

## 十一、用户的 memory 文件(必读)

```
/Users/qiu/.claude/projects/-Users-qiu-------/memory/
├── MEMORY.md                              ← 索引
├── feedback_chinese.md                    ← 中文优先
├── feedback_personal_memento.md           ← 个人作品数据不替换 demo
├── feedback_yingdao_collaboration.md      ← 影刀:大方向他拍板,细节你自决
├── reference_qiu_projects.md              ← ~/ 下项目位置速查
├── reference_remotion_macos13.md          ← Remotion 4.x 在 macOS 13 渲染坑
├── user_hermes_setup.md                   ← Hermes CLI 配置
├── user_qiuqiu_chichoo.md                 ← "qiuqiu" = EDG IGL,不是用户自指
└── user_visual_prefs.md                   ← 浅色终端 + 紫色审美
```

---

**Last updated**: 2026-05-21 · stage-75 回滚后
**接力人来源**:gentergumina@gmail.com 的本机 Claude Code 会话(经 76 个 commit 的累积演进)

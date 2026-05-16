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
- [ ] **NEED-003** `ScriptJson` → composition variables 映射(hyperframes-adapter)
- [ ] **NEED-004** `/api/video/render` middleware 替换 ffmpeg,改走 `spawn npx hyperframes render`
- [ ] **NEED-005** 影刀 `design.md` 落地(浅色 + 紫色调,贴用户审美)

### P1(三个关键点)
- [ ] **NEED-006** 🗂️ **本地文件夹联动**:composition 引用本地素材池(mp4/jpg),Agent 自动选材
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
| **阶段 1** | 🔌 ScriptJson 集成 | hyperframes-adapter + composition variables 化 | ☐ |
| **阶段 2** | 🔄 middleware 切换 | `/api/video/render` 改走 hyperframes,ffmpeg 路径降级 | ☐ |
| **阶段 3** | 🎨 design.md 落地 | 浅紫调一致,Workbench 美学统一 | ☐ |
| **阶段 4** | 🗂️ 本地素材联动 | composition 读本地素材池 | ☐ |
| **阶段 5** | 🖐️ 拖拽交互 | 素材/镜头/反馈拖入 Workbench | ☐ |
| **阶段 6** | 📦 收尾 | 多模板 + Workbench preview iframe + README | ☐ |

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

### 阶段 1:🔌 ScriptJson 集成(下一圈)
- [ ] composition `<html>` 加 `data-composition-variables`,声明:title / hook / scenes(JSON 字符串)/ cta / theme
- [ ] 内部 `getVariables()` 读值,动态填充 .title / .desc / .pill
- [ ] 新建 `src/adapters/hyperframes-adapter.ts`,把 ScriptJson 映射成 `--variables '{...}'`
- [ ] 用例:`renderHyperframesVideo({ cycleId, taskId, script })` 接口对齐现有 `VideoRenderResult`
- [ ] `npx hyperframes render --variables '{"title":"测试","hook":"..."}'` 跑通参数化渲染

---

## 八、变更日志

| 日期 | 圈数 | 完成 | 失败 / 待修 | Commit |
|---|---|---|---|---|
| 2026-05-16 | 0 | 影刀飞轮宪章落地 + 阶段 0 hyperframes 基建:scaffold + composition 重写 + lint/validate/render 三件套跑通,617 KB mp4 出片 | PingFang SC 字体无 mapping → 改 Inter+Noto Sans SC | _待 commit_ |

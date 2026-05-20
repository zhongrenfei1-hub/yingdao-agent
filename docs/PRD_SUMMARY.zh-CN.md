# 影刀 Agent PRD · 5 分钟概览

> 完整 35KB 版本:[YINGDAO_AGENT_PRD.zh-CN.md](../YINGDAO_AGENT_PRD.zh-CN.md)
> 这份是抽出来给"想用 / 想投 / 想抄"的快速版本。

## 一句话

**影刀 = Centaur Loop(反馈闭环工作台)+ 短视频增长 Agent + hyperframes 视频管线 + AI 产品经理**,本地跑,docker 一行起服。

## 它解决什么问题

| 别人怎么做 | 痛点 |
|---|---|
| ChatGPT/Claude 给你写个脚本 | 没法直接出 mp4,没真懂你受众 |
| 剪映 / CapCut AI 模板 | 模板风格固定,创意复用度低 |
| Runway / Pika / Sora 纯生成 | 不用你本地素材,贵 + 慢 |
| 自动化 SaaS(Heygen 等) | 内容生产黑盒,反馈无法回闭环 |

影刀的差异:**先访谈搞清楚需求 → 真用你本地素材混剪 → 出真 mp4 + 多平台发布包 + 反馈进入下一轮**。

## 目标用户

| 角色 | 用影刀做 |
|---|---|
| 独立开发者 | 自己产品的 demo / 上线视频 |
| 创作者 / KOL | 批量产出选题实验,跑数据驱动迭代 |
| 中小品牌运营 | 抖音 / 小红书 / TikTok 多平台同时投放 |
| 自媒体团队 | 复用历史经验做下一轮(Centaur Loop 的记忆功能) |

## 核心闭环(Centaur Loop)

```
PM 访谈 → brief 确认 → 自动跑 5 工具(选题 / 脚本 / AI 提示词 / 混剪 / 发布包)
       ↓
   人工卡点审核每个 draft → 发布(用户复制粘贴到抖音/小红书)
       ↓
   反馈数据(播放/完播/互动)→ AI 复盘 → 经验沉淀到记忆 → 下一轮启动
```

**人工卡点不是 bug 是 feature** — AI 自动跑能跑的部分,人在品牌/合规/审美关键节点决策。

## 5 个核心工具(stage-15 → 33 全部落地)

| 工具 | 输入 | 输出 |
|---|---|---|
| 🎬 short-video-script-writer | topic / audience / tone / 卖点 | JSON ScriptJson(标题/钩子/3 镜头/CTA) |
| ✨ ai-video-generation-brief | ScriptJson | 逐镜头 Sora/Veo/Seedance 提示词 |
| 🎞️ local-asset-remix-planner | ScriptJson + 本地素材(可选)| 9:16 mp4(hyperframes 真渲染) |
| 📦 short-video-publish-packager | ScriptJson + 平台列表 | 抖音/TikTok/小红书 每平台:标题+caption+标签+建议时间+A/B 变体+合规清单+24h 观察 |
| 🖼️ image-finder | 关键词 | Bing 24 张图配文章用 |

## 三个不可妥协的产品定位

1. **本地优先 + self-hosted** — 不做 SaaS,docker 在你自己机器跑
2. **AI 产品经理而不是 cron 执行器** — 先访谈搞清楚要做什么再开干
3. **HyperFrames HTML-as-video** — 真带文字带 GSAP 动画,不靠 ffmpeg drawbox 占位

## 非目标(明确不做)

- 不做 SaaS / 不收订阅
- 不做实时 AI 视频生成模型(用现成的:Sora / Veo / Seedance / Kling)
- 不绕平台 API 自动发布(违反 TOS)— 走"生成发布包让用户复制粘贴"路径
- 不内置 auth / 多用户隔离(self-host 是给单人/小团队)

## 跑起来 5 步

```bash
git clone https://github.com/zhongrenfei1-hub/yingdao-agent
cd yingdao-agent && npm run docker:up      # ~15min 首次 build
open http://localhost:5180                  # 浏览器接 Gemini key
npm run smoke                                # 验证 7 项 endpoint 全活
npm run sample                               # 生成一个真实 demo mp4
```

完整 onboarding:[docs/QUICK_START.zh-CN.md](./QUICK_START.zh-CN.md)
完整 PRD:[YINGDAO_AGENT_PRD.zh-CN.md](../YINGDAO_AGENT_PRD.zh-CN.md)
飞轮日志:[00_FLYWHEEL.md](../00_FLYWHEEL.md)

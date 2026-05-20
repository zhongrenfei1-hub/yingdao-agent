# 影刀 · 5 分钟新手 onboarding

> 从 0 跑到「输入关键词 → 出一条 9:16 mp4 + 抖音/小红书发布包」

## 第 0 步 · 准备

| 你需要 | 怎么拿 |
|---|---|
| Docker(macOS / Linux) | macOS 推荐 `brew install colima docker docker-compose` + `colima start --memory 4` |
| Gemini API key(免费) | https://aistudio.google.com/apikey · 1 分钟 |
| 备选 · DeepSeek | https://platform.deepseek.com/api_keys · ¥2 充值能跑几百次 |

## 第 1 步 · 起服(2 分钟,首次 build 慢)

```bash
git clone https://github.com/zhongrenfei1-hub/yingdao-agent.git
cd yingdao-agent
docker compose up -d --build
# 等容器启动好(看到 "Container yingdao-agent Started")
```

浏览器开 **http://localhost:5180**。

## 第 2 步 · 接入大模型(1 分钟)

1. 点右下角浮按(显示 `demo · local`)
2. 在弹出的"自定义 OpenAI-compat API"区:
   - 点 **Gemini** 预设(Base URL 自动填好)
   - **API Key** 粘 Google AI Studio 拿的 key
   - **Model** 默认 `gemini-3.5-flash`(快版,日常用)或 `gemini-3.1-pro-preview`(强版,preview 限速)
3. 点 **「测试连接」** → 看到「连通 ✓」
4. 点 **「保存并启用」** → 顶部按钮变紫色 + 显示当前 model 名

## 第 3 步 · 出一条短视频(1-4 分钟)

### 路径 A:🚀 快速制作(推荐新手)

默认就在这个 tab。左栏:

- **选题** · 例如「本地素材自动混剪」
- **核心卖点** · 一句话讲清楚要推什么、给谁、为啥有用
- **目标平台** · 默认抖音 + 小红书
- **本地素材**(可选)· 拖 1-3 个 mp4/png 进去就用你的

点 **「🚀 一键做一条」** 大按钮 → 4 步实时跑:

1. 🎬 **写脚本**(LLM,5-30s)
2. ✨ **AI 提示词**(LLM,5-30s)
3. 🎞️ **混剪出片**(hyperframes,1.5-4 分钟在 docker software WebGL)
4. 📦 **发布包**(LLM,5-30s)

右栏出 9:16 mp4 + 多平台发布包 + AI 提示词 + 脚本 JSON 折叠。

### 路径 B:🤖 Loop 工作台(熟手)

切上面 tab 到 **「Loop 工作台」**。

1. 在底部输入框打字,影刀 AI 产品经理会**反问** —— 主题 / 受众 / 卖点 / 平台 / 调性,5 轮内凑齐
2. AI 输出 **📋 brief**(目标 / 受众 / 卖点 / 平台 / 调性 + 一句话总结)
3. 你回 **「开干」**(或「行」/「确认」/「ok」/「冲」/「干」)→ 影刀启动 cycle
4. 右栏紫色 **「本轮产出」** 面板实时显示 5 个 task 进度 + 视频 + 发布包

不喜欢的 brief?继续打字告诉它哪儿要改,会重新合成。

## 第 4 步 · 配图(找文章配图用)

右下角浮按 **「配图」**:

1. 输关键词 → 回车
2. 24 张 Bing 图片网格
3. **点缩略图** → 自动复制原图 URL 到剪贴板
4. 粘到公众号编辑器即可

## 第 5 步 · 拿成片

视频在宿主机:`./public/generated/yingdao-auto-remix-demo.mp4`
发布包按钮:点单字段「复制」或「复制全部」→ 粘到抖音/小红书创作者后台。

## 验证

```bash
bash scripts/smoke-test.sh
# 应输出 ✓ 全部通过 6/6
```

## 常见问题

| 问题 | 解决 |
|---|---|
| 渲染卡 / 失败 | docker compose down && docker compose up -d,等 30s |
| 测试连接「列表里没找到 xxx」 | 警告不是错;按 model 名是否拼对再点保存 |
| Chrome / Loop tab 白屏 | 关掉浏览器翻译插件(沉浸式翻译、Google 翻译) |
| 端口 5180 被占 | `lsof -i :5180` 找进程 kill,然后 `docker compose up -d` |
| 模型调用失败 | 顶部按钮颜色:紫 = customRuntime,灰 = demo;紫还失败看 Console 红字 |

## 想深入

- [完整 PRD](../YINGDAO_AGENT_PRD.zh-CN.md)
- [飞轮宪章](../00_FLYWHEEL.md)
- [发布笔记 stage-15~25](../RELEASE_NOTES.zh-CN.md)
- [Self-Host 详情](../SELF_HOST.md)

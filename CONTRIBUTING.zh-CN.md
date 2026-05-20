# 贡献指南

[English](./CONTRIBUTING.md) | 简体中文

Centaur Loop 还处于早期阶段，因此最有价值的贡献是聚焦、具体、可验证的改进。

适合优先贡献的方向：

- 改进核心状态机的可靠性和幂等性。
- 从当前 React demo 中抽离框架无关的 core API。
- 增加 storage、notifier、memory 和 model 适配器。
- 增加销售跟进、客服、研究、内容增长等示例闭环。
- 改进文档和架构图。

如果你准备提交较大的 PR，请先开 issue 说明设计思路和取舍。

## 本地开发

```bash
npm install
npm run typecheck
npm run build
```

## 原则

- 把人类作为一等公民的决策者。
- 把反馈和复盘作为闭环的原生部分。
- 避免自动写入低质量长期记忆。
- 优先使用小而可组合的适配器,避免平台锁定。

## 影刀飞轮约定(yingdao-agent 分支特有)

影刀走"四环飞轮"工作法 —— **Build / Sell / Test / Fix 同步并发**。

每圈硬性动作:

1. **commit message** 用 `feat(stage-N): 主题 · 副标题` 格式。stage-N 递增,
   stage-0 是宪章落地,后续每圈 +1。
2. **打钩 + 入 [00_FLYWHEEL.md](./00_FLYWHEEL.md)** —— 阶段规划表加一行,
   变更日志区加一行(日期/圈数/完成/失败/commit hash)。
3. **typecheck + build** 通过(`npm run typecheck && npm run build`)。
4. **smoke test** 7 项通过(`npm run smoke`)—— 如果改了 vite middleware
   或新增 endpoint 必跑。
5. **改了 composition** 必须本地 `npx hyperframes lint` 0/0;CI 也会跑。
6. **改了 PRD 主战略**(本地优先 / PM 访谈 / hyperframes 三轴)需要先开 issue 讨论。

PR 提交模板见 [.github/pull_request_template.md](./.github/pull_request_template.md)。
完整工程经验(含 docker 6 个坑)见 [SELF_HOST.md](./SELF_HOST.md) 排错章节。


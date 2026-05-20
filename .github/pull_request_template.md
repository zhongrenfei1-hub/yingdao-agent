## Summary

- 

## Scope

- [ ] Core loop / Centaur Loop engine
- [ ] HyperFrames composition(short-video-demo / pitch / weekly-stats / local-asset-remix)
- [ ] vite middleware API(/api/video/render · /api/scrape/images · /api/assets/upload · /api/_health)
- [ ] PM 访谈 / Quick make UI / Loop chat-first
- [ ] Runtime connector / custom API form
- [ ] Docker / self-host
- [ ] Documentation
- [ ] Tests / smoke / CI

## Verification

```bash
npm run typecheck
npm run build
npm run docker:up
npm run smoke       # 7 项端到端通过
# 可选 · 真渲染一遍
npm run sample
```

改 composition 的话本地跑 `npx hyperframes lint` 应 0/0。

## Notes

Call out behavior changes, migration concerns, or follow-up work.
影刀飞轮约定:每圈一个 commit,message 用 `feat(stage-N): xxx · yyy`,
完整记录在 [00_FLYWHEEL.md](../00_FLYWHEEL.md)。

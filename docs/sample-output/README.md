# 影刀产品样品

通过 `scripts/generate-sample.sh` 自动生成。

| 项 | 值 |
|---|---|
| composition | `short-video-demo` |
| duration | 5.3s |
| adapter | hyperframes(chrome-headless-shell + Noto CJK)|
| 渲染耗时 | 53s(software WebGL · 2 cores) |
| 视频 | [`yingdao-sample.mp4`](./yingdao-sample.mp4) · 637K |
| 封面 | ![](./yingdao-sample.jpg) · 45K |

## 重生成

```bash
docker compose up -d --build
bash scripts/generate-sample.sh
```

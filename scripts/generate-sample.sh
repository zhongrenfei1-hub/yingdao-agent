#!/usr/bin/env bash
# 影刀产品样品生成器
# 跑一次 /api/video/render → 拷贝产出到 docs/sample-output/
# 用法:bash scripts/generate-sample.sh [base_url]
# 默认 base_url = http://localhost:5180

set -e
BASE_URL="${1:-http://localhost:5180}"
SAMPLE_DIR="docs/sample-output"
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
RESET='\033[0m'

cd "$(dirname "$0")/.."
mkdir -p "$SAMPLE_DIR"

printf "${PURPLE}🎬 影刀产品样品生成 · base=%s${RESET}\n\n" "$BASE_URL"

# 跑一次真渲染
printf "1/3 ⏳ 渲染 demo composition(5.3s 视频,software WebGL · ~3-5 min)…\n"
START_TS=$(date +%s)
curl -sS -o /tmp/sample-render.json -w "HTTP %{http_code} · %{time_total}s\n" \
  -X POST "$BASE_URL/api/video/render" \
  -H "Content-Type: application/json" \
  -d '{
    "script": {
      "title": "影刀短视频 Agent",
      "hook": "PM 访谈 + 一键出片",
      "platform": "抖音",
      "audience": "独立开发者",
      "tone": "高级",
      "sellingPoints": ["AI 产品经理", "本地素材自动混剪"],
      "cta": "GitHub 搜 yingdao-agent"
    }
  }' --max-time 600

VIDEO_URL=$(python3 -c "import json; print(json.load(open('/tmp/sample-render.json')).get('videoUrl', ''))")
POSTER_URL=$(python3 -c "import json; print(json.load(open('/tmp/sample-render.json')).get('posterUrl', ''))")
DURATION=$(python3 -c "import json; print(json.load(open('/tmp/sample-render.json')).get('durationSeconds', '?'))")
COMPOSITION=$(python3 -c "import json; print(json.load(open('/tmp/sample-render.json')).get('composition', '?'))")
END_TS=$(date +%s)
ELAPSED=$((END_TS - START_TS))

if [[ -z "$VIDEO_URL" ]]; then
  printf "${PURPLE}✗ 渲染失败${RESET}\n"
  cat /tmp/sample-render.json
  exit 1
fi
printf "  ${GREEN}✓${RESET} 渲染完成 · %ss · %s\n\n" "$ELAPSED" "$COMPOSITION"

# 拷贝产物到 sample-output/
printf "2/3 📁 拷贝产物到 %s/\n" "$SAMPLE_DIR"
SAMPLE_MP4="$SAMPLE_DIR/yingdao-sample.mp4"
SAMPLE_JPG="$SAMPLE_DIR/yingdao-sample.jpg"
curl -sS "$BASE_URL$VIDEO_URL" -o "$SAMPLE_MP4"
curl -sS "$BASE_URL$POSTER_URL" -o "$SAMPLE_JPG"
MP4_SIZE=$(ls -lh "$SAMPLE_MP4" | awk '{print $5}')
JPG_SIZE=$(ls -lh "$SAMPLE_JPG" | awk '{print $5}')
printf "  ${GREEN}✓${RESET} %s · %s\n" "$SAMPLE_MP4" "$MP4_SIZE"
printf "  ${GREEN}✓${RESET} %s · %s\n\n" "$SAMPLE_JPG" "$JPG_SIZE"

# 写 README 描述
cat > "$SAMPLE_DIR/README.md" <<EOF
# 影刀产品样品

通过 \`scripts/generate-sample.sh\` 自动生成。

| 项 | 值 |
|---|---|
| composition | \`$COMPOSITION\` |
| duration | ${DURATION}s |
| adapter | hyperframes(chrome-headless-shell + Noto CJK)|
| 渲染耗时 | ${ELAPSED}s(software WebGL · 2 cores) |
| 视频 | [\`yingdao-sample.mp4\`](./yingdao-sample.mp4) · $MP4_SIZE |
| 封面 | ![](./yingdao-sample.jpg) · $JPG_SIZE |

## 重生成

\`\`\`bash
docker compose up -d --build
bash scripts/generate-sample.sh
\`\`\`
EOF
printf "3/3 ${GREEN}✓${RESET} %s/README.md 写完\n\n" "$SAMPLE_DIR"
printf "${PURPLE}🎉 完成 · GitHub 访客可在 docs/sample-output/ 直接看到产品效果${RESET}\n"

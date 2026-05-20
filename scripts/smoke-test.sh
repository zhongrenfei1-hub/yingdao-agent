#!/usr/bin/env bash
# 影刀 smoke test —— docker compose up -d 之后跑一次,验证所有关键路径活着
# 用法:bash scripts/smoke-test.sh [base_url]
# 默认 base_url = http://localhost:5180

set -e
BASE_URL="${1:-http://localhost:5180}"
PASS=0
FAIL=0
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf "${GREEN}✓${RESET} %-40s %s\n" "$label" "$actual"
    PASS=$((PASS+1))
  else
    printf "${RED}✗${RESET} %-40s expected=%s got=%s\n" "$label" "$expected" "$actual"
    FAIL=$((FAIL+1))
  fi
}

printf "${PURPLE}🛠 影刀 smoke test · base=%s${RESET}\n\n" "$BASE_URL"

# 0. health
status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/_health")
check "GET /api/_health" "200" "$status"

# 1. 首页 200
status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/")
check "GET /" "200" "$status"

# 2. runtime status
status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/runtime/status" || echo "000")
check "GET /api/runtime/status" "200" "$status"

# 3. runtime scan
status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 "$BASE_URL/api/runtime/scan" || echo "000")
check "GET /api/runtime/scan" "200" "$status"

# 4. image scrape (Bing 关键词 → 24 张图)
images_count=$(curl -sS --max-time 15 "$BASE_URL/api/scrape/images?q=coffee&limit=5" 2>/dev/null \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('count', 0))" 2>/dev/null || echo "0")
if [[ "$images_count" =~ ^[0-9]+$ ]] && [[ "$images_count" -ge 1 ]]; then
  printf "${GREEN}✓${RESET} %-40s %s\n" "GET /api/scrape/images?q=coffee" "$images_count images"
  PASS=$((PASS+1))
else
  printf "${RED}✗${RESET} %-40s expected>=1 got=%s\n" "GET /api/scrape/images?q=coffee" "$images_count"
  FAIL=$((FAIL+1))
fi

# 5. asset upload(空 body 应该 400 "Expected multipart")
status=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" --max-time 5 "$BASE_URL/api/assets/upload" -d '{}')
check "POST /api/assets/upload (bad ct)" "400" "$status"

# 6. video render(短 demo composition · ≤ 5 min)
echo ""
printf "${PURPLE}⏳ 真渲染一遍视频(software WebGL · 4-5 min)…${RESET}\n"
start_ts=$(date +%s)
render_status=$(curl -sS -o /tmp/yingdao-render.json -w "%{http_code}" \
  --max-time 600 \
  -X POST "$BASE_URL/api/video/render" \
  -H "Content-Type: application/json" \
  -d '{"script":{"title":"smoke","hook":"自动化测试","platform":"抖音","cta":"试试"}}' \
  || echo "000")
end_ts=$(date +%s)
elapsed=$((end_ts - start_ts))
check "POST /api/video/render" "200" "$render_status"
if [[ "$render_status" == "200" ]]; then
  adapter=$(python3 -c "import json; print(json.load(open('/tmp/yingdao-render.json')).get('adapter', '?'))" 2>/dev/null || echo "?")
  duration=$(python3 -c "import json; print(json.load(open('/tmp/yingdao-render.json')).get('durationSeconds', '?'))" 2>/dev/null || echo "?")
  printf "  ${PURPLE}↳${RESET} adapter=%s · duration=%ss · 耗时=%ss\n" "$adapter" "$duration" "$elapsed"
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  printf "${GREEN}✓ 全部通过 · %d/%d${RESET}\n" "$PASS" "$((PASS+FAIL))"
  exit 0
else
  printf "${RED}✗ 失败 %d · 通过 %d${RESET}\n" "$FAIL" "$PASS"
  exit 1
fi

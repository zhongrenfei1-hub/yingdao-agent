/**
 * ScriptJson → HyperFrames composition variables 映射
 *
 * 纯函数,浏览器 / Node middleware 双端可用。
 *
 * 当前对应 composition:`compositions/short-video-demo/index.html`
 * 声明的变量:badge / eyebrow / title1 / title2 / desc / cta / accent
 */

import type { ScriptJson } from './video-renderer'

export type HyperframesVariables = {
  badge: string
  eyebrow: string
  title1: string
  title2: string
  desc: string
  cta: string
  accent: string
}

export interface MappingOptions {
  /** 品牌徽标文字,默认"影刀短视频" */
  badge?: string
  /** 主色,默认 iris-600 紫 */
  accent?: string
  /** 兜底文案,所有字段都缺失时使用 */
  fallback?: Partial<HyperframesVariables>
}

const DEFAULTS: HyperframesVariables = {
  badge: '影刀短视频',
  eyebrow: '本轮内容',
  title1: '影刀',
  title2: '短视频',
  desc: '基于 Centaur Loop 的短视频增长闭环',
  cta: '点击关注',
  accent: '#7c3aed',
}

/**
 * 把 AI 输出的 ScriptJson 转成 hyperframes composition 变量。
 *
 * - `title` 自动拆两行(优先 \n,其次中点附近的 ·/-/、,最后强切)
 * - `hook` 当作描述(`desc`)的主要来源
 * - `platform` 当作 `eyebrow`(如 "TikTok · 第 3 期")
 * - `cta` 直传
 */
export function scriptToVariables(
  script: ScriptJson | undefined,
  options: MappingOptions = {},
): HyperframesVariables {
  const fallback = { ...DEFAULTS, ...options.fallback }
  if (!script) return fallback

  const [title1, title2] = splitTitleTwoLines(script.title ?? fallback.title1)

  return {
    badge: options.badge ?? fallback.badge,
    eyebrow: pickFirst(script.platform, script.hook?.slice(0, 24), fallback.eyebrow),
    title1: title1 || fallback.title1,
    title2: title2 || fallback.title2,
    desc: pickFirst(script.hook, script.scenes?.[0]?.caption, fallback.desc),
    cta: pickFirst(script.cta, fallback.cta),
    accent: options.accent ?? fallback.accent,
  }
}

/**
 * 标题拆两行 — 中文/英文都友好。
 * - 含 \n:直接按 \n 切
 * - ≤ 8 字:整段 title1,title2 留空
 * - 否则:找中点附近的分隔符(`·,、-。 ` 等),最后兜底按字数中点强切
 */
export function splitTitleTwoLines(title: string): [string, string] {
  const t = (title ?? '').trim()
  if (!t) return ['', '']
  if (t.includes('\n')) {
    const [a, b = ''] = t.split('\n', 2)
    return [a.trim(), b.trim()]
  }
  if (t.length <= 8) return [t, '']

  const mid = Math.ceil(t.length / 2)
  const isSep = (ch: string) => /[\s,、,。·\-_/|]/.test(ch)

  // 从中点向两边找最近的分隔符
  for (let offset = 0; offset < 6; offset++) {
    for (const dir of [1, -1] as const) {
      const i = mid + dir * offset
      if (i > 0 && i < t.length && isSep(t[i])) {
        const left = t.slice(0, i).trim()
        const right = t.slice(i + 1).trim()
        if (left && right) return [left, right]
      }
    }
  }
  // 强切
  return [t.slice(0, mid).trim(), t.slice(mid).trim()]
}

function pickFirst(...candidates: Array<string | undefined>): string {
  for (const c of candidates) {
    if (c != null && c.trim().length > 0) return c.trim()
  }
  return ''
}

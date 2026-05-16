#!/usr/bin/env node
/**
 * 用 HyperFrames 渲染影刀短视频的独立 CLI。
 *
 * 这是阶段 2 的"集成示范"——展示 vite.config.ts 的 videoRenderApiPlugin
 * 应该如何调 hyperframes。等用户合并 WIP 后,把这段 spawn 逻辑搬到
 * `server.middlewares.use('/api/video/render', ...)` 里即可完成 ffmpeg → hyperframes 切换。
 *
 * 用法:
 *   node scripts/render-via-hyperframes.mjs <script.json> [output.mp4]
 *   echo '{"title":"测试","hook":"..."}' | node scripts/render-via-hyperframes.mjs - out.mp4
 *
 * ScriptJson schema(对应 src/adapters/video-renderer.ts 的 ScriptJson):
 *   { title?, cover?, duration?, platform?, hook?, scenes?: [...], cta?, risks? }
 *
 * 退出码:
 *   0  成功(stdout 输出 VideoRenderResult JSON)
 *   1  参数错误
 *   2  渲染失败(stderr 给原因)
 */

import { spawn } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const COMPOSITION_DIR = path.join(REPO_ROOT, 'compositions/short-video-demo')
const HYPERFRAMES_VERSION = '0.6.12'

// ---- ScriptJson → hyperframes variables 映射(复刻自 src/adapters/hyperframes-variables.ts)----
// .mjs 不能 import .ts,所以这段逻辑暂时双写。等阶段 3 把它编译成 .js 后再共享。

const DEFAULTS = {
  badge: '影刀短视频',
  eyebrow: '本轮内容',
  title1: '影刀',
  title2: '短视频',
  desc: '基于 Centaur Loop 的短视频增长闭环',
  cta: '点击关注',
  accent: '#7c3aed',
}

function splitTitleTwoLines(title) {
  const t = (title ?? '').trim()
  if (!t) return ['', '']
  if (t.includes('\n')) {
    const [a, b = ''] = t.split('\n', 2)
    return [a.trim(), b.trim()]
  }
  if (t.length <= 8) return [t, '']
  const mid = Math.ceil(t.length / 2)
  const isSep = (ch) => /[\s,、,。·\-_/|]/.test(ch)
  for (let offset = 0; offset < 6; offset++) {
    for (const dir of [1, -1]) {
      const i = mid + dir * offset
      if (i > 0 && i < t.length && isSep(t[i])) {
        const left = t.slice(0, i).trim()
        const right = t.slice(i + 1).trim()
        if (left && right) return [left, right]
      }
    }
  }
  return [t.slice(0, mid).trim(), t.slice(mid).trim()]
}

function pickFirst(...candidates) {
  for (const c of candidates) {
    if (c != null && String(c).trim().length > 0) return String(c).trim()
  }
  return ''
}

function scriptToVariables(script) {
  if (!script) return { ...DEFAULTS }
  const [title1, title2] = splitTitleTwoLines(script.title ?? DEFAULTS.title1)
  return {
    badge: DEFAULTS.badge,
    eyebrow: pickFirst(script.platform, script.hook?.slice(0, 24), DEFAULTS.eyebrow),
    title1: title1 || DEFAULTS.title1,
    title2: title2 || DEFAULTS.title2,
    desc: pickFirst(script.hook, script.scenes?.[0]?.caption, DEFAULTS.desc),
    cta: pickFirst(script.cta, DEFAULTS.cta),
    accent: DEFAULTS.accent,
  }
}

// ---- 读 ScriptJson ----

async function readScript(arg) {
  if (arg === '-' || !arg) {
    // stdin
    let buf = ''
    for await (const chunk of process.stdin) buf += chunk
    return JSON.parse(buf || '{}')
  }
  const text = await readFile(arg, 'utf8')
  return JSON.parse(text)
}

// ---- 主 render 函数(这就是要搬到 vite middleware 里的核心)----

async function renderViaHyperframes({ script, outputPath, quality = 'draft' }) {
  const variables = scriptToVariables(script)

  // 用绝对路径输出
  const absOut = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(process.cwd(), outputPath)

  return new Promise((resolve, reject) => {
    const args = [
      '--yes',
      `hyperframes@${HYPERFRAMES_VERSION}`,
      'render',
      '--variables', JSON.stringify(variables),
      '--output', absOut,
      '--quality', quality,
    ]
    process.stderr.write(`[hyperframes-render] spawning: npx ${args.slice(0, 4).join(' ')} ...\n`)
    process.stderr.write(`[hyperframes-render] variables: ${JSON.stringify(variables)}\n`)

    const child = spawn('npx', args, {
      cwd: COMPOSITION_DIR,
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      stdout += d.toString()
      process.stderr.write(d) // 渲染进度透传到 stderr,stdout 留给最终 JSON
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
      process.stderr.write(d)
    })
    child.on('error', reject)
    child.on('exit', async (code) => {
      if (code !== 0) {
        reject(new Error(`hyperframes render exit ${code}: ${stderr.slice(-500)}`))
        return
      }
      try {
        const fileStat = await stat(absOut)
        resolve({
          videoUrl: 'file://' + absOut,
          posterUrl: '', // poster 由 hyperframes 自动生成,放后续阶段
          outputPath: absOut,
          adapter: 'hyperframes',
          adapterVersion: HYPERFRAMES_VERSION,
          fileSizeBytes: fileStat.size,
          variables,
        })
      } catch (e) {
        reject(new Error(`render finished but output missing: ${absOut}`))
      }
    })
  })
}

// ---- CLI 入口 ----

async function main() {
  const [, , scriptArg, outputArg] = process.argv
  if (!scriptArg) {
    console.error('Usage: node scripts/render-via-hyperframes.mjs <script.json|-> [output.mp4]')
    process.exit(1)
  }
  const script = await readScript(scriptArg)
  const outputPath = outputArg ?? path.join(
    COMPOSITION_DIR,
    'renders',
    `script-${Date.now()}.mp4`,
  )

  try {
    const result = await renderViaHyperframes({ script, outputPath })
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  } catch (err) {
    console.error('Render failed:', err.message)
    process.exit(2)
  }
}

main()

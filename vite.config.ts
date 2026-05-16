import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

function readRequestBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res: import('http').ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

type RuntimeEnv = Record<string, string>;

function getModelConfig(env: RuntimeEnv) {
  const apiKey = (env.CENTAUR_MODEL_API_KEY || process.env.CENTAUR_MODEL_API_KEY || '').trim();
  const baseUrl = (env.CENTAUR_MODEL_BASE_URL || process.env.CENTAUR_MODEL_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/$/, '');
  const model = (env.CENTAUR_MODEL_NAME || process.env.CENTAUR_MODEL_NAME || 'gpt-4o-mini').trim();
  return { apiKey, baseUrl, model };
}

interface RuntimeConnector {
  id: string;
  label: string;
  provider: string;
  endpoint?: string;
  model: string;
  models?: string[];
  configured: boolean;
  available: boolean;
  kind: 'demo' | 'openai-compatible' | 'ollama' | 'planned';
  message: string;
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 900,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: unknown | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let data: unknown | null = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    return { ok: response.ok, status: response.status, data, error: response.ok ? undefined : text };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Connection failed.' };
  } finally {
    clearTimeout(timer);
  }
}

function extractOpenAIModelIds(data: unknown): string[] {
  const records = Array.isArray((data as { data?: unknown[] } | null)?.data)
    ? (data as { data: Array<{ id?: string }> }).data
    : [];
  return records.map((item) => item.id).filter(Boolean) as string[];
}

function pickModel(preferred: string, models: string[], fallback: string): string {
  if (preferred && models.includes(preferred)) return preferred;
  return models[0] ?? preferred ?? fallback;
}

async function scanOpenAICompatibleRuntime(params: {
  id: string;
  label: string;
  endpoint: string;
  provider?: string;
  preferredModel: string;
  apiKey?: string;
  configured: boolean;
  unavailableMessage: string;
  detectedMessage: (modelCount: number) => string;
}): Promise<RuntimeConnector> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (params.apiKey) headers.authorization = `Bearer ${params.apiKey}`;

  if (!params.configured) {
    return {
      id: params.id,
      label: params.label,
      provider: params.provider ?? 'openai-compatible',
      endpoint: params.endpoint,
      model: params.preferredModel,
      models: [],
      configured: false,
      available: false,
      kind: 'openai-compatible',
      message: params.unavailableMessage,
    };
  }

  const response = await fetchJsonWithTimeout(`${params.endpoint}/models`, 1200, { headers });
  const models = response.ok ? extractOpenAIModelIds(response.data) : [];
  const model = pickModel(params.preferredModel, models, params.preferredModel || 'local-model');

  return {
    id: params.id,
    label: params.label,
    provider: params.provider ?? 'openai-compatible',
    endpoint: params.endpoint,
    model,
    models,
    configured: true,
    available: response.ok,
    kind: 'openai-compatible',
    message: response.ok
      ? params.detectedMessage(models.length)
      : response.status === 401 || response.status === 403
        ? 'Runtime responded, but authentication failed. Check the API key.'
        : params.unavailableMessage,
  };
}

async function scanRuntimeConnectors(env: RuntimeEnv): Promise<RuntimeConnector[]> {
  const config = getModelConfig(env);
  const connectors: RuntimeConnector[] = [
    {
      id: 'local-demo',
      label: 'Local demo runtime',
      provider: 'local-demo',
      model: 'demo',
      models: ['demo'],
      configured: true,
      available: true,
      kind: 'demo',
      message: 'Built-in deterministic demo runtime. No API key required.',
    },
  ];

  connectors.push(await scanOpenAICompatibleRuntime({
    id: 'openai-compatible-env',
    label: 'OpenAI-compatible env',
    provider: 'openai-compatible',
    endpoint: config.baseUrl,
    preferredModel: config.model,
    apiKey: config.apiKey,
    configured: Boolean(config.apiKey),
    unavailableMessage: config.apiKey
      ? `Could not reach ${config.baseUrl}/models. The runtime is configured but not connected.`
      : 'Set CENTAUR_MODEL_API_KEY in .env.local to enable this runtime.',
    detectedMessage: (count) => `Connected through CENTAUR_MODEL_* environment variables. ${count || 1} model(s) visible.`,
  }));

  const ollama = await fetchJsonWithTimeout('http://127.0.0.1:11434/api/tags');
  const ollamaModels = ollama.ok && Array.isArray((ollama.data as { models?: unknown[] } | null)?.models)
    ? (ollama.data as { models: Array<{ name?: string }> }).models
    : [];
  const ollamaModel = ollamaModels[0]?.name ?? 'llama3.2';
  connectors.push({
    id: 'ollama-local',
    label: 'Ollama local',
    provider: 'ollama',
    endpoint: 'http://127.0.0.1:11434',
    model: ollamaModel,
    models: ollamaModels.map((item) => item.name).filter(Boolean) as string[],
    configured: ollama.ok,
    available: ollama.ok,
    kind: 'ollama',
    message: ollama.ok
      ? `Detected Ollama with ${ollamaModels.length || 1} model(s).`
      : 'Ollama was not detected at 127.0.0.1:11434.',
  });

  connectors.push(await scanOpenAICompatibleRuntime({
    id: 'lm-studio-local',
    label: 'LM Studio local server',
    provider: 'openai-compatible',
    endpoint: 'http://127.0.0.1:1234/v1',
    preferredModel: 'local-model',
    configured: true,
    unavailableMessage: 'LM Studio OpenAI-compatible server was not detected at 127.0.0.1:1234.',
    detectedMessage: (count) => `Detected LM Studio with ${count || 1} model(s).`,
  }));

  connectors.push(await scanOpenAICompatibleRuntime({
    id: 'vllm-local',
    label: 'vLLM local server',
    provider: 'openai-compatible',
    endpoint: 'http://127.0.0.1:8000/v1',
    preferredModel: 'local-model',
    configured: true,
    unavailableMessage: 'vLLM OpenAI-compatible server was not detected at 127.0.0.1:8000.',
    detectedMessage: (count) => `Detected vLLM with ${count || 1} model(s).`,
  }));

  connectors.push(await scanOpenAICompatibleRuntime({
    id: 'llamacpp-local',
    label: 'llama.cpp local server',
    provider: 'openai-compatible',
    endpoint: 'http://127.0.0.1:8080/v1',
    preferredModel: 'local-model',
    configured: true,
    unavailableMessage: 'llama.cpp OpenAI-compatible server was not detected at 127.0.0.1:8080.',
    detectedMessage: (count) => `Detected llama.cpp server with ${count || 1} model(s).`,
  }));

  connectors.push(
    {
      id: 'langgraph-planned',
      label: 'LangGraph',
      provider: 'langgraph',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'planned',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
    {
      id: 'temporal-planned',
      label: 'Temporal',
      provider: 'temporal',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'planned',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
    {
      id: 'n8n-planned',
      label: 'n8n',
      provider: 'n8n',
      model: 'adapter planned',
      configured: false,
      available: false,
      kind: 'planned',
      message: 'Adapter planned. Not implemented in this MVP.',
    },
  );

  return connectors;
}

function chooseDefaultRuntime(connectors: RuntimeConnector[]): RuntimeConnector {
  return connectors.find((connector) => connector.id === 'openai-compatible-env' && connector.available)
    ?? connectors.find((connector) => connector.id === 'ollama-local' && connector.available)
    ?? connectors.find((connector) => connector.id === 'lm-studio-local' && connector.available)
    ?? connectors.find((connector) => connector.kind !== 'demo' && connector.available)
    ?? connectors[0];
}

function connectorStatus(connector: RuntimeConnector) {
  return {
    mode: connector.kind === 'demo' ? 'demo' : 'real',
    provider: connector.provider,
    model: connector.model,
    configured: connector.configured,
    available: connector.available,
    message: connector.message,
    selectedRuntimeId: connector.id,
  };
}

async function verifyRuntimeConnector(connector: RuntimeConnector, env: RuntimeEnv): Promise<RuntimeConnector> {
  if (connector.kind === 'demo') return connector;
  if (!connector.available) return connector;

  if (connector.kind === 'ollama') {
    const response = await fetchJsonWithTimeout(`${connector.endpoint}/api/tags`, 1200);
    return {
      ...connector,
      available: response.ok,
      configured: response.ok,
      message: response.ok
        ? `Connected to Ollama model ${connector.model}.`
        : 'Ollama is no longer reachable.',
    };
  }

  if (connector.kind === 'openai-compatible') {
    const config = getModelConfig(env);
    const headers: Record<string, string> = { accept: 'application/json' };
    if (connector.id === 'openai-compatible-env' && config.apiKey) {
      headers.authorization = `Bearer ${config.apiKey}`;
    }
    const response = await fetchJsonWithTimeout(`${connector.endpoint}/models`, 1200, { headers });
    const models = response.ok ? extractOpenAIModelIds(response.data) : [];
    return {
      ...connector,
      available: response.ok,
      configured: response.ok,
      models,
      model: pickModel(connector.model, models, connector.model),
      message: response.ok
        ? `Connected to ${connector.label}. ${models.length || 1} model(s) visible.`
        : response.status === 401 || response.status === 403
          ? 'Runtime responded, but authentication failed. Check the API key.'
          : `${connector.label} is no longer reachable.`,
    };
  }

  return connector;
}

function centaurRuntimeApiPlugin(env: RuntimeEnv): Plugin {
  return {
    name: 'centaur-runtime-api',
    configureServer(server) {
      server.middlewares.use('/api/runtime/scan', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        const connectors = await scanRuntimeConnectors(env);
        sendJson(res, 200, { connectors, selectedRuntimeId: chooseDefaultRuntime(connectors).id });
      });

      server.middlewares.use('/api/runtime/status', (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        void scanRuntimeConnectors(env).then((connectors) => {
          const selected = chooseDefaultRuntime(connectors);
          sendJson(res, 200, connectorStatus(selected));
        });
      });

      server.middlewares.use('/api/runtime/connect', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readRequestBody(req);
          const parsed = JSON.parse(body || '{}') as { runtimeId?: string };
          const connectors = await scanRuntimeConnectors(env);
          const selected = connectors.find((connector) => connector.id === parsed.runtimeId);
          if (!selected) {
            sendJson(res, 404, { error: 'Runtime not found.' });
            return;
          }

          const verified = await verifyRuntimeConnector(selected, env);
          if (!verified.available) {
            sendJson(res, 409, { connector: verified, status: connectorStatus(verified) });
            return;
          }

          sendJson(res, 200, { connector: verified, status: connectorStatus(verified) });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sendJson(res, 500, { error: message });
        }
      });

      server.middlewares.use('/api/model', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readRequestBody(req);
          const parsed = JSON.parse(body || '{}') as { prompt?: string; runtimeId?: string };
          const prompt = parsed.prompt?.trim();
          if (!prompt) {
            sendJson(res, 400, { error: 'Missing prompt.' });
            return;
          }

          const connectors = await scanRuntimeConnectors(env);
          const selected = connectors.find((connector) => connector.id === parsed.runtimeId)
            ?? chooseDefaultRuntime(connectors);

          if (!selected.available || selected.kind === 'demo') {
            sendJson(res, 503, { error: `${selected.label} is not available for model execution.` });
            return;
          }
          if (selected.kind === 'planned') {
            sendJson(res, 501, { error: `${selected.label} adapter is planned, but not implemented in this MVP.` });
            return;
          }

          if (selected.kind === 'ollama') {
            const upstream = await fetch(`${selected.endpoint}/api/chat`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                model: selected.model,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
              }),
            });

            if (!upstream.ok) {
              const text = await upstream.text();
              sendJson(res, upstream.status, { error: text || 'Ollama request failed.' });
              return;
            }

            const payload = await upstream.json() as { message?: { content?: string }, response?: string };
            sendJson(res, 200, {
              text: payload.message?.content ?? payload.response ?? '',
              provider: selected.provider,
              model: selected.model,
              runtimeId: selected.id,
            });
            return;
          }

          const config = getModelConfig(env);
          const baseUrl = selected.id === 'openai-compatible-env'
            ? config.baseUrl
            : selected.endpoint ?? '';
          const apiKey = selected.id === 'openai-compatible-env'
            ? config.apiKey
            : '';
          const model = selected.id === 'openai-compatible-env'
            ? config.model
            : selected.model;

          if (!baseUrl) {
            sendJson(res, 503, { error: 'Selected runtime has no endpoint.' });
            return;
          }

          const headers: Record<string, string> = { 'content-type': 'application/json' };
          if (apiKey) headers.authorization = `Bearer ${apiKey}`;

          const upstream = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text();
            sendJson(res, upstream.status, { error: text || 'Model request failed.' });
            return;
          }

          const payload = await upstream.json() as {
            choices?: Array<{ message?: { content?: string }, text?: string }>;
          };
          const text = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? '';
          sendJson(res, 200, {
            text,
            provider: selected.provider,
            model,
            runtimeId: selected.id,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args);
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-600)}`));
    });
  });
}

interface SceneInput { id?: string; duration?: number }
interface ScriptInput { duration?: number; scenes?: SceneInput[] }
interface TimelineEntry { id: string; start: number; end: number }

function buildTimeline(script: ScriptInput | undefined): { durationSeconds: number; timeline: TimelineEntry[] } {
  const scenes = Array.isArray(script?.scenes) ? script!.scenes! : null;
  if (!scenes || scenes.length === 0) {
    // 默认 12 秒 3 段:钩子 / 演示 / CTA
    return {
      durationSeconds: 12,
      timeline: [
        { id: 'hook', start: 0.3, end: 3 },
        { id: 'demo', start: 3.5, end: 8 },
        { id: 'cta', start: 8.5, end: 12 },
      ],
    };
  }
  let cursor = 0;
  const timeline: TimelineEntry[] = scenes.map((s, i) => {
    const dur = typeof s.duration === 'number' && s.duration > 0 ? s.duration : 4;
    const id = String(s.id ?? ['hook', 'demo', 'cta'][i] ?? `scene${i}`).toLowerCase();
    const start = cursor + 0.3;
    const end = cursor + dur - 0.2;
    cursor += dur;
    return { id, start, end };
  });
  // clamp to [6, 30] 防止异常
  const total = Math.max(6, Math.min(30, cursor || 12));
  return { durationSeconds: total, timeline };
}

function boxesForScene(t: TimelineEntry): string[] {
  const enable = `enable='between(t,${t.start.toFixed(2)},${t.end.toFixed(2)})'`;
  if (t.id === 'hook' || t.id === 'intro' || t.id === 'opening') {
    return [
      `drawbox=x=80:y=420:w=iw-160:h=240:color=white@0.92:t=fill:${enable}`,
      `drawbox=x=80:y=420:w=iw-160:h=240:color=0x2E1065:t=6:${enable}`,
      `drawbox=x=100:y=560:w=iw-200:h=8:color=0x2E1065@0.6:t=fill:${enable}`,
      `drawbox=x=120:y=620:w=(iw-240)*0.7:h=8:color=0x6D28D9@0.6:t=fill:${enable}`,
    ];
  }
  if (t.id === 'demo' || t.id === 'product' || t.id === 'showcase' || t.id === 'b-roll') {
    const dur = (t.end - t.start).toFixed(2);
    const start = t.start.toFixed(2);
    const fillExpr = `(iw-320)*((t-${start})/${dur})`;
    return [
      `drawbox=x=100:y=720:w=iw-200:h=720:color=black@0.75:t=fill:${enable}`,
      `drawbox=x=100:y=720:w=iw-200:h=720:color=0xA78BFA:t=8:${enable}`,
      `drawbox=x=160:y=820:w=${fillExpr}:h=12:color=0xA78BFA:t=fill:${enable}`,
    ];
  }
  if (t.id === 'cta' || t.id === 'outro' || t.id === 'closing') {
    return [
      `drawbox=x=140:y=900:w=iw-280:h=320:color=0x6D28D9@0.95:t=fill:${enable}`,
      `drawbox=x=140:y=900:w=iw-280:h=320:color=white@0.95:t=6:${enable}`,
      `drawbox=x=180:y=1020:w=iw-360:h=8:color=white@0.85:t=fill:${enable}`,
    ];
  }
  // 未知类型 — 通用紫色框占位
  return [
    `drawbox=x=120:y=600:w=iw-240:h=400:color=0x6D28D9@0.55:t=fill:${enable}`,
    `drawbox=x=120:y=600:w=iw-240:h=400:color=0xA78BFA:t=6:${enable}`,
  ];
}

// === HyperFrames adapter(影刀飞轮 阶段 7 接入)===
//   优先用 hyperframes 出真带文字带动画的 mp4(走 compositions/short-video-demo)
//   失败时自动降级到下方 ffmpeg drawbox 实现,WIP 代码全部保留作为 fallback
//   显式传 `adapter: 'ffmpeg'` 可跳过 hyperframes 直接走 ffmpeg(快速预览/调试)

const HF_VERSION = '0.6.12';
const HF_COMPOSITION = path.resolve(__dirname, 'compositions/short-video-demo');

function splitTitleTwoLines(title: string): [string, string] {
  const t = (title ?? '').trim();
  if (!t) return ['', ''];
  if (t.includes('\n')) {
    const [a, b = ''] = t.split('\n', 2);
    return [a.trim(), b.trim()];
  }
  if (t.length <= 8) return [t, ''];
  const mid = Math.ceil(t.length / 2);
  const isSep = (ch: string) => /[\s,、,。·\-_/|]/.test(ch);
  for (let offset = 0; offset < 6; offset++) {
    for (const dir of [1, -1] as const) {
      const i = mid + dir * offset;
      if (i > 0 && i < t.length && isSep(t[i])) {
        const left = t.slice(0, i).trim();
        const right = t.slice(i + 1).trim();
        if (left && right) return [left, right];
      }
    }
  }
  return [t.slice(0, mid).trim(), t.slice(mid).trim()];
}

interface ScriptForHyperframes extends ScriptInput {
  title?: string;
  hook?: string;
  platform?: string;
  cta?: string;
}

function scriptToHyperframesVariables(script: ScriptInput | undefined): Record<string, string> {
  const D = {
    badge: '影刀短视频',
    eyebrow: '本轮内容',
    title1: '影刀',
    title2: '短视频',
    desc: '基于 Centaur Loop 的短视频增长闭环',
    cta: '点击关注',
    accent: '#7c3aed',
  };
  if (!script) return D;
  const s = script as ScriptForHyperframes;
  const [title1, title2] = splitTitleTwoLines(s.title ?? D.title1);
  const firstScene = script.scenes?.[0] as (SceneInput & { caption?: string }) | undefined;
  return {
    badge: D.badge,
    eyebrow: (s.platform || s.hook?.slice(0, 24) || D.eyebrow).trim(),
    title1: title1 || D.title1,
    title2: title2 || D.title2,
    desc: (s.hook || firstScene?.caption || D.desc).trim(),
    cta: (s.cta || D.cta).trim(),
    accent: D.accent,
  };
}

function runHyperframes(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, { cwd });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`hyperframes exited with code ${code}: ${stderr.slice(-600)}`));
    });
  });
}

async function renderViaHyperframes(
  script: ScriptInput | undefined,
  outputDir: string,
  videoPath: string,
  posterPath: string,
): Promise<void> {
  const variables = scriptToHyperframesVariables(script);
  await mkdir(outputDir, { recursive: true });
  await runHyperframes(
    [
      '--yes',
      `hyperframes@${HF_VERSION}`,
      'render',
      '--variables', JSON.stringify(variables),
      '--output', videoPath,
      '--quality', 'draft',
    ],
    HF_COMPOSITION,
  );
  // 抽 1 秒一帧做封面(复用 runFfmpeg)
  try {
    await runFfmpeg([
      '-y', '-ss', '00:00:01', '-i', videoPath,
      '-frames:v', '1', '-q:v', '3', posterPath,
    ]);
  } catch {
    /* 封面失败不阻塞,前端会用默认 poster */
  }
}

function videoRenderApiPlugin(): Plugin {
  const outputDir = path.resolve(__dirname, 'public/generated');
  const videoPath = path.join(outputDir, 'yingdao-auto-remix-demo.mp4');
  const posterPath = path.join(outputDir, 'yingdao-auto-remix-demo.jpg');

  return {
    name: 'yingdao-video-render-api',
    configureServer(server) {
      server.middlewares.use('/api/video/render', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          // 从 request body 读 script + 可选 adapter(由上游 short-video-script-writer 输出)
          const body = await readRequestBody(req);
          let parsed: { script?: ScriptInput; adapter?: 'hyperframes' | 'ffmpeg' } = {};
          if (body.trim()) {
            try { parsed = JSON.parse(body) as typeof parsed; } catch { /* fallback to default */ }
          }

          // 默认走 hyperframes;adapter='ffmpeg' 或 hyperframes 失败时降级到 ffmpeg drawbox
          if ((parsed.adapter ?? 'hyperframes') === 'hyperframes') {
            try {
              await renderViaHyperframes(parsed.script, outputDir, videoPath, posterPath);
              sendJson(res, 200, {
                videoUrl: `/generated/yingdao-auto-remix-demo.mp4?t=${Date.now()}`,
                posterUrl: `/generated/yingdao-auto-remix-demo.jpg?t=${Date.now()}`,
                outputPath: videoPath,
                adapter: 'hyperframes',
                durationSeconds: 5.3,
                composition: 'short-video-demo',
              });
              return;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              console.warn('[/api/video/render] hyperframes failed → fallback ffmpeg:', msg);
              // 继续到下方 ffmpeg 路径(WIP 代码,作为降级方案)
            }
          }

          // === ffmpeg drawbox 路径(快速 fallback / 调试用,WIP 代码全部保留)===
          const { durationSeconds, timeline } = buildTimeline(parsed.script);

          await mkdir(outputDir, { recursive: true });

          // 紫色 gradients 底图 + 按 timeline 动态生成镜头切换 drawbox
          //   每个 scene.id 映射到不同视觉:hook 白色标题框 / demo 黑色演示框 + 加载条 / cta 紫色按钮框
          //   缺省(无 script)时 fallback 到 0.3-3 / 3.5-8 / 8.5-12 三段
          // 说明：ffmpeg 未编译 libfreetype, drawtext 不可用;暂以 drawbox 占位
          const vf = [
            'format=yuv420p',
            // 顶部紫色品牌横条
            'drawbox=x=0:y=0:w=iw:h=80:color=0x6D28D9@0.9:t=fill',
            // 各场景 drawbox(根据 scene.id 决定形状)
            ...timeline.flatMap(boxesForScene),
            // 底部进度条
            `drawbox=x=0:y=ih-220:w=iw*t/${durationSeconds}:h=6:color=0xA78BFA:t=fill`,
            // 底部字幕安全区
            'drawbox=x=0:y=ih-160:w=iw:h=4:color=0xA78BFA@0.9:t=fill',
            'drawbox=x=0:y=ih-156:w=iw:h=156:color=black@0.45:t=fill',
          ].join(',');

          await runFfmpeg([
            '-y',
            '-f', 'lavfi',
            '-i', `gradients=size=1080x1920:duration=${durationSeconds}:rate=30:speed=0.12:c0=0x2E1065:c1=0x6D28D9:c2=0xA78BFA:c3=0x4C1D95:n=4`,
            '-vf', vf,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-t', String(durationSeconds),
            videoPath,
          ]);

          // 抽 1 秒处一帧做封面
          await runFfmpeg([
            '-y',
            '-ss', '00:00:01',
            '-i', videoPath,
            '-frames:v', '1',
            '-q:v', '3',
            posterPath,
          ]);

          sendJson(res, 200, {
            videoUrl: `/generated/yingdao-auto-remix-demo.mp4?t=${Date.now()}`,
            posterUrl: `/generated/yingdao-auto-remix-demo.jpg?t=${Date.now()}`,
            outputPath: videoPath,
            adapter: 'ffmpeg-local',
            durationSeconds,
            sceneTimeline: timeline,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), centaurRuntimeApiPlugin(env), videoRenderApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5180,
    },
  };
});

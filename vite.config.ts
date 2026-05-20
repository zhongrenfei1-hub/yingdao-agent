import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import Busboy from 'busboy';
import * as cheerio from 'cheerio';

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

// === ScriptJson 输入接口 ===
//   由上游 short-video-script-writer 输出 → POST /api/video/render 消费
interface SceneInput {
  id?: string;
  duration?: number;
  caption?: string;
}

interface ScriptInput {
  duration?: number;
  scenes?: SceneInput[];
  title?: string;
  hook?: string;
  platform?: string;
  cta?: string;
}

// === HyperFrames 视频渲染管线(stage-12:已退役 ffmpeg drawbox)===
//   走 compositions/short-video-demo,真带文字带 GSAP 动画的 mp4
//   ffmpeg 残留作用:hyperframes 完成后用 runFfmpeg 抽帧做封面

const HF_VERSION = '0.6.12';
const HF_PITCH_COMPOSITION = path.resolve(__dirname, 'compositions/short-video-pitch');
const HF_REMIX_COMPOSITION = path.resolve(__dirname, 'compositions/local-asset-remix');
const REMIX_ASSETS_UPLOADS = path.resolve(HF_REMIX_COMPOSITION, 'assets/uploads');

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
  const [title1, title2] = splitTitleTwoLines(script.title ?? D.title1);
  const firstScene = script.scenes?.[0];
  return {
    badge: D.badge,
    eyebrow: (script.platform || script.hook?.slice(0, 24) || D.eyebrow).trim(),
    title1: title1 || D.title1,
    title2: title2 || D.title2,
    desc: (script.hook || firstScene?.caption || D.desc).trim(),
    cta: (script.cta || D.cta).trim(),
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
  assetPaths: string[] | undefined,
  outputDir: string,
  videoPath: string,
  posterPath: string,
): Promise<{ composition: 'short-video-pitch' | 'local-asset-remix'; durationSeconds: number }> {
  const useRemix = Array.isArray(assetPaths) && assetPaths.length > 0;
  await mkdir(outputDir, { recursive: true });

  let variables: Record<string, string>;
  let cwd: string;
  let composition: 'short-video-pitch' | 'local-asset-remix';
  let durationSeconds: number;

  if (useRemix) {
    composition = 'local-asset-remix';
    cwd = HF_REMIX_COMPOSITION;
    durationSeconds = 8;
    const captions = scriptToRemixCaptions(script);
    // 3 clip 槽位:用户传 < 3 则后面槽位 fallback 到 demo clip-N.mp4
    const fallback = ['./assets/clip-1.mp4', './assets/clip-2.mp4', './assets/clip-3.mp4'];
    variables = {
      c1Url: assetPaths![0] ?? fallback[0],
      c2Url: assetPaths![1] ?? fallback[1],
      c3Url: assetPaths![2] ?? fallback[2],
      c1Caption: captions[0],
      c2Caption: captions[1],
      c3Caption: captions[2],
      outroTitle: captions[3],
      outroCta: script?.cta ?? '等你审核 → 发布',
      accent: '#7c3aed',
    };
  } else {
    composition = 'short-video-pitch';
    cwd = HF_PITCH_COMPOSITION;
    durationSeconds = 5.3;
    variables = scriptToHyperframesVariables(script);
  }

  await runHyperframes(
    [
      '--yes',
      `hyperframes@${HF_VERSION}`,
      'render',
      '--variables', JSON.stringify(variables),
      '--output', videoPath,
      '--quality', 'draft',
    ],
    cwd,
  );

  try {
    await runFfmpeg([
      '-y', '-ss', '00:00:01', '-i', videoPath,
      '-frames:v', '1', '-q:v', '3', posterPath,
    ]);
  } catch {
    /* 封面失败不阻塞,前端会用默认 poster */
  }

  return { composition, durationSeconds };
}

function scriptToRemixCaptions(script: ScriptInput | undefined): [string, string, string, string] {
  const scenes = script?.scenes ?? [];
  return [
    scenes[0]?.caption ?? script?.hook ?? '开头 3 秒钩住眼球',
    scenes[1]?.caption ?? '中段讲清楚为什么',
    scenes[2]?.caption ?? '最后召唤行动',
    script?.title ?? '影刀 · 自动混剪完成',
  ];
}

// 文件名安全化:只保留中英数 + . _ -,扩展名白名单
const ASSET_EXT_WHITELIST = new Set(['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp']);
function sanitizeFilename(name: string): string | null {
  const ext = path.extname(name).toLowerCase();
  if (!ASSET_EXT_WHITELIST.has(ext)) return null;
  const stem = path
    .basename(name, path.extname(name))
    .replace(/[^\w一-龥\-]/g, '_')
    .slice(0, 64);
  if (!stem) return null;
  return stem + ext;
}

function assetUploadApiPlugin(): Plugin {
  return {
    name: 'yingdao-asset-upload-api',
    configureServer(server) {
      server.middlewares.use('/api/assets/upload', (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        const contentType = req.headers['content-type'] ?? '';
        if (!contentType.startsWith('multipart/form-data')) {
          sendJson(res, 400, { error: 'Expected multipart/form-data' });
          return;
        }

        const sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const sessionDir = path.join(REMIX_ASSETS_UPLOADS, sid);
        const writes: Promise<void>[] = [];
        const paths: string[] = [];
        const errors: string[] = [];

        const bb = Busboy({
          headers: req.headers,
          limits: { files: 6, fileSize: 50 * 1024 * 1024 },
        });

        bb.on('file', (_field, file, info) => {
          const safe = sanitizeFilename(info.filename ?? '');
          if (!safe) {
            errors.push(`不支持的文件:${info.filename}`);
            file.resume();
            return;
          }
          const idx = paths.length;
          const target = path.join(sessionDir, `${String(idx + 1).padStart(2, '0')}-${safe}`);
          // 收集 chunks 后写入
          const chunks: Buffer[] = [];
          file.on('data', (c: Buffer) => chunks.push(c));
          file.on('limit', () => errors.push(`${info.filename} 超过 50MB 限制`));
          file.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const writePromise = mkdir(sessionDir, { recursive: true })
              .then(() => writeFile(target, buffer))
              .then(() => {
                paths.push(`./assets/uploads/${sid}/${path.basename(target)}`);
              })
              .catch((err) => {
                errors.push(`写入失败:${err instanceof Error ? err.message : String(err)}`);
              });
            writes.push(writePromise);
          });
        });

        bb.on('finish', async () => {
          await Promise.all(writes);
          if (paths.length === 0) {
            sendJson(res, 400, { error: '未收到有效文件', detail: errors });
            return;
          }
          sendJson(res, 200, { sid, paths, warnings: errors.length ? errors : undefined });
        });

        bb.on('error', (err) => {
          sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
        });

        req.pipe(bb);
      });
    },
  };
}

// === Bing 图片搜索 scrape(给公众号文章配图)===
//   纯 HTTP + cheerio,Bing iusc 元素的 `m` 属性是一个 JSON 字符串,带 murl(原图)+ turl(缩略图)+ purl(来源页)
interface ScrapedImage {
  url: string;          // 原图
  thumb: string;        // 缩略图
  source: string;       // 来源页
  title: string;
  width?: number;
  height?: number;
}

async function scrapeBingImages(query: string, limit = 24): Promise<ScrapedImage[]> {
  const q = encodeURIComponent(query);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const resp = await fetch(`https://www.bing.com/images/search?q=${q}&form=HDRSC2`, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Bing HTTP ${resp.status}`);
    const html = await resp.text();
    const $ = cheerio.load(html);
    const out: ScrapedImage[] = [];
    $('a.iusc').each((_, el) => {
      if (out.length >= limit) return;
      const m = $(el).attr('m');
      if (!m) return;
      try {
        const data = JSON.parse(m) as {
          murl?: string;
          turl?: string;
          purl?: string;
          t?: string;
        };
        const turl = data.turl ?? '';
        const murl = data.murl ?? '';
        if (!murl) return;
        // 尺寸从兄弟元素的 data-* 拿
        const sizeAttr = $(el).find('.img_info .nowrap').first().text().trim();
        const sizeMatch = sizeAttr.match(/(\d+)\s*[x×]\s*(\d+)/);
        out.push({
          url: murl,
          thumb: turl || murl,
          source: data.purl ?? '',
          title: (data.t ?? '').replace(/<[^>]+>/g, '').trim(),
          width: sizeMatch ? parseInt(sizeMatch[1], 10) : undefined,
          height: sizeMatch ? parseInt(sizeMatch[2], 10) : undefined,
        });
      } catch {
        /* 跳过解析失败的条目 */
      }
    });
    return out;
  } finally {
    clearTimeout(timer);
  }
}

function imageScrapeApiPlugin(): Plugin {
  return {
    name: 'yingdao-image-scrape-api',
    configureServer(server) {
      server.middlewares.use('/api/scrape/images', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const url = new URL(req.url ?? '/', 'http://localhost');
          const query = (url.searchParams.get('q') ?? '').trim();
          const limit = Math.min(Number(url.searchParams.get('limit') ?? 24), 50);
          if (!query) {
            sendJson(res, 400, { error: 'q 参数必填' });
            return;
          }
          const images = await scrapeBingImages(query, limit);
          sendJson(res, 200, { query, count: images.length, images });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          sendJson(res, 500, { error: msg });
        }
      });
    },
  };
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
          const body = await readRequestBody(req);
          let parsed: { script?: ScriptInput; assetPaths?: string[] } = {};
          if (body.trim()) {
            try { parsed = JSON.parse(body) as typeof parsed; } catch { /* fall through */ }
          }

          try {
            const result = await renderViaHyperframes(
              parsed.script,
              parsed.assetPaths,
              outputDir,
              videoPath,
              posterPath,
            );
            sendJson(res, 200, {
              videoUrl: `/generated/yingdao-auto-remix-demo.mp4?t=${Date.now()}`,
              posterUrl: `/generated/yingdao-auto-remix-demo.jpg?t=${Date.now()}`,
              outputPath: videoPath,
              adapter: 'hyperframes',
              durationSeconds: result.durationSeconds,
              composition: result.composition,
            });
            return;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[/api/video/render] hyperframes 失败:', msg);
            sendJson(res, 500, {
              error: 'hyperframes 渲染失败',
              detail: msg,
              hint: '首次启动需 1-2 分钟拉 Chrome;或确认 composition 存在且 lint 通过',
            });
            return;
          }

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
    plugins: [react(), centaurRuntimeApiPlugin(env), assetUploadApiPlugin(), imageScrapeApiPlugin(), videoRenderApiPlugin()],
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

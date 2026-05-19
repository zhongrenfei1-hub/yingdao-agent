/**
 * 用户在浏览器里直接填的 OpenAI-compat 端点配置
 *
 * - 存到 localStorage(影刀是 self-hosted 本地工作台,key 在自己机器上)
 * - 客户端 fetch 调 LLM,不走 vite middleware proxy
 * - 配了 customRuntime 后,ai-client 优先用它,demo / .env 路径作为 fallback
 */

export interface CustomRuntime {
  baseUrl: string;        // e.g. https://api.openai.com/v1 / https://api.deepseek.com/v1
  apiKey: string;
  model: string;          // e.g. gpt-4o-mini / deepseek-chat / claude-opus-4-7
  label?: string;         // 可选展示名
  updatedAt: string;
}

const STORAGE_KEY = 'centaur_loop_custom_runtime';
const CHANGE_EVENT = 'centaur-custom-runtime-change';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadCustomRuntime(): CustomRuntime | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CustomRuntime>;
    if (!parsed.baseUrl || !parsed.apiKey || !parsed.model) return null;
    return {
      baseUrl: String(parsed.baseUrl).trim().replace(/\/$/, ''),
      apiKey: String(parsed.apiKey),
      model: String(parsed.model).trim(),
      label: parsed.label ? String(parsed.label) : undefined,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveCustomRuntime(r: Omit<CustomRuntime, 'updatedAt'>): CustomRuntime {
  const full: CustomRuntime = {
    baseUrl: r.baseUrl.trim().replace(/\/$/, ''),
    apiKey: r.apiKey.trim(),
    model: r.model.trim(),
    label: r.label?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: full }));
  }
  return full;
}

export function clearCustomRuntime(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: null }));
}

export function onCustomRuntimeChange(handler: (r: CustomRuntime | null) => void): () => void {
  if (!isBrowser()) return () => undefined;
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail as CustomRuntime | null;
    handler(detail);
  };
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

/** 测试一下端点是否可达 + key 是否可用(GET /models 比真发 chat 更便宜) */
export async function testCustomRuntime(r: Omit<CustomRuntime, 'updatedAt'>): Promise<{
  ok: boolean;
  message: string;
  models?: string[];
}> {
  const baseUrl = r.baseUrl.trim().replace(/\/$/, '');
  if (!baseUrl || !r.apiKey || !r.model) {
    return { ok: false, message: '请填齐 Base URL / API Key / Model' };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(`${baseUrl}/models`, {
      headers: { authorization: `Bearer ${r.apiKey}` },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      return { ok: false, message: `HTTP ${resp.status}${body ? ' · ' + body.slice(0, 160) : ''}` };
    }
    const data = await resp.json().catch(() => null) as { data?: Array<{ id?: string }> } | null;
    const models = Array.isArray(data?.data)
      ? data!.data.map((m) => m.id ?? '').filter(Boolean)
      : [];
    const hit = models.length === 0 || models.includes(r.model);
    return {
      ok: true,
      message: hit
        ? `连通 ✓ 模型 ${r.model} 可用${models.length ? ` · 端点共 ${models.length} 个模型` : ''}`
        : `连通 ✓ 但模型列表里没找到 "${r.model}",可能名字拼错或要走其他端点`,
      models,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg.includes('aborted') ? '请求超时(8s)' : msg };
  }
}

/** 用 customRuntime 直接调 chat/completions,返回纯文本 */
export async function invokeCustomRuntime(prompt: string, r: CustomRuntime): Promise<string> {
  const resp = await fetch(`${r.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${r.apiKey}`,
    },
    body: JSON.stringify({
      model: r.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      stream: false,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Custom runtime HTTP ${resp.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  const data = await resp.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  } | null;
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    '';
  if (!text.trim()) throw new Error('模型未返回文本');
  return text;
}

import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, Check, ChevronDown, Cpu, Eye, EyeOff, Loader2, Plug, RefreshCw, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';
import type { RuntimeState } from '../hooks/useRuntimeStatus';
import {
  clearCustomRuntime,
  loadCustomRuntime,
  onCustomRuntimeChange,
  saveCustomRuntime,
  testCustomRuntime,
  type CustomRuntime,
} from '../adapters/customRuntime';

class FormErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; info: string }> {
  state = { error: null as Error | null, info: '' };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CustomRuntimeForm crashed]', error, info);
    this.setState({ info: info.componentStack ?? '' });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-terracotta/40 bg-terracotta/5 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-terracotta">
            <AlertCircle size={12} />
            自定义 API 表单崩了
          </p>
          <p className="mt-1 break-all text-near-black">{this.state.error.message}</p>
          {this.state.error.stack && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-stone-gray">stack</summary>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-stone-gray">
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            type="button"
            onClick={() => this.setState({ error: null, info: '' })}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-terracotta/40 bg-white px-2 py-1 text-[10px] text-terracotta hover:bg-terracotta/10"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const IRIS = '#7c3aed';

const PRESETS: Array<{ label: string; baseUrl: string; modelHint: string }> = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', modelHint: 'gpt-4o-mini' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', modelHint: 'deepseek-chat' },
  { label: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', modelHint: 'gemini-3.5-flash' },
  { label: 'Claude(Anthropic)', baseUrl: 'https://api.anthropic.com/v1', modelHint: 'claude-3-5-sonnet-latest' },
  { label: '智谱 BigModel', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelHint: 'glm-4-flash' },
  { label: '通义 DashScope', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelHint: 'qwen-plus' },
];

interface RuntimeDropdownProps {
  runtime: RuntimeState;
  floating?: boolean;
}

export default function RuntimeDropdown({ runtime, floating = false }: RuntimeDropdownProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<CustomRuntime | null>(() => loadCustomRuntime());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    return onCustomRuntimeChange((c) => setCustom(c));
  }, []);

  const customActive = Boolean(custom);
  const displayModel = customActive ? custom!.model : runtime.model;
  const displayProvider = customActive ? (custom!.label ?? '自定义 API') : runtime.provider;

  return (
    <div ref={ref} className={floating ? 'fixed bottom-4 right-4 z-[1000]' : 'relative'}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-lg backdrop-blur-md transition"
        style={
          customActive
            ? { borderColor: IRIS, background: 'rgba(124,58,237,0.10)', color: IRIS }
            : runtime.mode === 'real'
              ? { borderColor: 'rgba(122,158,126,0.3)', background: 'rgba(122,158,126,0.10)', color: '#7A9E7E' }
              : { borderColor: '#E5DDD0', background: 'rgba(255,255,255,0.95)', color: '#6B6B5E' }
        }
      >
        {customActive ? <Plug size={14} /> : <Cpu size={14} />}
        <span className="font-medium">{displayModel}</span>
        <span className="hidden text-stone-gray sm:inline">· {displayProvider}</span>
        <ChevronDown size={13} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>

      {open && (
        <div
          className={`absolute right-0 z-[1001] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-border-cream bg-white/95 p-3 text-left shadow-2xl backdrop-blur-md ${
            floating ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          <FormErrorBoundary>
            <CustomRuntimeForm current={custom} />
          </FormErrorBoundary>

          <div className="mt-3 flex items-start justify-between gap-3 border-t border-border-cream pt-3">
            <div>
              <p className="text-overline">{t('runtime.center')}</p>
              <p className="mt-1 text-sm font-semibold text-near-black">
                {customActive ? '已切到自定义 API · 下面是其他可选' : runtime.mode === 'real' ? t('runtime.real') : t('runtime.demo')}
              </p>
              <p className="mt-1 text-xs leading-5 text-olive-gray">{t('runtime.configureHint')}</p>
            </div>
            <button type="button" onClick={() => void runtime.rescan()} className="btn-ghost px-2 py-1 text-xs">
              <RefreshCw size={13} /> {t('runtime.scan')}
            </button>
          </div>

          <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {runtime.connectors.map((connector) => {
              const selected = runtime.selectedRuntimeId === connector.id;
              const connecting = runtime.connectingRuntimeId === connector.id;
              return (
                <button
                  key={connector.id}
                  type="button"
                  disabled={!connector.available || Boolean(runtime.connectingRuntimeId)}
                  onClick={async () => {
                    const connected = await runtime.selectRuntime(connector.id);
                    if (connected) setOpen(false);
                  }}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? 'border-terracotta/35 bg-terracotta/10'
                      : connector.available
                        ? 'border-border-cream bg-ivory/80 hover:border-terracotta/25'
                        : 'border-border-cream bg-warm-sand/25 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-near-black">{connector.label}</p>
                      <p className="mt-0.5 truncate text-xs text-stone-gray">{connector.model}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                      selected
                        ? 'bg-terracotta/15 text-terracotta'
                        : connector.available
                          ? 'bg-sage-green/15 text-sage-green'
                          : 'bg-warm-sand text-stone-gray'
                    }`}>
                      {connecting ? <Loader2 size={11} className="animate-spin" /> : selected && <Check size={11} />}
                      {connecting ? 'Connecting' : selected ? t('runtime.connected') : connector.available ? t('runtime.availableShort') : t('runtime.unavailableShort')}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-olive-gray">{connector.message}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomRuntimeForm({ current }: { current: CustomRuntime | null }) {
  const [baseUrl, setBaseUrl] = useState(current?.baseUrl ?? PRESETS[0].baseUrl);
  const [apiKey, setApiKey] = useState(current?.apiKey ?? '');
  const [model, setModel] = useState(current?.model ?? PRESETS[0].modelHint);
  const [label, setLabel] = useState(current?.label ?? '');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (current) {
      setBaseUrl(current.baseUrl);
      setApiKey(current.apiKey);
      setModel(current.model);
      setLabel(current.label ?? '');
    }
  }, [current]);

  const canSubmit = baseUrl.trim() && apiKey.trim() && model.trim();
  const dirty = !current
    || baseUrl.trim().replace(/\/$/, '') !== current.baseUrl
    || apiKey !== current.apiKey
    || model.trim() !== current.model
    || (label.trim() || undefined) !== current.label;

  const onTest = async () => {
    if (!canSubmit) return;
    setTesting(true);
    setFeedback(null);
    try {
      const res = await testCustomRuntime({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
        label: label.trim(),
      });
      setFeedback({ ok: res.ok, message: res.message });
    } catch (e) {
      // 防御:任何 sync throw(比如 header 构造失败 / fetch 拒收 / 浏览器 GFW)
      const msg = e instanceof Error ? e.message : String(e);
      setFeedback({ ok: false, message: `测试异常:${msg}` });
    } finally {
      setTesting(false);
    }
  };

  const onSave = () => {
    if (!canSubmit) return;
    try {
      saveCustomRuntime({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
        label: label.trim(),
      });
      setFeedback({ ok: true, message: '已保存 · 之后所有 LLM 调用走这个端点' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFeedback({ ok: false, message: `保存失败:${msg}` });
    }
  };

  const onClear = () => {
    try {
      clearCustomRuntime();
    } catch {
      /* ignore */
    }
    setApiKey('');
    setFeedback(null);
  };

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: 'rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.04)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: IRIS }}>
          <Plug size={12} />
          自定义 OpenAI-compat API
          {current && (
            <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: IRIS, color: '#fff' }}>
              已启用
            </span>
          )}
        </p>
        {current && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-stone-gray hover:text-terracotta"
          >
            <Trash2 size={10} />
            清除
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setBaseUrl(p.baseUrl);
              setModel(p.modelHint);
              setFeedback(null);
            }}
            className="rounded-md border border-border-cream bg-white/70 px-2 py-1 text-left text-[10px] text-olive-gray hover:border-iris-300"
            style={{ borderColor: baseUrl === p.baseUrl ? IRIS : undefined }}
          >
            <span className="block font-medium text-near-black">{p.label}</span>
            <span className="block truncate text-stone-gray">{p.baseUrl}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 space-y-1.5">
        <Input label="Base URL" value={baseUrl} onChange={setBaseUrl} placeholder="https://api.openai.com/v1" />
        <div className="relative">
          <Input
            label="API Key"
            value={apiKey}
            onChange={setApiKey}
            placeholder="sk-..."
            type={showKey ? 'text' : 'password'}
            rightPad
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-1.5 top-[22px] rounded p-1 text-stone-gray hover:text-near-black"
            tabIndex={-1}
          >
            {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <Input label="Model" value={model} onChange={setModel} placeholder="gpt-4o-mini" />
        <Input label="标签(可选)" value={label} onChange={setLabel} placeholder="my-deepseek / hermes" />
      </div>

      {feedback && (
        <pre
          className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-md px-2 py-1 font-sans text-[11px] leading-5"
          style={{
            background: feedback.ok ? 'rgba(122,158,126,0.12)' : 'rgba(192,117,90,0.12)',
            color: feedback.ok ? '#5b7a5e' : '#a85a3f',
          }}
        >
          {feedback.message}
        </pre>
      )}

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={onTest}
          disabled={!canSubmit || testing}
          className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-[11px] text-near-black transition hover:bg-warm-sand/40 disabled:opacity-50"
          style={{ borderColor: 'rgba(124,58,237,0.3)' }}
        >
          {testing ? <Loader2 size={11} className="animate-spin" /> : <Plug size={11} />}
          测试连接
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSubmit || !dirty}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] text-white transition disabled:opacity-50"
          style={{ background: IRIS }}
        >
          <Check size={11} />
          {current ? '保存修改' : '保存并启用'}
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  rightPad,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  rightPad?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wide text-stone-gray">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-0.5 w-full rounded-md border border-border-cream bg-white px-2 py-1 text-xs text-near-black outline-none placeholder:text-stone-gray ${
          rightPad ? 'pr-7' : ''
        }`}
        style={{
          borderColor: 'rgba(124,58,237,0.18)',
        }}
        spellCheck={false}
        autoComplete="off"
      />
    </label>
  );
}

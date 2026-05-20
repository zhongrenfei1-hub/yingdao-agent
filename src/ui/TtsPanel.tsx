import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Play, Square, X } from 'lucide-react';

const IRIS = '#7c3aed';

interface Voice {
  id: string;
  label: string;
  hint: string;
}

// Edge TTS 中文 neural voice 子集(微软公开 voice 列表,常用)
const ZH_VOICES: Voice[] = [
  { id: 'zh-CN-XiaoxiaoNeural', label: '晓晓 · 女', hint: '亲切活泼 · 默认' },
  { id: 'zh-CN-XiaoyiNeural', label: '晓伊 · 女', hint: '清新干练' },
  { id: 'zh-CN-YunyangNeural', label: '云扬 · 男', hint: '阳光新闻风' },
  { id: 'zh-CN-YunxiNeural', label: '云希 · 男', hint: '少年感' },
  { id: 'zh-CN-YunjianNeural', label: '云健 · 男', hint: '体育解说感' },
  { id: 'zh-CN-XiaomengNeural', label: '晓梦 · 女', hint: '童真' },
  { id: 'zh-CN-liaoning-XiaobeiNeural', label: '晓贝 · 女', hint: '辽宁方言' },
  { id: 'zh-HK-HiuMaanNeural', label: '晓敏 · 女', hint: '粤语' },
];

const DEMO_SAMPLES = [
  '影刀,本地跑的 AI 产品经理,一键出 9:16 短视频。',
  '欢迎来到影刀,我帮你 4 步出片:写脚本、AI 提示词、混剪、发布包。',
];

/**
 * 试听浮按 · 右下角紫色"试听"按钮
 * 点开 → 选 voice → 输入文案 → 调 /api/tts/edge → 播放
 * 试听满意可"保存为默认"(写 localStorage,后续渲染 short-video-pitch
 * 用这个 voice;读取在 YINGDAO_TTS_VOICE env 之后做)
 */
export default function TtsPanel({ floating = true }: { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const [voice, setVoice] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('yingdao_tts_voice') ?? ZH_VOICES[0].id;
    }
    return ZH_VOICES[0].id;
  });
  const [text, setText] = useState(DEMO_SAMPLES[0]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', handle);
    return () => window.removeEventListener('pointerdown', handle);
  }, [open]);

  async function synth() {
    if (loading || !text.trim()) return;
    setLoading(true);
    setError(null);
    setAudioUrl(null);
    try {
      const resp = await fetch('/api/tts/edge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), voice }),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}${body ? `:${body.slice(0, 160)}` : ''}`);
      }
      const data = (await resp.json()) as { audioUrl: string };
      setAudioUrl(data.audioUrl);
      // 自动播放
      setTimeout(() => {
        audioRef.current?.play().catch(() => undefined);
      }, 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function saveDefault() {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('yingdao_tts_voice', voice);
  }

  return (
    <div ref={ref} className={floating ? 'fixed bottom-4 right-[280px] z-[1000]' : 'relative'} translate="no">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="lift-hover inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] shadow-lg backdrop-blur-md"
        style={{
          borderColor: 'rgba(124,58,237,0.3)',
          background: 'rgba(255,255,255,0.95)',
          color: IRIS,
        }}
      >
        <Mic size={13} />
        <span>tts</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 w-[min(420px,calc(100vw-2rem))] rounded-2xl border bg-white/95 p-3 shadow-2xl backdrop-blur-md"
          style={{ borderColor: 'rgba(124,58,237,0.2)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: IRIS }}>
              <Mic size={12} />
              Edge TTS 试听 · 中文 neural voice
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-stone-gray hover:text-near-black"
            >
              <X size={12} />
            </button>
          </div>

          <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-gray">选 voice</p>
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            {ZH_VOICES.map((v) => {
              const active = v.id === voice;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoice(v.id)}
                  className="rounded-md border bg-white px-2 py-1.5 text-left text-[10px] transition"
                  style={{
                    borderColor: active ? IRIS : 'rgba(124,58,237,0.15)',
                    background: active ? 'rgba(124,58,237,0.08)' : '#fff',
                  }}
                >
                  <span className="block font-medium text-near-black">{v.label}</span>
                  <span className="block truncate text-stone-gray">{v.hint}</span>
                </button>
              );
            })}
          </div>

          <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-gray">试听文案</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full resize-none rounded-md border bg-white px-2 py-1.5 text-xs text-near-black outline-none focus:border-iris-400"
            style={{ borderColor: 'rgba(124,58,237,0.2)' }}
            spellCheck={false}
          />
          <div className="mb-2 flex items-center justify-between text-[10px] text-stone-gray">
            <div className="flex gap-2">
              {DEMO_SAMPLES.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setText(s)}
                  className="text-iris-600 underline-offset-2 hover:underline"
                  style={{ color: IRIS }}
                >
                  例 {i + 1}
                </button>
              ))}
            </div>
            <span>{text.length} / 300</span>
          </div>

          {error && (
            <p className="mb-2 rounded-md bg-terracotta/10 px-2 py-1 text-[11px] text-terracotta">{error}</p>
          )}

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="mb-2 w-full"
              style={{ height: 32 }}
            />
          )}

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void synth()}
              disabled={!text.trim() || loading}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[11px] text-white disabled:opacity-50"
              style={{ background: IRIS }}
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              合成并试听
            </button>
            {audioUrl && (
              <button
                type="button"
                onClick={() => audioRef.current?.pause()}
                className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-[11px] text-stone-gray hover:text-near-black"
                style={{ borderColor: 'rgba(124,58,237,0.2)' }}
              >
                <Square size={11} />
                停
              </button>
            )}
            <button
              type="button"
              onClick={saveDefault}
              className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-[11px] text-near-black hover:bg-warm-sand/40"
              style={{ borderColor: 'rgba(124,58,237,0.2)' }}
            >
              保存为默认
            </button>
          </div>

          <p className="mt-2 text-[10px] leading-5 text-stone-gray">
            "保存为默认"写到 localStorage,后续渲染 short-video-pitch composition
            会用这个 voice(需要 docker 容器设 YINGDAO_TTS_VOICE env 才真生效;
            浮按这里主要是给你挑声音听效果)。
          </p>
        </div>
      )}
    </div>
  );
}

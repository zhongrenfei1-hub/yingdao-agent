import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Image as ImageIcon, Loader2, Search, X } from 'lucide-react';

const IRIS = '#7c3aed';

interface ScrapedImage {
  url: string;
  thumb: string;
  source: string;
  title: string;
  width?: number;
  height?: number;
}

interface ScrapeResponse {
  query: string;
  count: number;
  images: ScrapedImage[];
}

/**
 * 文章配图爬虫面板:输入关键词 → 调 /api/scrape/images → 显示图片网格 → 点图片复制 URL
 * 浮动在右下角,跟 RuntimeDropdown 并列。
 */
export default function ImageScrapePanel({ floating = true }: { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ScrapedImage[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', handle);
    return () => window.removeEventListener('pointerdown', handle);
  }, [open]);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setImages([]);
    try {
      const resp = await fetch(`/api/scrape/images?q=${encodeURIComponent(q)}&limit=24`);
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}${body ? `:${body.slice(0, 120)}` : ''}`);
      }
      const data = (await resp.json()) as ScrapeResponse;
      setImages(data.images);
      if (data.images.length === 0) setError('没找到图片,换个关键词试试');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  const copyUrl = useCallback(async (url: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div ref={ref} className={floating ? 'fixed bottom-4 right-[180px] z-[1000]' : 'relative'} translate="no">
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
        <ImageIcon size={13} />
        <span>image</span>
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 z-[1001] w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-border-cream bg-white/95 p-3 shadow-2xl backdrop-blur-md"
          style={{ borderColor: 'rgba(124,58,237,0.2)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: IRIS }}>
              <ImageIcon size={12} />
              文章配图搜索
              <span className="ml-1 rounded-full bg-warm-sand/60 px-1.5 py-0.5 text-[10px] font-normal text-stone-gray">
                Bing 图片
              </span>
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-stone-gray hover:text-near-black"
            >
              <X size={12} />
            </button>
          </div>

          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-gray"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void search();
                }}
                placeholder="关键词,比如 咖啡 / 创业 / 工作台"
                className="w-full rounded-md border bg-white pl-7 pr-2 py-1.5 text-xs text-near-black outline-none placeholder:text-stone-gray"
                style={{ borderColor: 'rgba(124,58,237,0.2)' }}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              onClick={() => void search()}
              disabled={!query.trim() || loading}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-[11px] text-white disabled:opacity-50"
              style={{ background: IRIS }}
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
              搜
            </button>
          </div>

          {error && (
            <p className="mt-2 rounded-md bg-terracotta/10 px-2 py-1 text-[11px] text-terracotta">{error}</p>
          )}

          {images.length > 0 && (
            <>
              <p className="mt-2 text-[10px] text-stone-gray">
                共 {images.length} 张 · 点缩略图复制原图 URL 到剪贴板,点 ↗ 跳来源页
              </p>
              <div className="mt-1.5 grid max-h-[400px] grid-cols-3 gap-1.5 overflow-y-auto pr-1">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="group relative overflow-hidden rounded-md border bg-warm-sand/30"
                    style={{ borderColor: 'rgba(124,58,237,0.12)', aspectRatio: '1' }}
                  >
                    <img
                      src={img.thumb}
                      alt={img.title}
                      title={img.title}
                      loading="lazy"
                      className="h-full w-full cursor-pointer object-cover transition group-hover:scale-105"
                      onClick={() => void copyUrl(img.url, i)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                    {copiedIdx === i && (
                      <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center backdrop-blur-sm"
                        style={{ background: 'rgba(124,58,237,0.75)' }}
                      >
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-white">
                          <Check size={11} />
                          URL 已复制
                        </span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 opacity-0 transition group-hover:opacity-100">
                      <span className="text-[9px] text-white">
                        {img.width && img.height ? `${img.width}×${img.height}` : ''}
                      </span>
                      {img.source && (
                        <a
                          href={img.source}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="pointer-events-auto rounded p-0.5 text-white hover:bg-white/20"
                          title="跳来源页"
                        >
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void copyUrl(img.url, i);
                      }}
                      className="pointer-events-auto absolute right-1 top-1 rounded p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                      title="复制原图 URL"
                    >
                      <Copy size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !error && images.length === 0 && (
            <p className="mt-3 rounded-md border border-dashed border-iris-200 px-2 py-3 text-center text-[11px] text-stone-gray" style={{ borderColor: 'rgba(124,58,237,0.18)' }}>
              输关键词 → 回车 / 点搜 → 出图。点图片复制 URL 直接粘到公众号编辑器。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { Sparkles } from 'lucide-react';

export default function HeroBanner() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-amber-800">
          <Sparkles size={14} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            想跑一个真 9:16 的视频?
          </p>
          <p className="truncate text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
            访谈 → 混剪 → 多平台发布,本地直出 mp4
          </p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-2 text-xs font-medium transition hover:opacity-90"
        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
      >
        立即开始 →
      </button>
    </div>
  );
}

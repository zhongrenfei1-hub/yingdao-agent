import {
  FolderOpen,
  Layers,
  MapPin,
  MessagesSquare,
  Mic2,
  Rocket,
  Smartphone,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { ReactNode } from 'react';

const IRIS = '#7c3aed';

export default function HeroBanner() {
  return (
    <section className="mb-4 flex flex-col gap-3">
      <PromoBanner />
      <FunctionGrid
        title="内容交易"
        accent={IRIS}
        items={[
          { icon: <Rocket size={20} />, label: '快速制作', tint: '#dbeafe', fg: '#1d4ed8' },
          { icon: <Layers size={20} />, label: '素材管理', tint: '#fef3c7', fg: '#b45309' },
          { icon: <MapPin size={20} />, label: 'AI 打卡', tint: '#d1fae5', fg: '#047857' },
          { icon: <FolderOpen size={20} />, label: '我的项目', tint: '#ede9fe', fg: '#6d28d9' },
        ]}
      />
      <FunctionGrid
        title="AI Agent"
        accent={IRIS}
        items={[
          { icon: <MessagesSquare size={20} />, label: 'Loop 工作台', tint: '#fce7f3', fg: '#be185d' },
          { icon: <Wand2 size={20} />, label: '批量混剪', tint: '#dbeafe', fg: '#1d4ed8' },
          { icon: <Mic2 size={20} />, label: 'TTS 配音', tint: '#ffedd5', fg: '#c2410c' },
          { icon: <Smartphone size={20} />, label: '平台适配', tint: '#f1f5f9', fg: '#475569' },
        ]}
      />
    </section>
  );
}

function PromoBanner() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200/80"
          style={{ color: '#b45309' }}
        >
          <Sparkles size={14} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-near-black">想跑一个真 9:16 的视频?</p>
          <p className="truncate text-[11px] text-olive-gray">访谈 → 混剪 → 多平台发布,本地直出 mp4</p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-near-black px-3.5 py-2 text-xs font-medium text-ivory transition hover:opacity-90"
      >
        立即开始 →
      </button>
    </div>
  );
}

function FunctionGrid({
  title,
  accent,
  items,
}: {
  title: string;
  accent: string;
  items: { icon: ReactNode; label: string; tint: string; fg: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border-cream bg-white px-4 py-4">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-3 w-0.5 rounded-full" style={{ background: accent }} />
        <h2 className="text-[13px] font-medium text-near-black">{title}</h2>
      </div>
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            className="group flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition hover:bg-stone-50"
          >
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:-translate-y-0.5 group-hover:shadow-sm"
              style={{ background: it.tint, color: it.fg }}
            >
              {it.icon}
            </span>
            <span className="text-[12px] text-near-black">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


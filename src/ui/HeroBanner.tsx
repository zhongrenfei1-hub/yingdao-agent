import { Layers, MessagesSquare, Package, Rocket } from 'lucide-react';

const IRIS = '#7c3aed';

/**
 * 影刀产品首屏 hero banner
 *
 * 风格参考火花 / aitoearn.ai 的 sections + 现代浅色渐变 + 大字 hero。
 * 用影刀自己的 iris 紫色板,不引入新色。
 */
export default function HeroBanner() {
  return (
    <section
      className="relative mb-4 overflow-hidden rounded-3xl border border-border-cream backdrop-blur-sm"
      style={{
        background:
          'linear-gradient(135deg, #faf5ff 0%, #f3eaff 35%, #ede0ff 70%, #f9f6ff 100%)',
        borderColor: 'rgba(124,58,237,0.18)',
      }}
    >
      {/* 紫色光晕 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.35), transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.25), transparent)' }}
      />

      <div className="relative px-5 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
              style={{
                background: 'rgba(124,58,237,0.12)',
                color: IRIS,
                border: '1px solid rgba(124,58,237,0.25)',
              }}
            >
              影刀 · Yingdao Agent · v0.1.0
            </span>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-near-black md:text-3xl">
              本地跑的 <span style={{ color: IRIS }}>AI 产品经理</span>,
              <br className="hidden md:inline" />
              帮你出真 9:16 短视频 + 多平台发布包
            </h1>
            <p className="mt-2 text-sm leading-6 text-olive-gray">
              先访谈搞清楚需求 → 真用本地素材混剪 → 出 mp4 + 抖音 / TikTok / 小红书发布包。
              <br className="hidden md:inline" />
              不是 SaaS · 不上传素材 · Docker 一行起服。
            </p>
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-2">
            <FeatureCard icon={<Rocket size={14} />} label="快速制作" hint="一屏 4 步出片" />
            <FeatureCard icon={<MessagesSquare size={14} />} label="Loop 工作台" hint="PM 访谈 → 自动 cycle" />
            <FeatureCard icon={<Package size={14} />} label="发布包" hint="3 平台 × A/B 文案" />
            <FeatureCard icon={<Layers size={14} />} label="本地素材" hint="拖入 mp4 真接入混剪" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border bg-white/70 px-3 py-2 transition hover:-translate-y-0.5 hover:shadow-sm"
      style={{ borderColor: 'rgba(124,58,237,0.18)' }}
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm"
        style={{ background: IRIS, color: '#fff' }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-near-black">{label}</p>
        <p className="truncate text-[10px] text-stone-gray">{hint}</p>
      </div>
    </div>
  );
}

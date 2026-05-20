import { Layers, MessagesSquare, Package, Rocket } from 'lucide-react';

const IRIS = '#7c3aed';

/**
 * 影刀产品首屏 hero · stage-65 重做
 * Vibe:极简 / 高级 / 未来主义 / 锐利字 / 微动画
 */
export default function HeroBanner() {
  return (
    <section
      className="relative mb-5 overflow-hidden rounded-3xl border bg-white/40 backdrop-blur-sm"
      style={{ borderColor: 'rgba(124,58,237,0.16)' }}
    >
      {/* 紫色光晕 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.4), transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.28), transparent)' }}
      />
      {/* 细网格 dot pattern · 未来感 */}
      <div aria-hidden className="grain-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative px-6 py-8 md:px-9 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]"
                style={{
                  background: 'rgba(124,58,237,0.10)',
                  color: IRIS,
                  borderColor: 'rgba(124,58,237,0.30)',
                }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: IRIS, boxShadow: `0 0 8px ${IRIS}` }} />
                Yingdao Agent / v0.1.0
              </span>
            </div>

            <h1 className="text-sharp mt-4 text-[2.2rem] leading-[1.05] text-near-black md:text-[2.75rem]">
              本地跑的<span style={{ color: IRIS }}> AI 产品经理</span>,
              <br />
              一句话出真<span className="num-stat" style={{ color: IRIS }}>9 : 16</span>短视频
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-olive-gray">
              先访谈搞清楚需求 · 真用本地素材混剪 · 出 mp4 + 抖音 / TikTok / 小红书发布包。<br />
              不是 SaaS · 不上传素材 · <span className="font-mono text-[12px] text-near-black">docker compose up -d</span>
            </p>

            {/* 数字 stat 横排 · monospace + tabular-nums + 锐利 */}
            <div className="mt-6 grid max-w-md grid-cols-4 gap-3">
              <Stat value="40" suffix="+" label="commits" />
              <Stat value="8" suffix="" label="smoke" />
              <Stat value="11" suffix="" label="unit" />
              <Stat value="6" suffix="" label="platforms" />
            </div>
          </div>

          {/* 4 能力卡 · 紧凑 + lift hover */}
          <div className="grid w-full max-w-md grid-cols-2 gap-2">
            <FeatureCard icon={<Rocket size={14} />} label="快速制作" hint="一屏 4 步出片" />
            <FeatureCard icon={<MessagesSquare size={14} />} label="Loop 工作台" hint="PM 访谈 → cycle" />
            <FeatureCard icon={<Package size={14} />} label="发布包" hint="6 平台 × A/B" />
            <FeatureCard icon={<Layers size={14} />} label="本地素材" hint="拖入 → 真混剪" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  suffix,
  label,
}: {
  value: string;
  suffix: string;
  label: string;
}) {
  return (
    <div className="border-l-2 pl-3" style={{ borderColor: 'rgba(124,58,237,0.4)' }}>
      <p className="num-stat text-2xl font-semibold leading-none text-near-black">
        {value}
        <span className="text-iris-500" style={{ color: IRIS }}>{suffix}</span>
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-stone-gray">
        {label}
      </p>
    </div>
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
      className="lift-hover flex items-center gap-2 rounded-xl border bg-white/75 px-3 py-2"
      style={{ borderColor: 'rgba(124,58,237,0.18)' }}
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm"
        style={{ background: IRIS, color: '#fff' }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-near-black" style={{ letterSpacing: '-0.01em' }}>
          {label}
        </p>
        <p className="truncate font-mono text-[10px] text-stone-gray">{hint}</p>
      </div>
    </div>
  );
}

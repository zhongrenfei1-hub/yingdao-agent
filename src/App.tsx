import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLoopStore } from './core/loopStore';
import { ALL_LOOP_CONFIGS } from './core/loopConfigs';
import LoopConversationWorkbench from './ui/LoopConversationWorkbench';
import QuickMakeWorkbench from './ui/QuickMakeWorkbench';
import { I18nProvider, useI18n } from './i18n';
import { useRuntimeStatus } from './hooks/useRuntimeStatus';
import { BookOpen, Github, Languages, MessagesSquare, Rocket } from 'lucide-react';
import RuntimeDropdown from './ui/RuntimeDropdown';
import ImageScrapePanel from './ui/ImageScrapePanel';
import TtsPanel from './ui/TtsPanel';
import HeroBanner from './ui/HeroBanner';

type WorkbenchTab = 'quick' | 'loop';

function AppShell() {
  const { t, toggleLocale } = useI18n();
  const runtime = useRuntimeStatus();
  const registerLoop = useLoopStore((s) => s.registerLoop);
  const [tab, setTab] = useState<WorkbenchTab>('quick');

  useEffect(() => {
    for (const config of ALL_LOOP_CONFIGS) {
      registerLoop(config);
    }
  }, [registerLoop]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/yingdao-logo.png"
            alt="影刀"
            className="h-10 w-10 shrink-0"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(124,58,237,0.25))' }}
          />
          <div>
            <h1 className="text-lg font-bold leading-none text-near-black">影刀</h1>
            <p className="mt-0.5 text-[10px] text-stone-gray">Yingdao Agent · v0.1.0</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1">
          <a
            href="https://github.com/zhongrenfei1-hub/yingdao-agent"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-gray transition hover:bg-white/60 hover:text-near-black"
          >
            <Github size={13} /> github
          </a>
          <a
            href="https://github.com/zhongrenfei1-hub/yingdao-agent#readme"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-gray transition hover:bg-white/60 hover:text-near-black"
          >
            <BookOpen size={13} /> docs
          </a>
          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-gray transition hover:bg-white/60 hover:text-near-black"
          >
            <Languages size={13} /> {t('app.language')}
          </button>
        </nav>
      </header>

      <HeroBanner />

      {/* underline 风格 tab,不是 pill 填充 — 更现代 */}
      <div className="mb-5 flex items-center gap-1 border-b" style={{ borderColor: 'rgba(124,58,237,0.15)' }}>
        <TabButton
          active={tab === 'quick'}
          onClick={() => setTab('quick')}
          icon={<Rocket size={14} />}
          label="快速制作"
          hint="一屏 4 步出片"
        />
        <TabButton
          active={tab === 'loop'}
          onClick={() => setTab('loop')}
          icon={<MessagesSquare size={14} />}
          label="Loop 工作台"
          hint="PM 访谈 → 自动 cycle"
        />
      </div>

      {tab === 'quick' ? <QuickMakeWorkbench /> : <LoopConversationWorkbench runtime={runtime} />}

      <RuntimeDropdown runtime={runtime} floating />
      <ImageScrapePanel floating />
      <TtsPanel floating />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-3 text-sm transition-colors"
      style={{ color: active ? '#7c3aed' : '#6B6B5E', marginBottom: '-1px' }}
    >
      <span style={{ color: active ? '#7c3aed' : '#9B9B8F' }}>{icon}</span>
      <span className="font-medium" style={{ letterSpacing: active ? '-0.01em' : 0 }}>{label}</span>
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.15em] text-stone-gray sm:inline">
        / {hint}
      </span>
      {active && (
        <motion.span
          layoutId="tab-underline"
          className="absolute inset-x-2 -bottom-[2px] h-[2px]"
          style={{ background: '#7c3aed', boxShadow: '0 0 8px rgba(124,58,237,0.5)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
    </button>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}

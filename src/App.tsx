import { useEffect, useState } from 'react';
import { useLoopStore } from './core/loopStore';
import { ALL_LOOP_CONFIGS } from './core/loopConfigs';
import LoopConversationWorkbench from './ui/LoopConversationWorkbench';
import QuickMakeWorkbench from './ui/QuickMakeWorkbench';
import { I18nProvider, useI18n } from './i18n';
import { useRuntimeStatus } from './hooks/useRuntimeStatus';
import { BookOpen, Github, Languages, MessagesSquare, Rocket, SlidersHorizontal } from 'lucide-react';
import RuntimeDropdown from './ui/RuntimeDropdown';

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
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      <header className="mb-4 rounded-2xl border border-border-cream bg-white/75 px-4 py-4 backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-near-black">Centaur Loop</h1>
              <span className="badge"><SlidersHorizontal size={12} /> Chat-first Workbench</span>
            </div>
            <p className="mt-1 text-sm font-medium text-near-black">{t('app.tagline')}</p>
            <p className="mt-1 text-xs leading-5 text-olive-gray">{t('app.thesis')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a href="https://github.com/finewood2008/centaur-loop" target="_blank" rel="noreferrer" className="btn-ghost">
              <Github size={15} /> {t('app.github')}
            </a>
            <a href="https://github.com/finewood2008/centaur-loop#readme" target="_blank" rel="noreferrer" className="btn-ghost">
              <BookOpen size={15} /> {t('app.docs')}
            </a>
            <button type="button" onClick={toggleLocale} className="btn-ghost">
              <Languages size={15} /> {t('app.language')}
            </button>
          </div>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-1 rounded-2xl border border-border-cream bg-white/75 p-1 backdrop-blur-sm">
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
          hint="跟 AI 对话推进增长闭环"
        />
      </div>

      {tab === 'quick' ? <QuickMakeWorkbench /> : <LoopConversationWorkbench runtime={runtime} />}

      <RuntimeDropdown runtime={runtime} floating />
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
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? 'bg-terracotta text-white shadow-sm'
          : 'text-olive-gray hover:bg-warm-sand/40'
      }`}
    >
      <span className={active ? 'text-white' : 'text-terracotta'}>{icon}</span>
      <span className="font-medium">{label}</span>
      <span className={`hidden text-[10px] sm:inline ${active ? 'text-white/80' : 'text-stone-gray'}`}>
        · {hint}
      </span>
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

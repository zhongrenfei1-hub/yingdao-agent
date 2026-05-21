import { useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  Ellipsis,
  Github,
  Languages,
  Menu,
  MessagesSquare,
  PanelLeftClose,
  Puzzle,
  Rocket,
  Sparkles,
  Tv,
  Upload,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useLoopStore } from './core/loopStore';
import { ALL_LOOP_CONFIGS } from './core/loopConfigs';
import LoopConversationWorkbench from './ui/LoopConversationWorkbench';
import QuickMakeWorkbench from './ui/QuickMakeWorkbench';
import { I18nProvider, useI18n } from './i18n';
import { useRuntimeStatus } from './hooks/useRuntimeStatus';
import RuntimeDropdown from './ui/RuntimeDropdown';
import ImageScrapePanel from './ui/ImageScrapePanel';
import TtsPanel from './ui/TtsPanel';
import HeroBanner from './ui/HeroBanner';

type WorkbenchTab = 'quick' | 'loop';

const NAV_ITEMS: { key: WorkbenchTab | 'publish' | 'assets' | 'more'; icon: ReactNode; label: string }[] = [
  { key: 'quick', icon: <Rocket size={20} />, label: '快速制作' },
  { key: 'loop', icon: <MessagesSquare size={20} />, label: 'Loop 工作台' },
  { key: 'publish', icon: <Upload size={20} />, label: '发布包' },
  { key: 'assets', icon: <Bot size={20} />, label: 'Agent 素材' },
  { key: 'more', icon: <Ellipsis size={20} />, label: '更多' },
];

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
    <div className="flex h-screen w-full" style={{ background: 'var(--background)' }}>
      {/* 移动顶 topbar */}
      <div
        className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b px-4 md:hidden"
        style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
      >
        <a className="flex items-center gap-2" href="/">
          <img src="/yingdao-logo.png" alt="影刀" width={32} height={32} />
          <span className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            影刀
          </span>
        </a>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg transition"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* 左 sidebar (md+) */}
      <aside
        className="sticky left-0 top-0 hidden h-screen w-[240px] min-w-[240px] flex-col border-r p-3 md:flex"
        style={{ background: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}
      >
        <div className="mb-3 flex items-center justify-between px-2 py-2">
          <a className="flex items-center gap-2" href="/">
            <img src="/yingdao-logo.png" alt="影刀" width={32} height={32} />
            <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
              影刀
            </span>
          </a>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-[var(--accent)]"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="收起"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.key === tab;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === 'quick' || item.key === 'loop') setTab(item.key);
                  }}
                  className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  style={{
                    background: active ? 'var(--background)' : 'transparent',
                    color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : undefined,
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r"
                      style={{ background: 'var(--foreground)' }}
                    />
                  )}
                  <span className="flex shrink-0 items-center justify-center">{item.icon}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* sidebar 底部 */}
        <div className="shrink-0">
          <div className="pb-1">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 transition hover:bg-[var(--accent)]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <span className="flex items-center gap-2">
                <Tv size={18} style={{ color: 'var(--foreground)' }} />
                <span className="text-sm">我的频道</span>
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--sidebar-border)' }}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 transition hover:bg-[var(--accent)]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <span className="flex items-center gap-2">
                <Puzzle size={18} style={{ color: 'var(--muted-foreground)' }} />
                <span className="text-sm">Runtime</span>
              </span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {runtime.available ? 'real' : 'demo'}
              </span>
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--sidebar-border)' }}>
            <a
              href="https://github.com/zhongrenfei1-hub/yingdao-agent#readme"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
            >
              <BookOpen size={12} /> Docs
            </a>
            <a
              href="https://github.com/zhongrenfei1-hub/yingdao-agent"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
            >
              <Github size={12} /> Star
            </a>
            <button
              type="button"
              onClick={toggleLocale}
              className="ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
              aria-label="切换语言"
            >
              <Languages size={12} />
              {t('app.language')}
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col pt-14 md:pt-0">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                  {tab === 'quick' ? '快速制作' : 'Loop 工作台'}
                </h1>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {tab === 'quick'
                    ? '一屏 4 步出片 · 本地素材真接入混剪'
                    : 'PM 访谈 → 自动 cycle · 多 Loop 协作'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                >
                  <Sparkles size={11} /> Yingdao Agent · v0.1.0
                </span>
              </div>
            </header>

            <HeroBanner />

            {tab === 'quick' ? <QuickMakeWorkbench /> : <LoopConversationWorkbench runtime={runtime} />}
          </div>
        </div>
      </main>

      <RuntimeDropdown runtime={runtime} floating />
      <ImageScrapePanel floating />
      <TtsPanel floating />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}

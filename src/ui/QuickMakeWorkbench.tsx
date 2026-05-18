import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  CircleDashed,
  Loader2,
  Play,
  Rocket,
  Sparkles,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import {
  QUICK_PLATFORM_OPTIONS,
  QUICK_STEP_ORDER,
  initialQuickSteps,
  runQuickMake,
  type QuickMakeArtifacts,
  type QuickStepId,
  type QuickStepState,
} from '../core/quickMake';
import PublishPackPanel from './PublishPackPanel';

export default function QuickMakeWorkbench() {
  const [topic, setTopic] = useState('');
  const [pitch, setPitch] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['抖音', '小红书']);
  const [visualStyle, setVisualStyle] = useState('');
  const [steps, setSteps] = useState(initialQuickSteps());
  const [artifacts, setArtifacts] = useState<QuickMakeArtifacts>({});
  const [running, setRunning] = useState(false);

  const canRun = topic.trim().length > 0 && pitch.trim().length > 0 && platforms.length > 0;

  const togglePlatform = useCallback((p: string) => {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }, []);

  const reset = useCallback(() => {
    setSteps(initialQuickSteps());
    setArtifacts({});
  }, []);

  const go = useCallback(async () => {
    if (!canRun || running) return;
    setRunning(true);
    reset();
    try {
      await runQuickMake(
        { topic: topic.trim(), pitch: pitch.trim(), platforms, visualStyle: visualStyle.trim() || undefined },
        {
          onStep: (id, patch) =>
            setSteps((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } })),
          onArtifacts: (patch) => setArtifacts((cur) => ({ ...cur, ...patch })),
        },
      );
    } finally {
      setRunning(false);
    }
  }, [canRun, running, reset, topic, pitch, platforms, visualStyle]);

  const finishedCount = useMemo(
    () => QUICK_STEP_ORDER.filter((id) => steps[id].status === 'done').length,
    [steps],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)]">
      <InputColumn
        topic={topic}
        setTopic={setTopic}
        pitch={pitch}
        setPitch={setPitch}
        platforms={platforms}
        togglePlatform={togglePlatform}
        visualStyle={visualStyle}
        setVisualStyle={setVisualStyle}
        canRun={canRun}
        running={running}
        onGo={go}
      />
      <ProgressColumn steps={steps} finishedCount={finishedCount} />
      <OutputColumn artifacts={artifacts} steps={steps} />
    </div>
  );
}

function InputColumn({
  topic,
  setTopic,
  pitch,
  setPitch,
  platforms,
  togglePlatform,
  visualStyle,
  setVisualStyle,
  canRun,
  running,
  onGo,
}: {
  topic: string;
  setTopic: (v: string) => void;
  pitch: string;
  setPitch: (v: string) => void;
  platforms: string[];
  togglePlatform: (p: string) => void;
  visualStyle: string;
  setVisualStyle: (v: string) => void;
  canRun: boolean;
  running: boolean;
  onGo: () => void;
}) {
  return (
    <section className="card-glass space-y-3 p-4">
      <header className="flex items-center justify-between">
        <p className="text-overline">输入</p>
        <span className="rounded-full bg-warm-sand/60 px-2 py-0.5 text-[10px] text-stone-gray">
          一屏 4 步
        </span>
      </header>

      <Field label="选题 / 标题方向" required>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="比如:本地素材自动混剪"
          disabled={running}
          className="w-full rounded-xl border border-border-cream bg-white/80 px-3 py-2 text-sm text-near-black outline-none placeholder:text-stone-gray focus:border-terracotta/40 disabled:opacity-50"
        />
      </Field>

      <Field label="核心卖点 / 描述" required>
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="一句话讲清楚你想推什么、对谁有用、为什么有用"
          rows={4}
          disabled={running}
          className="w-full resize-none rounded-xl border border-border-cream bg-white/80 px-3 py-2 text-sm text-near-black outline-none placeholder:text-stone-gray focus:border-terracotta/40 disabled:opacity-50"
        />
      </Field>

      <Field label="目标平台">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PLATFORM_OPTIONS.map((p) => {
            const active = platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                disabled={running}
                className={`rounded-full px-3 py-1 text-xs transition disabled:opacity-50 ${
                  active
                    ? 'bg-terracotta text-white shadow-sm'
                    : 'bg-warm-sand/50 text-olive-gray hover:bg-warm-sand'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="视觉风格(可选)">
        <input
          type="text"
          value={visualStyle}
          onChange={(e) => setVisualStyle(e.target.value)}
          placeholder="冷静实拍 / CG 抽象 / 胶片质感"
          disabled={running}
          className="w-full rounded-xl border border-border-cream bg-white/80 px-3 py-2 text-sm text-near-black outline-none placeholder:text-stone-gray focus:border-terracotta/40 disabled:opacity-50"
        />
      </Field>

      <button
        type="button"
        onClick={onGo}
        disabled={!canRun || running}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-terracotta px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
        {running ? '正在制作…' : '一键做一条'}
      </button>

      <p className="text-[11px] leading-5 text-stone-gray">
        4 步串行:写脚本 → AI 提示词 → 本地混剪出片 → 多平台发布包。
        视频走影刀本地 hyperframes pipeline,发布包走 LLM 结构化输出。
      </p>
    </section>
  );
}

function ProgressColumn({
  steps,
  finishedCount,
}: {
  steps: Record<QuickStepId, QuickStepState>;
  finishedCount: number;
}) {
  return (
    <section className="card-glass space-y-3 p-4">
      <header className="flex items-center justify-between">
        <p className="text-overline">进度</p>
        <span className="text-xs text-stone-gray">{finishedCount} / 4 完成</span>
      </header>
      <ol className="space-y-2">
        {QUICK_STEP_ORDER.map((id) => (
          <StepRow key={id} step={steps[id]} />
        ))}
      </ol>
    </section>
  );
}

function StepRow({ step }: { step: QuickStepState }) {
  const borderCls =
    step.status === 'done'
      ? 'border-sage-green/30 bg-sage-green/5'
      : step.status === 'error'
        ? 'border-terracotta/30 bg-terracotta/5'
        : step.status === 'running'
          ? 'border-terracotta/30 bg-warm-sand/40'
          : 'border-border-cream bg-white/60';
  return (
    <li className={`rounded-xl border p-3 ${borderCls}`}>
      <div className="flex items-center gap-2">
        <StepIcon status={step.status} />
        <span className="text-sm font-medium text-near-black">
          {step.icon} {step.label}
        </span>
        <StepStatusBadge status={step.status} />
      </div>
      {step.output && step.status === 'done' && (
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 text-[11px] leading-5 text-olive-gray">
          {step.output}
        </pre>
      )}
      {step.error && step.status === 'error' && (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-5 text-terracotta">
          <TriangleAlert size={11} className="mt-0.5 shrink-0" />
          {step.error}
        </p>
      )}
    </li>
  );
}

function StepIcon({ status }: { status: QuickStepState['status'] }) {
  if (status === 'done') return <Check size={14} className="text-sage-green" />;
  if (status === 'error') return <XCircle size={14} className="text-terracotta" />;
  if (status === 'running') return <Loader2 size={14} className="animate-spin text-terracotta" />;
  if (status === 'skipped') return <CircleDashed size={14} className="text-stone-gray/60" />;
  return <CircleDashed size={14} className="text-stone-gray" />;
}

function StepStatusBadge({ status }: { status: QuickStepState['status'] }) {
  const label =
    status === 'done'
      ? '完成'
      : status === 'error'
        ? '失败'
        : status === 'running'
          ? '运行中'
          : status === 'skipped'
            ? '跳过'
            : '等待';
  const cls =
    status === 'done'
      ? 'bg-sage-green/15 text-sage-green'
      : status === 'error'
        ? 'bg-terracotta/15 text-terracotta'
        : status === 'running'
          ? 'bg-terracotta/15 text-terracotta'
          : 'bg-warm-sand/60 text-stone-gray';
  return (
    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${cls}`}>{label}</span>
  );
}

function OutputColumn({
  artifacts,
  steps,
}: {
  artifacts: QuickMakeArtifacts;
  steps: Record<QuickStepId, QuickStepState>;
}) {
  const hasOutput =
    artifacts.videoResult || artifacts.publishPackJson || artifacts.aiPromptText;

  return (
    <section className="card-glass space-y-3 p-4">
      <header className="flex items-center justify-between">
        <p className="text-overline">产出</p>
        {!hasOutput && (
          <span className="rounded-full bg-warm-sand/60 px-2 py-0.5 text-[10px] text-stone-gray">
            等待执行
          </span>
        )}
      </header>

      {!hasOutput && (
        <div className="rounded-xl border border-dashed border-border-cream bg-white/40 p-6 text-center text-xs text-stone-gray">
          <Sparkles size={18} className="mx-auto mb-2 text-stone-gray/70" />
          填好左侧后点"一键做一条",视频和发布包会出现在这里。
        </div>
      )}

      {artifacts.videoResult && (
        <div className="overflow-hidden rounded-xl border border-border-cream bg-black/95">
          <video
            controls
            src={artifacts.videoResult.videoUrl}
            poster={artifacts.videoResult.posterUrl}
            className="aspect-[9/16] w-full max-w-[280px] bg-black"
          />
          <div className="space-y-0.5 bg-white/90 p-2 text-[11px] text-stone-gray">
            <p>
              <span className="text-near-black">adapter</span> · {artifacts.videoResult.adapter}
            </p>
            <p>
              <span className="text-near-black">时长</span> · {artifacts.videoResult.durationSeconds}s
            </p>
            <p className="truncate">
              <span className="text-near-black">输出</span> · {artifacts.videoResult.outputPath}
            </p>
          </div>
        </div>
      )}

      {artifacts.publishPackJson && (
        <div className="rounded-xl border border-border-cream bg-white/70 p-3">
          <p className="mb-2 text-overline">📦 发布包</p>
          <PublishPackPanel json={artifacts.publishPackJson} />
        </div>
      )}

      {artifacts.aiPromptText && steps.aiPrompt.status === 'done' && (
        <details className="rounded-xl border border-border-cream bg-white/60 p-3 text-xs">
          <summary className="cursor-pointer text-overline">✨ AI 视频提示词</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-olive-gray">
            {artifacts.aiPromptText}
          </pre>
        </details>
      )}

      {artifacts.scriptJson && (
        <details className="rounded-xl border border-border-cream bg-white/60 p-3 text-xs">
          <summary className="cursor-pointer text-overline">🎬 脚本 JSON</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-olive-gray">
            {JSON.stringify(artifacts.scriptJson, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-overline">
        {label}
        {required && <span className="text-terracotta">*</span>}
      </p>
      {children}
    </div>
  );
}

export const QuickMakeIcon = Play;

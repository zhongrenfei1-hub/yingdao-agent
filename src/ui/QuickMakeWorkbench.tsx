import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CircleDashed,
  FileVideo,
  Loader2,
  Play,
  Rocket,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
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
import { uploadAssets } from '../adapters/video-renderer';
import PublishPackPanel from './PublishPackPanel';

interface LocalAsset {
  file: File;
  previewUrl: string;
  kind: 'video' | 'image';
}

const MAX_ASSETS = 3;
const ACCEPT_TYPES = 'video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp';

export default function QuickMakeWorkbench() {
  const [topic, setTopic] = useState('');
  const [pitch, setPitch] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['抖音', '小红书']);
  const [visualStyle, setVisualStyle] = useState('');
  const [assets, setAssets] = useState<LocalAsset[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [steps, setSteps] = useState(initialQuickSteps());
  const [artifacts, setArtifacts] = useState<QuickMakeArtifacts>({});
  const [running, setRunning] = useState(false);

  const canRun = topic.trim().length > 0 && pitch.trim().length > 0 && platforms.length > 0;

  const togglePlatform = useCallback((p: string) => {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }, []);

  const addAssets = useCallback((files: File[]) => {
    setUploadError(null);
    setAssets((cur) => {
      const remaining = MAX_ASSETS - cur.length;
      if (remaining <= 0) {
        setUploadError(`最多 ${MAX_ASSETS} 个素材,请先删除再加`);
        return cur;
      }
      const accepted: LocalAsset[] = [];
      for (const f of files.slice(0, remaining)) {
        const isVideo = f.type.startsWith('video/');
        const isImage = f.type.startsWith('image/');
        if (!isVideo && !isImage) continue;
        if (f.size > 50 * 1024 * 1024) {
          setUploadError(`${f.name} 超过 50MB`);
          continue;
        }
        accepted.push({
          file: f,
          previewUrl: URL.createObjectURL(f),
          kind: isVideo ? 'video' : 'image',
        });
      }
      return [...cur, ...accepted];
    });
  }, []);

  const removeAsset = useCallback((idx: number) => {
    setAssets((cur) => {
      const next = cur.filter((_, i) => i !== idx);
      const removed = cur[idx];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSteps(initialQuickSteps());
    setArtifacts({});
  }, []);

  const go = useCallback(async () => {
    if (!canRun || running) return;
    setRunning(true);
    reset();
    let assetPaths: string[] | undefined;
    try {
      if (assets.length > 0) {
        const uploaded = await uploadAssets(assets.map((a) => a.file));
        assetPaths = uploaded.paths;
        if (uploaded.warnings?.length) {
          setUploadError(uploaded.warnings.join(' · '));
        }
      }
      await runQuickMake(
        {
          topic: topic.trim(),
          pitch: pitch.trim(),
          platforms,
          visualStyle: visualStyle.trim() || undefined,
          assetPaths,
        },
        {
          onStep: (id, patch) =>
            setSteps((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } })),
          onArtifacts: (patch) => setArtifacts((cur) => ({ ...cur, ...patch })),
        },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadError(msg);
    } finally {
      setRunning(false);
    }
  }, [canRun, running, reset, assets, topic, pitch, platforms, visualStyle]);

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
        assets={assets}
        addAssets={addAssets}
        removeAsset={removeAsset}
        uploadError={uploadError}
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
  assets,
  addAssets,
  removeAsset,
  uploadError,
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
  assets: LocalAsset[];
  addAssets: (files: File[]) => void;
  removeAsset: (idx: number) => void;
  uploadError: string | null;
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

      <AssetUploader
        assets={assets}
        onAdd={addAssets}
        onRemove={removeAsset}
        disabled={running}
        error={uploadError}
      />

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
        传素材就用你的,不传走 demo 模板。
      </p>
    </section>
  );
}

function AssetUploader({
  assets,
  onAdd,
  onRemove,
  disabled,
  error,
}: {
  assets: LocalAsset[];
  onAdd: (files: File[]) => void;
  onRemove: (idx: number) => void;
  disabled: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onAdd(Array.from(files));
    if (inputRef.current) inputRef.current.value = '';
  };

  const slots = assets.length;
  const remaining = MAX_ASSETS - slots;
  const captionHint = remaining > 0
    ? `还能加 ${remaining} 个 · 当前 ${slots}/${MAX_ASSETS}`
    : `已满 · ${MAX_ASSETS}/${MAX_ASSETS}`;

  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-overline">
        本地素材(可选)
        <span className="ml-1 text-[10px] font-normal text-stone-gray">{captionHint}</span>
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && remaining > 0) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled || remaining <= 0) return;
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-3 text-center transition ${
          dragging
            ? 'border-terracotta bg-terracotta/5'
            : 'border-border-cream bg-white/50'
        } ${disabled || remaining <= 0 ? 'opacity-60' : ''}`}
      >
        <button
          type="button"
          disabled={disabled || remaining <= 0}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-warm-sand/60 px-3 py-1.5 text-xs text-olive-gray hover:bg-warm-sand disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={12} />
          选文件 / 拖进来
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_TYPES}
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="mt-1.5 text-[10px] text-stone-gray">
          mp4 / webm / mov / jpg / png · 单文件 ≤ 50MB · 最多 {MAX_ASSETS} 个
        </p>
      </div>

      {assets.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {assets.map((a, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border-cream bg-white/70 p-1.5"
            >
              <AssetThumb asset={a} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-near-black">{a.file.name}</p>
                <p className="text-[10px] text-stone-gray">
                  {a.kind === 'video' ? '🎬' : '🖼️'} {(a.file.size / 1024 / 1024).toFixed(1)} MB · 槽位 {i + 1}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={disabled}
                className="rounded p-1 text-stone-gray hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-40"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-5 text-terracotta">
          <TriangleAlert size={11} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function AssetThumb({ asset }: { asset: LocalAsset }) {
  if (asset.kind === 'video') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-near-black/80 text-white">
        <FileVideo size={14} />
      </div>
    );
  }
  return (
    <img
      src={asset.previewUrl}
      alt=""
      className="h-10 w-10 shrink-0 rounded-md object-cover"
    />
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
  const eta =
    step.id === 'remix'
      ? 'docker software WebGL · 预计 1.5-4 分钟出 5s 视频'
      : step.id === 'script' || step.id === 'aiPrompt' || step.id === 'publishPack'
        ? 'LLM · 通常 5-30s'
        : null;
  return (
    <li className={`rounded-xl border p-3 ${borderCls}`}>
      <div className="flex items-center gap-2">
        <StepIcon status={step.status} />
        <span className="text-sm font-medium text-near-black">
          {step.icon} {step.label}
        </span>
        {step.status === 'running' && step.startedAt && (
          <ElapsedTimer startedAt={step.startedAt} />
        )}
        <StepStatusBadge status={step.status} />
      </div>
      {step.status === 'running' && eta && (
        <p className="mt-1 text-[10px] text-stone-gray">{eta}</p>
      )}
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

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  return (
    <span className="text-[10px] tabular-nums text-stone-gray">
      {mm > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss}s`}
    </span>
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

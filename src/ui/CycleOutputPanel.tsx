/**
 * 当前 cycle 产出聚合面板
 *
 * 解决 "看着都不知道输出的内容是哪个" — chat 流里的 plan/draft/brief 太散,
 * 这个面板把当前 active cycle 的所有产物按工具分组、按时间排序,一目了然。
 */

import { useEffect, useRef, useState } from 'react';
import { useLoopStore } from '../core/loopStore';
import { PUBLISH_PACK_FIELD } from '../core/publishPack';
import PublishPackPanel from './PublishPackPanel';
import { Check, Clapperboard, Clock, FileText, Layers, Loader2, Package, Sparkles, Wand2 } from 'lucide-react';
import type { LoopTask } from '../core/types';

// 前端轻量记 task 第一次进 running 的时间,渲染 elapsed timer。不动 core type。
function useTaskStartTimes(tasks: LoopTask[]): Record<string, number> {
  const map = useRef<Record<string, number>>({});
  for (const t of tasks) {
    if (t.status === 'running' && !map.current[t.id]) {
      map.current[t.id] = Date.now();
    }
  }
  return map.current;
}

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  return (
    <span className="ml-auto inline-flex items-center gap-1 text-[10px] tabular-nums text-stone-gray">
      {mm > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss}s`}
    </span>
  );
}

const IRIS = '#7c3aed';
const IRIS_SOFT = 'rgba(124,58,237,0.08)';

interface Props {
  configId: string;
}

const STAGE_LABELS: Record<string, string> = {
  planning: '规划中',
  awaiting_plan_review: '等你审计划',
  generating: '生成中',
  awaiting_review: '等你审草稿',
  awaiting_publish: '等发布',
  awaiting_feedback: '等数据',
  reviewing_auto: '复盘中',
  awaiting_memory: '等确认记忆',
  cycle_complete: '✓ 完成',
};

const TOOL_META: Record<string, { icon: React.ReactNode; label: string }> = {
  'short-video-strategist': { icon: <Sparkles size={12} />, label: '选题策划' },
  'short-video-script-writer': { icon: <FileText size={12} />, label: '脚本分镜' },
  'ai-video-generation-brief': { icon: <Wand2 size={12} />, label: 'AI 提示词' },
  'local-asset-remix-planner': { icon: <Clapperboard size={12} />, label: '混剪出片' },
  'short-video-publish-packager': { icon: <Package size={12} />, label: '发布包' },
};

export default function CycleOutputPanel({ configId }: Props) {
  const cycle = useLoopStore((s) => {
    const cid = s.activeCycleIds[configId];
    return cid ? s.cycles[cid] : null;
  });

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border-cream bg-white/80 backdrop-blur-sm"
      style={{ borderColor: 'rgba(124,58,237,0.15)' }}
    >
      <header
        className="flex items-center justify-between px-3 py-2.5"
        style={{ background: IRIS_SOFT, borderBottom: '1px solid rgba(124,58,237,0.12)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white shadow-sm"
            style={{ background: IRIS }}
          >
            <Layers size={12} />
          </span>
          <div>
            <p className="text-xs font-semibold text-near-black">本轮产出</p>
            {cycle ? (
              <p className="text-[10px] text-stone-gray">
                #{cycle.cycleNumber} · {STAGE_LABELS[cycle.stage] ?? cycle.stage}
              </p>
            ) : (
              <p className="text-[10px] text-stone-gray">还没启动 cycle</p>
            )}
          </div>
        </div>
        {cycle && cycle.stage !== 'cycle_complete' && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(124,58,237,0.15)', color: IRIS }}>
            <Loader2 size={9} className="animate-spin" />
            进行中
          </span>
        )}
      </header>

      <div className="space-y-2 p-3">
        {!cycle && (
          <div className="rounded-xl border border-dashed px-3 py-6 text-center text-[11px] text-stone-gray" style={{ borderColor: 'rgba(124,58,237,0.18)' }}>
            <Sparkles size={18} className="mx-auto mb-1.5 text-stone-gray/70" />
            <p>跟 AI 聊一下你要做啥</p>
            <p className="text-[10px] text-stone-gray/80">访谈完出 brief,回"开干"启动 cycle,这里实时显示产物</p>
          </div>
        )}

        {cycle && <CycleContent cycle={cycle} />}
      </div>
    </section>
  );
}

function CycleContent({ cycle }: { cycle: NonNullable<ReturnType<typeof useLoopStore.getState>['cycles'][string]> }) {
  const taskStartTimes = useTaskStartTimes(cycle.tasks);
  const remix = [...cycle.tasks].reverse().find((t) => t.draft?.fields?.videoUrl);
  const pack = [...cycle.tasks].reverse().find((t) => t.draft?.fields?.[PUBLISH_PACK_FIELD]);
  return (
    <>
      <Block label="🎯 本轮目标">
        <p className="text-xs leading-5 text-near-black">{cycle.goal}</p>
      </Block>

      {cycle.tasks.length > 0 ? (
        <Block label="📋 任务进度">
          <ul className="space-y-1.5">
            {cycle.tasks.map((task) => (
              <TaskRow key={task.id} task={task} startedAt={taskStartTimes[task.id]} />
            ))}
          </ul>
        </Block>
      ) : cycle.stage === 'planning' ? (
        <Block label="📋 任务进度">
          <p className="flex items-center gap-1.5 text-[11px] text-stone-gray">
            <Loader2 size={10} className="animate-spin" />
            AI 正在规划任务清单…
          </p>
        </Block>
      ) : null}

      {remix?.draft?.fields?.videoUrl && (
        <Block label="🎬 视频产出">
          <div className="overflow-hidden rounded-lg bg-black/90">
            <video
              controls
              src={String(remix.draft.fields.videoUrl)}
              poster={remix.draft.fields.posterUrl ? String(remix.draft.fields.posterUrl) : undefined}
              className="aspect-[9/16] w-full max-w-[220px] object-contain"
            />
          </div>
          <div className="mt-1 space-y-0.5 text-[10px] text-stone-gray">
            {remix.draft.fields.durationSeconds && <p>时长 · {String(remix.draft.fields.durationSeconds)}s</p>}
            {remix.draft.fields.adapter && <p>引擎 · {String(remix.draft.fields.adapter)}</p>}
          </div>
        </Block>
      )}

      {pack?.draft?.fields?.[PUBLISH_PACK_FIELD] && (
        <Block label="📦 发布包">
          <PublishPackPanel json={String(pack.draft.fields[PUBLISH_PACK_FIELD])} />
        </Block>
      )}
    </>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-warm-sand/20 p-2.5" style={{ background: IRIS_SOFT }}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: IRIS }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function TaskRow({ task, startedAt }: { task: LoopTask; startedAt?: number }) {
  const meta = TOOL_META[task.appToolId];
  const statusIcon = (() => {
    switch (task.status) {
      case 'pending':
        return <Clock size={11} className="text-stone-gray" />;
      case 'running':
        return <Loader2 size={11} className="animate-spin" style={{ color: IRIS }} />;
      case 'draft_ready':
      case 'confirmed':
      case 'published':
      case 'feedback_done':
        return <Check size={11} className="text-sage-green" />;
      case 'rejected':
        return <Clock size={11} className="text-terracotta" />;
      default:
        return <Clock size={11} className="text-stone-gray" />;
    }
  })();
  const statusLabel = (() => {
    switch (task.status) {
      case 'pending': return '等待';
      case 'running': return '生成中';
      case 'draft_ready': return '草稿就绪';
      case 'confirmed': return '已通过';
      case 'rejected': return '已退回';
      case 'published': return '已发';
      case 'feedback_done': return '反馈完';
      default: return task.status;
    }
  })();
  return (
    <li
      className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5"
      style={{ border: '1px solid rgba(124,58,237,0.1)' }}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md" style={{ background: IRIS_SOFT, color: IRIS }}>
        {meta?.icon ?? <FileText size={11} />}
      </span>
      <span className="flex-1 text-[11px] font-medium text-near-black">
        {meta?.label ?? task.appName}
      </span>
      {task.status === 'running' && startedAt && <ElapsedTimer startedAt={startedAt} />}
      <span className="inline-flex items-center gap-1 text-[10px] text-stone-gray">
        {statusIcon}
        {statusLabel}
      </span>
    </li>
  );
}

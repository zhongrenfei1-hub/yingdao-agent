/**
 * 快速制作工作台 · 串行执行 4 步:脚本 → AI 提示词 → 混剪 → 发布包
 *
 * 不走 Centaur Loop 的 cycle / store / executor,而是直接调
 * ai-client + video-renderer,产出落到组件本地 state。
 * Prompt 拼装与 loopExecutor 对齐(含 publishPack schema hint)。
 */

import { getClientAsync, extractModelText } from '../adapters/ai-client';
import { findTool, type AIToolDefinition } from '../adapters/tool-registry';
import { renderDemoRemixVideo, type ScriptJson, type VideoRenderResult } from '../adapters/video-renderer';
import { parsePublishPack, publishPackSchemaHint, serializePublishPack } from './publishPack';

export type QuickStepId = 'script' | 'aiPrompt' | 'remix' | 'publishPack';
export type QuickStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface QuickStepState {
  id: QuickStepId;
  label: string;
  icon: string;
  status: QuickStepStatus;
  output?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface QuickMakeInput {
  topic: string;
  pitch: string;
  platforms: string[];
  visualStyle?: string;
  /** 已上传的本地素材相对路径(由 uploadAssets 拿到),非空时混剪走 local-asset-remix composition */
  assetPaths?: string[];
}

export interface QuickMakeArtifacts {
  scriptJson?: ScriptJson;
  scriptRaw?: string;
  aiPromptText?: string;
  videoResult?: VideoRenderResult;
  publishPackJson?: string;
}

export const QUICK_STEP_ORDER: QuickStepId[] = ['script', 'aiPrompt', 'remix', 'publishPack'];

export function initialQuickSteps(): Record<QuickStepId, QuickStepState> {
  return {
    script: { id: 'script', label: '写脚本', icon: '🎬', status: 'pending' },
    aiPrompt: { id: 'aiPrompt', label: 'AI 提示词', icon: '✨', status: 'pending' },
    remix: { id: 'remix', label: '混剪出片', icon: '🎞️', status: 'pending' },
    publishPack: { id: 'publishPack', label: '发布包', icon: '📦', status: 'pending' },
  };
}

function formatInputs(tool: AIToolDefinition, params: Record<string, string>): string {
  return tool.inputSchema
    .map((f) => `${f.label}:${params[f.id]?.trim() || '未填写'}`)
    .join('\n');
}

function buildPrompt(opts: {
  tool: AIToolDefinition;
  params: Record<string, string>;
  extra?: string;
}): string {
  const { tool, params, extra } = opts;
  return [
    '你是 Centaur Loop 快速制作工作台的内容生成引擎。',
    `应用 toolId:"${tool.id}"`,
    `应用说明:${tool.description}`,
    `用户输入:\n${formatInputs(tool, params)}`,
    `输出要求:${tool.outputInstruction}`,
    extra ?? '',
  ].filter(Boolean).join('\n\n');
}

async function runLLM(prompt: string): Promise<string> {
  const client = await getClientAsync();
  const raw = await client.models.invoke({ prompt });
  const text = extractModelText(raw);
  if (!text) throw new Error('模型未返回文本');
  return text;
}

function tryParseScript(raw: string): ScriptJson | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as ScriptJson;
  } catch {
    return null;
  }
}

function summarizeScript(script: ScriptJson | null, fallback: string): string {
  if (!script) return fallback;
  const lines = [
    script.title ? `标题:${script.title}` : '',
    script.hook ? `钩子:${script.hook}` : '',
    script.platform ? `平台:${script.platform}` : '',
    script.duration ? `时长:${script.duration}s` : '',
  ].filter(Boolean);
  if (script.scenes?.length) {
    lines.push('分镜:');
    for (const s of script.scenes) {
      lines.push(`  · ${s.id}(${s.duration}s):${s.visual ?? ''} / ${s.caption ?? ''}`);
    }
  }
  return lines.join('\n');
}

export interface QuickRunCallbacks {
  onStep: (id: QuickStepId, patch: Partial<QuickStepState>) => void;
  onArtifacts: (patch: Partial<QuickMakeArtifacts>) => void;
}

export async function runQuickMake(
  input: QuickMakeInput,
  cb: QuickRunCallbacks,
): Promise<void> {
  const platformStr = input.platforms.join('/') || '抖音/TikTok';
  const cycleId = `quick-${Date.now().toString(36)}`;
  const taskId = () => `${cycleId}-${Math.random().toString(36).slice(2, 7)}`;
  const artifacts: QuickMakeArtifacts = {};

  // ── 1. 脚本
  const scriptTool = findTool('short-video-script-writer');
  if (scriptTool) {
    cb.onStep('script', { status: 'running', startedAt: new Date().toISOString() });
    try {
      const prompt = buildPrompt({
        tool: scriptTool,
        params: {
          topic: input.topic,
          platform: platformStr,
          duration: '15s',
          hook: '',
          sellingPoint: input.pitch,
          audience: '',
          tone: input.visualStyle ?? '',
        },
      });
      const raw = await runLLM(prompt);
      artifacts.scriptRaw = raw;
      const parsed = tryParseScript(raw);
      if (parsed) artifacts.scriptJson = parsed;
      cb.onArtifacts({ scriptRaw: raw, scriptJson: parsed ?? undefined });
      cb.onStep('script', {
        status: 'done',
        output: summarizeScript(parsed, raw.slice(0, 300)),
        finishedAt: new Date().toISOString(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      cb.onStep('script', { status: 'error', error: message, finishedAt: new Date().toISOString() });
      // 脚本失败:后续都跳过
      cb.onStep('aiPrompt', { status: 'skipped' });
      cb.onStep('remix', { status: 'skipped' });
      cb.onStep('publishPack', { status: 'skipped' });
      return;
    }
  }

  // ── 2. AI 提示词
  const briefTool = findTool('ai-video-generation-brief');
  if (briefTool) {
    cb.onStep('aiPrompt', { status: 'running', startedAt: new Date().toISOString() });
    try {
      const scriptText = artifacts.scriptJson
        ? JSON.stringify(artifacts.scriptJson, null, 2)
        : artifacts.scriptRaw ?? '';
      const prompt = buildPrompt({
        tool: briefTool,
        params: {
          script: scriptText,
          visualStyle: input.visualStyle ?? '冷静实拍 + 浅紫氛围',
          model: 'sora/veo/seedance',
        },
      });
      const raw = await runLLM(prompt);
      artifacts.aiPromptText = raw;
      cb.onArtifacts({ aiPromptText: raw });
      cb.onStep('aiPrompt', {
        status: 'done',
        output: raw.slice(0, 400),
        finishedAt: new Date().toISOString(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      cb.onStep('aiPrompt', { status: 'error', error: message, finishedAt: new Date().toISOString() });
      // 不阻断后续
    }
  }

  // ── 3. 混剪(hyperframes / ffmpeg)
  cb.onStep('remix', { status: 'running', startedAt: new Date().toISOString() });
  try {
    const result = await renderDemoRemixVideo({
      cycleId,
      taskId: taskId(),
      script: artifacts.scriptJson,
      assetPaths: input.assetPaths,
    });
    artifacts.videoResult = result;
    cb.onArtifacts({ videoResult: result });
    const note = input.assetPaths?.length
      ? ` · ${input.assetPaths.length} 个本地素材`
      : '';
    cb.onStep('remix', {
      status: 'done',
      output: `${result.adapter} · ${result.durationSeconds}s${note} · ${result.outputPath}`,
      finishedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    cb.onStep('remix', { status: 'error', error: message, finishedAt: new Date().toISOString() });
  }

  // ── 4. 发布包
  const packTool = findTool('short-video-publish-packager');
  if (packTool) {
    cb.onStep('publishPack', { status: 'running', startedAt: new Date().toISOString() });
    try {
      const scriptSummary = artifacts.scriptJson
        ? JSON.stringify({
            title: artifacts.scriptJson.title,
            hook: artifacts.scriptJson.hook,
            cta: artifacts.scriptJson.cta,
            scenes: artifacts.scriptJson.scenes?.map((s) => ({ id: s.id, caption: s.caption })),
          }, null, 2)
        : artifacts.scriptRaw ?? input.pitch;
      const prompt = buildPrompt({
        tool: packTool,
        params: { script: scriptSummary, platforms: platformStr },
        extra: publishPackSchemaHint(),
      });
      const raw = await runLLM(prompt);
      const parsed = parsePublishPack(raw);
      const stored = parsed ? serializePublishPack(parsed) : raw;
      artifacts.publishPackJson = stored;
      cb.onArtifacts({ publishPackJson: stored });
      cb.onStep('publishPack', {
        status: 'done',
        output: parsed
          ? `已生成 ${parsed.platforms.length} 个平台:${parsed.platforms.map((p) => p.platform).join(' / ')}`
          : raw.slice(0, 300),
        finishedAt: new Date().toISOString(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      cb.onStep('publishPack', { status: 'error', error: message, finishedAt: new Date().toISOString() });
    }
  }
}

export const QUICK_PLATFORM_OPTIONS = ['抖音', 'TikTok', '小红书', '快手'];

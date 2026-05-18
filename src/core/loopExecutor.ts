/**
 * Centaur Loop Engine — 任务执行器
 */

import { getClientAsync, extractModelText } from '../adapters/ai-client';
import { findTool } from '../adapters/tool-registry';
import { renderDemoRemixVideo, type ScriptJson } from '../adapters/video-renderer';
import { useLoopStore } from './loopStore';
import {
  PUBLISH_PACK_FIELD,
  parsePublishPack,
  publishPackSchemaHint,
  serializePublishPack,
} from './publishPack';
import type { LoopExecuteContext, LoopTask, LoopTaskDraft } from './types';

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

function extractTitle(text: string, appName: string): string {
  const firstLine = text.split('\n').find((l) => l.trim().length > 0);
  if (firstLine) {
    const cleaned = firstLine.replace(/^#+\s*/, '').replace(/^\*+\s*/, '').trim();
    if (cleaned.length > 0 && cleaned.length < 80) return cleaned;
  }
  return `${appName} · 草稿`;
}

function formatInputs(tool: { inputSchema: { id: string; label: string }[] }, input: Record<string, string>): string {
  return tool.inputSchema
    .map((field) => {
      const value = input[field.id]?.trim();
      return `${field.label}：${value || '未填写'}`;
    })
    .join('\n');
}

export async function executeTask(
  task: LoopTask,
  context: LoopExecuteContext,
): Promise<LoopTaskDraft> {
  if (task.appToolId === 'local-asset-remix-planner') {
    return renderRemixDraft(task);
  }

  const tool = findTool(task.appToolId);
  const isPublishPack = task.appToolId === 'short-video-publish-packager';

  const client = await getClientAsync();

  const prompt = [
    context.outputLanguage ? `Output language instruction: ${context.outputLanguage}` : '',
    '你是 Centaur Loop Engine 的内容生成引擎。',
    tool ? `应用 toolId："${tool.id}"` : '',
    `应用名称：${task.appName}`,
    tool ? `应用说明：${tool.description}` : '',
    context.ownerContext ? `老板偏好：\n${context.ownerContext}` : '',
    context.businessContext ? `企业资料摘要：\n${context.businessContext}` : '',
    context.memories.length > 0 ? `已有记忆：\n${context.memories.join('\n')}` : '',
    tool ? `用户输入：\n${formatInputs(tool, task.inputParams)}` : `用户输入：\n${JSON.stringify(task.inputParams)}`,
    tool ? `输出要求：${tool.outputInstruction}` : '请生成可直接使用的内容。',
    isPublishPack ? publishPackSchemaHint() : '',
  ].filter(Boolean).join('\n\n');

  let raw: unknown;
  try {
    raw = await client.models.invoke({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`内容生成失败：${message}`);
  }

  const content = extractModelText(raw);
  if (!content) throw new Error('模型未返回文本');

  const title = extractTitle(content, task.appName);

  if (isPublishPack) {
    const parsed = parsePublishPack(content);
    if (parsed) {
      const platformNames = parsed.platforms.map((p) => p.platform).join(' / ');
      return {
        title: platformNames ? `发布包 · ${platformNames}` : title,
        content,
        preview: platformNames
          ? `已生成 ${parsed.platforms.length} 个平台的发布包:${platformNames}`
          : truncate(content, 200),
        fields: { [PUBLISH_PACK_FIELD]: serializePublishPack(parsed) },
        generatedAt: new Date().toISOString(),
      };
    }
  }

  return {
    title,
    content,
    preview: truncate(content, 200),
    generatedAt: new Date().toISOString(),
  };
}

function findUpstreamScript(task: LoopTask): ScriptJson | undefined {
  const cycle = useLoopStore.getState().cycles[task.cycleId];
  if (!cycle) return undefined;
  const scriptTask = cycle.tasks.find((t) => t.appToolId === 'short-video-script-writer');
  const raw = scriptTask?.draft?.content;
  if (!raw) return undefined;
  // 容错:有的 LLM 会用 ```json ... ``` 包裹,有的会带前置说明
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return undefined;
  try {
    return JSON.parse(match[0]) as ScriptJson;
  } catch {
    return undefined;
  }
}

async function renderRemixDraft(task: LoopTask): Promise<LoopTaskDraft> {
  const script = findUpstreamScript(task);
  try {
    const result = await renderDemoRemixVideo({ cycleId: task.cycleId, taskId: task.id, script });
    const timelineLines = result.sceneTimeline?.map(
      (s) => `  · ${s.id}: ${s.start.toFixed(1)}s → ${s.end.toFixed(1)}s`,
    ) ?? [];
    const summaryLines = [
      `已生成 ${result.durationSeconds} 秒 9:16 粗剪视频（${result.adapter}）。`,
      script
        ? `按上游脚本时间线切了 ${result.sceneTimeline?.length ?? 0} 段镜头：`
        : '使用默认 3-5-4 分段（上游脚本未提供 JSON timeline）。',
      ...timelineLines,
      `输出路径：${result.outputPath}`,
      '',
      'MVP 说明：当前 adapter 用 FFmpeg lavfi 生成抽象画面，仅证明 loop 能自动出片。',
      '生产级会按 EDL 使用真实素材渲染、补字幕/BGM/转场，并产出质量报告。',
    ];
    const content = summaryLines.join('\n');
    return {
      title: `${task.appName} · 粗剪 ${result.durationSeconds}s`,
      content,
      preview: `已生成 ${result.durationSeconds} 秒 9:16 粗剪视频`,
      fields: {
        videoUrl: result.videoUrl,
        posterUrl: result.posterUrl,
        outputPath: result.outputPath,
        adapter: result.adapter,
        durationSeconds: String(result.durationSeconds),
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      title: `${task.appName} · 渲染失败`,
      content: `自动混剪渲染失败：${message}`,
      preview: '自动混剪渲染失败',
      fields: { renderError: message },
      generatedAt: new Date().toISOString(),
    };
  }
}

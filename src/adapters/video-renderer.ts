/**
 * 视频渲染前端 adapter
 *
 * MVP 阶段调用 vite dev middleware /api/video/render，
 * 由本地 FFmpeg 生成 1080×1920 9:16 抽象粗剪视频 + 封面。
 *
 * 生产级会替换为 RenderAdapter 接口（PRD 第 9.2 节），
 * 支持 EDL / 真实素材 / 进度回报 / 失败重试。
 */

export interface ScriptScene {
  id: string;
  duration: number;
  visual?: string;
  voiceover?: string;
  caption?: string;
  transition?: string;
}

export interface ScriptJson {
  title?: string;
  cover?: string;
  duration?: number;
  platform?: string;
  hook?: string;
  scenes?: ScriptScene[];
  cta?: string;
  risks?: string[];
}

export interface VideoRenderInput {
  cycleId: string;
  taskId: string;
  /** 上游 short-video-script-writer 输出的 JSON 脚本，缺省时 middleware 用默认 3-5-4 分段 */
  script?: ScriptJson;
}

export interface VideoRenderResult {
  videoUrl: string;
  posterUrl: string;
  outputPath: string;
  adapter: string;
  durationSeconds: number;
  /** middleware 实际用到的分镜段时间表，便于 UI 调试 */
  sceneTimeline?: Array<{ id: string; start: number; end: number }>;
}

export async function renderDemoRemixVideo(input: VideoRenderInput): Promise<VideoRenderResult> {
  const response = await fetch('/api/video/render', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`视频渲染失败 (${response.status})${text ? `：${text}` : ''}`);
  }

  return (await response.json()) as VideoRenderResult;
}

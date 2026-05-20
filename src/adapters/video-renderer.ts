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
  /** PM 访谈合成的目标受众(stage-20+);影响 composition eyebrow + LLM 后续语气 */
  audience?: string;
  /** PM 访谈合成的调性(stage-20+);影响 voiceover 风格 */
  tone?: string;
  /** PM 访谈合成的核心卖点(1-3 个);写脚本时强制覆盖 */
  sellingPoints?: string[];
}

export interface VideoRenderInput {
  cycleId: string;
  taskId: string;
  /** 上游 short-video-script-writer 输出的 JSON 脚本，缺省时 middleware 用默认 3-5-4 分段 */
  script?: ScriptJson;
  /** 已上传到 /api/assets/upload 的素材相对路径(相对 local-asset-remix composition);
   *  非空时 middleware 会切到 local-asset-remix composition 使用用户素材 */
  assetPaths?: string[];
}

export interface AssetUploadResult {
  sid: string;
  paths: string[];
  warnings?: string[];
}

export async function uploadAssets(files: File[]): Promise<AssetUploadResult> {
  const form = new FormData();
  for (const f of files) form.append('files', f, f.name);
  const response = await fetch('/api/assets/upload', { method: 'POST', body: form });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`上传失败 (${response.status})${text ? `:${text}` : ''}`);
  }
  return (await response.json()) as AssetUploadResult;
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
    body: JSON.stringify({
      cycleId: input.cycleId,
      taskId: input.taskId,
      script: input.script,
      assetPaths: input.assetPaths,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`视频渲染失败 (${response.status})${text ? `：${text}` : ''}`);
  }

  return (await response.json()) as VideoRenderResult;
}

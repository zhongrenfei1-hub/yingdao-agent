/**
 * Tool Registry 适配层
 *
 * 替代 centaurai-edge 的 toolCatalog / appCatalog / toolRunner。
 * 在独立产品中：
 * - 工具定义内联（不依赖外部 catalog）
 * - 执行统一走 ai-client 的 models.invoke
 */

// ── 类型定义 ──────────────────────────────────────────────────────

export type AIToolInputType = 'text' | 'textarea' | 'select';

export interface AIToolInputField {
  id: string;
  label: string;
  type: AIToolInputType;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export interface AIToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  inputSchema: AIToolInputField[];
  outputInstruction: string;
}

export type AIToolInputValues = Record<string, string>;

// ── 内置工具定义（Demo 用） ──────────────────────────────────────

export const TOOL_CATALOG: AIToolDefinition[] = [
  {
    id: 'wechat-article-generator',
    name: '写公众号文章',
    description: '生成适合公众号发布的深度文章',
    icon: '📝',
    inputSchema: [
      { id: 'topic', label: '主题', type: 'text', required: true },
      { id: 'keywords', label: '关键词', type: 'text' },
      { id: 'tone', label: '语气', type: 'text', placeholder: '专业/轻松/故事化' },
    ],
    outputInstruction: '输出一篇完整的公众号文章，包含标题、正文、结尾引导。',
  },
  {
    id: 'xiaohongshu-note-generator',
    name: '写小红书笔记',
    description: '生成适合小红书风格的图文笔记',
    icon: '📕',
    inputSchema: [
      { id: 'topic', label: '主题', type: 'text', required: true },
      { id: 'style', label: '风格', type: 'text', placeholder: '干货/种草/测评' },
    ],
    outputInstruction: '输出一篇小红书笔记，包含标题、正文、标签。',
  },
  {
    id: 'seo-article-writer',
    name: 'SEO 长文',
    description: '生成搜索引擎优化的长文章',
    icon: '🔍',
    inputSchema: [
      { id: 'keyword', label: '目标关键词', type: 'text', required: true },
      { id: 'outline', label: '大纲', type: 'textarea' },
    ],
    outputInstruction: '输出一篇2000字以上的SEO优化文章。',
  },
  {
    id: 'geo-content-optimizer',
    name: 'GEO 内容优化',
    description: '优化内容以在AI回答中获得更好的引用',
    icon: '🌐',
    inputSchema: [
      { id: 'content', label: '原始内容', type: 'textarea', required: true },
      { id: 'targetQuestion', label: '目标问题', type: 'text' },
    ],
    outputInstruction: '输出优化后的内容，使其更容易被AI引擎引用。',
  },
  {
    id: 'short-video-strategist',
    name: '短视频选题策划',
    description: '基于账号定位、历史数据和本地素材策划本轮短视频选题',
    icon: '🎯',
    inputSchema: [
      { id: 'accountPositioning', label: '账号定位', type: 'text', required: true },
      { id: 'audience', label: '目标人群', type: 'text' },
      { id: 'goal', label: '本轮目标', type: 'textarea' },
      { id: 'materialLibrary', label: '本地素材摘要', type: 'textarea' },
    ],
    outputInstruction: '输出 3 个候选选题，每个包含：目标平台、目标人群、3 秒钩子、核心卖点、本地素材使用建议、A/B 测试假设、本轮目标指标（3 秒留存/完播/收藏/评论/涨粉）。必须引用历史数据或记忆，说明为什么这个选题适合本轮目标。',
  },
  {
    id: 'short-video-script-writer',
    name: '短视频脚本分镜',
    description: '将选题转化为可拍摄/可剪辑的脚本与分镜',
    icon: '🎬',
    inputSchema: [
      { id: 'topic', label: '选题', type: 'text', required: true },
      { id: 'platform', label: '目标平台', type: 'text', placeholder: '抖音/TikTok/快手/小红书' },
      { id: 'duration', label: '时长', type: 'text', placeholder: '30s' },
      { id: 'hook', label: '3 秒钩子', type: 'text' },
      { id: 'sellingPoint', label: '核心卖点', type: 'text' },
      { id: 'audience', label: '目标受众', type: 'text', placeholder: 'PM 访谈拿到的目标人群' },
      { id: 'tone', label: '调性', type: 'text', placeholder: '专业 / 活泼 / 搞笑 / 治愈 / 沉浸' },
    ],
    outputInstruction: `严格输出 JSON（不要 markdown 代码块），schema：
{
  "title": "标题",
  "cover": "封面文案",
  "duration": 12,
  "platform": "抖音 / TikTok",
  "audience": "目标受众(原样回填用户输入)",
  "tone": "调性(原样回填用户输入)",
  "sellingPoints": ["卖点 1", "卖点 2"],
  "hook": "0-3 秒钩子文案",
  "scenes": [
    { "id": "hook", "duration": 3, "visual": "画面描述", "voiceover": "旁白", "caption": "字幕", "transition": "cut" },
    { "id": "demo", "duration": 5, "visual": "...", "voiceover": "...", "caption": "...", "transition": "fade" },
    { "id": "cta", "duration": 4, "visual": "...", "voiceover": "...", "caption": "...", "transition": "cut" }
  ],
  "cta": "...",
  "risks": ["平台违规词", "版权风险", "品牌限制"]
}
要点:
- 整条视频的调性必须贴合 tone 字段(专业:严谨数据 / 活泼:口语化感叹号 / 搞笑:段子节奏 / 治愈:慢节奏温暖词)
- hook / voiceover / caption 都要让 audience 觉得"在跟我说话",别用通用万能话
- scenes 各项的 duration 总和应等于 duration
- id 用 hook/demo/cta 之一以便下游 remix 识别镜头类型`,
  },
  {
    id: 'ai-video-generation-brief',
    name: 'AI 视频生成提示词',
    description: '将分镜转换为 Sora/Veo/Seedance/Kling 等模型可用的视频生成 prompt',
    icon: '✨',
    inputSchema: [
      { id: 'script', label: '脚本与分镜', type: 'textarea', required: true },
      { id: 'visualStyle', label: '视觉风格', type: 'text', placeholder: '冷静实拍/CG 抽象/胶片质感' },
      { id: 'model', label: '目标模型', type: 'text', placeholder: 'sora/veo/seedance/kling/runway/pika' },
    ],
    outputInstruction: '逐镜头输出 prompt，每个镜头包含：主体、动作、镜头运动、光线、构图、时长、负面提示词。同时标注哪些镜头应由 AI 生成、哪些应使用本地素材。',
  },
  {
    id: 'local-asset-remix-planner',
    name: '本地素材自动混剪',
    description: '按脚本调用本地 FFmpeg 渲染粗剪视频，输出 1080×1920 9:16 mp4 + 封面',
    icon: '🎞️',
    inputSchema: [
      { id: 'script', label: '脚本与分镜', type: 'textarea' },
      { id: 'assetSummary', label: '可用素材摘要', type: 'textarea' },
    ],
    outputInstruction: '（本任务由 FFmpeg adapter 直接渲染，不调用 LLM）',
  },
  {
    id: 'short-video-publish-packager',
    name: '短视频发布包',
    description: '为目标平台生成发布文案、检查清单与 24h 观察指标',
    icon: '📦',
    inputSchema: [
      { id: 'script', label: '脚本与选题摘要', type: 'textarea', required: true },
      { id: 'platforms', label: '目标平台', type: 'text', placeholder: '抖音/TikTok/快手/小红书' },
    ],
    outputInstruction: '为每个目标平台输出：标题、简介/caption、话题标签、建议发布时间、A/B 版本。附发布前合规检查清单（音乐授权、人像授权、商标 Logo、平台敏感词、夸大宣传）与 24 小时观察指标（播放、完播率、互动率、涨粉）。',
  },
];

export function findTool(toolId: string): AIToolDefinition | undefined {
  return TOOL_CATALOG.find((t) => t.id === toolId);
}

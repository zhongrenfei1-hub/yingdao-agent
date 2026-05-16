import type { CentaurLoopConfig } from '../types';

export const YINGDAO_SHORT_VIDEO_LOOP_CONFIG: CentaurLoopConfig = {
  id: 'yingdao-short-video-growth',
  name: '影刀短视频增长闭环',
  icon: '🎬',
  employeeId: 'yingdao',
  description: '基于账号定位、历史视频数据和本地素材，自动策划选题、生成脚本与 AI 视频提示词、本地素材自动混剪导出粗剪，并在发布后采集平台反馈进入下一轮策划',
  trigger: { type: 'ai_suggest', description: '影刀每周主动推荐本轮短视频策划计划', scheduleHint: '每周一' },
  cyclePeriod: 'weekly',
  aiWorkPhases: [
    { id: 'diagnose', name: '账号诊断与选题策划', appToolIds: ['short-video-strategist'] },
    { id: 'generate', name: '脚本生成 / AI 提示词 / 自动混剪 / 发布包', appToolIds: ['short-video-script-writer', 'ai-video-generation-brief', 'local-asset-remix-planner', 'short-video-publish-packager'] },
    { id: 'review', name: '增长复盘与记忆沉淀', appToolIds: [] },
  ],
  humanGates: [
    { id: 'confirm-plan', stage: 'awaiting_plan_review', name: '确认本轮短视频计划', description: '审核选题方向、平台策略和本地素材使用建议', required: true, timeoutAction: 'remind', remindAfterMinutes: 60, maxReminders: 3, notifyChannels: ['spirit_bubble', 'badge', 'home_card'] },
    { id: 'confirm-drafts', stage: 'awaiting_review', name: '审核脚本与粗剪成片', description: '逐项审核脚本、AI 视频提示词、自动混剪成片和发布包', required: true, timeoutAction: 'remind', remindAfterMinutes: 180, maxReminders: 3, notifyChannels: ['spirit_bubble', 'badge', 'home_card'] },
    { id: 'publish', stage: 'awaiting_publish', name: '确认发布', description: 'MVP 阶段：人工发布到目标平台并标记完成', required: true, timeoutAction: 'remind', remindAfterMinutes: 1440, maxReminders: 2, notifyChannels: ['spirit_bubble', 'chat_followup'] },
    { id: 'feedback', stage: 'awaiting_feedback', name: '补充视频数据反馈', description: '通过截图、剪贴板或手填补充播放、完播、互动、涨粉等数据', required: false, timeoutAction: 'skip', remindAfterMinutes: 4320, maxReminders: 2, notifyChannels: ['chat_followup'] },
    { id: 'confirm-memory', stage: 'awaiting_memory', name: '确认增长经验', description: '确认 AI 提炼的钩子、剪辑节奏、平台偏好等经验是否值得沉淀', required: false, timeoutAction: 'skip', remindAfterMinutes: 60, maxReminders: 1, notifyChannels: ['spirit_bubble'] },
  ],
  artifactTypes: ['content_plan', 'video_script', 'ai_video_prompt', 'short_video_draft', 'publish_pack'],
  feedbackMethods: ['quick_form', 'chat_followup', 'screenshot_ocr', 'browser_clip'],
  memoryCategories: ['爆款选题', '前三秒钩子', '剪辑节奏', '平台偏好', '素材表现', '发布时间', '违规风险'],
};

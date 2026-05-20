/**
 * Loop Chat Controller — 对话驱动闭环的核心控制器
 *
 * 职责：
 * 1. 把 loopEngine 的阶段推进翻译成对话消息
 * 2. 把用户的文字/点击翻译成 loopEngine 的动作
 * 3. 管理对话消息列表
 */

import { useLoopStore } from '../core/loopStore';
import { advanceLoop } from '../core/loopEngine';
import { submitQuickFeedback } from '../core/feedbackCollector';
import { getClientAsync, extractModelText } from '../adapters/ai-client';
import type { CentaurLoopConfig, LoopCycle, SpiritBubblePayload } from '../core/types';
import { getLoopConfigDescription, getLoopConfigLabel, getOutputLanguageInstruction, type Locale } from '../i18n';
import type {
  LoopChatSession,
  LoopMessage,
  LoopMessageMetadata,
  QuickAction,
  UserAction,
} from './types';

// ─── PM Interview · 产品经理访谈 ─────────────────────────────
//
// 用户进来 → 影刀扮 PM 反问需求 → 凑齐信息 → 输出 brief → 用户确认 → 才启 cycle。
// 走当前 ai-client(优先 customRuntime,比如用户配的 Gemini)。

interface InterviewTurn {
  role: 'pm' | 'user';
  text: string;
}

interface PMBrief {
  topic: string;
  audience: string;
  selling_points: string[];
  platforms: string[];
  tone: string;
  summary: string; // 用作 cycle goal
}

interface InterviewReply {
  next_question?: string;
  brief?: PMBrief;
  /** 当 LLM 直接降级失败时,这里给一个兜底文案,UI 用 next_question 流程展示 */
  error?: string;
}

const INTERVIEW_SYSTEM_PROMPT = `你是"影刀"的产品经理。你的工作是在用户开始做短视频前,先用简短对话搞清楚需求。

风格:像微信对话,中文,简洁,每条不超过 40 字。绝对不啰嗦,不寒暄。

需要搞清楚的关键信息(已知的别再问):
1. 视频主题 / 想推什么(产品 / 服务 / 故事 / 知识)
2. 目标受众(给谁看,什么人群)
3. 核心卖点(1-3 个亮点)
4. 投放平台(抖音 / TikTok / 小红书 / 快手 / B 站)
5. 调性(专业 / 活泼 / 搞笑 / 治愈 / 高级 / 沉浸)

规则:
- 每轮只问 1 个最重要的问题,别一次问 3 个
- 用户回答含糊就追问一下;给的够具体就推进下一个
- 凑齐 3-5 项后(至少 1+2+3 必须有),输出 brief

输出格式:严格 JSON,不要 markdown 代码块包裹,不要任何额外文字。

如果还要继续问:
{"next_question": "你说的那个 XX 主要是给谁看的?"}

如果可以收口了:
{"brief": {
  "topic": "...",
  "audience": "...",
  "selling_points": ["...", "..."],
  "platforms": ["..."],
  "tone": "...",
  "summary": "为 <audience> 在 <platforms> 做一条关于 <topic> 的短视频,突出 <selling_points>,调性 <tone>"
}}`;

function formatInterviewHistory(history: InterviewTurn[]): string {
  return history.map((t) => `${t.role === 'pm' ? 'PM' : '用户'}: ${t.text}`).join('\n');
}

function parseInterviewReply(raw: string): InterviewReply {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { error: 'LLM 返回不是 JSON' };
  try {
    const obj = JSON.parse(match[0]) as Partial<InterviewReply>;
    if (obj.brief) {
      const b = obj.brief as Partial<PMBrief>;
      const brief: PMBrief = {
        topic: String(b.topic ?? ''),
        audience: String(b.audience ?? ''),
        selling_points: Array.isArray(b.selling_points) ? b.selling_points.map(String) : [],
        platforms: Array.isArray(b.platforms) ? b.platforms.map(String) : [],
        tone: String(b.tone ?? ''),
        summary: String(b.summary ?? ''),
      };
      if (!brief.summary && brief.topic) {
        brief.summary = `做一条关于「${brief.topic}」的短视频`;
      }
      return { brief };
    }
    if (typeof obj.next_question === 'string' && obj.next_question.trim()) {
      return { next_question: obj.next_question.trim() };
    }
    return { error: '返回 JSON 缺 next_question 或 brief' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `JSON parse 失败: ${msg}` };
  }
}

async function runPMInterview(history: InterviewTurn[]): Promise<InterviewReply> {
  const client = await getClientAsync();
  const prompt = [INTERVIEW_SYSTEM_PROMPT, '', '对话历史:', formatInterviewHistory(history)].join('\n');
  const raw = await client.models.invoke({ prompt });
  const text = extractModelText(raw);
  if (!text) return { error: '模型未返回文本' };
  return parseInterviewReply(text);
}

function formatBriefMarkdown(brief: PMBrief): string {
  return [
    '**📋 需求 brief**',
    '',
    `**主题** · ${brief.topic || '—'}`,
    `**受众** · ${brief.audience || '—'}`,
    `**卖点** · ${brief.selling_points.join(' / ') || '—'}`,
    `**平台** · ${brief.platforms.join(' / ') || '—'}`,
    `**调性** · ${brief.tone || '—'}`,
    '',
    `> ${brief.summary || ''}`,
    '',
    '✅ **回复「开干」** 就按这个启动 cycle',
    '✎ 或者告诉我哪儿要改,我重新规划',
  ].join('\n');
}

// ─── 工具函数 ────────────────────────────────────────────────

function msgId(): string {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function now(): string {
  return new Date().toISOString();
}

function aiMsg(text: string, type: LoopMessage['type'] = 'text', metadata?: LoopMessageMetadata): LoopMessage {
  return { id: msgId(), role: 'ai', type, text, timestamp: now(), metadata };
}

function systemMsg(text: string): LoopMessage {
  return { id: msgId(), role: 'system', type: 'text', text, timestamp: now() };
}

function humanMsg(text: string): LoopMessage {
  return { id: msgId(), role: 'human', type: 'text', text, timestamp: now() };
}

// ─── 意图解析器 ──────────────────────────────────────────────

// 招呼/试探类输入 — 不该当 cycle goal 触发完整规划
const GREETING_PATTERNS = /^(hi+|hello+|hey+|yo+|你好+|您好|哈喽+|哈罗|嗨+|hola|喂|在|在吗|在不在|有人吗|test|测试|ping|\?|\?|请问|你是谁)[?\.!。!?\s]*$/i;

function isGreetingOrPing(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (t.length <= 8 && GREETING_PATTERNS.test(t)) return true;
  if (/^[?。?!.\s]+$/.test(t)) return true;
  return false;
}

const CONFIRM_PATTERNS = /^(行|好|确认|通过|ok|可以|没问题|approve|yes|同意|对|嗯|去吧|开始|继续)/i;
const REJECT_PATTERNS = /^(不行|退回|重做|reject|修改|改一下|不好|差|换)/i;
const SKIP_PATTERNS = /^(跳过|skip|算了|不用了|下一步)/i;
const PUBLISH_PATTERNS = /(已发布|发了|已经发|published)/i;
const FEEDBACK_PATTERNS = /(\d+)\s*(阅读|播放|views?|点赞|likes?|收藏|评论)/i;

export function parseUserIntent(text: string, currentStage: string): UserAction {
  const trimmed = text.trim();

  if (CONFIRM_PATTERNS.test(trimmed)) {
    return { type: 'confirm' };
  }
  if (SKIP_PATTERNS.test(trimmed)) {
    return { type: 'skip' };
  }
  if (PUBLISH_PATTERNS.test(trimmed)) {
    return { type: 'mark_published', payload: { text: trimmed } };
  }
  if (REJECT_PATTERNS.test(trimmed)) {
    return { type: 'reject', payload: { note: trimmed } };
  }

  // 尝试提取反馈数据
  if (currentStage === 'awaiting_feedback' && FEEDBACK_PATTERNS.test(trimmed)) {
    const numbers = trimmed.match(/\d+/g)?.map(Number) ?? [];
    return {
      type: 'submit_feedback',
      payload: {
        feedback: {
          views: numbers[0],
          likes: numbers[1],
        },
        note: trimmed,
      },
    };
  }

  // 默认当自由文本处理（可能是修改指令）
  return {
    type: currentStage.startsWith('awaiting_') ? 'modify' : 'free_text',
    payload: { text: trimmed, note: trimmed },
  };
}

// ─── 阶段 → 消息翻译器 ──────────────────────────────────────

function buildPlanMessage(cycle: LoopCycle, config: CentaurLoopConfig, locale: Locale): LoopMessage[] {
  const plan = cycle.plan;
  if (!plan) return [aiMsg(locale === 'zh-CN' ? '规划完成，但未生成计划详情。' : 'Planning finished, but no plan details were generated.')];

  const taskList = cycle.tasks.map((t, i) => `${i + 1}. ${t.appName}`).join('\n');
  const keywordStr = plan.keywords?.length
    ? locale === 'zh-CN' ? `\n关键词：${plan.keywords.join('、')}` : `\nKeywords: ${plan.keywords.join(', ')}`
    : '';
  const platformStr = plan.platforms.length
    ? locale === 'zh-CN' ? `\n平台：${plan.platforms.join('、')}` : `\nPlatforms: ${plan.platforms.join(', ')}`
    : '';

  void config;
  const text = locale === 'zh-CN'
    ? `📋 本周内容增长计划已出：\n\n${plan.summary}${platformStr}${keywordStr}\n\n${taskList}\n\n确认这个计划吗？或者告诉我要怎么调整。`
    : `📋 The content growth plan is ready:\n\n${plan.summary}${platformStr}${keywordStr}\n\n${taskList}\n\nApprove this plan, or tell me what to change.`;

  const actions: QuickAction[] = [
    { id: 'confirm', label: locale === 'zh-CN' ? '确认，开始生成' : 'Approve and generate', variant: 'primary', action: { type: 'confirm' } },
    { id: 'skip', label: locale === 'zh-CN' ? '跳过本轮' : 'Skip cycle', variant: 'ghost', action: { type: 'skip' } },
  ];

  return [aiMsg(text, 'plan_card', {
    plan: {
      summary: plan.summary,
      platforms: plan.platforms,
      keywords: plan.keywords,
      tasks: cycle.tasks.map((t) => ({ appName: t.appName, artifactType: t.artifactType })),
    },
    actions,
    cycleId: cycle.id,
  })];
}

function buildDraftMessages(cycle: LoopCycle, locale: Locale): LoopMessage[] {
  const messages: LoopMessage[] = [];

  messages.push(aiMsg(locale === 'zh-CN'
    ? `✍️ ${cycle.tasks.length} 篇内容已生成，逐篇给你看：`
    : `✍️ ${cycle.tasks.length} draft(s) are ready for review.`));

  for (const task of cycle.tasks) {
    if (!task.draft) continue;
    const actions: QuickAction[] = [
      { id: `approve-${task.id}`, label: locale === 'zh-CN' ? '通过' : 'Approve', variant: 'primary', action: { type: 'confirm', payload: { taskId: task.id } } },
      { id: `reject-${task.id}`, label: locale === 'zh-CN' ? '修改意见' : 'Change request', variant: 'ghost', action: { type: 'reject', payload: { taskId: task.id } } },
    ];

    messages.push(aiMsg(
      `**${task.draft.title}**\n_${task.appName}_\n\n${task.draft.preview}`,
      'draft_card',
      {
        draft: {
          taskId: task.id,
          title: task.draft.title,
          content: task.draft.content,
          appName: task.appName,
          artifactType: task.artifactType,
          fields: task.draft.fields,
        },
        actions,
        cycleId: cycle.id,
      },
    ));
  }

  messages.push(aiMsg(locale === 'zh-CN' ? '全部看完了，可以逐篇确认，也可以说"全部通过"。' : 'You can approve drafts one by one, or approve all of them.', 'quick_actions', {
    actions: [
      { id: 'approve-all', label: locale === 'zh-CN' ? '全部通过' : 'Approve all', variant: 'primary', action: { type: 'approve_all' } },
    ],
  }));

  return messages;
}

function buildPublishMessage(cycle: LoopCycle, locale: Locale): LoopMessage[] {
  const confirmed = cycle.tasks.filter((t) => t.status === 'confirmed');
  const messages: LoopMessage[] = [];

  messages.push(aiMsg(
    locale === 'zh-CN'
      ? `📤 ${confirmed.length} 篇内容已确认，请复制到目标平台发布。发完了告诉我一声。`
      : `📤 ${confirmed.length} item(s) are approved. Publish them to the target channel, then tell me when they are live.`,
    'publish_card',
    {
      actions: [
        { id: 'published-all', label: locale === 'zh-CN' ? '已全部发布' : 'Mark all published', variant: 'primary', action: { type: 'mark_published' } },
        { id: 'skip-publish', label: locale === 'zh-CN' ? '稍后发布' : 'Later', variant: 'ghost', action: { type: 'skip' } },
      ],
      cycleId: cycle.id,
    },
  ));

  return messages;
}

function buildFeedbackRequest(cycle: LoopCycle, config: CentaurLoopConfig, locale: Locale): LoopMessage[] {
  void cycle;
  void config;
  const text = locale === 'zh-CN'
    ? '📊 内容发布后表现怎么样？可以直接说数据（比如"公众号800阅读56赞"），或者截个图。'
    : '📊 How did it perform after publishing? Send metrics like "1200 views 68 likes", or paste the result manually.';

  return [aiMsg(text, 'feedback_request', {
    actions: [
      {
        id: 'sample-feedback',
        label: locale === 'zh-CN' ? '使用样例反馈' : 'Use sample feedback',
        variant: 'primary',
        action: {
          type: 'submit_feedback',
          payload: {
            feedback: {
              views: 8400,
              likes: 310,
              favorites: 180,
              comments: 42,
              rating: 'good',
              note: locale === 'zh-CN'
                ? '开发者喜欢把 Centaur Loop 和 cron、workflow、chat agent 直接对比，但想更清楚看到记忆如何影响下一轮。'
                : 'Developers liked the direct comparison with cron, workflow engines, and chat agents, but wanted to see how memory affects the next cycle.',
            },
          },
        },
      },
      { id: 'skip-feedback', label: locale === 'zh-CN' ? '跳过，直接复盘' : 'Skip and review', variant: 'ghost', action: { type: 'skip' } },
    ],
    cycleId: cycle.id,
  })];
}

function buildReviewMessage(cycle: LoopCycle, locale: Locale): LoopMessage[] {
  const review = cycle.review;
  if (!review) return [aiMsg(locale === 'zh-CN' ? '复盘完成。' : 'Review complete.')];

  const effective = review.effectivePoints.map((p) => `  ✅ ${p}`).join('\n');
  const ineffective = review.ineffectivePoints.map((p) => `  ⚠️ ${p}`).join('\n');
  const data = review.dataHighlights.map((d) => `  📈 ${d}`).join('\n');

  const text = locale === 'zh-CN'
    ? `📋 **本轮复盘**\n\n${review.summary}\n\n${effective ? `有效：\n${effective}\n\n` : ''}${ineffective ? `待改进：\n${ineffective}\n\n` : ''}${data ? `数据：\n${data}` : ''}`
    : `📋 **Cycle review**\n\n${review.summary}\n\n${effective ? `What worked:\n${effective}\n\n` : ''}${ineffective ? `Needs improvement:\n${ineffective}\n\n` : ''}${data ? `Data:\n${data}` : ''}`;

  const messages: LoopMessage[] = [
    aiMsg(text, 'review_card', {
      review: {
        summary: review.summary,
        effectivePoints: review.effectivePoints,
        ineffectivePoints: review.ineffectivePoints,
        dataHighlights: review.dataHighlights,
        nextSuggestion: cycle.nextSuggestion ?? '',
      },
      cycleId: cycle.id,
    }),
  ];

  if (cycle.memoryCandidates.length > 0) {
    const memList = cycle.memoryCandidates
      .filter((m) => m.status === 'pending')
      .map((m) => `  💡 ${m.content}`)
      .join('\n');

    messages.push(aiMsg(
      locale === 'zh-CN'
        ? `从这轮复盘中提炼了几条经验：\n\n${memList}\n\n要记住这些吗？`
        : `I extracted a few memory candidates from this cycle:\n\n${memList}\n\nShould these become long-term memory?`,
      'memory_card',
      {
        memories: cycle.memoryCandidates
          .filter((m) => m.status === 'pending')
          .map((m) => ({ id: m.id, content: m.content, category: m.category })),
        actions: [
          { id: 'confirm-all-mem', label: locale === 'zh-CN' ? '全部记住' : 'Save all', variant: 'primary', action: { type: 'confirm' } },
          { id: 'skip-mem', label: locale === 'zh-CN' ? '不用了' : 'Do not save', variant: 'ghost', action: { type: 'skip' } },
        ],
        cycleId: cycle.id,
      },
    ));
  }

  return messages;
}

function buildCompleteMessage(cycle: LoopCycle, config: CentaurLoopConfig, locale: Locale): LoopMessage[] {
  const suggestion = cycle.nextSuggestion
    ? locale === 'zh-CN' ? `\n\n💡 下一轮建议：${cycle.nextSuggestion}` : `\n\n💡 Next-cycle suggestion: ${cycle.nextSuggestion}`
    : '';

  return [aiMsg(
    locale === 'zh-CN'
      ? `🎉 ${getLoopConfigLabel(config.id, locale)}第 ${cycle.cycleNumber} 轮完成！${suggestion}\n\n想开始下一轮的话，直接告诉我目标就行。`
      : `🎉 ${getLoopConfigLabel(config.id, locale)} cycle #${cycle.cycleNumber} is complete.${suggestion}\n\nTell me the next goal when you want to run another cycle.`,
    'cycle_complete',
    {
      actions: [
        { id: 'next-cycle', label: locale === 'zh-CN' ? '开始下一轮' : 'Start next cycle', variant: 'primary', action: { type: 'start_loop' } },
      ],
      cycleId: cycle.id,
    },
  )];
}

// ─── 主控制器 ────────────────────────────────────────────────

export class LoopChatController {
  private session: LoopChatSession;
  private config: CentaurLoopConfig;
  private onUpdate: (session: LoopChatSession) => void;
  private locale: Locale;
  // PM Interview 上下文(只活在内存,不入 store;component unmount 就丢)
  private interviewHistory: InterviewTurn[] | null = null;
  private pendingBrief: PMBrief | null = null;

  constructor(
    config: CentaurLoopConfig,
    onUpdate: (session: LoopChatSession) => void,
    locale: Locale = 'zh-CN',
  ) {
    this.config = config;
    this.onUpdate = onUpdate;
    this.locale = locale;
    this.session = {
      id: `chat-${Date.now().toString(36)}`,
      loopConfigId: config.id,
      cycleId: null,
      messages: [
        aiMsg(
          locale === 'zh-CN'
            ? `👋 我是你的${getLoopConfigLabel(config.id, locale)}助手。\n\n${getLoopConfigDescription(config.id, locale)}\n\n告诉我这周的内容增长目标，我来帮你启动闭环。`
            : `👋 I am your ${getLoopConfigLabel(config.id, locale)} assistant.\n\n${getLoopConfigDescription(config.id, locale)}\n\nTell me the content growth goal for this week, and I will start the loop.`,
          'text',
          {
            actions: [
              {
                id: 'start-seo',
                label: locale === 'zh-CN' ? '帮我做本周增长' : 'Plan this week\'s growth loop',
                variant: 'primary',
                action: {
                  type: 'start_loop',
                  payload: {
                    goal: locale === 'zh-CN'
                      ? '这周帮我做一轮 SEO/GEO 内容增长'
                      : 'Run a content growth loop about AI agent feedback loops this week',
                  },
                },
              },
            ],
          },
        ),
      ],
      status: 'idle',
    };
  }

  getSession(): LoopChatSession {
    return this.session;
  }

  private pushMessages(msgs: LoopMessage[]): void {
    this.session = {
      ...this.session,
      messages: [...this.session.messages, ...msgs],
    };
    this.onUpdate(this.session);
  }

  private setStatus(status: LoopChatSession['status']): void {
    this.session = { ...this.session, status };
    this.onUpdate(this.session);
  }

  private noop(_b: SpiritBubblePayload): void { /* no-op */ }

  private get advanceContext() {
    return {
      connected: true,
      ownerContext: '',
      businessContext: '',
      outputLanguage: getOutputLanguageInstruction(this.locale),
      pushBubble: this.noop,
    };
  }

  private getCycle(): LoopCycle | null {
    if (!this.session.cycleId) return null;
    return useLoopStore.getState().cycles[this.session.cycleId] ?? null;
  }

  // ── 处理用户输入 ──────────────────────────────────────────

  async handleUserInput(text: string): Promise<void> {
    // 添加用户消息
    this.pushMessages([humanMsg(text)]);

    const cycle = this.getCycle();
    const currentStage = cycle?.stage ?? 'idle';

    // 如果没有活跃循环 → 走 PM 访谈流(不再直接 startCycle)
    if (!cycle || currentStage === 'cycle_complete') {
      await this.continueInterview(text);
      return;
    }

    const intent = parseUserIntent(text, currentStage);
    await this.handleAction(intent);
  }

  // ── PM 访谈流 ───────────────────────────────────────────
  // 用户进来 → AI 扮 PM 反问需求 → 凑齐 brief → 用户确认 → 才启 cycle
  private async continueInterview(userText: string): Promise<void> {
    // 已经有待确认的 brief,且用户回了"确认/开干"类的话 → 直接启 cycle(不再依赖按钮渲染)
    if (this.pendingBrief && CONFIRM_PATTERNS.test(userText.trim())) {
      const goal = this.pendingBrief.summary || this.pendingBrief.topic;
      this.pendingBrief = null;
      this.interviewHistory = null;
      await this.startCycle(goal);
      return;
    }

    // 首次招呼直接回引导,不消耗一次 LLM(也避免冷启动延迟)
    if (this.interviewHistory === null && isGreetingOrPing(userText)) {
      this.interviewHistory = []; // 标记进入访谈,后续直接走 LLM
      this.pushMessages([
        aiMsg(
          [
            '👋 我是影刀的产品经理。',
            '在我们开始做之前,先简单聊几句搞清你想要的东西 ——',
            '',
            '**你想做的内容,大概是关于什么的?**',
            '(产品 / 服务 / 故事 / 知识科普,一句话告诉我就行)',
          ].join('\n'),
        ),
      ]);
      return;
    }

    // 用户回答中,但 pendingBrief 已经在但用户给的不是确认 → 当成"我要改"
    if (this.pendingBrief) {
      this.pendingBrief = null; // 清旧 brief,继续访谈用新回答合成新 brief
    }

    // 把用户回答塞进访谈历史
    if (this.interviewHistory === null) this.interviewHistory = [];
    this.interviewHistory.push({ role: 'user', text: userText });

    // 显示 typing 状态
    this.setStatus('running');
    try {
      const reply = await runPMInterview(this.interviewHistory);
      this.setStatus('idle');

      if (reply.brief) {
        // 凑齐了,push brief 卡 + 确认按钮
        this.pendingBrief = reply.brief;
        const briefGoal = reply.brief.summary || reply.brief.topic;
        this.pushMessages([
          aiMsg(formatBriefMarkdown(reply.brief), 'text', {
            actions: [
              {
                id: 'confirm-brief',
                label: '✓ 按这个开干',
                variant: 'primary',
                action: { type: 'start_loop', payload: { goal: briefGoal } },
              },
              {
                id: 'tweak-brief',
                label: '✎ 我要改',
                variant: 'ghost',
                action: { type: 'free_text', payload: { text: '' } },
              },
            ],
          }),
        ]);
        return;
      }

      if (reply.next_question) {
        this.interviewHistory.push({ role: 'pm', text: reply.next_question });
        this.pushMessages([aiMsg(reply.next_question)]);
        return;
      }

      // LLM 失败兜底
      this.pushMessages([
        aiMsg(
          [
            '⚠️ 我这边出了点小问题:' + (reply.error ?? '未知'),
            '',
            '你可以直接把目标整句告诉我,比如:',
            '· 给独立开发者做一条「影刀本地混剪」的小红书,调性高级。',
            '我直接按这个开干。',
          ].join('\n'),
        ),
      ]);
    } catch (e) {
      this.setStatus('idle');
      const msg = e instanceof Error ? e.message : String(e);
      this.pushMessages([
        aiMsg(
          [
            `⚠️ LLM 调用失败:${msg}`,
            '',
            '检查一下右下角的 Runtime 是不是真接通了大模型(没接通会一直走 demo / 报错)。',
            '或者直接把完整目标整句给我,我跳过访谈直接开干。',
          ].join('\n'),
        ),
      ]);
    }
  }

  // ── 处理快捷按钮动作 ──────────────────────────────────────

  async handleAction(action: UserAction): Promise<void> {
    const store = useLoopStore.getState();
    const cycle = this.getCycle();

    switch (action.type) {
      case 'start_loop': {
        const goal = action.payload?.goal ?? action.payload?.text ?? '';
        if (goal) {
          // 启 cycle 前清 PM 访谈上下文,下一轮新 cycle 重新访谈
          this.interviewHistory = null;
          this.pendingBrief = null;
          await this.startCycle(goal);
        }
        return;
      }

      case 'confirm': {
        if (!cycle) return;

        if (action.payload?.taskId) {
          // 确认单篇草稿
          store.updateTask(cycle.id, action.payload.taskId, {
            status: 'confirmed',
            confirmation: { status: 'approved', confirmedAt: now() },
          });
          this.pushMessages([aiMsg(this.locale === 'zh-CN' ? '✅ 已确认。' : '✅ Approved.')]);

          // 检查是否全部审完
          const fresh = useLoopStore.getState().cycles[cycle.id];
          if (fresh && fresh.tasks.every((t) => t.status === 'confirmed' || t.status === 'rejected')) {
            await this.advanceAndTranslate();
          }
          return;
        }

        if (cycle.stage === 'awaiting_memory') {
          for (const candidate of cycle.memoryCandidates) {
            if (candidate.status === 'pending') {
              store.confirmMemory(cycle.id, candidate.id);
            }
          }
        }

        // 通用确认（计划/记忆等）
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'approve_all': {
        if (!cycle) return;
        for (const task of cycle.tasks) {
          if (task.status === 'draft_ready') {
            store.updateTask(cycle.id, task.id, {
              status: 'confirmed',
              confirmation: { status: 'approved', confirmedAt: now() },
            });
          }
        }
        this.pushMessages([aiMsg(this.locale === 'zh-CN' ? '✅ 全部通过！' : '✅ All drafts approved.')]);
        await this.advanceAndTranslate();
        return;
      }

      case 'reject':
      case 'modify': {
        if (!cycle) return;
        const note = action.payload?.note ?? (this.locale === 'zh-CN' ? '需要修改' : 'Needs changes');
        this.pushMessages([aiMsg(this.locale === 'zh-CN'
          ? `收到，我记下了你的意见：「${note}」\n\n目前先继续推进，下一轮会结合这个反馈优化。`
          : `Got it. I recorded your change request: "${note}".\n\nFor this MVP I will continue the loop and use this as improvement context.`)]);

        // 暂时按确认处理，后续接入重新生成
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'mark_published': {
        if (!cycle) return;
        for (const task of cycle.tasks) {
          if (task.status === 'confirmed' && !task.publish?.published) {
            store.updateTask(cycle.id, task.id, {
              status: 'published',
              publish: { published: true, publishedAt: now() },
            });
          }
        }
        this.pushMessages([aiMsg(this.locale === 'zh-CN' ? '👍 已标记发布。' : '👍 Marked as published.')]);
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'submit_feedback': {
        if (!cycle) return;
        const fb = action.payload?.feedback;
        if (fb) {
          const task = cycle.tasks.find((t) => t.status === 'published' || t.status === 'confirmed');
          if (task) {
            const feedback = submitQuickFeedback(task.id, cycle.id, {
              published: true,
              views: fb.views,
              likes: fb.likes,
              favorites: fb.favorites,
              comments: fb.comments,
              rating: fb.rating,
              ownerNote: fb.note,
            });
            store.updateTask(cycle.id, task.id, { feedback, status: 'feedback_done' });
          }
        }
        this.pushMessages([aiMsg(this.locale === 'zh-CN' ? '📊 收到反馈数据，开始复盘分析…' : '📊 Feedback received. Starting review...')]);
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'skip': {
        if (!cycle) return;
        const waitingCp = cycle.checkpoints.find((cp) => cp.status === 'waiting');
        if (waitingCp) store.resolveCheckpoint(cycle.id, waitingCp.id);
        await this.advanceAndTranslate();
        return;
      }

      case 'free_text': {
        // 当做修改意见处理
        await this.handleAction({ type: 'modify', payload: action.payload });
        return;
      }
    }
  }

  // ── 启动循环 ──────────────────────────────────────────────

  private async startCycle(goal: string): Promise<void> {
    const store = useLoopStore.getState();
    this.pushMessages([aiMsg(this.locale === 'zh-CN'
      ? `🚀 收到！目标：「${goal}」\n\n正在规划…`
      : `🚀 Got it. Goal: "${goal}"\n\nPlanning now...`, 'progress', { progressStage: 'planning' })]);
    this.setStatus('running');

    const cycleId = store.startCycle(this.config.id, goal, 'manual');
    this.session = { ...this.session, cycleId };

    await this.advanceAndTranslate();
  }

  // ── 推进并翻译 ────────────────────────────────────────────

  private async advanceAndTranslate(): Promise<void> {
    if (!this.session.cycleId) return;

    this.setStatus('running');

    try {
      await advanceLoop(this.session.cycleId, this.advanceContext);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.pushMessages([aiMsg(this.locale === 'zh-CN' ? `❌ 出了点问题：${msg}` : `❌ Something went wrong: ${msg}`)]);
      this.setStatus('waiting_human');
      return;
    }

    // 读取最新状态，翻译成消息
    const cycle = this.getCycle();
    if (!cycle) return;

    const messages = this.translateStage(cycle);
    this.pushMessages(messages);

    const isWaiting = cycle.stage.startsWith('awaiting_');
    const isComplete = cycle.stage === 'cycle_complete';
    this.setStatus(isComplete ? 'complete' : isWaiting ? 'waiting_human' : 'running');
  }

  private translateStage(cycle: LoopCycle): LoopMessage[] {
    switch (cycle.stage) {
      case 'awaiting_plan_review':
        return buildPlanMessage(cycle, this.config, this.locale);
      case 'awaiting_review':
        return buildDraftMessages(cycle, this.locale);
      case 'awaiting_publish':
        return buildPublishMessage(cycle, this.locale);
      case 'awaiting_feedback':
        return buildFeedbackRequest(cycle, this.config, this.locale);
      case 'awaiting_memory':
        return buildReviewMessage(cycle, this.locale);
      case 'cycle_complete':
        return [...buildReviewMessage(cycle, this.locale), ...buildCompleteMessage(cycle, this.config, this.locale)];
      case 'planning':
      case 'generating':
      case 'reviewing_auto':
        return [aiMsg(this.locale === 'zh-CN' ? '⏳ AI 正在工作…' : '⏳ AI is working...', 'progress', { progressStage: cycle.stage })];
      default:
        return [];
    }
  }
}

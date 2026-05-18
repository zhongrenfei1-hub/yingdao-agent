/**
 * 发布包(Publish Pack)结构化数据 + 序列化/反序列化
 *
 * 与 `short-video-publish-packager` 工具对齐:每个目标平台一组
 * (标题/caption/hashtag/建议时间/A-B 版本) + 合规清单 + 24h 观察指标。
 *
 * 存储约定:LoopTaskDraft.fields.publishPackJson(JSON 字符串),
 * 走 fields 通道以保持与 video draft 的渲染模式一致。
 */

export interface PublishPackVariant {
  title: string;
  caption: string;
}

export interface PublishPackPlatform {
  platform: string;
  title: string;
  caption: string;
  hashtags: string[];
  suggestedTime: string;
  abVariants: PublishPackVariant[];
}

export interface PublishPack {
  platforms: PublishPackPlatform[];
  complianceChecklist: string[];
  observation24h: string[];
}

export const PUBLISH_PACK_FIELD = 'publishPackJson';

const PUBLISH_PACK_SCHEMA_HINT = `严格输出一个 JSON 对象,不要 Markdown 代码块包裹,schema:
{
  "platforms": [
    {
      "platform": "抖音" | "TikTok" | "快手" | "小红书",
      "title": "限平台字数",
      "caption": "正文/简介",
      "hashtags": ["#标签1", "#标签2"],
      "suggestedTime": "如 工作日 19:00-21:00",
      "abVariants": [
        { "title": "A 版本标题", "caption": "A 版正文" },
        { "title": "B 版本标题", "caption": "B 版正文" }
      ]
    }
  ],
  "complianceChecklist": ["音乐授权", "人像授权", "..."],
  "observation24h": ["播放量", "完播率", "..."]
}`;

export function publishPackSchemaHint(): string {
  return PUBLISH_PACK_SCHEMA_HINT;
}

export function parsePublishPack(raw: string): PublishPack | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as Partial<PublishPack>;
    if (!Array.isArray(obj.platforms)) return null;
    const platforms: PublishPackPlatform[] = obj.platforms.map((p) => ({
      platform: String(p?.platform ?? '未知平台'),
      title: String(p?.title ?? ''),
      caption: String(p?.caption ?? ''),
      hashtags: Array.isArray(p?.hashtags) ? p.hashtags.map(String) : [],
      suggestedTime: String(p?.suggestedTime ?? ''),
      abVariants: Array.isArray(p?.abVariants)
        ? p.abVariants.map((v) => ({
            title: String(v?.title ?? ''),
            caption: String(v?.caption ?? ''),
          }))
        : [],
    }));
    return {
      platforms,
      complianceChecklist: Array.isArray(obj.complianceChecklist)
        ? obj.complianceChecklist.map(String)
        : [],
      observation24h: Array.isArray(obj.observation24h)
        ? obj.observation24h.map(String)
        : [],
    };
  } catch {
    return null;
  }
}

export function serializePublishPack(pack: PublishPack): string {
  return JSON.stringify(pack, null, 2);
}

export function formatPlatformCopy(platform: PublishPackPlatform): string {
  const parts = [
    `【标题】${platform.title}`,
    '',
    platform.caption,
    '',
    platform.hashtags.join(' '),
  ];
  if (platform.suggestedTime) {
    parts.push('', `建议发布时间:${platform.suggestedTime}`);
  }
  return parts.join('\n').trim();
}

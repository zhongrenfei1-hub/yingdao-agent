import { describe, it, expect } from 'vitest';
import {
  parsePublishPack,
  serializePublishPack,
  formatPlatformCopy,
  publishPackSchemaHint,
  PUBLISH_PACK_FIELD,
} from './publishPack';

const SAMPLE = {
  platforms: [
    {
      platform: '抖音',
      title: '影刀一键自动混剪本地素材',
      caption: '本地素材积一年,影刀读你的素材,按脚本自动剪。',
      hashtags: ['#AI剪辑', '#影刀', '#自动混剪'],
      suggestedTime: '工作日 19:00-21:00',
      abVariants: [
        { title: 'A 版标题', caption: 'A 版正文' },
        { title: 'B 版标题', caption: 'B 版正文' },
      ],
    },
    {
      platform: 'TikTok',
      title: 'Yingdao auto-remix',
      caption: 'AI edits your footage.',
      hashtags: ['#AIediting'],
      suggestedTime: '7-9 PM',
      abVariants: [],
    },
  ],
  complianceChecklist: ['音乐授权', '人像授权', '商标 Logo'],
  observation24h: ['播放量', '完播率', '互动率'],
};

describe('publishPack', () => {
  it('exports stable field name', () => {
    expect(PUBLISH_PACK_FIELD).toBe('publishPackJson');
  });

  it('parses well-formed JSON', () => {
    const raw = JSON.stringify(SAMPLE);
    const parsed = parsePublishPack(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.platforms).toHaveLength(2);
    expect(parsed!.platforms[0].platform).toBe('抖音');
    expect(parsed!.platforms[0].hashtags).toHaveLength(3);
    expect(parsed!.platforms[0].abVariants).toHaveLength(2);
    expect(parsed!.complianceChecklist).toHaveLength(3);
    expect(parsed!.observation24h).toHaveLength(3);
  });

  it('extracts JSON from markdown-fenced output', () => {
    const fenced = '```json\n' + JSON.stringify(SAMPLE) + '\n```';
    const parsed = parsePublishPack(fenced);
    expect(parsed?.platforms).toHaveLength(2);
  });

  it('extracts JSON when LLM prepends explanation text', () => {
    const noisy = 'Sure, here is the publish pack:\n\n' + JSON.stringify(SAMPLE);
    const parsed = parsePublishPack(noisy);
    expect(parsed?.platforms).toHaveLength(2);
  });

  it('returns null for non-JSON input', () => {
    expect(parsePublishPack('not json at all')).toBeNull();
    expect(parsePublishPack('')).toBeNull();
  });

  it('returns null when JSON lacks platforms array', () => {
    expect(parsePublishPack('{"foo":"bar"}')).toBeNull();
  });

  it('serializes and re-parses identically (round trip)', () => {
    const parsed = parsePublishPack(JSON.stringify(SAMPLE));
    const re = parsePublishPack(serializePublishPack(parsed!));
    expect(re).toEqual(parsed);
  });

  it('formats platform copy with title + caption + hashtags + time', () => {
    const parsed = parsePublishPack(JSON.stringify(SAMPLE));
    const out = formatPlatformCopy(parsed!.platforms[0]);
    expect(out).toContain('【标题】');
    expect(out).toContain('影刀一键自动混剪本地素材');
    expect(out).toContain('#AI剪辑');
    expect(out).toContain('工作日 19:00-21:00');
  });

  it('skips suggestedTime when empty', () => {
    const parsed = parsePublishPack(JSON.stringify(SAMPLE));
    const platform = { ...parsed!.platforms[0], suggestedTime: '' };
    const out = formatPlatformCopy(platform);
    expect(out).not.toContain('建议发布时间');
  });

  it('coerces missing fields to safe defaults', () => {
    const partial = {
      platforms: [{ platform: '小红书' }], // 只有 platform,其他字段缺
      complianceChecklist: [],
      observation24h: [],
    };
    const parsed = parsePublishPack(JSON.stringify(partial));
    expect(parsed!.platforms[0]).toEqual({
      platform: '小红书',
      title: '',
      caption: '',
      hashtags: [],
      suggestedTime: '',
      abVariants: [],
    });
  });

  it('publishPackSchemaHint includes JSON schema keywords', () => {
    const hint = publishPackSchemaHint();
    expect(hint).toContain('platforms');
    expect(hint).toContain('hashtags');
    expect(hint).toContain('complianceChecklist');
    expect(hint).toContain('observation24h');
  });
});

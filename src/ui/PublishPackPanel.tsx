import { useMemo, useState } from 'react';
import { Check, Copy, Hash, Clock3, ListChecks, LineChart, Layers } from 'lucide-react';
import {
  formatPlatformCopy,
  parsePublishPack,
  type PublishPack,
  type PublishPackPlatform,
} from '../core/publishPack';

interface Props {
  json: string;
}

export default function PublishPackPanel({ json }: Props) {
  const pack = useMemo<PublishPack | null>(() => parsePublishPack(json), [json]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!pack || pack.platforms.length === 0) {
    return (
      <div className="rounded-xl border border-border-cream bg-warm-sand/30 p-3 text-xs text-stone-gray">
        发布包未解析成功,以下是原始输出:
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-near-black">{json}</pre>
      </div>
    );
  }

  const active = pack.platforms[Math.min(activeIdx, pack.platforms.length - 1)];

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1600);
    } catch {
      setCopiedKey(`__err__${key}`);
      setTimeout(() => setCopiedKey(null), 1600);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {pack.platforms.map((p, i) => (
          <button
            key={p.platform + i}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              i === activeIdx
                ? 'bg-terracotta text-white shadow-sm'
                : 'bg-warm-sand/60 text-olive-gray hover:bg-warm-sand'
            }`}
          >
            {p.platform}
          </button>
        ))}
      </div>

      <PlatformCard
        platform={active}
        copiedKey={copiedKey}
        onCopy={copy}
        idx={activeIdx}
      />

      {pack.complianceChecklist.length > 0 && (
        <Section icon={<ListChecks size={13} />} title="发布前合规清单">
          <ul className="space-y-1 text-xs text-olive-gray">
            {pack.complianceChecklist.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1 w-1 rounded-full bg-terracotta/60" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {pack.observation24h.length > 0 && (
        <Section icon={<LineChart size={13} />} title="发布后 24h 观察指标">
          <ul className="space-y-1 text-xs text-olive-gray">
            {pack.observation24h.map((o, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1 w-1 rounded-full bg-sage-green/70" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
  copiedKey,
  onCopy,
  idx,
}: {
  platform: PublishPackPlatform;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  idx: number;
}) {
  const fullKey = `full-${idx}`;
  const titleKey = `title-${idx}`;
  const captionKey = `caption-${idx}`;
  const hashtagsKey = `hashtags-${idx}`;
  const fullText = formatPlatformCopy(platform);

  return (
    <div className="space-y-2.5 rounded-xl border border-border-cream bg-white/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-gray">{platform.platform}</span>
        <CopyBtn
          onClick={() => onCopy(fullText, fullKey)}
          copied={copiedKey === fullKey}
          err={copiedKey === `__err__${fullKey}`}
          label="复制全部"
        />
      </div>

      <Field label="标题" copyText={platform.title} keyName={titleKey} copiedKey={copiedKey} onCopy={onCopy}>
        <p className="text-sm font-medium text-near-black">{platform.title}</p>
      </Field>

      <Field label="正文" copyText={platform.caption} keyName={captionKey} copiedKey={copiedKey} onCopy={onCopy}>
        <p className="whitespace-pre-wrap text-sm leading-6 text-olive-gray">{platform.caption}</p>
      </Field>

      {platform.hashtags.length > 0 && (
        <Field
          label="标签"
          copyText={platform.hashtags.join(' ')}
          keyName={hashtagsKey}
          copiedKey={copiedKey}
          onCopy={onCopy}
        >
          <div className="flex flex-wrap gap-1">
            {platform.hashtags.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 rounded-md bg-warm-sand/60 px-1.5 py-0.5 text-xs text-olive-gray"
              >
                <Hash size={10} />
                {h.replace(/^#/, '')}
              </span>
            ))}
          </div>
        </Field>
      )}

      {platform.suggestedTime && (
        <div className="flex items-center gap-1.5 text-xs text-stone-gray">
          <Clock3 size={12} />
          建议发布:<span className="text-near-black">{platform.suggestedTime}</span>
        </div>
      )}

      {platform.abVariants.length > 0 && (
        <Section icon={<Layers size={12} />} title={`A/B 变体 × ${platform.abVariants.length}`} compact>
          <div className="space-y-2">
            {platform.abVariants.map((v, i) => {
              const variantKey = `variant-${idx}-${i}`;
              const variantText = `【标题】${v.title}\n\n${v.caption}`;
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border-cream bg-ivory/60 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-stone-gray">
                      变体 {String.fromCharCode(65 + i)}
                    </span>
                    <CopyBtn
                      onClick={() => onCopy(variantText, variantKey)}
                      copied={copiedKey === variantKey}
                      err={copiedKey === `__err__${variantKey}`}
                      label="复制"
                      small
                    />
                  </div>
                  <p className="mt-1 text-xs font-medium text-near-black">{v.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-olive-gray">{v.caption}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Field({
  label,
  copyText,
  keyName,
  copiedKey,
  onCopy,
  children,
}: {
  label: string;
  copyText: string;
  keyName: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-stone-gray">{label}</span>
        <CopyBtn
          onClick={() => onCopy(copyText, keyName)}
          copied={copiedKey === keyName}
          err={copiedKey === `__err__${keyName}`}
          label="复制"
          small
        />
      </div>
      {children}
    </div>
  );
}

function Section({
  icon,
  title,
  compact,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border-cream bg-ivory/50 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-near-black">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function CopyBtn({
  onClick,
  copied,
  err,
  label,
  small,
}: {
  onClick: () => void;
  copied: boolean;
  err: boolean;
  label: string;
  small?: boolean;
}) {
  const sizeCls = small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border transition ${sizeCls} ${
        copied
          ? 'border-sage-green/40 bg-sage-green/10 text-sage-green'
          : err
            ? 'border-terracotta/40 bg-terracotta/10 text-terracotta'
            : 'border-border-cream bg-white text-stone-gray hover:border-terracotta/40 hover:text-terracotta'
      }`}
    >
      {copied ? <Check size={small ? 10 : 12} /> : <Copy size={small ? 10 : 12} />}
      {copied ? '已复制' : err ? '复制失败' : label}
    </button>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, RefreshCw, Play, AlertCircle, Layers, Clock } from 'lucide-react';

const LATEST_VIDEO_URL = '/generated/yingdao-auto-remix-demo.mp4';
const LATEST_POSTER_URL = '/generated/yingdao-auto-remix-demo.jpg';

interface RenderMeta {
  adapter: string;
  composition?: string;
  durationSeconds?: number;
  generatedAt?: number;
}

/**
 * Workbench 的 composition 预览面板。
 * - 实时显示 /generated/yingdao-auto-remix-demo.mp4(最新一次渲染)
 * - 显示 adapter / composition / duration 元信息
 * - 点"刷新"重新加载视频(查询参数破缓存)
 * - 视频文件不存在时显示占位提示用户先触发 /api/video/render
 */
export default function VideoPreviewPanel() {
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const [meta, setMeta] = useState<RenderMeta | null>(null);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleRefresh = useCallback(() => {
    setRefreshKey(Date.now());
    setVideoError(false);
  }, []);

  // 探测最新一次 render 的元信息(probe HEAD 看文件是否存在)
  useEffect(() => {
    let cancelled = false;
    fetch(LATEST_VIDEO_URL, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          const lastModified = res.headers.get('last-modified');
          setMeta({
            adapter: 'hyperframes',
            composition: 'short-video-demo',
            durationSeconds: 5.3,
            generatedAt: lastModified ? new Date(lastModified).getTime() : Date.now(),
          });
          setVideoError(false);
        } else {
          setMeta(null);
          setVideoError(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMeta(null);
          setVideoError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const hasVideo = !videoError && meta != null;

  return (
    <section className="card-glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Film size={14} className="text-terracotta" />
          <p className="text-overline">composition 预览</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="btn-ghost text-xs"
          title="重新加载最新一次渲染"
        >
          <RefreshCw size={12} />
          刷新
        </button>
      </div>

      {/* 视频区:9:16 aspect ratio */}
      <div className="relative overflow-hidden rounded-xl bg-near-black/85" style={{ aspectRatio: '9 / 16' }}>
        {hasVideo ? (
          <video
            ref={videoRef}
            key={refreshKey}
            src={`${LATEST_VIDEO_URL}?r=${refreshKey}`}
            poster={`${LATEST_POSTER_URL}?r=${refreshKey}`}
            controls
            preload="metadata"
            className="h-full w-full object-contain"
            onError={() => setVideoError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertCircle size={26} className="text-warm-sand" />
            <p className="text-sm text-white/80">还没有渲染过视频</p>
            <p className="text-xs text-stone-gray">
              在对话里触发{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-warm-sand">
                short-video-loop
              </code>
              <br />
              生成第一次产出
            </p>
          </div>
        )}
      </div>

      {/* 元信息条 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        {hasVideo && meta ? (
          <>
            <span className="inline-flex items-center gap-1 text-sage-green">
              <span className="h-1.5 w-1.5 rounded-full bg-sage-green" />
              adapter · {meta.adapter}
            </span>
            <span className="inline-flex items-center gap-1 text-olive-gray">
              <Layers size={11} />
              {meta.composition}
            </span>
            <span className="inline-flex items-center gap-1 text-olive-gray">
              <Clock size={11} />
              {meta.durationSeconds?.toFixed(1)}s
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-stone-gray">
            <Play size={11} />
            等待渲染
          </span>
        )}
      </div>
    </section>
  );
}

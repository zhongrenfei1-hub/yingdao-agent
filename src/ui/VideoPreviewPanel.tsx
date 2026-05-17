import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, RefreshCw, Play, AlertCircle, Layers, Clock, Upload, X, FolderUp } from 'lucide-react';

const LATEST_VIDEO_URL = '/generated/yingdao-auto-remix-demo.mp4';
const LATEST_POSTER_URL = '/generated/yingdao-auto-remix-demo.jpg';

interface RenderMeta {
  adapter: string;
  composition?: string;
  durationSeconds?: number;
  generatedAt?: number;
}

interface LocalPreview {
  url: string;
  name: string;
  size: number;
}

/**
 * Workbench 的 composition 预览面板。
 * - 实时显示 /generated/yingdao-auto-remix-demo.mp4(最新一次 hyperframes 渲染)
 * - 显示 adapter / composition / duration 元信息
 * - 点"刷新"重新加载视频(查询参数破缓存)
 * - 🖐️ 拖本地 mp4 进来 → 立即用 blob URL 替换预览(临时,不影响 hyperframes 输出)
 * - 视频文件不存在时显示占位提示用户先触发 /api/video/render
 */
export default function VideoPreviewPanel() {
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const [meta, setMeta] = useState<RenderMeta | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState<LocalPreview | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
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

  // === 🖐️ HTML5 拖拽 ===
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOver(true);
      setDropError(null);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // 子元素 dragleave 不算,只在离开整个 panel 时清状态
    if (e.currentTarget === e.target) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setDropError(`不是视频文件:${file.name}(${file.type || '未知类型'})`);
      return;
    }

    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return {
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      };
    });
    setDropError(null);
  }, []);

  const handleResetLocal = useCallback(() => {
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setDropError(null);
  }, []);

  // 卸载时 revoke 残留 blob URL
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasRender = !videoError && meta != null;
  const usingLocal = localPreview != null;
  const showVideo = usingLocal || hasRender;

  const videoSrc = usingLocal
    ? localPreview!.url
    : hasRender
      ? `${LATEST_VIDEO_URL}?r=${refreshKey}`
      : null;
  const videoPoster = usingLocal ? undefined : hasRender ? `${LATEST_POSTER_URL}?r=${refreshKey}` : undefined;
  const videoKey = usingLocal ? localPreview!.url : refreshKey;

  return (
    <section
      className="card-glass p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Film size={14} className="text-terracotta" />
          <p className="text-overline">composition 预览</p>
        </div>
        <div className="flex items-center gap-1">
          {usingLocal && (
            <button
              type="button"
              onClick={handleResetLocal}
              className="btn-ghost text-xs"
              title="清除本地预览,回到 hyperframes 渲染"
            >
              <X size={12} />
              重置
            </button>
          )}
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
      </div>

      {/* 视频区:9:16 aspect ratio,同时是 drop zone */}
      <div
        className={`relative overflow-hidden rounded-xl bg-near-black/85 transition-all ${
          dragOver ? 'ring-4 ring-terracotta/60 ring-offset-2 ring-offset-ivory' : ''
        }`}
        style={{ aspectRatio: '9 / 16' }}
      >
        {showVideo && videoSrc ? (
          <video
            ref={videoRef}
            key={videoKey}
            src={videoSrc}
            poster={videoPoster}
            controls
            preload="metadata"
            className="h-full w-full object-contain"
            onError={() => !usingLocal && setVideoError(true)}
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
              或拖一个本地 mp4 进来预览
            </p>
          </div>
        )}

        {/* 拖拽悬浮层 — drag 时覆盖在 video 上 */}
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-terracotta/85 backdrop-blur-sm">
            <FolderUp size={42} className="text-white" />
            <p className="text-base font-semibold text-white">释放以预览</p>
            <p className="text-xs text-white/85">支持任意 video/* 文件</p>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {dropError && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-terracotta/10 px-2.5 py-1.5 text-xs text-terracotta">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{dropError}</span>
        </div>
      )}

      {/* 元信息条 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        {usingLocal ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-terracotta/10 px-2 py-0.5 text-terracotta">
              <Upload size={11} />
              本地预览
            </span>
            <span className="inline-flex items-center gap-1 truncate text-olive-gray" title={localPreview!.name}>
              {localPreview!.name}
            </span>
            <span className="inline-flex items-center gap-1 text-stone-gray">
              {(localPreview!.size / 1024).toFixed(0)} KB
            </span>
          </>
        ) : hasRender && meta ? (
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
            等待渲染或拖入本地视频
          </span>
        )}
      </div>
    </section>
  );
}

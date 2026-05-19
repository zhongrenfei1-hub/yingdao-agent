import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, RefreshCw, Sparkles, Layers, Clock, Upload, X, FolderUp } from 'lucide-react';

// iris 紫一抹 — 跟用户的全局视觉偏好对齐(浅色 + 紫色 accent),
// 不污染影刀 warm 色板,只局限在这个面板的强调色
const IRIS = '#7c3aed';
const IRIS_SOFT = 'rgba(124, 58, 237, 0.10)';
const IRIS_RING = 'rgba(124, 58, 237, 0.35)';

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
      className="relative overflow-hidden rounded-2xl border border-border-cream bg-white/75 p-4 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.15)] backdrop-blur-sm"
      style={{
        backgroundImage: `radial-gradient(circle at 100% 0%, ${IRIS_SOFT} 0%, transparent 55%)`,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 顶部:标题 + 操作 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg shadow-sm"
            style={{ background: IRIS, color: '#fff' }}
          >
            <Film size={14} />
          </span>
          <div>
            <p className="text-sm font-semibold text-near-black">视频预览</p>
            <p className="text-[10px] text-stone-gray">最新一次 hyperframes 渲染 · 可拖本地 mp4 临时替换</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {usingLocal && (
            <button
              type="button"
              onClick={handleResetLocal}
              className="inline-flex items-center gap-1 rounded-lg border border-border-cream bg-white/80 px-2 py-1 text-[11px] text-stone-gray transition hover:text-near-black"
              title="清除本地预览,回到 hyperframes 渲染"
              style={{ borderColor: 'rgba(124, 58, 237, 0.2)' }}
            >
              <X size={11} />
              重置
            </button>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1 rounded-lg border border-border-cream bg-white/80 px-2 py-1 text-[11px] text-stone-gray transition hover:text-near-black"
            title="重新加载最新一次渲染"
            style={{ borderColor: 'rgba(124, 58, 237, 0.2)' }}
          >
            <RefreshCw size={11} />
            刷新
          </button>
        </div>
      </div>

      {/* 视频区:9:16,浅色 + 紫晕,不再死黑 */}
      <div
        className="relative overflow-hidden rounded-2xl border transition-all"
        style={{
          aspectRatio: '9 / 16',
          background: showVideo
            ? '#0b0b14'
            : `linear-gradient(160deg, #faf5ff 0%, #f3eaff 50%, #e9dcff 100%)`,
          borderColor: dragOver ? IRIS : 'rgba(124, 58, 237, 0.18)',
          boxShadow: dragOver
            ? `0 0 0 4px ${IRIS_RING}, 0 18px 40px -16px rgba(124, 58, 237, 0.35)`
            : `0 12px 32px -16px rgba(124, 58, 237, 0.25)`,
        }}
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
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 30% 25%, rgba(124,58,237,0.18) 0%, transparent 45%), radial-gradient(circle at 75% 80%, rgba(124,58,237,0.10) 0%, transparent 50%)',
                pointerEvents: 'none',
              }}
            />
            <span
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
              style={{ background: '#fff', color: IRIS }}
            >
              <Sparkles size={22} />
            </span>
            <p className="relative text-sm font-medium" style={{ color: '#3b1e6e' }}>
              视频还没渲染
            </p>
            <p className="relative text-xs leading-5" style={{ color: '#6b4ea5' }}>
              在对话里跑一轮 <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[11px]" style={{ color: IRIS }}>short-video-loop</code>
              <br />
              或拖一个本地 mp4 进来先看
            </p>
          </div>
        )}

        {/* 拖拽悬浮层 — 紫色玻璃 */}
        {dragOver && (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 backdrop-blur-md"
            style={{ background: 'rgba(124, 58, 237, 0.78)' }}
          >
            <FolderUp size={42} className="text-white drop-shadow" />
            <p className="text-base font-semibold text-white">释放以预览</p>
            <p className="text-xs text-white/90">任意 video/* 文件</p>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {dropError && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-terracotta/20 bg-terracotta/5 px-2.5 py-1.5 text-xs text-terracotta">
          <X size={12} className="mt-0.5 shrink-0" />
          <span>{dropError}</span>
        </div>
      )}

      {/* 元信息 chip 行 */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {usingLocal ? (
          <>
            <Chip iris icon={<Upload size={10} />} label="本地预览" />
            <Chip muted label={localPreview!.name} truncate title={localPreview!.name} />
            <Chip muted label={`${(localPreview!.size / 1024).toFixed(0)} KB`} />
          </>
        ) : hasRender && meta ? (
          <>
            <Chip iris icon={<span className="h-1.5 w-1.5 rounded-full bg-current" />} label={meta.adapter} />
            <Chip muted icon={<Layers size={10} />} label={meta.composition ?? ''} />
            <Chip muted icon={<Clock size={10} />} label={`${meta.durationSeconds?.toFixed(1)}s`} />
          </>
        ) : (
          <Chip muted icon={<Sparkles size={10} />} label="等渲染或拖入本地视频" />
        )}
      </div>
    </section>
  );
}

function Chip({
  icon,
  label,
  iris,
  muted,
  truncate,
  title,
}: {
  icon?: React.ReactNode;
  label: string;
  iris?: boolean;
  muted?: boolean;
  truncate?: boolean;
  title?: string;
}) {
  const baseCls = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]';
  const truncCls = truncate ? 'max-w-[160px] truncate' : '';
  if (iris) {
    return (
      <span
        className={`${baseCls} ${truncCls}`}
        title={title}
        style={{ background: IRIS_SOFT, color: IRIS, border: '1px solid rgba(124,58,237,0.25)' }}
      >
        {icon}
        {label}
      </span>
    );
  }
  return (
    <span
      className={`${baseCls} ${truncCls} ${muted ? 'bg-warm-sand/50 text-olive-gray' : 'bg-white/70 text-near-black'}`}
      title={title}
    >
      {icon}
      {label}
    </span>
  );
}

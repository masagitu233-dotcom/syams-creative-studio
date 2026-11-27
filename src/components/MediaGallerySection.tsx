import { useState } from 'react';
import { Film, Images, Play, X } from 'lucide-react';
import { buildMediaProxyUrl, isVideoMimeType } from '../utils/studioLogic';
import { StudioImage } from './StudioImage';
import type { MediaGalleryItem } from '../types/studio';

interface MediaGallerySectionProps {
  items?: MediaGalleryItem[];
  title?: string;
  compact?: boolean;
  cacheVersion?: unknown;
}

export function MediaGallerySection({
  items,
  title = 'Dokumentasi & Galeri Media',
  compact = false,
  cacheVersion,
}: MediaGallerySectionProps) {
  const [activeItem, setActiveItem] = useState<MediaGalleryItem | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <Images className="w-4 h-4 text-[#0F3D3A]" />
          <h2
            className={`font-display font-bold text-[#171717] ${
              compact ? 'text-sm' : 'text-base sm:text-lg'
            }`}
          >
            {title}
          </h2>
        </div>
        <span className="font-mono text-[11px] font-semibold text-[#525252]">
          {items.length} media
        </span>
      </div>

      <div
        className={`grid gap-2.5 ${
          compact
            ? 'grid-cols-2 sm:grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        }`}
      >
        {items.map((item) => {
          const isVideo = isVideoMimeType(item.mimeType);
          const proxyUrl = buildMediaProxyUrl(item.fileId, 'public', cacheVersion);
          return (
            <button
              key={item.fileId}
              type="button"
              onClick={() => setActiveItem(item)}
              className="group nb-card overflow-hidden text-left transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="relative aspect-[16/10] bg-[#171717] overflow-hidden">
                {isVideo ? (
                  <div className="w-full h-full relative flex items-center justify-center bg-[#0F3D3A]">
                    <video
                      src={proxyUrl}
                      muted
                      preload="metadata"
                      playsInline
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                      <span className="w-9 h-9 bg-[#F3C95B] text-[#171717] border-2 border-[#171717] rounded-[4px] nb-shadow-sm flex items-center justify-center">
                        <Play className="w-4 h-4 fill-current" />
                      </span>
                      <span className="mt-1 px-1.5 py-0.5 bg-[#171717] text-[#F8F8E1] font-mono text-[9px] uppercase rounded-[2px]">
                        Video
                      </span>
                    </div>
                  </div>
                ) : (
                  <StudioImage
                    src={item.imageUrl}
                    driveFileId={item.fileId}
                    cacheVersion={cacheVersion}
                    alt={item.caption || item.fileName}
                    aspectClass="aspect-[16/10]"
                    className="group-hover:scale-[1.03]"
                  />
                )}
              </div>

              {(item.caption || item.fileName) && (
                <div className="px-2.5 py-1.5 bg-white border-t-2 border-[#171717] flex items-center justify-between gap-1.5">
                  <p className="text-[11px] font-medium text-[#171717] truncate">
                    {item.caption || item.fileName}
                  </p>
                  {isVideo && <Film className="w-3 h-3 text-[#6C151E] shrink-0" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox Preview Modal */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 bg-[#171717]/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${activeItem.caption || activeItem.fileName}`}
          onClick={() => setActiveItem(null)}
        >
          <div
            className="nb-card max-w-4xl w-full overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 bg-[#F8F8E1] border-b-2 border-[#171717] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-[#171717] truncate">
                  {activeItem.caption || activeItem.fileName}
                </p>
                <p className="font-mono text-[10px] text-[#525252] truncate">
                  {activeItem.mimeType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                aria-label="Tutup pratinjau media"
                className="nb-btn nb-btn-surface p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#171717] flex items-center justify-center max-h-[75vh] overflow-hidden">
              {isVideoMimeType(activeItem.mimeType) ? (
                <video
                  src={buildMediaProxyUrl(activeItem.fileId, 'public', cacheVersion)}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[75vh] w-full object-contain"
                />
              ) : (
                <StudioImage
                  src={activeItem.imageUrl}
                  driveFileId={activeItem.fileId}
                  cacheVersion={cacheVersion}
                  alt={activeItem.caption || activeItem.fileName}
                  aspectClass="w-full h-[65vh] max-h-[75vh]"
                  fit="contain"
                  loading="eager"
                  allowSrcFallback={Boolean(activeItem.imageUrl)}
                  showErrorDetails
                  className="max-h-[75vh]"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

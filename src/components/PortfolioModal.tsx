import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StudioImage } from './StudioImage';
import { MediaGallerySection } from './MediaGallerySection';
import { SERVICE_CATEGORY_LABELS, sanitizeExternalUrl } from '../utils/studioLogic';
import type { PortfolioItem } from '../types/studio';

interface PortfolioModalProps {
  item: PortfolioItem | null;
  onClose: () => void;
}

export function PortfolioModal({ item, onClose }: PortfolioModalProps) {
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  const safeProjectUrl = item ? sanitizeExternalUrl(item.projectUrl) : '';

  return (
    <AnimatePresence>
      {item && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="portfolio-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#171717]/70"
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-[#F8F8E1] border-2 border-[#171717] nb-shadow-lg rounded-[4px] max-w-xl w-full max-h-[88vh] overflow-y-auto"
          >
            <div className="sticky top-0 z-20 bg-[#F8F8E1] border-b-2 border-[#171717] px-4 py-2.5 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#525252] truncate">
                {SERVICE_CATEGORY_LABELS[item.category]} · {item.clientName} · {item.year}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup detail portofolio"
                className="nb-btn nb-btn-surface p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border-b-2 border-[#171717] bg-[#F1F1D3]">
              <StudioImage
                src={item.imageUrl}
                driveFileId={item.driveFileId}
                cacheVersion={item.updatedAt}
                alt={item.title}
                aspectClass="aspect-[16/9] max-h-[240px]"
              />
            </div>

            <div className="p-4 sm:p-5 space-y-4 bg-white">
              <div className="space-y-1.5">
                <h2
                  id="portfolio-modal-title"
                  className="font-display font-bold text-lg sm:text-xl text-[#171717] leading-snug"
                >
                  {item.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">{item.summary}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                {item.challenge && (
                  <div className="p-3 border-2 border-[#171717] bg-[#F8F8E1] rounded-[4px] h-full">
                    <h3 className="font-display font-bold text-xs text-[#6C151E] mb-1">
                      Tantangan Awal
                    </h3>
                    <p className="text-xs text-[#333333] leading-relaxed">
                      {item.challenge}
                    </p>
                  </div>
                )}
                <div className="p-3 border-2 border-[#171717] bg-[#F8F8E1] rounded-[4px] h-full">
                  <h3 className="font-display font-bold text-xs text-[#0F3D3A] mb-1">
                    Solusi & Hasil
                  </h3>
                  <p className="text-xs text-[#333333] leading-relaxed">
                    {item.outcome}
                  </p>
                </div>
              </div>

              <div className="p-3 border-2 border-[#171717] bg-[#8ACCD5]/35 rounded-[4px]">
                <p className="text-[11px] font-medium text-[#171717]">Dampak Terukur</p>
                <p className="font-display font-bold text-sm text-[#0F3D3A] mt-0.5">
                  {item.metrics}
                </p>
              </div>

              {item.gallery && item.gallery.length > 0 && (
                <div className="pt-1">
                  <MediaGallerySection
                    items={item.gallery}
                    title="Dokumentasi Proyek"
                    cacheVersion={item.updatedAt}
                    compact
                  />
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                {safeProjectUrl ? (
                  <a
                    href={safeProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nb-btn nb-btn-surface nb-btn-sm w-full sm:w-auto"
                  >
                    Buka Tautan Proyek
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-[#525252]">
                    Tertarik membuat proyek serupa?
                  </span>
                )}

                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="nb-btn nb-btn-primary nb-btn-md w-full sm:w-auto"
                >
                  Pesan Layanan Serupa
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

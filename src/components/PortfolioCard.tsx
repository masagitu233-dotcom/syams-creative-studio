import { ArrowUpRight } from 'lucide-react';
import { StudioImage } from './StudioImage';
import { SERVICE_CATEGORY_LABELS } from '../utils/studioLogic';
import type { PortfolioItem } from '../types/studio';

interface PortfolioCardProps {
  item: PortfolioItem;
  onSelect: (item: PortfolioItem) => void;
}

export function PortfolioCard({ item, onSelect }: PortfolioCardProps) {
  return (
    <article className="group nb-card-interactive overflow-hidden flex flex-col h-full">
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-label={`Buka detail karya ${item.title}`}
        className="flex flex-col h-full text-left w-full cursor-pointer focus-visible:outline-none"
      >
        <div className="border-b-2 border-[#171717] overflow-hidden w-full shrink-0">
          <StudioImage
            src={item.imageUrl}
            driveFileId={item.driveFileId}
            alt={item.title}
            aspectClass="aspect-[16/10]"
            className="group-hover:scale-[1.03]"
          />
        </div>

        <div className="p-2 sm:p-2.5 flex flex-col flex-1 gap-1.5 w-full">
          <div className="space-y-0.5 flex-1">
            <p className="text-[10px] font-semibold text-[#6C151E] truncate leading-tight">
              {SERVICE_CATEGORY_LABELS[item.category]}
            </p>
            <h3 className="font-display font-bold text-xs sm:text-[13px] text-[#171717] leading-snug line-clamp-2 min-h-[2rem] group-hover:text-[#0F3D3A] transition-colors">
              {item.title}
            </h3>
          </div>

          <div className="pt-1.5 border-t border-[#171717]/15 flex items-center justify-between text-[11px] font-display font-semibold text-[#0F3D3A] mt-auto">
            <span>Lihat Detail</span>
            <ArrowUpRight className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </button>
    </article>
  );
}

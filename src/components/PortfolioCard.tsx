import { ArrowUpRight } from 'lucide-react';
import { StudioImage } from './StudioImage';
import { useDesign } from '../contexts/DesignContext';
import { useTheme } from '../contexts/ThemeContext';
import { resolveCardAppearance } from '../utils/designSystem';
import { SERVICE_CATEGORY_LABELS } from '../utils/studioLogic';
import type { PortfolioItem } from '../types/studio';

interface PortfolioCardProps {
  item: PortfolioItem;
  onSelect: (item: PortfolioItem) => void;
  forceList?: boolean;
}

export function PortfolioCard({ item, onSelect, forceList = false }: PortfolioCardProps) {
  const { design, viewport, previewThemeOverride } = useDesign();
  const { activeTheme } = useTheme();
  const theme = previewThemeOverride ?? activeTheme;

  const itemOverride = design.portfolio.itemOverrides[item.id];
  const {
    card,
    effectiveImagePosition,
    articleStyle,
    hoverClass,
    paddingClass,
    aspectClass,
    textAlignClass,
  } = resolveCardAppearance(design.portfolio.card, theme, viewport, design.responsive, itemOverride);

  const imagePos = forceList && effectiveImagePosition === 'top' ? 'left' : effectiveImagePosition;
  const isHorizontal = imagePos === 'left' || imagePos === 'right';
  const isBg = imagePos === 'background';

  const buttonStyle: React.CSSProperties = {
    ...(card.buttonBg ? { backgroundColor: card.buttonBg, borderColor: card.buttonBg } : {}),
    ...(card.buttonText ? { color: card.buttonText } : {}),
  };

  if (isBg) {
    return (
      <article
        style={articleStyle}
        className={`group nb-card-interactive ${hoverClass} relative overflow-hidden flex flex-col justify-end min-h-[215px] h-full`}
      >
        <button
          type="button"
          onClick={() => onSelect(item)}
          aria-label={`Buka detail karya ${item.title}`}
          className="relative flex flex-col justify-end h-full text-left w-full cursor-pointer focus-visible:outline-none"
        >
          <div className="absolute inset-0">
            <StudioImage
              src={item.imageUrl}
              driveFileId={item.driveFileId}
              cacheVersion={item.updatedAt}
              alt={item.title}
              aspectClass="w-full h-full"
              className="group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/92 via-[#171717]/45 to-transparent" />
          </div>
          <div className={`relative z-10 ${paddingClass} flex flex-col gap-1 text-white ${textAlignClass}`}>
            {card.showCategory && (
              <p className="text-[10px] font-semibold text-[#F3C95B] truncate">
                {SERVICE_CATEGORY_LABELS[item.category]}
              </p>
            )}
            <h3
              className="font-display leading-snug line-clamp-2"
              style={{ fontSize: `${card.titleSizePx}px`, fontWeight: card.titleWeight }}
            >
              {item.title}
            </h3>
            {card.showMeta && (
              <p className="text-[10px] text-white/75 truncate">
                {item.clientName} · {item.year}
              </p>
            )}
          </div>
        </button>
      </article>
    );
  }

  return (
    <article
      style={articleStyle}
      className={`group nb-card-interactive ${hoverClass} overflow-hidden flex h-full`}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-label={`Buka detail karya ${item.title}`}
        className={`flex h-full text-left w-full cursor-pointer focus-visible:outline-none ${
          isHorizontal
            ? imagePos === 'right'
              ? 'flex-row-reverse'
              : 'flex-row'
            : 'flex-col'
        }`}
      >
        <div
          className={`overflow-hidden shrink-0 ${
            isHorizontal
              ? 'w-[38%] min-w-[100px] border-r-2 border-[#171717]'
              : 'w-full border-b-2 border-[#171717]'
          }`}
          style={card.borderColor ? { borderColor: card.borderColor } : undefined}
        >
          <StudioImage
            src={item.imageUrl}
            driveFileId={item.driveFileId}
            cacheVersion={item.updatedAt}
            alt={item.title}
            aspectClass={isHorizontal ? 'h-full min-h-[112px] w-full' : aspectClass}
            className="group-hover:scale-[1.03]"
          />
        </div>

        <div className={`${paddingClass} flex flex-col flex-1 gap-1.5 w-full min-w-0 ${textAlignClass}`}>
          <div className="space-y-0.5 flex-1 w-full">
            {card.showCategory && (
              <p
                className="text-[10px] font-semibold text-[#6C151E] truncate leading-tight"
                style={card.accentColor ? { color: card.accentColor } : undefined}
              >
                {SERVICE_CATEGORY_LABELS[item.category]}
              </p>
            )}
            <h3
              className="font-display font-bold text-xs sm:text-[13px] text-[#171717] leading-snug line-clamp-2 min-h-[2rem] group-hover:text-[#0F3D3A] transition-colors"
              style={{
                ...(card.titleSizePx !== 13 ? { fontSize: `${card.titleSizePx}px` } : {}),
                ...(card.titleWeight !== 700 ? { fontWeight: card.titleWeight } : {}),
                ...(card.textColor ? { color: card.textColor } : {}),
              }}
            >
              {item.title}
            </h3>
            {card.showMeta && (
              <p className="text-[10px] text-[#525252] truncate">
                {item.clientName} · {item.year}
              </p>
            )}
            {card.showDescription && (
              <p
                className="text-[#404040] leading-relaxed line-clamp-2 pt-0.5"
                style={{
                  fontSize: `${card.descriptionSizePx}px`,
                  ...(card.textColor ? { color: card.textColor, opacity: 0.78 } : {}),
                }}
              >
                {item.summary}
              </p>
            )}
          </div>

          {card.showActionButton && (
            <div className="pt-1.5 border-t border-[#171717]/15 flex items-center justify-between text-[11px] font-display font-semibold text-[#0F3D3A] mt-auto w-full">
              <span
                className={card.buttonBg ? 'px-2 py-0.5 rounded-[3px]' : ''}
                style={buttonStyle}
              >
                Lihat Detail
              </span>
              <ArrowUpRight className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}
        </div>
      </button>
    </article>
  );
}

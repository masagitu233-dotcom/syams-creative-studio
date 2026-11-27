import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { StudioImage } from './StudioImage';
import { useDesign } from '../contexts/DesignContext';
import { useTheme } from '../contexts/ThemeContext';
import { resolveCardAppearance } from '../utils/designSystem';
import { SERVICE_CATEGORY_LABELS } from '../utils/studioLogic';
import type { ServiceItem } from '../types/studio';

interface ServiceCardProps {
  service: ServiceItem;
  forceList?: boolean;
}

export function ServiceCard({ service, forceList = false }: ServiceCardProps) {
  const { design, viewport, isEmbeddedPreview, previewThemeOverride } = useDesign();
  const { activeTheme } = useTheme();
  const theme = previewThemeOverride ?? activeTheme;

  const itemOverride = design.services.itemOverrides[service.id];
  const {
    card,
    effectiveImagePosition,
    articleStyle,
    hoverClass,
    paddingClass,
    aspectClass,
    textAlignClass,
  } = resolveCardAppearance(design.services.card, theme, viewport, design.responsive, itemOverride);

  const imagePos = forceList && effectiveImagePosition === 'top' ? 'left' : effectiveImagePosition;
  const isHorizontal = imagePos === 'left' || imagePos === 'right';
  const isBg = imagePos === 'background';

  const primaryBtnStyle: React.CSSProperties = {
    ...(card.buttonBg ? { backgroundColor: card.buttonBg, borderColor: card.buttonBg } : {}),
    ...(card.buttonText ? { color: card.buttonText } : {}),
  };

  const blockLink = (e: React.MouseEvent) => {
    if (isEmbeddedPreview) e.preventDefault();
  };

  if (isBg) {
    return (
      <article
        style={articleStyle}
        className={`group nb-card-interactive ${hoverClass} relative overflow-hidden flex flex-col justify-end min-h-[225px] h-full`}
      >
        <div className="absolute inset-0">
          <StudioImage
            src={service.imageUrl}
            driveFileId={service.driveFileId}
            cacheVersion={service.updatedAt}
            alt={service.title}
            accentColor={service.accentColor}
            aspectClass="w-full h-full"
            className="group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/92 via-[#171717]/48 to-transparent" />
        </div>
        <div className={`relative z-10 ${paddingClass} flex flex-col gap-1.5 text-white ${textAlignClass}`}>
          {card.showCategory && (
            <span className="text-[10px] font-semibold text-[#F3C95B]">
              {SERVICE_CATEGORY_LABELS[service.category]}
            </span>
          )}
          <h3
            className="font-display leading-snug line-clamp-2"
            style={{ fontSize: `${card.titleSizePx}px`, fontWeight: card.titleWeight }}
          >
            <Link to={`/layanan/${service.slug}`} onClick={blockLink} className="hover:underline">
              {service.title}
            </Link>
          </h3>
          {card.showPrice && (
            <p className="font-mono font-bold text-[#F3C95B]" style={{ fontSize: `${card.priceSizePx}px` }}>
              {service.priceLabel}
            </p>
          )}
          {card.showActionButton && (
            <div className="pt-1.5 grid grid-cols-2 gap-1.5 w-full">
              <Link to={`/layanan/${service.slug}`} onClick={blockLink} className="nb-btn nb-btn-surface nb-btn-xs w-full">
                Detail
              </Link>
              <Link
                to={`/checkout?service=${encodeURIComponent(service.slug)}`}
                onClick={blockLink}
                style={primaryBtnStyle}
                className="nb-btn nb-btn-primary nb-btn-xs w-full"
              >
                Pesan
              </Link>
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      style={articleStyle}
      className={`group nb-card-interactive ${hoverClass} overflow-hidden flex h-full ${
        isHorizontal
          ? imagePos === 'right'
            ? 'flex-row-reverse'
            : 'flex-row'
          : 'flex-col'
      }`}
    >
      <Link
        to={`/layanan/${service.slug}`}
        onClick={blockLink}
        className={`relative block overflow-hidden shrink-0 ${
          isHorizontal
            ? 'w-[38%] min-w-[100px] border-r-2 border-[#171717]'
            : 'w-full border-b-2 border-[#171717]'
        }`}
        style={card.borderColor ? { borderColor: card.borderColor } : undefined}
        aria-label={`Lihat detail layanan ${service.title}`}
      >
        <StudioImage
          src={service.imageUrl}
          driveFileId={service.driveFileId}
          cacheVersion={service.updatedAt}
          alt={service.title}
          accentColor={service.accentColor}
          aspectClass={isHorizontal ? 'h-full min-h-[116px] w-full' : aspectClass}
          className="group-hover:scale-[1.03]"
        />
        {card.showPrice && card.pricePosition === 'top_badge' && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#0F3D3A] text-[#F3C95B] font-mono font-bold text-[10px] border border-[#171717] max-w-[90%] truncate">
            {service.priceLabel}
          </span>
        )}
      </Link>

      <div className={`${paddingClass} flex flex-col flex-1 gap-2 min-w-0 ${textAlignClass}`}>
        <div className="space-y-1 flex-1 flex flex-col w-full">
          {card.showCategory && (
            <p
              className="text-[10px] font-semibold text-[#6C151E] truncate"
              style={card.accentColor ? { color: card.accentColor } : undefined}
            >
              {SERVICE_CATEGORY_LABELS[service.category]}
            </p>
          )}

          <h3
            className="font-display font-bold text-xs sm:text-[13px] text-[#171717] leading-snug line-clamp-2 min-h-[2rem]"
            style={{
              ...(card.titleSizePx !== 13 ? { fontSize: `${card.titleSizePx}px` } : {}),
              ...(card.titleWeight !== 700 ? { fontWeight: card.titleWeight } : {}),
              ...(card.textColor ? { color: card.textColor } : {}),
            }}
          >
            <Link
              to={`/layanan/${service.slug}`}
              onClick={blockLink}
              className="hover:text-[#0F3D3A] transition-colors"
            >
              {service.title}
            </Link>
          </h3>

          {card.showDescription && (
            <p
              className="text-[#404040] leading-relaxed line-clamp-2"
              style={{
                fontSize: `${card.descriptionSizePx}px`,
                ...(card.textColor ? { color: card.textColor, opacity: 0.78 } : {}),
              }}
            >
              {service.shortDescription}
            </p>
          )}

          {card.showPrice && card.pricePosition !== 'top_badge' && (
            <p
              className="font-mono font-bold text-[11px] sm:text-xs text-[#0F3D3A] tabular-nums leading-snug line-clamp-2 min-h-[1.85rem] mt-auto pt-0.5"
              style={{
                ...(card.priceSizePx !== 13 ? { fontSize: `${Math.max(11, card.priceSizePx - 1)}px` } : {}),
                ...(card.accentColor ? { color: card.accentColor } : {}),
              }}
            >
              {service.priceLabel}
            </p>
          )}
        </div>

        {card.showActionButton && (
          <div className="pt-2 border-t border-[#171717]/15 grid grid-cols-2 gap-1.5 mt-auto w-full">
            <Link
              to={`/layanan/${service.slug}`}
              onClick={blockLink}
              className="nb-btn nb-btn-surface nb-btn-xs w-full"
            >
              Detail
            </Link>
            <Link
              to={`/checkout?service=${encodeURIComponent(service.slug)}`}
              onClick={blockLink}
              style={primaryBtnStyle}
              className="nb-btn nb-btn-primary nb-btn-xs w-full"
            >
              Pesan
              <ArrowRight className="w-2.5 h-2.5 hidden sm:inline shrink-0" />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

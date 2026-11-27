import { Link } from 'react-router-dom';
import { StudioImage } from './StudioImage';
import { useDesign } from '../contexts/DesignContext';
import { useTheme } from '../contexts/ThemeContext';
import { resolveCardAppearance } from '../utils/designSystem';
import { DIGITAL_PRODUCT_CATEGORY_LABELS, formatRupiah } from '../utils/studioLogic';
import type { DigitalProductItem } from '../types/studio';

interface ProductCardProps {
  product: DigitalProductItem;
  forceList?: boolean;
}

export function ProductCard({ product, forceList = false }: ProductCardProps) {
  const { design, viewport, isEmbeddedPreview, previewThemeOverride } = useDesign();
  const { activeTheme } = useTheme();
  const theme = previewThemeOverride ?? activeTheme;

  const itemOverride = design.products.itemOverrides[product.id];
  const {
    card,
    effectiveImagePosition,
    articleStyle,
    hoverClass,
    paddingClass,
    aspectClass,
    textAlignClass,
  } = resolveCardAppearance(design.products.card, theme, viewport, design.responsive, itemOverride);

  const imagePos = forceList && effectiveImagePosition === 'top' ? 'left' : effectiveImagePosition;
  const isHorizontal = imagePos === 'left' || imagePos === 'right';
  const isBg = imagePos === 'background';

  const priceElement = card.showPrice ? (
    product.showPrice ? (
      <p
        className="font-mono font-bold text-xs sm:text-[13px] text-[#0F3D3A] tabular-nums leading-none"
        style={{
          ...(card.priceSizePx !== 13 ? { fontSize: `${card.priceSizePx}px` } : {}),
          ...(card.accentColor ? { color: card.accentColor } : {}),
        }}
      >
        {formatRupiah(product.price)}
      </p>
    ) : (
      <p
        className="font-display font-semibold text-[11px] text-[#6C151E] leading-none"
        style={card.accentColor ? { color: card.accentColor } : undefined}
      >
        Lihat Detail
      </p>
    )
  ) : null;

  const buttonStyle: React.CSSProperties = {
    ...(card.buttonBg ? { backgroundColor: card.buttonBg, borderColor: card.buttonBg } : {}),
    ...(card.buttonText ? { color: card.buttonText } : {}),
  };

  if (isBg) {
    return (
      <article
        style={articleStyle}
        className={`group nb-card-interactive ${hoverClass} relative overflow-hidden flex flex-col justify-end min-h-[210px] h-full`}
      >
        <Link
          to={`/produk/${product.slug}`}
          onClick={(e) => {
            if (isEmbeddedPreview) e.preventDefault();
          }}
          className="relative flex flex-col justify-end h-full w-full focus-visible:outline-none"
          aria-label={`Lihat detail produk ${product.title}`}
        >
          <div className="absolute inset-0">
            <StudioImage
              src={product.imageUrl}
              driveFileId={product.driveFileId}
              cacheVersion={product.updatedAt}
              alt={product.title}
              aspectClass="w-full h-full"
              className="group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/90 via-[#171717]/40 to-transparent" />
          </div>
          {card.showPrice && card.pricePosition === 'top_badge' && product.showPrice && (
            <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-[4px] bg-[#0F3D3A] text-[#F3C95B] font-mono font-bold text-[11px]">
              {formatRupiah(product.price)}
            </span>
          )}
          <div className={`relative z-10 ${paddingClass} flex flex-col gap-1 text-white ${textAlignClass}`}>
            {card.showCategory && (
              <span className="text-[10px] font-semibold text-[#F3C95B]">
                {DIGITAL_PRODUCT_CATEGORY_LABELS[product.category]}
              </span>
            )}
            <h3
              className="font-display leading-snug line-clamp-2"
              style={{ fontSize: `${card.titleSizePx}px`, fontWeight: card.titleWeight }}
            >
              {product.title}
            </h3>
            {card.showPrice && card.pricePosition !== 'top_badge' && product.showPrice && (
              <p className="font-mono font-bold text-[#F3C95B]" style={{ fontSize: `${card.priceSizePx}px` }}>
                {formatRupiah(product.price)}
              </p>
            )}
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article
      style={articleStyle}
      className={`group nb-card-interactive ${hoverClass} overflow-hidden flex h-full`}
    >
      <Link
        to={`/produk/${product.slug}`}
        onClick={(e) => {
          if (isEmbeddedPreview) e.preventDefault();
        }}
        className={`flex h-full w-full focus-visible:outline-none ${
          isHorizontal
            ? imagePos === 'right'
              ? 'flex-row-reverse'
              : 'flex-row'
            : 'flex-col'
        }`}
        aria-label={`Lihat detail produk ${product.title}`}
      >
        <div
          className={`relative overflow-hidden shrink-0 ${
            isHorizontal
              ? 'w-[38%] min-w-[100px] border-r-2 border-[#171717]'
              : 'w-full border-b-2 border-[#171717]'
          }`}
          style={card.borderColor ? { borderColor: card.borderColor } : undefined}
        >
          <StudioImage
            src={product.imageUrl}
            driveFileId={product.driveFileId}
            cacheVersion={product.updatedAt}
            alt={product.title}
            aspectClass={isHorizontal ? 'h-full min-h-[104px] w-full' : aspectClass}
            className="group-hover:scale-[1.03]"
          />
          {card.showPrice && card.pricePosition === 'top_badge' && product.showPrice && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#0F3D3A] text-[#F3C95B] font-mono font-bold text-[10px] border border-[#171717]">
              {formatRupiah(product.price)}
            </span>
          )}
        </div>

        <div className={`${paddingClass} flex flex-col flex-1 justify-between gap-1.5 min-w-0 ${textAlignClass}`}>
          <div className="space-y-1 w-full">
            {card.showCategory && (
              <p
                className="text-[10px] font-semibold text-[#6C151E] truncate"
                style={card.accentColor ? { color: card.accentColor } : undefined}
              >
                {DIGITAL_PRODUCT_CATEGORY_LABELS[product.category]}
              </p>
            )}

            <div className={card.pricePosition === 'inline' ? 'flex items-baseline justify-between gap-2' : ''}>
              <h3
                className="font-display font-bold text-xs sm:text-[13px] text-[#171717] leading-snug line-clamp-2 min-h-[2rem] group-hover:text-[#0F3D3A] transition-colors"
                style={{
                  ...(card.titleSizePx !== 13 ? { fontSize: `${card.titleSizePx}px` } : {}),
                  ...(card.titleWeight !== 700 ? { fontWeight: card.titleWeight } : {}),
                  ...(card.textColor ? { color: card.textColor } : {}),
                }}
              >
                {product.title}
              </h3>
              {card.pricePosition === 'inline' && <div className="shrink-0">{priceElement}</div>}
            </div>

            {card.showDescription && (
              <p
                className="text-[#404040] leading-relaxed line-clamp-2"
                style={{
                  fontSize: `${card.descriptionSizePx}px`,
                  ...(card.textColor ? { color: card.textColor, opacity: 0.78 } : {}),
                }}
              >
                {product.summary}
              </p>
            )}
          </div>

          <div className="w-full space-y-1.5 pt-0.5">
            {card.pricePosition === 'bottom' && priceElement}
            {card.showActionButton && (
              <span
                style={buttonStyle}
                className="nb-btn nb-btn-primary nb-btn-xs w-full mt-1"
              >
                Lihat Produk
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

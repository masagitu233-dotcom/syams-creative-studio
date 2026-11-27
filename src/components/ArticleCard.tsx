import { ArrowUpRight, Calendar, Clock } from 'lucide-react';
import { StudioImage } from './StudioImage';
import { useDesign } from '../contexts/DesignContext';
import { useTheme } from '../contexts/ThemeContext';
import { resolveCardAppearance } from '../utils/designSystem';
import type { CardDesignConfig, StudioArticleItem } from '../types/design';

interface ArticleCardProps {
  article: StudioArticleItem;
  onSelect?: (article: StudioArticleItem) => void;
  cardOverride?: Partial<CardDesignConfig>;
}

export function ArticleCard({ article, onSelect, cardOverride }: ArticleCardProps) {
  const { design, viewport, previewThemeOverride } = useDesign();
  const { activeTheme } = useTheme();
  const theme = previewThemeOverride ?? activeTheme;

  const {
    card,
    effectiveImagePosition,
    articleStyle,
    hoverClass,
    paddingClass,
    aspectClass,
    textAlignClass,
  } = resolveCardAppearance(design.articles.card, theme, viewport, design.responsive, cardOverride);

  const isHorizontal = effectiveImagePosition === 'left' || effectiveImagePosition === 'right';
  const isBg = effectiveImagePosition === 'background';

  const buttonStyle: React.CSSProperties = {
    ...(card.buttonBg ? { backgroundColor: card.buttonBg, borderColor: card.buttonBg } : {}),
    ...(card.buttonText ? { color: card.buttonText } : {}),
  };

  if (isBg) {
    return (
      <article
        style={articleStyle}
        className={`group nb-card-interactive ${hoverClass} relative overflow-hidden flex flex-col justify-end min-h-[240px] h-full`}
      >
        <button
          type="button"
          onClick={() => onSelect?.(article)}
          className="relative flex flex-col justify-end h-full w-full text-left cursor-pointer"
        >
          <div className="absolute inset-0">
            <StudioImage
              src={article.imageUrl}
              driveFileId={article.driveFileId}
              alt={article.title}
              aspectClass="w-full h-full"
              className="group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/90 via-[#171717]/45 to-transparent" />
          </div>
          <div className={`relative z-10 ${paddingClass} flex flex-col gap-1.5 text-white ${textAlignClass}`}>
            {card.showCategory && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#F3C95B]">
                {article.category}
              </span>
            )}
            <h3
              className="font-display leading-snug line-clamp-2"
              style={{ fontSize: `${card.titleSizePx}px`, fontWeight: card.titleWeight }}
            >
              {article.title}
            </h3>
            {card.showDescription && (
              <p
                className="text-white/85 line-clamp-2 leading-relaxed"
                style={{ fontSize: `${card.descriptionSizePx}px` }}
              >
                {article.summary}
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
      className={`group nb-card-interactive ${hoverClass} overflow-hidden flex h-full ${
        isHorizontal
          ? effectiveImagePosition === 'right'
            ? 'flex-row-reverse'
            : 'flex-row'
          : 'flex-col'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect?.(article)}
        className={`flex h-full w-full text-left cursor-pointer focus-visible:outline-none ${
          isHorizontal
            ? effectiveImagePosition === 'right'
              ? 'flex-row-reverse'
              : 'flex-row'
            : 'flex-col'
        }`}
      >
        <div
          className={`overflow-hidden shrink-0 ${
            isHorizontal
              ? 'w-[38%] min-w-[110px] border-r-2 border-[#171717]'
              : 'w-full border-b-2 border-[#171717]'
          }`}
          style={card.borderColor ? { borderColor: card.borderColor } : undefined}
        >
          <StudioImage
            src={article.imageUrl}
            driveFileId={article.driveFileId}
            alt={article.title}
            aspectClass={isHorizontal ? 'h-full min-h-[120px] w-full' : aspectClass}
            className="group-hover:scale-[1.03]"
          />
        </div>

        <div className={`${paddingClass} flex flex-col flex-1 gap-2 min-w-0 ${textAlignClass}`}>
          {card.showCategory && (
            <p
              className="text-[10px] font-semibold text-[#6C151E] uppercase tracking-wide"
              style={card.accentColor ? { color: card.accentColor } : undefined}
            >
              {article.category}
            </p>
          )}

          <h3
            className="font-display text-[#171717] leading-snug line-clamp-2 group-hover:text-[#0F3D3A] transition-colors"
            style={{
              fontSize: `${card.titleSizePx}px`,
              fontWeight: card.titleWeight,
              ...(card.textColor ? { color: card.textColor } : {}),
            }}
          >
            {article.title}
          </h3>

          {card.showDescription && (
            <p
              className="text-[#404040] leading-relaxed line-clamp-3"
              style={{
                fontSize: `${card.descriptionSizePx}px`,
                ...(card.textColor ? { color: card.textColor, opacity: 0.8 } : {}),
              }}
            >
              {article.summary}
            </p>
          )}

          {card.showMeta && (
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono opacity-70 pt-0.5">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {article.publishedDate}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {article.readTime}
              </span>
            </div>
          )}

          {card.showActionButton && (
            <div className="pt-1.5 mt-auto w-full flex items-center justify-between border-t border-[#171717]/15">
              <span
                className={`text-[11px] font-display font-semibold inline-flex items-center gap-1 ${
                  card.buttonBg ? 'px-2.5 py-1 rounded-[4px]' : 'text-[#0F3D3A]'
                }`}
                style={buttonStyle}
              >
                Baca Artikel
                <ArrowUpRight className="w-3 h-3 shrink-0" />
              </span>
            </div>
          )}
        </div>
      </button>
    </article>
  );
}

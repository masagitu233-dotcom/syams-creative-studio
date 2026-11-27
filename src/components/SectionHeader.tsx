import React from 'react';
import type { DesignAlign, DesignFontKey } from '../types/design';
import { getFontStack } from '../utils/designSystem';

interface SectionHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  asPageTitle?: boolean;
  action?: React.ReactNode;
  align?: DesignAlign;
  headingSizePx?: number;
  descriptionSizePx?: number;
  textColor?: string;
  accentColor?: string;
  fontFamily?: DesignFontKey | '';
}

export function SectionHeader({
  kicker,
  title,
  subtitle,
  asPageTitle = false,
  action,
  align = 'left',
  headingSizePx = 0,
  descriptionSizePx = 0,
  textColor = '',
  accentColor = '',
  fontFamily = '',
}: SectionHeaderProps) {
  const isCentered = align === 'center';
  const isRight = align === 'right';

  const wrapperClass = isCentered
    ? 'flex flex-col items-center text-center gap-3'
    : isRight
      ? 'flex flex-col sm:flex-row-reverse sm:items-end justify-between gap-3 text-right'
      : 'flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-left';

  const headingStyle: React.CSSProperties = {
    textWrap: 'balance',
    ...(headingSizePx > 0 ? { fontSize: `${headingSizePx}px` } : {}),
    ...(textColor ? { color: textColor } : {}),
    ...(fontFamily ? { fontFamily: getFontStack(fontFamily) } : {}),
  };

  const subtitleStyle: React.CSSProperties = {
    ...(descriptionSizePx > 0 ? { fontSize: `${descriptionSizePx}px` } : {}),
    ...(textColor ? { color: textColor, opacity: 0.82 } : {}),
  };

  return (
    <div className={wrapperClass}>
      <div className={`space-y-1 ${isCentered ? 'max-w-2xl mx-auto' : 'max-w-2xl'}`}>
        {kicker && (
          <p
            className="text-xs font-semibold text-[#6C151E] leading-none"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {kicker}
          </p>
        )}
        {asPageTitle ? (
          <h1
            className="font-display font-bold text-2xl sm:text-3xl text-[#171717] leading-tight"
            style={headingStyle}
          >
            {title}
          </h1>
        ) : (
          <h2
            className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-tight"
            style={headingStyle}
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-sm text-[#404040] leading-relaxed" style={subtitleStyle}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className={`shrink-0 ${isCentered ? 'self-center' : 'self-start sm:self-end'}`}>
          {action}
        </div>
      )}
    </div>
  );
}

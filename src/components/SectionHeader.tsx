import React from 'react';

interface SectionHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  asPageTitle?: boolean;
  action?: React.ReactNode;
}

export function SectionHeader({
  kicker,
  title,
  subtitle,
  asPageTitle = false,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="space-y-1 max-w-2xl">
        {kicker && (
          <p className="text-xs font-semibold text-[#6C151E] leading-none">{kicker}</p>
        )}
        {asPageTitle ? (
          <h1
            className="font-display font-bold text-2xl sm:text-3xl text-[#171717] leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h1>
        ) : (
          <h2
            className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-sm text-[#404040] leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 self-start sm:self-end">{action}</div>}
    </div>
  );
}

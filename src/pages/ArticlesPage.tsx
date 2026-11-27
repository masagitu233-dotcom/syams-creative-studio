import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, Search, X } from 'lucide-react';
import { useDesign } from '../contexts/DesignContext';
import { ArticleCard } from '../components/ArticleCard';
import { StudioImage } from '../components/StudioImage';
import { FadeScroll } from '../components/FadeScroll';
import {
  resolveCollectionGridLayout,
  resolveSectionContainerStyle,
} from '../utils/designSystem';
import type { StudioArticleItem } from '../types/design';

export function ArticlesPage() {
  const { design, viewport } = useDesign();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [activeArticle, setActiveArticle] = useState<StudioArticleItem | null>(null);

  const publishedItems = useMemo(
    () => design.articles.items.filter((a) => a.isPublished),
    [design.articles.items]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedItems.forEach((a) => set.add(a.category));
    return ['all', ...Array.from(set)];
  }, [publishedItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = publishedItems.filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    });
    return design.articles.section.maxItems > 0
      ? list.slice(0, design.articles.section.maxItems)
      : list;
  }, [publishedItems, category, search, design.articles.section.maxItems]);

  const { sectionStyle, containerStyle, alignClass } = resolveSectionContainerStyle(
    design.articles.section,
    design.global,
    viewport,
    design.responsive
  );

  const gridLayout = resolveCollectionGridLayout({
    layout: design.articles.section.layout,
    colsDesktop: design.articles.section.colsDesktop,
    colsTablet: design.articles.section.colsTablet,
    colsMobile: design.articles.section.colsMobile,
    gapPx: design.articles.section.gapPx,
    viewport,
  });

  return (
    <div style={sectionStyle}>
      <div className="nb-container space-y-4" style={containerStyle}>
        <header className={`space-y-1.5 ${alignClass}`}>
          <nav aria-label="Breadcrumb" className="nb-breadcrumb">
            <Link to="/" className="hover:text-[#0F3D3A] font-medium transition-colors">
              Beranda
            </Link>
            <ChevronRight className="w-3 h-3 text-[#737373] shrink-0" />
            <span className="text-[#171717] font-semibold">Artikel &amp; Konten</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-0.5">
              <h1
                className="font-display font-bold text-lg sm:text-xl lg:text-[1.45rem] text-[#171717] leading-tight"
                style={
                  design.articles.section.headingSizePx > 0
                    ? { fontSize: `${design.articles.section.headingSizePx}px` }
                    : undefined
                }
              >
                {design.articles.pageTitle}
              </h1>
              <p
                className="text-xs sm:text-sm text-[#404040] leading-relaxed"
                style={
                  design.articles.section.descriptionSizePx > 0
                    ? { fontSize: `${design.articles.section.descriptionSizePx}px` }
                    : undefined
                }
              >
                {design.articles.pageSubtitle}
              </p>
            </div>
            <p className="text-xs font-mono font-semibold text-[#0F3D3A] tabular-nums shrink-0">
              {filtered.length} artikel
            </p>
          </div>
        </header>

        <div className="nb-card p-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter kategori artikel">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                onClick={() => setCategory(cat)}
                className="nb-tab"
              >
                {cat === 'all' ? 'Semua Artikel' : cat}
              </button>
            ))}
          </div>
          <div className="relative lg:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#525252] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="article-search" className="sr-only">
              Cari artikel
            </label>
            <input
              id="article-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari artikel atau panduan..."
              className="nb-input nb-input-compact pl-8"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="nb-card p-6 text-center space-y-2">
            <h2 className="font-display font-bold text-base text-[#171717]">Artikel tidak ditemukan</h2>
            <p className="text-xs text-[#525252]">Coba kata kunci lain atau pilih kategori Semua Artikel.</p>
          </div>
        ) : (
          <div className={gridLayout.className} style={gridLayout.style}>
            {filtered.map((art, idx) => (
              <FadeScroll
                key={art.id}
                index={idx}
                columnsPerRow={gridLayout.activeCols}
                className={`h-full ${
                  gridLayout.isHorizontal
                    ? 'min-w-[260px] w-[280px] shrink-0 snap-start'
                    : gridLayout.isBento && idx === 0 && gridLayout.activeCols >= 2
                      ? 'sm:col-span-2'
                      : ''
                }`}
              >
                <ArticleCard article={art} onSelect={(a) => setActiveArticle(a)} />
              </FadeScroll>
            ))}
          </div>
        )}
      </div>

      {/* Article Reader Modal */}
      {activeArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-modal-title"
        >
          <div
            onClick={() => setActiveArticle(null)}
            className="fixed inset-0 bg-[#171717]/70"
          />
          <div className="relative z-10 bg-white border-2 border-[#171717] nb-shadow-lg rounded-[6px] max-w-2xl w-full max-h-[88vh] overflow-y-auto">
            <div className="sticky top-0 z-20 bg-[#F8F8E1] border-b-2 border-[#171717] px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#6C151E] truncate">
                {activeArticle.category}
              </span>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                aria-label="Tutup artikel"
                className="nb-btn nb-btn-surface p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border-b-2 border-[#171717] bg-[#F1F1D3]">
              <StudioImage
                src={activeArticle.imageUrl}
                driveFileId={activeArticle.driveFileId}
                alt={activeArticle.title}
                aspectClass="aspect-[16/9] max-h-[280px]"
              />
            </div>
            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#525252]">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {activeArticle.publishedDate}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {activeArticle.readTime}
                </span>
              </div>
              <h2 id="article-modal-title" className="font-display font-bold text-xl text-[#171717] leading-snug">
                {activeArticle.title}
              </h2>
              <p className="text-sm font-medium text-[#404040] leading-relaxed">
                {activeArticle.summary}
              </p>
              <div className="pt-2 border-t border-[#171717]/15 text-sm text-[#262626] leading-relaxed whitespace-pre-line">
                {activeArticle.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

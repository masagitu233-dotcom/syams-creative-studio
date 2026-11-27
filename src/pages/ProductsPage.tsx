import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { useDesign } from '../contexts/DesignContext';
import { ProductCard } from '../components/ProductCard';
import { ServiceCardSkeleton } from '../components/SkeletonCard';
import { FadeScroll } from '../components/FadeScroll';
import {
  DIGITAL_PRODUCT_CATEGORY_LABELS,
  filterDigitalProducts,
} from '../utils/studioLogic';
import {
  resolveCollectionGridLayout,
  resolveSectionContainerStyle,
} from '../utils/designSystem';
import type { DigitalProductCategory } from '../types/studio';

const PRODUCT_CATEGORIES: { value: DigitalProductCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Produk' },
  { value: 'template_ppt', label: DIGITAL_PRODUCT_CATEGORY_LABELS.template_ppt },
  { value: 'template_poster', label: DIGITAL_PRODUCT_CATEGORY_LABELS.template_poster },
  { value: 'ui_web_kit', label: DIGITAL_PRODUCT_CATEGORY_LABELS.ui_web_kit },
  { value: 'aset_video', label: DIGITAL_PRODUCT_CATEGORY_LABELS.aset_video },
  { value: 'naskah_siap_pakai', label: DIGITAL_PRODUCT_CATEGORY_LABELS.naskah_siap_pakai },
];

export function ProductsPage() {
  const { products, loadingProducts } = useStudioData();
  const { design, viewport } = useDesign();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = (searchParams.get('kategori') as DigitalProductCategory | 'all') || 'all';
  const [category, setCategory] = useState<DigitalProductCategory | 'all'>(
    PRODUCT_CATEGORIES.some((c) => c.value === initialCat) ? initialCat : 'all'
  );
  const [search, setSearch] = useState('');

  const section = design.products.section;
  const { sectionStyle, containerStyle, alignClass } = resolveSectionContainerStyle(
    section,
    design.global,
    viewport,
    design.responsive
  );

  const filteredAll = useMemo(
    () => filterDigitalProducts(products, { category, search }),
    [products, category, search]
  );

  const filtered =
    section.maxItems > 0 ? filteredAll.slice(0, section.maxItems) : filteredAll;

  const grid = resolveCollectionGridLayout({
    layout: section.layout,
    colsDesktop: section.colsDesktop,
    colsTablet: section.colsTablet,
    colsMobile: section.colsMobile,
    gapPx: section.gapPx,
    viewport,
  });

  function handleSelectCategory(val: DigitalProductCategory | 'all') {
    setCategory(val);
    if (val === 'all') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ kategori: val }, { replace: true });
    }
  }

  return (
    <div className="nb-catalog-section" style={sectionStyle}>
      <div className="nb-container space-y-3.5 sm:space-y-4" style={containerStyle}>
        {/* Compact Category Header */}
        <header className={`space-y-1.5 ${alignClass}`}>
          <nav
            aria-label="Breadcrumb"
            className={`nb-breadcrumb ${
              section.textAlign === 'center'
                ? 'justify-center'
                : section.textAlign === 'right'
                  ? 'justify-end'
                  : ''
            }`}
          >
            <Link to="/" className="hover:text-[#0F3D3A] font-medium transition-colors">
              Beranda
            </Link>
            <ChevronRight className="w-3 h-3 text-[#737373] shrink-0" />
            <span className="text-[#171717] font-semibold">Produk Digital</span>
          </nav>

          <div
            className={`flex flex-col ${
              section.textAlign === 'center'
                ? 'items-center text-center'
                : 'sm:flex-row sm:items-end justify-between'
            } gap-2`}
          >
            <div className="space-y-0.5">
              <h1
                className="font-display font-bold text-lg sm:text-xl lg:text-[1.35rem] text-[#171717] leading-tight"
                style={{
                  ...(section.headingSizePx > 0 ? { fontSize: `${section.headingSizePx}px` } : {}),
                  ...(section.textColor ? { color: section.textColor } : {}),
                }}
              >
                {section.customTitle?.trim() || 'Katalog Produk Digital Siap Pakai'}
              </h1>
              <p
                className="text-xs text-[#404040] leading-relaxed"
                style={{
                  ...(section.descriptionSizePx > 0
                    ? { fontSize: `${section.descriptionSizePx}px` }
                    : {}),
                  ...(section.textColor ? { color: section.textColor, opacity: 0.8 } : {}),
                }}
              >
                {section.customSubtitle?.trim() ||
                  'Klik produk untuk melihat spesifikasi file, kompatibilitas, serta tombol pemesanan via WhatsApp.'}
              </p>
            </div>
            <p
              className="text-xs font-mono font-semibold text-[#0F3D3A] tabular-nums shrink-0"
              style={section.accentColor ? { color: section.accentColor } : undefined}
            >
              {filtered.length} produk
            </p>
          </div>
        </header>

        {/* Compact Filter & Search Toolbar */}
        <div className="nb-card p-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="tablist"
            aria-label="Filter kategori produk digital"
          >
            {PRODUCT_CATEGORIES.map((tab) => {
              const active = category === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectCategory(tab.value)}
                  className="nb-tab"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative lg:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#525252] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="product-search" className="sr-only">
              Cari produk digital
            </label>
            <input
              id="product-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk atau format..."
              className="nb-input nb-input-compact pl-8"
            />
          </div>
        </div>

        {/* Dynamic Responsive Grid / Bento / List / Horizontal Collection */}
        {loadingProducts ? (
          <div className={grid.className} style={grid.style}>
            {Array.from({ length: Math.min(5, grid.activeCols) }).map((_, idx) => (
              <ServiceCardSkeleton key={idx} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="nb-card p-6 text-center space-y-2">
            <h2 className="font-display font-bold text-base text-[#171717]">
              Produk tidak ditemukan
            </h2>
            <p className="text-xs text-[#525252]">
              Coba kata kunci lain atau pilih kategori Semua Produk.
            </p>
            {(category !== 'all' || search.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  handleSelectCategory('all');
                  setSearch('');
                }}
                className="nb-btn nb-btn-mustard nb-btn-sm"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <div className={grid.className} style={grid.style}>
            {filtered.map((product, idx) => (
              <FadeScroll
                key={product.id}
                index={idx}
                columnsPerRow={grid.activeCols}
                className={`h-full ${
                  grid.isHorizontal ? 'w-60 shrink-0 snap-start' : ''
                } ${grid.isBento && idx === 0 && grid.activeCols >= 2 ? 'sm:col-span-2' : ''}`}
              >
                <ProductCard product={product} forceList={grid.isList} />
              </FadeScroll>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

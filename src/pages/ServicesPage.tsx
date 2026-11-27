import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { useDesign } from '../contexts/DesignContext';
import { ServiceCard } from '../components/ServiceCard';
import { ServiceCardSkeleton } from '../components/SkeletonCard';
import { FadeScroll } from '../components/FadeScroll';
import { SERVICE_CATEGORY_LABELS } from '../utils/studioLogic';
import {
  resolveCollectionGridLayout,
  resolveSectionContainerStyle,
} from '../utils/designSystem';
import type { ServiceCategory } from '../types/studio';

const CATEGORIES: { value: ServiceCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Layanan' },
  { value: 'web_app', label: SERVICE_CATEGORY_LABELS.web_app },
  { value: 'video', label: SERVICE_CATEGORY_LABELS.video },
  { value: 'desain', label: SERVICE_CATEGORY_LABELS.desain },
  { value: 'presentasi', label: SERVICE_CATEGORY_LABELS.presentasi },
  { value: 'naskah', label: SERVICE_CATEGORY_LABELS.naskah },
];

export function ServicesPage() {
  const { services, loadingServices } = useStudioData();
  const { design, viewport } = useDesign();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = (searchParams.get('kategori') as ServiceCategory | 'all') || 'all';
  const [category, setCategory] = useState<ServiceCategory | 'all'>(
    CATEGORIES.some((c) => c.value === initialCat) ? initialCat : 'all'
  );
  const [search, setSearch] = useState('');

  const section = design.services.section;
  const { sectionStyle, containerStyle, alignClass } = resolveSectionContainerStyle(
    section,
    design.global,
    viewport,
    design.responsive
  );

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((srv) => {
      if (category !== 'all' && srv.category !== category) return false;
      if (!q) return true;
      return (
        srv.title.toLowerCase().includes(q) ||
        srv.shortDescription.toLowerCase().includes(q) ||
        srv.priceLabel.toLowerCase().includes(q)
      );
    });
  }, [services, category, search]);

  const filteredServices =
    section.maxItems > 0 ? filteredAll.slice(0, section.maxItems) : filteredAll;

  const grid = resolveCollectionGridLayout({
    layout: section.layout,
    colsDesktop: section.colsDesktop,
    colsTablet: section.colsTablet,
    colsMobile: section.colsMobile,
    gapPx: section.gapPx,
    viewport,
  });

  function handleSelectCategory(val: ServiceCategory | 'all') {
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
            <span className="text-[#171717] font-semibold">Layanan Jasa</span>
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
                {section.customTitle?.trim() || 'Katalog Layanan Jasa Digital'}
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
                  'Harga tercantum adalah estimasi awal; biaya final dikonfirmasi admin setelah brief ditinjau.'}
              </p>
            </div>
            <p
              className="text-xs font-mono font-semibold text-[#0F3D3A] tabular-nums shrink-0"
              style={section.accentColor ? { color: section.accentColor } : undefined}
            >
              {filteredServices.length} layanan
            </p>
          </div>
        </header>

        {/* Compact Filter & Search Toolbar */}
        <div className="nb-card p-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="tablist"
            aria-label="Filter kategori layanan"
          >
            {CATEGORIES.map((tab) => {
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
            <label htmlFor="service-search" className="sr-only">
              Cari layanan
            </label>
            <input
              id="service-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari layanan atau harga..."
              className="nb-input nb-input-compact pl-8"
            />
          </div>
        </div>

        {/* Dynamic Responsive Collection */}
        {loadingServices ? (
          <div className={grid.className} style={grid.style}>
            {Array.from({ length: Math.min(5, grid.activeCols) }).map((_, idx) => (
              <ServiceCardSkeleton key={idx} />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="nb-card p-6 text-center space-y-2">
            <h2 className="font-display font-bold text-base text-[#171717]">
              Layanan tidak ditemukan
            </h2>
            <p className="text-xs text-[#525252]">
              Coba kata kunci lain atau tampilkan semua kategori layanan.
            </p>
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
          </div>
        ) : (
          <div className={grid.className} style={grid.style}>
            {filteredServices.map((srv, idx) => (
              <FadeScroll
                key={srv.id}
                index={idx}
                columnsPerRow={grid.activeCols}
                className={`h-full ${
                  grid.isHorizontal ? 'w-64 shrink-0 snap-start' : ''
                } ${grid.isBento && idx === 0 && grid.activeCols >= 2 ? 'sm:col-span-2' : ''}`}
              >
                <ServiceCard service={srv} forceList={grid.isList} />
              </FadeScroll>
            ))}
          </div>
        )}

        {/* Compact Pricing Notice */}
        <div className="nb-card-cream p-3">
          <p className="text-xs text-[#333333] leading-relaxed">
            <strong className="font-display font-bold text-[#171717]">Catatan Estimasi Biaya:</strong>{' '}
            Harga yang ditampilkan bersifat estimasi awal. Admin meninjau kerumitan, jumlah unit
            (halaman/slide/menit/desain), dan tenggat waktu sebelum menetapkan biaya final.
          </p>
        </div>
      </div>
    </div>
  );
}

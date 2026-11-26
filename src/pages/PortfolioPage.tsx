import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { PortfolioCard } from '../components/PortfolioCard';
import { PortfolioCardSkeleton } from '../components/SkeletonCard';
import { PortfolioModal } from '../components/PortfolioModal';
import { CATALOG_GRID_COLS_CLASS, SERVICE_CATEGORY_LABELS } from '../utils/studioLogic';
import type { PortfolioItem, ServiceCategory } from '../types/studio';

const FILTER_OPTIONS: { value: ServiceCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Karya' },
  { value: 'web_app', label: SERVICE_CATEGORY_LABELS.web_app },
  { value: 'video', label: SERVICE_CATEGORY_LABELS.video },
  { value: 'desain', label: SERVICE_CATEGORY_LABELS.desain },
  { value: 'presentasi', label: SERVICE_CATEGORY_LABELS.presentasi },
  { value: 'naskah', label: SERVICE_CATEGORY_LABELS.naskah },
];

export function PortfolioPage() {
  const { portfolio, loadingPortfolio } = useStudioData();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = (searchParams.get('kategori') as ServiceCategory | 'all') || 'all';
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>(
    FILTER_OPTIONS.some((c) => c.value === initialCat) ? initialCat : 'all'
  );
  const [search, setSearch] = useState('');
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return portfolio.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (!q) return true;
      const catLabel = SERVICE_CATEGORY_LABELS[item.category].toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        catLabel.includes(q)
      );
    });
  }, [portfolio, selectedCategory, search]);

  function handleSelectCategory(val: ServiceCategory | 'all') {
    setSelectedCategory(val);
    if (val === 'all') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ kategori: val }, { replace: true });
    }
  }

  return (
    <div className="nb-catalog-section">
      <div className="nb-container space-y-3.5 sm:space-y-4">
        {/* Compact Category Header */}
        <header className="space-y-1.5">
          <nav aria-label="Breadcrumb" className="nb-breadcrumb">
            <Link to="/" className="hover:text-[#0F3D3A] font-medium transition-colors">
              Beranda
            </Link>
            <ChevronRight className="w-3 h-3 text-[#737373] shrink-0" />
            <span className="text-[#171717] font-semibold">Portofolio</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-0.5">
              <h1 className="font-display font-bold text-lg sm:text-xl lg:text-[1.35rem] text-[#171717] leading-tight">
                Galeri Portofolio Karya Digital
              </h1>
              <p className="text-xs text-[#404040] leading-relaxed">
                Klik setiap karya untuk membuka rincian tantangan awal, pendekatan eksekusi, dan dampak terukurnya.
              </p>
            </div>
            <p className="text-xs font-mono font-semibold text-[#0F3D3A] tabular-nums shrink-0">
              {filtered.length} karya
            </p>
          </div>
        </header>

        {/* Compact Filter & Search Toolbar */}
        <div className="nb-card p-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="tablist"
            aria-label="Filter kategori portofolio"
          >
            {FILTER_OPTIONS.map((opt) => {
              const active = selectedCategory === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectCategory(opt.value)}
                  className="nb-tab"
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="relative lg:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#525252] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="portfolio-search" className="sr-only">
              Cari portofolio
            </label>
            <input
              id="portfolio-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari karya atau klien..."
              className="nb-input nb-input-compact pl-8"
            />
          </div>
        </div>

        {/* Fixed 5-Col Desktop / 3-Col Tablet / 2-Col Phone Gallery Grid */}
        {loadingPortfolio ? (
          <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <PortfolioCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="nb-card p-6 text-center space-y-2">
            <h2 className="font-display font-bold text-base text-[#171717]">
              Karya tidak ditemukan
            </h2>
            <p className="text-xs text-[#525252]">
              Coba kata kunci lain atau tampilkan semua kategori portofolio.
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
          <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
            {filtered.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item}
                onSelect={(selected) => setActiveItem(selected)}
              />
            ))}
          </div>
        )}
      </div>

      <PortfolioModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}

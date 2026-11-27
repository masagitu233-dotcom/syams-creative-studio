import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { ProductCard } from '../components/ProductCard';
import { ServiceCardSkeleton } from '../components/SkeletonCard';
import { VelocityLayer } from '../components/ScrollMotionPrimitives';
import {
  CATALOG_GRID_COLS_CLASS,
  DIGITAL_PRODUCT_CATEGORY_LABELS,
  filterDigitalProducts,
  getProductGridColsClass,
} from '../utils/studioLogic';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = (searchParams.get('kategori') as DigitalProductCategory | 'all') || 'all';
  const [category, setCategory] = useState<DigitalProductCategory | 'all'>(
    PRODUCT_CATEGORIES.some((c) => c.value === initialCat) ? initialCat : 'all'
  );
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => filterDigitalProducts(products, { category, search }),
    [products, category, search]
  );

  const gridCols = getProductGridColsClass(filtered.length);

  function handleSelectCategory(val: DigitalProductCategory | 'all') {
    setCategory(val);
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
            <span className="text-[#171717] font-semibold">Produk Digital</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-0.5">
              <h1 className="font-display font-bold text-lg sm:text-xl lg:text-[1.35rem] text-[#171717] leading-tight">
                Katalog Produk Digital Siap Pakai
              </h1>
              <p className="text-xs text-[#404040] leading-relaxed">
                Klik produk untuk melihat spesifikasi file, kompatibilitas, serta tombol pemesanan via WhatsApp.
              </p>
            </div>
            <p className="text-xs font-mono font-semibold text-[#0F3D3A] tabular-nums shrink-0">
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

        {/* Fixed 5-Col Desktop / 3-Col Tablet / 2-Col Phone Grid */}
        {loadingProducts ? (
          <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
            {Array.from({ length: 5 }).map((_, idx) => (
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
          <div className={`grid ${gridCols} gap-2.5 sm:gap-3 items-stretch`}>
            {filtered.map((product, idx) => (
              <VelocityLayer
                key={product.id}
                speed={[-0.08, 0.02, 0.1, 0.02, -0.08][idx % 5]}
                velocityFactor={[0.55, 0.9, 1.25, 0.9, 0.55][idx % 5]}
                maxOffsetPx={18}
                maxVelocityShiftPx={24}
                maxSkewDeg={1.15}
                className="h-full"
              >
                <ProductCard product={product} />
              </VelocityLayer>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

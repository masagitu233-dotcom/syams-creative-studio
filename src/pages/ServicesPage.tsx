import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { ServiceCard } from '../components/ServiceCard';
import { ServiceCardSkeleton } from '../components/SkeletonCard';
import { VelocityLayer } from '../components/ScrollMotionPrimitives';
import { CATALOG_GRID_COLS_CLASS, SERVICE_CATEGORY_LABELS } from '../utils/studioLogic';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = (searchParams.get('kategori') as ServiceCategory | 'all') || 'all';
  const [category, setCategory] = useState<ServiceCategory | 'all'>(
    CATEGORIES.some((c) => c.value === initialCat) ? initialCat : 'all'
  );
  const [search, setSearch] = useState('');

  const filteredServices = useMemo(() => {
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

  function handleSelectCategory(val: ServiceCategory | 'all') {
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
            <span className="text-[#171717] font-semibold">Layanan Jasa</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-0.5">
              <h1 className="font-display font-bold text-lg sm:text-xl lg:text-[1.35rem] text-[#171717] leading-tight">
                Katalog Layanan Jasa Digital
              </h1>
              <p className="text-xs text-[#404040] leading-relaxed">
                Harga tercantum adalah estimasi awal; biaya final dikonfirmasi admin setelah brief ditinjau.
              </p>
            </div>
            <p className="text-xs font-mono font-semibold text-[#0F3D3A] tabular-nums shrink-0">
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

        {/* Dense Symmetrical 5-Col Desktop / 3-Col Tablet / 2-Col Phone Grid */}
        {loadingServices ? (
          <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
            {Array.from({ length: 5 }).map((_, idx) => (
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
          <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
            {filteredServices.map((srv, idx) => (
              <VelocityLayer
                key={srv.id}
                speed={[-0.08, 0.02, 0.1, 0.02, -0.08][idx % 5]}
                velocityFactor={[0.55, 0.9, 1.25, 0.9, 0.55][idx % 5]}
                maxOffsetPx={18}
                maxVelocityShiftPx={24}
                maxSkewDeg={1.2}
                className="h-full"
              >
                <ServiceCard service={srv} />
              </VelocityLayer>
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

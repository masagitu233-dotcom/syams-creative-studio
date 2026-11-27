import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { STUDIO_IMAGES } from '../data/initialCatalog';
import { OverlapSection, VelocityLayer } from '../components/ScrollMotionPrimitives';
import { SectionHeader } from '../components/SectionHeader';
import { StudioImage } from '../components/StudioImage';
import { ServiceCard } from '../components/ServiceCard';
import { ProductCard } from '../components/ProductCard';
import { PortfolioCard } from '../components/PortfolioCard';
import { ServiceCardSkeleton } from '../components/SkeletonCard';
import { FaqAccordion } from '../components/FaqAccordion';
import { PortfolioModal } from '../components/PortfolioModal';
import {
  CATALOG_GRID_COLS_CLASS,
  DIGITAL_PRODUCT_CATEGORY_LABELS,
  filterDigitalProducts,
  formatRupiah,
  getProductGridColsClass,
  SERVICE_CATEGORY_LABELS,
} from '../utils/studioLogic';
import type { DigitalProductCategory, PortfolioItem } from '../types/studio';

const ADVANTAGES = [
  {
    num: '01',
    title: 'Estimasi Harga Transparan',
    description:
      'Rentang biaya tampil sejak awal dan harga final disepakati secara terbuka setelah brief ditinjau admin.',
    bg: 'bg-[#F3C95B]/45',
  },
  {
    num: '02',
    title: 'Alur Pemesanan Terdokumentasi',
    description:
      'Setiap pesanan tercatat dengan kode unik dan pembaruan status real-time di halaman Riwayat Pesanan.',
    bg: 'bg-[#8ACCD5]/40',
  },
  {
    num: '03',
    title: 'Standar Visual & Editorial Rapi',
    description:
      'Website, video, desain poster, slide materi, hingga naskah dikerjakan konsisten dan siap pakai.',
    bg: 'bg-white',
  },
  {
    num: '04',
    title: 'Revisi Minor & Tepat Waktu',
    description:
      'Termasuk 2 kali revisi minor dengan tenggat pengerjaan terukur sesuai jadwal publikasi Anda.',
    bg: 'bg-white',
  },
];

const ORDER_STEPS = [
  {
    step: '01',
    title: 'Pilih Layanan',
    desc: 'Tinjau katalog layanan jasa atau produk digital beserta estimasi biayanya.',
  },
  {
    step: '02',
    title: 'Login & Isi Brief',
    desc: 'Masuk Google saat checkout lalu lengkapi WhatsApp, brief, dan tenggat waktu.',
  },
  {
    step: '03',
    title: 'Konfirmasi Admin',
    desc: 'Admin meninjau kebutuhan dan mengonfirmasi biaya final sebelum pengerjaan.',
  },
  {
    step: '04',
    title: 'Pengerjaan & Serah Terima',
    desc: 'Pantau progres real-time hingga file final siap Anda gunakan.',
  },
];

const PRODUCT_FILTER_TABS: { value: DigitalProductCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'template_ppt', label: DIGITAL_PRODUCT_CATEGORY_LABELS.template_ppt },
  { value: 'template_poster', label: DIGITAL_PRODUCT_CATEGORY_LABELS.template_poster },
  { value: 'ui_web_kit', label: DIGITAL_PRODUCT_CATEGORY_LABELS.ui_web_kit },
  { value: 'aset_video', label: DIGITAL_PRODUCT_CATEGORY_LABELS.aset_video },
  { value: 'naskah_siap_pakai', label: DIGITAL_PRODUCT_CATEGORY_LABELS.naskah_siap_pakai },
];

// Symmetric editorial motion profiles across 5-column & 4-column rows:
// outer cards trail subtly, center leads, converging cleanly at viewport center.
const FIVE_COL_SPEEDS = [-0.1, 0.02, 0.12, 0.02, -0.1] as const;
const FIVE_COL_VELOCITY = [0.6, 0.95, 1.35, 0.95, 0.6] as const;
const FOUR_COL_SPEEDS = [-0.1, 0.08, 0.08, -0.1] as const;
const FOUR_COL_VELOCITY = [0.65, 0.95, 1.25, 0.95] as const;

export function HomePage() {
  const {
    services,
    products,
    portfolio,
    faqs,
    siteSettings,
    loadingServices,
    loadingProducts,
  } = useStudioData();
  const [activePortfolio, setActivePortfolio] = useState<PortfolioItem | null>(null);
  const [productCat, setProductCat] = useState<DigitalProductCategory | 'all'>('all');

  const featuredServices = services.slice(0, 5);
  const featuredPortfolio = portfolio.slice(0, 5);
  const homeFaqs = faqs.slice(0, 4);

  const allPublishedProducts = useMemo(
    () => products.filter((p) => p.isPublished),
    [products]
  );

  const publishedProducts = useMemo(
    () => filterDigitalProducts(products, { category: productCat }),
    [products, productCat]
  );
  const homeProducts = publishedProducts.slice(0, 10);
  const hasMoreProducts = allPublishedProducts.length > 10;
  const productGridCols = getProductGridColsClass(homeProducts.length);

  const lowestServicePrice =
    services.length > 0
      ? formatRupiah(Math.min(...services.map((s) => s.priceMin)))
      : '—';

  return (
    <div>
      {/* 1. Compact Horizontal Hero Banner — Sticky Receding Anchor + Expressive Hero Parallax */}
      <OverlapSection
        layerIndex={1}
        stickyAnchor
        className="border-b-2 border-[#171717] nb-grid-pattern py-6 sm:py-8 bg-[#F8F8E1]"
      >
        <div className="nb-container relative">
          {/* Decorative Differential-Speed Parallax Accents (visible across Desktop, Split-Screen Preview, Tablet & Mobile) */}
          <VelocityLayer
            speed={-1}
            velocityFactor={0.95}
            maxOffsetPx={56}
            maxVelocityShiftPx={24}
            scrollRangePx={440}
            className="block absolute -top-3 left-1 sm:-top-4 sm:-left-3 z-0 pointer-events-none"
          >
            <div
              aria-hidden="true"
              className="scs-deco-accent w-14 h-14 sm:w-20 sm:h-20 bg-[#F3C95B]/75 border-2 border-[#171717] rounded-[4px]"
            />
          </VelocityLayer>
          <VelocityLayer
            speed={1}
            velocityFactor={1.05}
            maxOffsetPx={48}
            maxVelocityShiftPx={24}
            scrollRangePx={440}
            className="block absolute -bottom-3 right-1 sm:-bottom-4 sm:-right-3 z-0 pointer-events-none"
          >
            <div
              aria-hidden="true"
              className="scs-deco-accent w-16 h-12 sm:w-24 sm:h-16 bg-[#8ACCD5]/80 border-2 border-[#171717] rounded-[4px]"
            />
          </VelocityLayer>

          <div className="nb-card relative z-10 overflow-hidden bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <VelocityLayer
                speed={-1}
                velocityFactor={0.68}
                maxOffsetPx={28}
                maxVelocityShiftPx={16}
                scrollRangePx={440}
                className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-center gap-3.5"
              >
                <p className="text-xs font-semibold text-[#6C151E]">
                  {siteSettings.studioName} · {siteSettings.slogan}
                </p>

                <h1
                  className="font-display font-bold text-2xl sm:text-3xl lg:text-[2.1rem] text-[#171717] leading-[1.16]"
                  style={{ textWrap: 'balance' }}
                >
                  {siteSettings.heroHeadline}
                </h1>

                <p className="text-sm text-[#404040] leading-relaxed max-w-xl line-clamp-4">
                  {siteSettings.heroSubheadline}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Link
                    to="/checkout"
                    className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm"
                  >
                    Pesan Sekarang
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to="/layanan"
                    className="nb-btn nb-btn-mustard px-4 py-2 text-xs sm:text-sm"
                  >
                    Lihat Katalog Layanan
                  </Link>
                  <Link
                    to="/produk"
                    className="nb-btn nb-btn-surface px-4 py-2 text-xs sm:text-sm"
                  >
                    Produk Digital
                  </Link>
                </div>
              </VelocityLayer>

              <div className="lg:col-span-5 border-t-2 lg:border-t-0 lg:border-l-2 border-[#171717] bg-[#F8F8E1] flex flex-col overflow-hidden">
                <div className="relative z-10 bg-[#0F3D3A] text-[#F8F8E1] px-4 py-2 border-b-2 border-[#171717] flex items-center justify-between gap-2 text-[11px] font-medium">
                  <span className="truncate">Katalog Jasa & Produk Digital</span>
                  <span className="font-mono text-[#F3C95B] whitespace-nowrap shrink-0">
                    Mulai {lowestServicePrice}
                  </span>
                </div>
                <div className="flex-1 min-h-0 flex overflow-hidden">
                  <VelocityLayer
                    speed={1}
                    velocityFactor={1.15}
                    maxOffsetPx={68}
                    maxVelocityShiftPx={22}
                    baseScale={1.28}
                    scrollRangePx={440}
                    className="w-full h-full flex"
                  >
                    <StudioImage
                      src={siteSettings.heroImageUrl || STUDIO_IMAGES.hero}
                      driveFileId={siteSettings.heroDriveFileId || undefined}
                      alt="Ilustrasi ruang kerja kreatif SYAMS CREATIVE STUDIO"
                      aspectClass="w-full aspect-[16/10] lg:aspect-auto lg:h-full"
                      loading="eager"
                    />
                  </VelocityLayer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </OverlapSection>

      {/* 2. Kategori & Layanan Unggulan Strip — Rising Overlapping Curtain over Hero */}
      <OverlapSection
        layerIndex={2}
        risingCurtain
        className="py-5 border-b-2 border-[#171717] bg-white"
      >
        <div className="nb-container space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display font-bold text-sm sm:text-base text-[#171717]">
              Kategori Layanan Unggulan
            </h2>
            <span className="text-xs text-[#525252] hidden sm:inline">
              Pilih bidang untuk langsung melihat detail & estimasi
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 items-stretch">
            {featuredServices.map((srv, idx) => (
              <VelocityLayer
                key={srv.id}
                speed={0}
                velocityFactor={0.48 + idx * 0.2}
                maxVelocityShiftPx={20}
                maxSkewDeg={0.85}
                className="h-full"
              >
                <Link
                  to={`/layanan/${srv.slug}`}
                  className="group bg-[#F8F8E1] hover:bg-[#F3C95B]/55 border-2 border-[#171717] rounded-[4px] px-3 py-2.5 flex items-center justify-between gap-2 transition-colors h-full"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-bold text-[#6C151E]">
                      0{idx + 1}.
                    </p>
                    <p className="font-display font-semibold text-xs sm:text-[13px] text-[#171717] truncate">
                      {SERVICE_CATEGORY_LABELS[srv.category]}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#0F3D3A] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </VelocityLayer>
            ))}
          </div>
        </div>
      </OverlapSection>

      {/* 3. Katalog Lima Layanan Jasa — Rising over Hero, then Sticky Receding Anchor for Produk */}
      <OverlapSection
        id="layanan"
        layerIndex={3}
        stickyAnchor
        risingCurtain
        className="nb-section border-b-2 border-[#171717] bg-[#F8F8E1]"
      >
        <div className="nb-container space-y-5">
          <VelocityLayer
            speed={0.07}
            velocityFactor={0.45}
            maxOffsetPx={10}
            maxVelocityShiftPx={10}
          >
            <SectionHeader
              kicker="Layanan Jasa Utama"
              title="Lima Layanan Digital SYAMS Creative Studio"
              subtitle="Harga bersifat estimasi awal dan dikelola dinamis. Klik Detail untuk melihat cakupan lengkap."
              action={
                <Link to="/layanan" className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs">
                  Semua Layanan
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
          </VelocityLayer>

          {loadingServices ? (
            <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredServices.length === 0 ? (
            <div className="nb-card p-6 text-center text-xs sm:text-sm text-[#525252]">
              Belum ada layanan yang dipublikasikan saat ini.
            </div>
          ) : (
            <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
              {featuredServices.map((service, idx) => (
                <VelocityLayer
                  key={service.id}
                  speed={FIVE_COL_SPEEDS[idx % 5]}
                  velocityFactor={FIVE_COL_VELOCITY[idx % 5]}
                  maxOffsetPx={20}
                  maxVelocityShiftPx={26}
                  maxSkewDeg={1.45}
                  className="h-full"
                >
                  <ServiceCard service={service} />
                </VelocityLayer>
              ))}
            </div>
          )}
        </div>
      </OverlapSection>

      {/* 4. Katalog Produk Digital — Rising Overlapping Curtain over Layanan + Column Velocity */}
      <OverlapSection
        id="produk"
        layerIndex={4}
        risingCurtain
        className="nb-section border-b-2 border-[#171717] bg-white"
      >
        <div className="nb-container space-y-5">
          <VelocityLayer
            speed={0.07}
            velocityFactor={0.45}
            maxOffsetPx={10}
            maxVelocityShiftPx={10}
          >
            <SectionHeader
              kicker="Katalog Produk Digital"
              title="Template & Aset Digital Siap Pakai"
              subtitle="Klik produk untuk detail spesifikasi, format file, dan pemesanan langsung via WhatsApp."
              action={
                <Link to="/produk" className="nb-btn nb-btn-mustard px-3.5 py-1.5 text-xs">
                  {hasMoreProducts ? 'Lihat Semua Produk' : 'Buka Katalog'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
          </VelocityLayer>

          {/* Compact Category Filter */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="tablist"
            aria-label="Filter kategori produk digital beranda"
          >
            {PRODUCT_FILTER_TABS.map((tab) => {
              const active = productCat === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setProductCat(tab.value)}
                  className="nb-tab"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {loadingProducts ? (
            <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          ) : homeProducts.length === 0 ? (
            <div className="nb-card p-6 text-center space-y-2">
              <p className="text-xs sm:text-sm text-[#525252]">
                Belum ada produk digital yang dipublikasikan pada kategori ini.
              </p>
              {productCat !== 'all' && (
                <button
                  type="button"
                  onClick={() => setProductCat('all')}
                  className="nb-btn nb-btn-mustard nb-btn-sm"
                >
                  Lihat Semua Kategori
                </button>
              )}
            </div>
          ) : (
            <div className={`grid ${productGridCols} gap-2.5 sm:gap-3 items-stretch`}>
              {homeProducts.map((product, idx) => (
                <VelocityLayer
                  key={product.id}
                  speed={FIVE_COL_SPEEDS[idx % 5]}
                  velocityFactor={FIVE_COL_VELOCITY[idx % 5]}
                  maxOffsetPx={18}
                  maxVelocityShiftPx={24}
                  maxSkewDeg={1.3}
                  className="h-full"
                >
                  <ProductCard product={product} />
                </VelocityLayer>
              ))}
            </div>
          )}

          {hasMoreProducts && productCat === 'all' && (
            <div className="flex justify-center pt-1">
              <Link to="/produk" className="nb-btn nb-btn-surface px-5 py-2 text-xs sm:text-sm">
                Lihat Semua Produk Digital ({allPublishedProducts.length})
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </OverlapSection>

      {/* 5. Keunggulan SYAMS CREATIVE STUDIO — Sticky Receding Anchor + Floating Decorative Depth */}
      <OverlapSection
        layerIndex={5}
        stickyAnchor
        className="nb-section border-b-2 border-[#171717] bg-[#8ACCD5]/20"
      >
        <div className="nb-container relative space-y-5">
          <VelocityLayer
            speed={-0.36}
            velocityFactor={0.9}
            maxOffsetPx={48}
            maxVelocityShiftPx={22}
            className="block absolute -top-2 right-4 sm:right-6 z-0 pointer-events-none"
          >
            <div
              aria-hidden="true"
              className="scs-deco-accent w-12 h-12 sm:w-16 sm:h-16 bg-[#F3C95B]/65 border-2 border-[#171717] rounded-[4px]"
            />
          </VelocityLayer>

          <VelocityLayer
            speed={0.07}
            velocityFactor={0.45}
            maxOffsetPx={10}
            maxVelocityShiftPx={10}
            className="relative z-10"
          >
            <SectionHeader
              kicker="Keunggulan Kami"
              title="Kenapa Memilih SYAMS Creative Studio"
            />
          </VelocityLayer>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
            {ADVANTAGES.map((adv, idx) => (
              <VelocityLayer
                key={adv.num}
                speed={FOUR_COL_SPEEDS[idx % 4]}
                velocityFactor={FOUR_COL_VELOCITY[idx % 4]}
                maxOffsetPx={18}
                maxVelocityShiftPx={24}
                maxSkewDeg={1.25}
                className="h-full"
              >
                <div
                  className={`${adv.bg} border-2 border-[#171717] nb-shadow rounded-[4px] p-4 flex flex-col gap-1.5 h-full`}
                >
                  <p className="font-mono font-bold text-xs text-[#6C151E]">{adv.num}.</p>
                  <h3 className="font-display font-bold text-sm sm:text-base text-[#171717] leading-snug">
                    {adv.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#333333] leading-relaxed">
                    {adv.description}
                  </p>
                </div>
              </VelocityLayer>
            ))}
          </div>
        </div>
      </OverlapSection>

      {/* 6. Cuplikan Portofolio — Rising Overlapping Curtain over Keunggulan + Velocity Depth */}
      <OverlapSection
        layerIndex={6}
        risingCurtain
        className="nb-section border-b-2 border-[#171717] bg-white"
      >
        <div className="nb-container space-y-5">
          <VelocityLayer
            speed={0.07}
            velocityFactor={0.45}
            maxOffsetPx={10}
            maxVelocityShiftPx={10}
          >
            <SectionHeader
              kicker="Portofolio Pilihan"
              title="Karya Nyata dengan Hasil Terukur"
              subtitle="Klik karya untuk membuka studi kasus lengkap, tantangan, dan dampaknya."
              action={
                <Link to="/portofolio" className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs">
                  Semua Portofolio
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
          </VelocityLayer>

          <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
            {featuredPortfolio.map((item, idx) => (
              <VelocityLayer
                key={item.id}
                speed={FIVE_COL_SPEEDS[idx % 5]}
                velocityFactor={FIVE_COL_VELOCITY[idx % 5]}
                maxOffsetPx={20}
                maxVelocityShiftPx={26}
                maxSkewDeg={1.45}
                className="h-full"
              >
                <PortfolioCard
                  item={item}
                  onSelect={(selected) => setActivePortfolio(selected)}
                />
              </VelocityLayer>
            ))}
          </div>
        </div>
      </OverlapSection>

      {/* 7. Prosedur Pemesanan — Sticky Receding Anchor + Staggered Step Velocity */}
      <OverlapSection
        layerIndex={7}
        stickyAnchor
        className="nb-section border-b-2 border-[#171717] bg-[#F8F8E1]"
      >
        <div className="nb-container space-y-5">
          <VelocityLayer
            speed={0.06}
            velocityFactor={0.42}
            maxOffsetPx={10}
            maxVelocityShiftPx={10}
          >
            <SectionHeader
              kicker="Prosedur Pemesanan"
              title="Empat Langkah dari Brief hingga File Final"
              action={
                <Link to="/prosedur" className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs">
                  Prosedur Lengkap
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
          </VelocityLayer>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
            {ORDER_STEPS.map((item, idx) => (
              <VelocityLayer
                key={item.step}
                speed={FOUR_COL_SPEEDS[idx % 4]}
                velocityFactor={0.6 + idx * 0.24}
                maxOffsetPx={16}
                maxVelocityShiftPx={24}
                maxSkewDeg={1.2}
                className="h-full"
              >
                <div className="nb-card p-4 flex flex-col gap-2.5 h-full">
                  <div className="w-8 h-8 bg-[#0F3D3A] text-[#F3C95B] border-2 border-[#171717] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    {item.step}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-sm sm:text-base text-[#171717] leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-[#404040] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </VelocityLayer>
            ))}
          </div>
        </div>
      </OverlapSection>

      {/* 8. Cuplikan Profil Studio — Rising Overlapping Curtain over Prosedur + Split Parallax */}
      <OverlapSection
        layerIndex={8}
        risingCurtain
        className="nb-section border-b-2 border-[#171717] bg-white"
      >
        <div className="nb-container">
          <div className="nb-card-cream p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center overflow-hidden">
            <VelocityLayer
              speed={0.14}
              velocityFactor={0.55}
              maxOffsetPx={24}
              maxVelocityShiftPx={16}
              className="lg:col-span-8 space-y-2"
            >
              <p className="text-xs font-semibold text-[#6C151E]">Profil Singkat Studio</p>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-tight">
                Satu Studio untuk Kebutuhan Digital, Visual, dan Naskah
              </h2>
              <p className="text-sm text-[#333333] leading-relaxed">
                {siteSettings.aboutSummary}
              </p>
            </VelocityLayer>
            <VelocityLayer
              speed={-0.18}
              velocityFactor={1.0}
              maxOffsetPx={30}
              maxVelocityShiftPx={22}
              className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3"
            >
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <div className="bg-white border-2 border-[#171717] rounded-[4px] p-2.5 text-center">
                  <p className="font-mono font-bold text-lg text-[#0F3D3A] tabular-nums">
                    {services.length}
                  </p>
                  <p className="text-[11px] text-[#525252]">Layanan Jasa</p>
                </div>
                <div className="bg-white border-2 border-[#171717] rounded-[4px] p-2.5 text-center">
                  <p className="font-mono font-bold text-lg text-[#6C151E] tabular-nums">
                    {allPublishedProducts.length}
                  </p>
                  <p className="text-[11px] text-[#525252]">Produk Digital</p>
                </div>
              </div>
              <Link
                to="/tentang"
                className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm w-full"
              >
                Tentang SYAMS Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </VelocityLayer>
          </div>
        </div>
      </OverlapSection>

      {/* 9. FAQ Ringkas — Standard Layered Flow (non-sticky so accordion expands cleanly) */}
      <OverlapSection
        layerIndex={9}
        className="nb-section border-b-2 border-[#171717] bg-[#F8F8E1]"
      >
        <div className="nb-container max-w-4xl space-y-4">
          <SectionHeader
            kicker="Pertanyaan Umum"
            title="Hal yang Sering Ditanyakan"
            action={
              <Link to="/faq" className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs">
                Semua FAQ
              </Link>
            }
          />
          <FaqAccordion items={homeFaqs} />
        </div>
      </OverlapSection>

      {/* 10. CTA Penutup Compact — Rising Overlapping Curtain + Decorative Parallax Accent */}
      <OverlapSection
        layerIndex={10}
        risingCurtain
        className="py-8 sm:py-10 bg-[#F3C95B]"
      >
        <div className="nb-container relative">
          <VelocityLayer
            speed={0.32}
            velocityFactor={0.95}
            maxOffsetPx={44}
            maxVelocityShiftPx={20}
            className="block absolute -top-3 right-2 sm:-top-4 sm:-right-3 z-0 pointer-events-none"
          >
            <div
              aria-hidden="true"
              className="scs-deco-accent w-14 h-12 sm:w-20 sm:h-16 bg-[#0F3D3A]/85 border-2 border-[#171717] rounded-[4px]"
            />
          </VelocityLayer>

          <VelocityLayer
            speed={-0.12}
            velocityFactor={0.8}
            maxOffsetPx={22}
            maxVelocityShiftPx={18}
            className="relative z-10"
          >
            <div className="bg-white border-2 border-[#171717] nb-shadow rounded-[4px] p-5 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <p className="text-xs font-semibold text-[#6C151E]">Mulai Proyek Anda</p>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-snug">
                  Siap Mewujudkan Ide Digital Anda Bersama SYAMS CREATIVE STUDIO?
                </h2>
                <p className="text-xs sm:text-sm text-[#404040]">
                  Kirim brief melalui formulir pemesanan, lalu admin kami akan segera mengonfirmasi
                  estimasi waktu serta biaya finalnya.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <Link to="/checkout" className="nb-btn nb-btn-primary px-5 py-2.5 text-xs sm:text-sm">
                  Buat Pesanan
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link to="/kontak" className="nb-btn nb-btn-surface px-4 py-2.5 text-xs sm:text-sm">
                  Konsultasi Dulu
                </Link>
              </div>
            </div>
          </VelocityLayer>
        </div>
      </OverlapSection>

      <PortfolioModal item={activePortfolio} onClose={() => setActivePortfolio(null)} />
    </div>
  );
}

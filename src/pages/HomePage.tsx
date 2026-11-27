import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, X } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { useDesign } from '../contexts/DesignContext';
import { STUDIO_IMAGES } from '../data/initialCatalog';
import { FadeScroll } from '../components/FadeScroll';
import { SectionHeader } from '../components/SectionHeader';
import { StudioImage } from '../components/StudioImage';
import { ServiceCard } from '../components/ServiceCard';
import { ProductCard } from '../components/ProductCard';
import { PortfolioCard } from '../components/PortfolioCard';
import { ArticleCard } from '../components/ArticleCard';
import { ServiceCardSkeleton } from '../components/SkeletonCard';
import { FaqAccordion } from '../components/FaqAccordion';
import { PortfolioModal } from '../components/PortfolioModal';
import {
  DIGITAL_PRODUCT_CATEGORY_LABELS,
  filterDigitalProducts,
  formatRupiah,
  SERVICE_CATEGORY_LABELS,
} from '../utils/studioLogic';
import {
  resolveCollectionGridLayout,
  resolveSectionContainerStyle,
} from '../utils/designSystem';
import type { DigitalProductCategory, PortfolioItem } from '../types/studio';
import type { HomeSectionId, StudioArticleItem } from '../types/design';

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
  const { design, viewport } = useDesign();
  const [activePortfolio, setActivePortfolio] = useState<PortfolioItem | null>(null);
  const [activeArticle, setActiveArticle] = useState<StudioArticleItem | null>(null);
  const [productCat, setProductCat] = useState<DigitalProductCategory | 'all'>('all');

  const allPublishedProducts = useMemo(
    () => products.filter((p) => p.isPublished),
    [products]
  );

  const publishedProducts = useMemo(
    () => filterDigitalProducts(products, { category: productCat }),
    [products, productCat]
  );

  const publishedArticles = useMemo(
    () => design.articles.items.filter((a) => a.isPublished),
    [design.articles.items]
  );

  const lowestServicePrice =
    services.length > 0
      ? formatRupiah(Math.min(...services.map((s) => s.priceMin)))
      : '—';

  const heroImageUrl =
    design.identity.heroImageOverrideUrl || siteSettings.heroImageUrl || STUDIO_IMAGES.hero;
  const heroDriveFileId =
    design.identity.heroImageOverrideUrl || design.identity.heroImageOverrideDriveFileId
      ? design.identity.heroImageOverrideDriveFileId || undefined
      : siteSettings.heroDriveFileId || undefined;

  function renderSection(sectionId: HomeSectionId): React.ReactNode {
    const cfg = design.home.sections[sectionId];
    if (!cfg || !cfg.visible) return null;

    const { sectionStyle, containerStyle, alignClass } = resolveSectionContainerStyle(
      cfg,
      design.global,
      viewport,
      design.responsive
    );
    const sectionBtnStyle: React.CSSProperties | undefined =
      cfg.buttonBg || cfg.buttonText
        ? {
            ...(cfg.buttonBg ? { backgroundColor: cfg.buttonBg, borderColor: cfg.buttonBg } : {}),
            ...(cfg.buttonText ? { color: cfg.buttonText } : {}),
          }
        : undefined;

    switch (sectionId) {
      case 'hero': {
        const heroLayout = cfg.heroLayout || 'split_right';
        const isDesktop = viewport === 'desktop';
        const headline = cfg.customTitle?.trim() || siteSettings.heroHeadline;
        const subheadline = cfg.customSubtitle?.trim() || siteSettings.heroSubheadline;

        if (heroLayout === 'banner_overlay') {
          return (
            <section
              key="hero"
              data-home-section="hero"
              style={sectionStyle}
              className="border-b-2 border-[#171717] bg-[#F8F8E1] py-6 sm:py-8"
            >
              <div className="nb-container" style={containerStyle}>
                <div
                  data-dark-surface="true"
                  className="nb-card relative overflow-hidden min-h-[340px] sm:min-h-[400px] flex items-center"
                >
                  <div className="absolute inset-0">
                    <StudioImage
                      src={heroImageUrl}
                      driveFileId={heroDriveFileId}
                      cacheVersion={siteSettings.updatedAt}
                      alt="Banner utama SYAMS CREATIVE STUDIO"
                      aspectClass="w-full h-full"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0F3D3A]/92 via-[#0F3D3A]/75 to-[#171717]/45" />
                  </div>
                  <div
                    className={`relative z-10 p-6 sm:p-10 w-full flex flex-col gap-3.5 text-[#F8F8E1] ${
                      cfg.textAlign === 'center'
                        ? 'items-center text-center mx-auto max-w-3xl'
                        : cfg.textAlign === 'right'
                          ? 'items-end text-right ml-auto max-w-2xl'
                          : 'items-start text-left max-w-2xl'
                    }`}
                  >
                    <p
                      className="text-xs font-semibold text-[#F3C95B]"
                      style={cfg.accentColor ? { color: cfg.accentColor } : undefined}
                    >
                      {siteSettings.studioName} · {siteSettings.slogan}
                    </p>
                    <h1
                      className="font-display font-bold text-2xl sm:text-4xl leading-[1.15] text-white"
                      style={{
                        textWrap: 'balance',
                        ...(cfg.headingSizePx > 0 ? { fontSize: `${cfg.headingSizePx}px` } : {}),
                        ...(cfg.textColor ? { color: cfg.textColor } : {}),
                      }}
                    >
                      {headline}
                    </h1>
                    <p
                      className="text-sm text-white/90 leading-relaxed max-w-xl"
                      style={cfg.descriptionSizePx > 0 ? { fontSize: `${cfg.descriptionSizePx}px` } : undefined}
                    >
                      {subheadline}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <Link
                        to="/checkout"
                        style={sectionBtnStyle}
                        className="nb-btn nb-btn-mustard px-4 py-2 text-xs sm:text-sm"
                      >
                        Pesan Sekarang
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link to="/layanan" className="nb-btn nb-btn-surface px-4 py-2 text-xs sm:text-sm">
                        Lihat Katalog Layanan
                      </Link>
                      <Link to="/produk" className="nb-btn nb-btn-surface px-4 py-2 text-xs sm:text-sm">
                        Produk Digital
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (heroLayout === 'centered') {
          return (
            <section
              key="hero"
              data-home-section="hero"
              style={sectionStyle}
              className="border-b-2 border-[#171717] nb-grid-pattern bg-[#F8F8E1] py-6 sm:py-8"
            >
              <div className="nb-container" style={containerStyle}>
                <div className="nb-card overflow-hidden bg-white p-6 sm:p-8 flex flex-col items-center text-center gap-5">
                  <div className="space-y-3 max-w-2xl">
                    <p
                      className="text-xs font-semibold text-[#6C151E]"
                      style={cfg.accentColor ? { color: cfg.accentColor } : undefined}
                    >
                      {siteSettings.studioName} · {siteSettings.slogan}
                    </p>
                    <h1
                      className="font-display font-bold text-2xl sm:text-4xl text-[#171717] leading-[1.16]"
                      style={{
                        textWrap: 'balance',
                        ...(cfg.headingSizePx > 0 ? { fontSize: `${cfg.headingSizePx}px` } : {}),
                        ...(cfg.textColor ? { color: cfg.textColor } : {}),
                      }}
                    >
                      {headline}
                    </h1>
                    <p
                      className="text-sm text-[#404040] leading-relaxed"
                      style={{
                        ...(cfg.descriptionSizePx > 0 ? { fontSize: `${cfg.descriptionSizePx}px` } : {}),
                        ...(cfg.textColor ? { color: cfg.textColor, opacity: 0.82 } : {}),
                      }}
                    >
                      {subheadline}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      <Link
                        to="/checkout"
                        style={sectionBtnStyle}
                        className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm"
                      >
                        Pesan Sekarang
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link to="/layanan" className="nb-btn nb-btn-mustard px-4 py-2 text-xs sm:text-sm">
                        Lihat Katalog Layanan
                      </Link>
                      <Link to="/produk" className="nb-btn nb-btn-surface px-4 py-2 text-xs sm:text-sm">
                        Produk Digital
                      </Link>
                    </div>
                  </div>
                  <div className="w-full max-w-3xl border-2 border-[#171717] rounded-[6px] overflow-hidden">
                    <StudioImage
                      src={heroImageUrl}
                      driveFileId={heroDriveFileId}
                      cacheVersion={siteSettings.updatedAt}
                      alt="Ilustrasi ruang kerja kreatif SYAMS CREATIVE STUDIO"
                      aspectClass="w-full aspect-[16/9]"
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            </section>
          );
        }

        const isImageLeft = heroLayout === 'split_left';

        return (
          <section
            key="hero"
            data-home-section="hero"
            style={sectionStyle}
            className="border-b-2 border-[#171717] nb-grid-pattern bg-[#F8F8E1] py-6 sm:py-8"
          >
            <div className="nb-container relative" style={containerStyle}>
              <div className="block absolute -top-3 left-1 sm:-top-4 sm:-left-3 z-0 pointer-events-none">
                <div
                  aria-hidden="true"
                  className="scs-deco-accent w-14 h-14 sm:w-20 sm:h-20 bg-[#F3C95B]/75 border-2 border-[#171717] rounded-[4px]"
                />
              </div>
              <div className="block absolute -bottom-3 right-1 sm:-bottom-4 sm:-right-3 z-0 pointer-events-none">
                <div
                  aria-hidden="true"
                  className="scs-deco-accent w-16 h-12 sm:w-24 sm:h-16 bg-[#8ACCD5]/80 border-2 border-[#171717] rounded-[4px]"
                />
              </div>

              <div className="nb-card relative z-10 overflow-hidden bg-white">
                <div
                  className={`grid items-stretch ${isDesktop ? 'grid-cols-12' : 'grid-cols-1'}`}
                >
                  <FadeScroll
                    index={0}
                    durationMs={650}
                    distancePx={22}
                    className={`${isDesktop ? 'col-span-7' : ''} ${
                      isImageLeft && isDesktop ? 'order-2' : 'order-1'
                    } p-5 sm:p-7 flex flex-col justify-center gap-3.5 ${alignClass}`}
                  >
                    <p
                      className="text-xs font-semibold text-[#6C151E]"
                      style={cfg.accentColor ? { color: cfg.accentColor } : undefined}
                    >
                      {siteSettings.studioName} · {siteSettings.slogan}
                    </p>

                    <h1
                      className="font-display font-bold text-2xl sm:text-3xl lg:text-[2.1rem] text-[#171717] leading-[1.16]"
                      style={{
                        textWrap: 'balance',
                        ...(cfg.headingSizePx > 0 ? { fontSize: `${cfg.headingSizePx}px` } : {}),
                        ...(cfg.textColor ? { color: cfg.textColor } : {}),
                      }}
                    >
                      {headline}
                    </h1>

                    <p
                      className="text-sm text-[#404040] leading-relaxed max-w-xl line-clamp-4"
                      style={{
                        ...(cfg.descriptionSizePx > 0 ? { fontSize: `${cfg.descriptionSizePx}px` } : {}),
                        ...(cfg.textColor ? { color: cfg.textColor, opacity: 0.8 } : {}),
                      }}
                    >
                      {subheadline}
                    </p>

                    <div
                      className={`flex flex-wrap items-center gap-2.5 pt-1 ${
                        cfg.textAlign === 'center'
                          ? 'justify-center'
                          : cfg.textAlign === 'right'
                            ? 'justify-end'
                            : 'justify-start'
                      }`}
                    >
                      <Link
                        to="/checkout"
                        style={sectionBtnStyle}
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
                  </FadeScroll>

                  <div
                    className={`${isDesktop ? 'col-span-5' : ''} ${
                      isImageLeft && isDesktop
                        ? 'order-1 border-r-2'
                        : isDesktop
                          ? 'order-2 border-l-2'
                          : 'order-2 border-t-2'
                    } border-[#171717] bg-[#F8F8E1] flex flex-col overflow-hidden`}
                  >
                    <div className="relative z-10 bg-[#0F3D3A] text-[#F8F8E1] px-4 py-2 border-b-2 border-[#171717] flex items-center justify-between gap-2 text-[11px] font-medium">
                      <span className="truncate">Katalog Jasa &amp; Produk Digital</span>
                      <span className="font-mono text-[#F3C95B] whitespace-nowrap shrink-0">
                        Mulai {lowestServicePrice}
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 flex overflow-hidden">
                      <FadeScroll
                        index={1}
                        staggerMs={110}
                        durationMs={700}
                        distancePx={24}
                        className="w-full h-full flex"
                      >
                        <StudioImage
                          src={heroImageUrl}
                          driveFileId={heroDriveFileId}
                          cacheVersion={siteSettings.updatedAt}
                          alt="Ilustrasi ruang kerja kreatif SYAMS CREATIVE STUDIO"
                          aspectClass="w-full aspect-[16/10] lg:aspect-auto lg:h-full"
                          loading="eager"
                        />
                      </FadeScroll>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      }

      case 'categories': {
        const items = cfg.maxItems > 0 ? services.slice(0, cfg.maxItems) : services.slice(0, 5);
        const grid = resolveCollectionGridLayout({
          layout: cfg.layout,
          colsDesktop: cfg.colsDesktop,
          colsTablet: cfg.colsTablet,
          colsMobile: cfg.colsMobile,
          gapPx: cfg.gapPx,
          viewport,
        });

        return (
          <section
            key="categories"
            data-home-section="categories"
            style={sectionStyle}
            className="border-b-2 border-[#171717] bg-white py-4 sm:py-5"
          >
            <div className="nb-container space-y-3" style={containerStyle}>
              <FadeScroll index={0} distancePx={20} durationMs={640}>
                <div className={`flex items-center justify-between gap-3 ${alignClass}`}>
                  <h2
                    className="font-display font-bold text-sm sm:text-base text-[#171717]"
                    style={{
                      ...(cfg.headingSizePx > 0 ? { fontSize: `${cfg.headingSizePx}px` } : {}),
                      ...(cfg.textColor ? { color: cfg.textColor } : {}),
                    }}
                  >
                    {cfg.customTitle?.trim() || 'Kategori Layanan Unggulan'}
                  </h2>
                  <span className="text-xs text-[#525252] hidden sm:inline">
                    {cfg.customSubtitle?.trim() ||
                      'Pilih bidang untuk langsung melihat detail & estimasi'}
                  </span>
                </div>
              </FadeScroll>

              <div className={grid.className} style={grid.style}>
                {items.map((srv, idx) => (
                  <FadeScroll
                    key={srv.id}
                    index={idx}
                    columnsPerRow={grid.activeCols}
                    className={`h-full ${grid.isHorizontal ? 'w-52 shrink-0 snap-start' : ''}`}
                  >
                    <Link
                      to={`/layanan/${srv.slug}`}
                      className="group bg-[#F8F8E1] hover:bg-[#F3C95B]/55 border-2 border-[#171717] rounded-[4px] px-3 py-2.5 flex items-center justify-between gap-2 transition-colors h-full"
                    >
                      <div className="min-w-0">
                        <p
                          className="font-mono text-[11px] font-bold text-[#6C151E]"
                          style={cfg.accentColor ? { color: cfg.accentColor } : undefined}
                        >
                          0{idx + 1}.
                        </p>
                        <p className="font-display font-semibold text-xs sm:text-[13px] text-[#171717] truncate">
                          {SERVICE_CATEGORY_LABELS[srv.category]}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0F3D3A] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </FadeScroll>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'services': {
        const items = cfg.maxItems > 0 ? services.slice(0, cfg.maxItems) : services.slice(0, 5);
        const grid = resolveCollectionGridLayout({
          layout: cfg.layout,
          colsDesktop: cfg.colsDesktop,
          colsTablet: cfg.colsTablet,
          colsMobile: cfg.colsMobile,
          gapPx: cfg.gapPx,
          viewport,
        });

        return (
          <section
            key="services"
            id="layanan"
            data-home-section="services"
            style={sectionStyle}
            className="nb-section border-b-2 border-[#171717] bg-[#F8F8E1]"
          >
            <div className="nb-container space-y-5" style={containerStyle}>
              <FadeScroll index={0}>
                <SectionHeader
                  kicker="Layanan Jasa Utama"
                  title={cfg.customTitle?.trim() || 'Lima Layanan Digital SYAMS Creative Studio'}
                  subtitle={
                    cfg.customSubtitle?.trim() ||
                    'Harga bersifat estimasi awal dan dikelola dinamis. Klik Detail untuk melihat cakupan lengkap.'
                  }
                  align={cfg.textAlign}
                  headingSizePx={cfg.headingSizePx}
                  descriptionSizePx={cfg.descriptionSizePx}
                  textColor={cfg.textColor}
                  accentColor={cfg.accentColor}
                  fontFamily={cfg.fontFamily}
                  action={
                    <Link
                      to="/layanan"
                      style={sectionBtnStyle}
                      className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs"
                    >
                      Semua Layanan
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                />
              </FadeScroll>

              {loadingServices ? (
                <div className={grid.className} style={grid.style}>
                  {Array.from({ length: Math.min(5, grid.activeCols) }).map((_, i) => (
                    <ServiceCardSkeleton key={i} />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="nb-card p-6 text-center text-xs sm:text-sm text-[#525252]">
                  Belum ada layanan yang dipublikasikan saat ini.
                </div>
              ) : (
                <div className={grid.className} style={grid.style}>
                  {items.map((service, idx) => (
                    <FadeScroll
                      key={service.id}
                      index={idx}
                      columnsPerRow={grid.activeCols}
                      className={`h-full ${
                        grid.isHorizontal ? 'w-64 shrink-0 snap-start' : ''
                      } ${grid.isBento && idx === 0 && grid.activeCols >= 2 ? 'sm:col-span-2' : ''}`}
                    >
                      <ServiceCard service={service} forceList={grid.isList} />
                    </FadeScroll>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      }

      case 'products': {
        const limit = cfg.maxItems > 0 ? cfg.maxItems : 10;
        const homeProducts = publishedProducts.slice(0, limit);
        const hasMoreProducts = allPublishedProducts.length > limit;
        const grid = resolveCollectionGridLayout({
          layout: cfg.layout,
          colsDesktop: cfg.colsDesktop,
          colsTablet: cfg.colsTablet,
          colsMobile: cfg.colsMobile,
          gapPx: cfg.gapPx,
          viewport,
        });

        return (
          <section
            key="products"
            id="produk"
            data-home-section="products"
            style={sectionStyle}
            className="nb-section border-b-2 border-[#171717] bg-white"
          >
            <div className="nb-container space-y-5" style={containerStyle}>
              <FadeScroll index={0}>
                <SectionHeader
                  kicker="Katalog Produk Digital"
                  title={cfg.customTitle?.trim() || 'Template & Aset Digital Siap Pakai'}
                  subtitle={
                    cfg.customSubtitle?.trim() ||
                    'Klik produk untuk detail spesifikasi, format file, dan pemesanan langsung via WhatsApp.'
                  }
                  align={cfg.textAlign}
                  headingSizePx={cfg.headingSizePx}
                  descriptionSizePx={cfg.descriptionSizePx}
                  textColor={cfg.textColor}
                  accentColor={cfg.accentColor}
                  fontFamily={cfg.fontFamily}
                  action={
                    <Link
                      to="/produk"
                      style={sectionBtnStyle}
                      className="nb-btn nb-btn-mustard px-3.5 py-1.5 text-xs"
                    >
                      {hasMoreProducts ? 'Lihat Semua Produk' : 'Buka Katalog'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                />
              </FadeScroll>

              <div
                className={`flex flex-wrap items-center gap-1.5 ${
                  cfg.textAlign === 'center'
                    ? 'justify-center'
                    : cfg.textAlign === 'right'
                      ? 'justify-end'
                      : 'justify-start'
                }`}
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
                <div className={grid.className} style={grid.style}>
                  {Array.from({ length: Math.min(5, grid.activeCols) }).map((_, i) => (
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
                <div className={grid.className} style={grid.style}>
                  {homeProducts.map((product, idx) => (
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

              {hasMoreProducts && productCat === 'all' && (
                <div className="flex justify-center pt-1">
                  <Link
                    to="/produk"
                    style={sectionBtnStyle}
                    className="nb-btn nb-btn-surface px-5 py-2 text-xs sm:text-sm"
                  >
                    Lihat Semua Produk Digital ({allPublishedProducts.length})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        );
      }

      case 'articles': {
        const limit = cfg.maxItems > 0 ? cfg.maxItems : 3;
        const items = publishedArticles.slice(0, limit);
        const grid = resolveCollectionGridLayout({
          layout: cfg.layout,
          colsDesktop: cfg.colsDesktop,
          colsTablet: cfg.colsTablet,
          colsMobile: cfg.colsMobile,
          gapPx: cfg.gapPx,
          viewport,
        });

        return (
          <section
            key="articles"
            id="artikel"
            data-home-section="articles"
            style={sectionStyle}
            className="nb-section border-b-2 border-[#171717] bg-[#F8F8E1]"
          >
            <div className="nb-container space-y-5" style={containerStyle}>
              <FadeScroll index={0}>
                <SectionHeader
                  kicker="Artikel & Wawasan"
                  title={cfg.customTitle?.trim() || design.articles.pageTitle}
                  subtitle={cfg.customSubtitle?.trim() || design.articles.pageSubtitle}
                  align={cfg.textAlign}
                  headingSizePx={cfg.headingSizePx}
                  descriptionSizePx={cfg.descriptionSizePx}
                  textColor={cfg.textColor}
                  accentColor={cfg.accentColor}
                  fontFamily={cfg.fontFamily}
                  action={
                    <Link
                      to="/artikel"
                      style={sectionBtnStyle}
                      className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs"
                    >
                      Semua Artikel
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                />
              </FadeScroll>

              {items.length === 0 ? (
                <div className="nb-card p-6 text-center text-xs sm:text-sm text-[#525252]">
                  Belum ada artikel yang dipublikasikan.
                </div>
              ) : (
                <div className={grid.className} style={grid.style}>
                  {items.map((article, idx) => (
                    <FadeScroll
                      key={article.id}
                      index={idx}
                      columnsPerRow={grid.activeCols}
                      className={`h-full ${
                        grid.isHorizontal ? 'w-72 shrink-0 snap-start' : ''
                      } ${grid.isBento && idx === 0 && grid.activeCols >= 2 ? 'sm:col-span-2' : ''}`}
                    >
                      <ArticleCard article={article} onSelect={setActiveArticle} />
                    </FadeScroll>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      }

      case 'advantages': {
        const items = cfg.maxItems > 0 ? ADVANTAGES.slice(0, cfg.maxItems) : ADVANTAGES;
        const grid = resolveCollectionGridLayout({
          layout: cfg.layout,
          colsDesktop: cfg.colsDesktop,
          colsTablet: cfg.colsTablet,
          colsMobile: cfg.colsMobile,
          gapPx: cfg.gapPx,
          viewport,
        });

        return (
          <section
            key="advantages"
            data-home-section="advantages"
            style={sectionStyle}
            className="nb-section border-b-2 border-[#171717] bg-[#8ACCD5]/20"
          >
            <div className="nb-container relative space-y-5" style={containerStyle}>
              <div className="block absolute -top-2 right-4 sm:right-6 z-0 pointer-events-none">
                <div
                  aria-hidden="true"
                  className="scs-deco-accent w-12 h-12 sm:w-16 sm:h-16 bg-[#F3C95B]/65 border-2 border-[#171717] rounded-[4px]"
                />
              </div>

              <FadeScroll index={0} className="relative z-10">
                <SectionHeader
                  kicker="Keunggulan Kami"
                  title={cfg.customTitle?.trim() || 'Kenapa Memilih SYAMS Creative Studio'}
                  subtitle={cfg.customSubtitle?.trim() || undefined}
                  align={cfg.textAlign}
                  headingSizePx={cfg.headingSizePx}
                  descriptionSizePx={cfg.descriptionSizePx}
                  textColor={cfg.textColor}
                  accentColor={cfg.accentColor}
                  fontFamily={cfg.fontFamily}
                />
              </FadeScroll>

              <div className={`relative z-10 ${grid.className}`} style={grid.style}>
                {items.map((adv, idx) => (
                  <FadeScroll
                    key={adv.num}
                    index={idx}
                    columnsPerRow={grid.activeCols}
                    className={`h-full ${grid.isHorizontal ? 'w-64 shrink-0 snap-start' : ''}`}
                  >
                    <div
                      className={`${adv.bg} border-2 border-[#171717] nb-shadow rounded-[4px] p-4 flex flex-col gap-1.5 h-full ${alignClass}`}
                    >
                      <p
                        className="font-mono font-bold text-xs text-[#6C151E]"
                        style={cfg.accentColor ? { color: cfg.accentColor } : undefined}
                      >
                        {adv.num}.
                      </p>
                      <h3 className="font-display font-bold text-sm sm:text-base text-[#171717] leading-snug">
                        {adv.title}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-[#333333] leading-relaxed">
                        {adv.description}
                      </p>
                    </div>
                  </FadeScroll>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'portfolio': {
        const items = cfg.maxItems > 0 ? portfolio.slice(0, cfg.maxItems) : portfolio.slice(0, 5);
        const grid = resolveCollectionGridLayout({
          layout: cfg.layout,
          colsDesktop: cfg.colsDesktop,
          colsTablet: cfg.colsTablet,
          colsMobile: cfg.colsMobile,
          gapPx: cfg.gapPx,
          viewport,
        });

        return (
          <section
            key="portfolio"
            data-home-section="portfolio"
            style={sectionStyle}
            className="nb-section border-b-2 border-[#171717] bg-white"
          >
            <div className="nb-container space-y-5" style={containerStyle}>
              <FadeScroll index={0}>
                <SectionHeader
                  kicker="Portofolio Pilihan"
                  title={cfg.customTitle?.trim() || 'Karya Nyata dengan Hasil Terukur'}
                  subtitle={
                    cfg.customSubtitle?.trim() ||
                    'Klik karya untuk membuka studi kasus lengkap, tantangan, dan dampaknya.'
                  }
                  align={cfg.textAlign}
                  headingSizePx={cfg.headingSizePx}
                  descriptionSizePx={cfg.descriptionSizePx}
                  textColor={cfg.textColor}
                  accentColor={cfg.accentColor}
                  fontFamily={cfg.fontFamily}
                  action={
                    <Link
                      to="/portofolio"
                      style={sectionBtnStyle}
                      className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs"
                    >
                      Semua Portofolio
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                />
              </FadeScroll>

              <div className={grid.className} style={grid.style}>
                {items.map((item, idx) => (
                  <FadeScroll
                    key={item.id}
                    index={idx}
                    columnsPerRow={grid.activeCols}
                    className={`h-full ${
                      grid.isHorizontal ? 'w-64 shrink-0 snap-start' : ''
                    } ${grid.isBento && idx === 0 && grid.activeCols >= 2 ? 'sm:col-span-2' : ''}`}
                  >
                    <PortfolioCard
                      item={item}
                      forceList={grid.isList}
                      onSelect={(selected) => setActivePortfolio(selected)}
                    />
                  </FadeScroll>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'procedure': {
        const items = cfg.maxItems > 0 ? ORDER_STEPS.slice(0, cfg.maxItems) : ORDER_STEPS;
        const grid = resolveCollectionGridLayout({
          layout: cfg.layout,
          colsDesktop: cfg.colsDesktop,
          colsTablet: cfg.colsTablet,
          colsMobile: cfg.colsMobile,
          gapPx: cfg.gapPx,
          viewport,
        });

        return (
          <section
            key="procedure"
            data-home-section="procedure"
            style={sectionStyle}
            className="nb-section border-b-2 border-[#171717] bg-[#F8F8E1]"
          >
            <div className="nb-container space-y-5" style={containerStyle}>
              <FadeScroll index={0}>
                <SectionHeader
                  kicker="Prosedur Pemesanan"
                  title={cfg.customTitle?.trim() || 'Empat Langkah dari Brief hingga File Final'}
                  subtitle={cfg.customSubtitle?.trim() || undefined}
                  align={cfg.textAlign}
                  headingSizePx={cfg.headingSizePx}
                  descriptionSizePx={cfg.descriptionSizePx}
                  textColor={cfg.textColor}
                  accentColor={cfg.accentColor}
                  fontFamily={cfg.fontFamily}
                  action={
                    <Link
                      to="/prosedur"
                      style={sectionBtnStyle}
                      className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs"
                    >
                      Prosedur Lengkap
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                />
              </FadeScroll>

              <div className={grid.className} style={grid.style}>
                {items.map((item, idx) => (
                  <FadeScroll
                    key={item.step}
                    index={idx}
                    columnsPerRow={grid.activeCols}
                    className={`h-full ${grid.isHorizontal ? 'w-64 shrink-0 snap-start' : ''}`}
                  >
                    <div className={`nb-card p-4 flex flex-col gap-2.5 h-full ${alignClass}`}>
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
                  </FadeScroll>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'about': {
        const isDesktop = viewport === 'desktop';
        const hasOwnerPhoto = Boolean(
          design.identity.ownerPhotoUrl || design.identity.ownerPhotoDriveFileId
        );

        return (
          <section
            key="about"
            data-home-section="about"
            style={sectionStyle}
            className="nb-section border-b-2 border-[#171717] bg-white"
          >
            <div className="nb-container" style={containerStyle}>
              <div
                className={`nb-card-cream p-5 sm:p-6 grid gap-5 items-center overflow-hidden ${
                  isDesktop ? 'grid-cols-12' : 'grid-cols-1'
                }`}
              >
                <FadeScroll
                  index={0}
                  className={`${isDesktop ? 'col-span-8' : ''} space-y-2.5 ${alignClass}`}
                >
                  <p
                    className="text-xs font-semibold text-[#6C151E]"
                    style={cfg.accentColor ? { color: cfg.accentColor } : undefined}
                  >
                    Profil Singkat Studio
                  </p>
                  <h2
                    className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-tight"
                    style={{
                      ...(cfg.headingSizePx > 0 ? { fontSize: `${cfg.headingSizePx}px` } : {}),
                      ...(cfg.textColor ? { color: cfg.textColor } : {}),
                    }}
                  >
                    {cfg.customTitle?.trim() ||
                      'Satu Studio untuk Kebutuhan Digital, Visual, dan Naskah'}
                  </h2>
                  <p
                    className="text-sm text-[#333333] leading-relaxed"
                    style={cfg.descriptionSizePx > 0 ? { fontSize: `${cfg.descriptionSizePx}px` } : undefined}
                  >
                    {cfg.customSubtitle?.trim() || siteSettings.aboutSummary}
                  </p>
                  {hasOwnerPhoto && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#171717] shrink-0">
                        <StudioImage
                          src={design.identity.ownerPhotoUrl}
                          driveFileId={design.identity.ownerPhotoDriveFileId || undefined}
                          alt={design.identity.ownerName}
                          aspectClass="w-full h-full"
                        />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-display font-bold text-xs text-[#171717] truncate">
                          {design.identity.ownerName}
                        </p>
                        <p className="text-[11px] text-[#525252] truncate">
                          {design.identity.ownerRole}
                        </p>
                      </div>
                    </div>
                  )}
                </FadeScroll>
                <FadeScroll
                  index={1}
                  staggerMs={110}
                  className={`${isDesktop ? 'col-span-4' : ''} flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3`}
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
                    style={sectionBtnStyle}
                    className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm w-full"
                  >
                    Tentang SYAMS Studio
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </FadeScroll>
              </div>
            </div>
          </section>
        );
      }

      case 'faq': {
        const limit = cfg.maxItems > 0 ? cfg.maxItems : 4;
        const homeFaqs = faqs.slice(0, limit);

        return (
          <section
            key="faq"
            data-home-section="faq"
            style={sectionStyle}
            className="nb-section border-b-2 border-[#171717] bg-[#F8F8E1]"
          >
            <div
              className="nb-container space-y-4"
              style={{
                maxWidth: `${cfg.maxWidthPx > 0 ? cfg.maxWidthPx : 896}px`,
              }}
            >
              <FadeScroll index={0}>
                <SectionHeader
                  kicker="Pertanyaan Umum"
                  title={cfg.customTitle?.trim() || 'Hal yang Sering Ditanyakan'}
                  subtitle={cfg.customSubtitle?.trim() || undefined}
                  align={cfg.textAlign}
                  headingSizePx={cfg.headingSizePx}
                  descriptionSizePx={cfg.descriptionSizePx}
                  textColor={cfg.textColor}
                  accentColor={cfg.accentColor}
                  fontFamily={cfg.fontFamily}
                  action={
                    <Link
                      to="/faq"
                      style={sectionBtnStyle}
                      className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs"
                    >
                      Semua FAQ
                    </Link>
                  }
                />
              </FadeScroll>
              <FadeScroll index={1} staggerMs={100}>
                <FaqAccordion items={homeFaqs} />
              </FadeScroll>
            </div>
          </section>
        );
      }

      case 'cta': {
        return (
          <section
            key="cta"
            data-home-section="cta"
            style={sectionStyle}
            className="nb-section bg-[#F3C95B]"
          >
            <div className="nb-container relative" style={containerStyle}>
              <div className="block absolute -top-3 right-2 sm:-top-4 sm:-right-3 z-0 pointer-events-none">
                <div
                  aria-hidden="true"
                  className="scs-deco-accent w-14 h-12 sm:w-20 sm:h-16 bg-[#0F3D3A]/85 border-2 border-[#171717] rounded-[4px]"
                />
              </div>

              <FadeScroll index={0} className="relative z-10">
                <div
                  className={`bg-white border-2 border-[#171717] nb-shadow rounded-[4px] p-5 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${alignClass}`}
                >
                  <div className="space-y-1 max-w-2xl">
                    <p
                      className="text-xs font-semibold text-[#6C151E]"
                      style={cfg.accentColor ? { color: cfg.accentColor } : undefined}
                    >
                      Mulai Proyek Anda
                    </p>
                    <h2
                      className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-snug"
                      style={{
                        ...(cfg.headingSizePx > 0 ? { fontSize: `${cfg.headingSizePx}px` } : {}),
                        ...(cfg.textColor ? { color: cfg.textColor } : {}),
                      }}
                    >
                      {cfg.customTitle?.trim() ||
                        'Siap Mewujudkan Ide Digital Anda Bersama SYAMS CREATIVE STUDIO?'}
                    </h2>
                    <p
                      className="text-xs sm:text-sm text-[#404040]"
                      style={cfg.descriptionSizePx > 0 ? { fontSize: `${cfg.descriptionSizePx}px` } : undefined}
                    >
                      {cfg.customSubtitle?.trim() ||
                        'Kirim brief melalui formulir pemesanan, lalu admin kami akan segera mengonfirmasi estimasi waktu serta biaya finalnya.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5 shrink-0">
                    <Link
                      to="/checkout"
                      style={sectionBtnStyle}
                      className="nb-btn nb-btn-primary px-5 py-2.5 text-xs sm:text-sm"
                    >
                      Buat Pesanan
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/kontak"
                      className="nb-btn nb-btn-surface px-4 py-2.5 text-xs sm:text-sm"
                    >
                      Konsultasi Dulu
                    </Link>
                  </div>
                </div>
              </FadeScroll>
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  }

  return (
    <div>
      {design.home.sectionOrder.map((sectionId) => renderSection(sectionId))}

      <PortfolioModal item={activePortfolio} onClose={() => setActivePortfolio(null)} />

      {/* Article Reader Modal */}
      {activeArticle && (
        <div
          className="fixed inset-0 z-50 bg-[#171717]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeArticle.title}
          onClick={() => setActiveArticle(null)}
        >
          <div
            className="nb-card max-w-2xl w-full max-h-[88vh] overflow-y-auto bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 py-3 border-b-2 border-[#171717] flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#6C151E] uppercase">
                {activeArticle.category}
              </span>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="nb-btn nb-btn-surface p-1.5"
                aria-label="Tutup artikel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border-b-2 border-[#171717]">
              <StudioImage
                src={activeArticle.imageUrl}
                driveFileId={activeArticle.driveFileId}
                alt={activeArticle.title}
                aspectClass="aspect-[16/9]"
              />
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <h2 className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-snug">
                  {activeArticle.title}
                </h2>
                <div className="flex items-center gap-4 text-xs font-mono text-[#525252]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {activeArticle.publishedDate}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {activeArticle.readTime}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm text-[#262626] leading-relaxed whitespace-pre-line">
                {activeArticle.content || activeArticle.summary}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

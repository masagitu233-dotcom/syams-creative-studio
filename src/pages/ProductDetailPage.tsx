import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  HardDrive,
  Layers,
} from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { useDesign } from '../contexts/DesignContext';
import { StudioImage } from '../components/StudioImage';
import { MediaGallerySection } from '../components/MediaGallerySection';
import { ProductCard } from '../components/ProductCard';
import { SectionHeader } from '../components/SectionHeader';
import { FadeScroll } from '../components/FadeScroll';
import {
  buildProductWhatsappMessage,
  buildWhatsappLink,
  DIGITAL_PRODUCT_CATEGORY_LABELS,
  formatRupiah,
} from '../utils/studioLogic';
import { getAspectClass } from '../utils/designSystem';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, loadingProducts, siteSettings } = useStudioData();
  const { design, viewport } = useDesign();
  const detailCfg = design.otherPages.detailPages;

  if (loadingProducts) {
    return (
      <div className="nb-section">
        <div className="nb-container space-y-4">
          <div className="h-4 w-48 bg-[#171717]/10 rounded animate-pulse" />
          <div className="nb-card h-80 bg-[#171717]/5 animate-pulse" />
        </div>
      </div>
    );
  }

  const product = products.find(
    (item) => item.isPublished && (item.slug === slug || item.id === slug)
  );

  if (!product) {
    return (
      <div className="nb-section">
        <div className="nb-container max-w-xl">
          <div className="nb-card p-6 text-center space-y-3">
            <h1 className="font-display font-bold text-xl sm:text-2xl text-[#171717]">
              Produk Digital Tidak Ditemukan
            </h1>
            <p className="text-sm text-[#404040]">
              Produk yang Anda cari tidak tersedia atau telah diperbarui.
            </p>
            <Link to="/produk" className="nb-btn nb-btn-primary nb-btn-md">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Katalog Produk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const related = products
    .filter((item) => item.isPublished && item.id !== product.id)
    .slice(0, detailCfg.relatedColsDesktop);

  const waHref = buildWhatsappLink(
    siteSettings.whatsappNumber,
    buildProductWhatsappMessage(product)
  );

  const isTopImage = detailCfg.imagePosition === 'top' || viewport !== 'desktop';
  const isRightImage = detailCfg.imagePosition === 'right' && viewport === 'desktop';
  const aspectClass = getAspectClass(detailCfg.imageAspectRatio);

  const relatedCols =
    viewport === 'mobile'
      ? 2
      : viewport === 'tablet'
        ? Math.min(3, detailCfg.relatedColsDesktop)
        : detailCfg.relatedColsDesktop;

  return (
    <div className="nb-section">
      <div
        className="nb-container space-y-6"
        style={{
          maxWidth: `${detailCfg.maxWidthPx > 0 ? detailCfg.maxWidthPx : design.global.containerMaxWidthPx}px`,
        }}
      >
        {/* Compact Breadcrumb */}
        <nav aria-label="Breadcrumb" className="nb-breadcrumb">
          <Link to="/" className="hover:text-[#0F3D3A] font-medium transition-colors">
            Beranda
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#737373] shrink-0" />
          <Link to="/produk" className="hover:text-[#0F3D3A] font-medium transition-colors">
            Produk Digital
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#737373] shrink-0" />
          <span className="text-[#171717] font-semibold truncate max-w-[220px] sm:max-w-md">
            {product.title}
          </span>
        </nav>

        {/* Product Overview Card */}
        <div className="nb-card overflow-hidden">
          <div className={`grid items-stretch ${isTopImage ? 'grid-cols-1' : 'grid-cols-12'}`}>
            {/* Controlled Product Preview Frame */}
            <div
              className={`${
                isTopImage
                  ? 'border-b-2'
                  : isRightImage
                    ? 'col-span-5 order-2 border-l-2'
                    : 'col-span-5 order-1 border-r-2'
              } border-[#171717] bg-[#F1F1D3] flex`}
            >
              <StudioImage
                src={product.imageUrl}
                driveFileId={product.driveFileId}
                cacheVersion={product.updatedAt}
                alt={product.title}
                aspectClass={
                  isTopImage
                    ? `w-full ${aspectClass} max-h-[380px]`
                    : `w-full ${aspectClass} lg:aspect-auto lg:h-full`
                }
                loading="eager"
              />
            </div>

            {/* Contiguous Purchase Module */}
            <div
              className={`${
                isTopImage ? '' : isRightImage ? 'col-span-7 order-1' : 'col-span-7 order-2'
              } p-4 sm:p-5 lg:p-6 flex flex-col justify-between gap-4`}
            >
              <div className="space-y-1.5">
                <p className="nb-kicker">
                  {DIGITAL_PRODUCT_CATEGORY_LABELS[product.category]}
                </p>
                <h1 className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-snug">
                  {product.title}
                </h1>
                <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
                  {product.summary}
                </p>
              </div>

              {product.showPrice && (
                <div className="p-3.5 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-[#525252]">Harga Produk Digital</p>
                    <p className="font-mono font-bold text-xl sm:text-2xl text-[#0F3D3A] tabular-nums mt-0.5">
                      {formatRupiah(product.price)}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#404040] sm:max-w-[230px] leading-relaxed">
                    File dikirim langsung setelah konfirmasi pembayaran via WhatsApp resmi studio.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#262626]">
                <div className="flex items-start gap-2 p-2.5 bg-[#F8F8E1]/70 border border-[#171717]/20 rounded-[4px]">
                  <FileText className="w-3.5 h-3.5 text-[#0F3D3A] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#525252]">Format</p>
                    <p className="font-semibold text-xs truncate">{product.format}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 bg-[#F8F8E1]/70 border border-[#171717]/20 rounded-[4px]">
                  <HardDrive className="w-3.5 h-3.5 text-[#0F3D3A] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#525252]">Ukuran File</p>
                    <p className="font-mono font-semibold text-xs tabular-nums truncate">
                      {product.fileSize || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 bg-[#F8F8E1]/70 border border-[#171717]/20 rounded-[4px]">
                  <Layers className="w-3.5 h-3.5 text-[#0F3D3A] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#525252]">Kompatibel</p>
                    <p className="font-semibold text-xs truncate">{product.compatibility || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nb-btn nb-btn-primary nb-btn-md w-full"
                >
                  Pesan via WhatsApp
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <Link
                  to="/checkout"
                  className="nb-btn nb-btn-mustard nb-btn-md w-full"
                >
                  Pesan Kustomisasi Jasa
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Balanced Full Description & Deliverables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <FadeScroll index={0} columnsPerRow={2} className="lg:col-span-7 h-full">
            <div className="nb-card p-4 sm:p-5 space-y-2 h-full">
              <h2 className="font-display font-bold text-base sm:text-lg text-[#171717]">
                Informasi Lengkap Produk
              </h2>
              <p className="text-xs sm:text-sm text-[#333333] leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          </FadeScroll>

          <FadeScroll index={1} columnsPerRow={2} className="lg:col-span-5 h-full">
            <div className="nb-card p-4 sm:p-5 space-y-2.5 h-full">
              <h2 className="font-display font-bold text-base sm:text-lg text-[#171717]">
                Isi Paket &amp; Deliverable
              </h2>
              <ul className="space-y-2">
                {product.includes.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#262626]">
                    <span className="w-4 h-4 mt-0.5 shrink-0 bg-[#F3C95B] border-2 border-[#171717] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-[#171717]" />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeScroll>
        </div>

        {/* Photo & Video Documentation Gallery */}
        {detailCfg.showGallery && product.gallery && product.gallery.length > 0 && (
          <FadeScroll index={0}>
            <section className="nb-card p-4 sm:p-5">
              <MediaGallerySection
                items={product.gallery}
                title="Galeri Dokumentasi Produk"
                cacheVersion={product.updatedAt}
              />
            </section>
          </FadeScroll>
        )}

        {/* Related Products */}
        {detailCfg.showRelated && related.length > 0 && (
          <section className="pt-6 border-t-2 border-[#171717] space-y-4">
            <FadeScroll index={0}>
              <SectionHeader
                title="Produk Digital Lainnya"
                action={
                  <Link to="/produk" className="nb-btn nb-btn-surface nb-btn-sm">
                    Lihat Semua
                  </Link>
                }
              />
            </FadeScroll>
            <div
              className="grid gap-2.5 sm:gap-3 items-stretch"
              style={{
                gridTemplateColumns: `repeat(${relatedCols}, minmax(0, 1fr))`,
              }}
            >
              {related.map((item, idx) => (
                <FadeScroll key={item.id} index={idx} columnsPerRow={relatedCols} className="h-full">
                  <ProductCard product={item} />
                </FadeScroll>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock, ShieldCheck } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { StudioImage } from '../components/StudioImage';
import { ServiceCard } from '../components/ServiceCard';
import { SectionHeader } from '../components/SectionHeader';
import { CATALOG_GRID_COLS_CLASS, SERVICE_CATEGORY_LABELS } from '../utils/studioLogic';

export function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { services, loadingServices } = useStudioData();

  const service = services.find((item) => item.slug === slug || item.id === slug);
  const otherServices = services.filter((item) => item.id !== service?.id).slice(0, 5);

  if (loadingServices && !service) {
    return (
      <div className="nb-section">
        <div className="nb-container">
          <div className="nb-card p-5 animate-pulse space-y-4">
            <div className="h-6 w-1/2 bg-[#E5E5C7]" />
            <div className="h-52 w-full bg-[#E5E5C7]" />
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="nb-section">
        <div className="nb-container max-w-xl">
          <div className="nb-card p-6 text-center space-y-3">
            <h1 className="font-display font-bold text-xl sm:text-2xl text-[#171717]">
              Layanan Tidak Ditemukan
            </h1>
            <p className="text-sm text-[#404040]">
              Layanan yang Anda cari mungkin telah diperbarui atau tidak lagi dipublikasikan.
            </p>
            <Link to="/layanan" className="nb-btn nb-btn-primary nb-btn-md">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Katalog Layanan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-section">
      <div className="nb-container space-y-6">
        {/* Compact Breadcrumb */}
        <nav aria-label="Breadcrumb" className="nb-breadcrumb">
          <Link to="/" className="hover:text-[#0F3D3A] font-medium transition-colors">
            Beranda
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#737373] shrink-0" />
          <Link to="/layanan" className="hover:text-[#0F3D3A] font-medium transition-colors">
            Layanan
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#737373] shrink-0" />
          <span className="text-[#171717] font-semibold truncate max-w-[220px] sm:max-w-md">
            {service.title}
          </span>
        </nav>

        {/* Compact Horizontal Primary Overview Card */}
        <div className="nb-card overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Controlled Preview Image Frame */}
            <div className="lg:col-span-5 border-b-2 lg:border-b-0 lg:border-r-2 border-[#171717] bg-[#F1F1D3] flex">
              <StudioImage
                src={service.imageUrl}
                driveFileId={service.driveFileId}
                alt={service.title}
                accentColor={service.accentColor}
                aspectClass="w-full aspect-[16/10] max-h-[280px] lg:aspect-auto lg:h-full lg:max-h-none"
                loading="eager"
              />
            </div>

            {/* Contiguous Order & Pricing Module */}
            <div className="lg:col-span-7 p-4 sm:p-5 lg:p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <p className="nb-kicker">
                  {SERVICE_CATEGORY_LABELS[service.category]} · Estimasi {service.estimatedTurnaround}
                </p>
                <h1 className="font-display font-bold text-xl sm:text-2xl text-[#171717] leading-snug">
                  {service.title}
                </h1>
                <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
                  {service.shortDescription}
                </p>
              </div>

              <div className="p-3.5 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-[#525252]">Estimasi Harga Awal</p>
                  <p className="font-mono font-bold text-lg sm:text-xl text-[#0F3D3A] tabular-nums mt-0.5">
                    {service.priceLabel}
                  </p>
                </div>
                <p className="text-[11px] text-[#404040] sm:max-w-[230px] leading-relaxed">
                  Harga awal bersifat estimasi. Biaya final dikonfirmasi admin setelah brief ditinjau.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#333333]">
                <div className="flex items-center gap-2 p-2.5 bg-[#F8F8E1]/70 border border-[#171717]/20 rounded-[4px]">
                  <Clock className="w-3.5 h-3.5 text-[#0F3D3A] shrink-0" />
                  <span>Durasi: {service.estimatedTurnaround}</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#F8F8E1]/70 border border-[#171717]/20 rounded-[4px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0F3D3A] shrink-0" />
                  <span>Brief & lampiran privat per akun</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                <Link
                  to={`/checkout?service=${encodeURIComponent(service.slug)}`}
                  className="nb-btn nb-btn-primary nb-btn-md w-full"
                >
                  Pesan Sekarang
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/prosedur"
                  className="nb-btn nb-btn-surface nb-btn-md w-full"
                >
                  Pelajari Alur Pemesanan
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Balanced Full Description & Deliverables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 nb-card p-4 sm:p-5 space-y-2 h-full">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#171717]">
              Deskripsi & Cakupan Layanan
            </h2>
            <p className="text-xs sm:text-sm text-[#333333] leading-relaxed whitespace-pre-line">
              {service.fullDescription}
            </p>
          </div>

          <div className="lg:col-span-5 nb-card p-4 sm:p-5 space-y-2.5 h-full">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#171717]">
              Yang Anda Dapatkan
            </h2>
            <ul className="space-y-2">
              {service.deliverables.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-[#262626]"
                >
                  <span className="w-4 h-4 mt-0.5 shrink-0 bg-[#F3C95B] border-2 border-[#171717] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#171717]" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Related Services */}
        {otherServices.length > 0 && (
          <section className="pt-6 border-t-2 border-[#171717] space-y-4">
            <SectionHeader
              title="Layanan Lainnya"
              action={
                <Link to="/layanan" className="nb-btn nb-btn-surface nb-btn-sm">
                  Lihat Semua
                </Link>
              }
            />
            <div className={`grid ${CATALOG_GRID_COLS_CLASS} gap-2.5 sm:gap-3 items-stretch`}>
              {otherServices.map((item) => (
                <ServiceCard key={item.id} service={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

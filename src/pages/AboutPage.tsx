import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { STUDIO_IMAGES } from '../data/initialCatalog';
import { StudioImage } from '../components/StudioImage';
import { SectionHeader } from '../components/SectionHeader';
import { Reveal } from '../components/Reveal';

const VALUES = [
  {
    code: '01',
    title: 'Kejelasan di Atas Kerumitan',
    body: 'Karya digital yang baik selalu memudahkan audiens—baik navigasi website, alur video, tata letak poster, maupun susunan naskah.',
    bg: 'bg-[#F3C95B]/45',
  },
  {
    code: '02',
    title: 'Komunikasi Jujur & Terbuka',
    body: 'Estimasi biaya dan waktu disampaikan sejak awal. Setiap penyesuaian didiskusikan terbuka sebelum pengerjaan berlanjut.',
    bg: 'bg-[#8ACCD5]/40',
  },
  {
    code: '03',
    title: 'Kualitas Konsisten di Lima Bidang',
    body: 'Setiap layanan digarap dengan standar editorial yang seragam: rapi, responsif, sesuai kaidah bahasa, dan siap pakai.',
    bg: 'bg-white',
  },
];

export function AboutPage() {
  const { siteSettings, services } = useStudioData();

  return (
    <div className="nb-section">
      <div className="nb-container space-y-6">
        {/* Compact Horizontal Studio Profile Banner */}
        <Reveal>
          <div className="nb-card overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-center gap-3">
                <p className="nb-kicker">Tentang Kami</p>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#171717] leading-tight">
                  {siteSettings.studioName} — {siteSettings.slogan}
                </h1>
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
                  {siteSettings.aboutSummary}
                </p>
                {siteSettings.aboutMission && (
                  <p className="text-xs sm:text-sm text-[#525252] leading-relaxed">
                    {siteSettings.aboutMission}
                  </p>
                )}
                <div className="pt-1 flex flex-wrap gap-2">
                  <Link to="/layanan" className="nb-btn nb-btn-primary nb-btn-md">
                    Katalog Layanan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link to="/produk" className="nb-btn nb-btn-mustard nb-btn-md">
                    Produk Digital
                  </Link>
                  <Link to="/portofolio" className="nb-btn nb-btn-surface nb-btn-md">
                    Portofolio
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 border-t-2 lg:border-t-0 lg:border-l-2 border-[#171717] bg-[#F8F8E1] flex">
                <StudioImage
                  src={STUDIO_IMAGES.hero}
                  alt="Ruang kerja SYAMS CREATIVE STUDIO"
                  aspectClass="w-full aspect-[16/10] max-h-[280px] lg:aspect-auto lg:h-full lg:max-h-none"
                />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Symmetrical 3-Column Values Grid */}
        <section className="space-y-4">
          <SectionHeader
            kicker="Prinsip Kerja"
            title="Nilai yang Menjaga Standar Setiap Proyek"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {VALUES.map((val) => (
              <div
                key={val.code}
                className={`${val.bg} border-2 border-[#171717] nb-shadow rounded-[4px] p-4 sm:p-5 flex flex-col gap-2 h-full`}
              >
                <p className="font-mono font-bold text-xs text-[#6C151E]">{val.code}.</p>
                <h3 className="font-display font-bold text-base text-[#171717]">
                  {val.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">{val.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Symmetrical 5-Column Services Scope Strip */}
        <section className="nb-card p-4 sm:p-5 space-y-4">
          <SectionHeader
            kicker="Ruang Lingkup Keahlian"
            title="Lima Layanan Utama Studio"
            action={
              <Link to="/checkout" className="nb-btn nb-btn-mustard nb-btn-sm">
                Mulai Pemesanan
              </Link>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-stretch">
            {services.map((srv, idx) => (
              <Link
                key={srv.id}
                to={`/layanan/${srv.slug}`}
                className="p-3.5 border-2 border-[#171717] bg-[#F8F8E1] hover:bg-[#F3C95B]/45 rounded-[4px] transition-colors flex flex-col justify-between gap-2 h-full"
              >
                <div className="space-y-1">
                  <p className="font-mono text-[11px] font-bold text-[#6C151E]">0{idx + 1}.</p>
                  <h3 className="font-display font-bold text-xs sm:text-sm text-[#171717] leading-snug line-clamp-2 min-h-[2.25rem]">
                    {srv.title}
                  </h3>
                </div>
                <p className="font-mono text-[11px] font-bold text-[#0F3D3A] tabular-nums">
                  {srv.priceLabel}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

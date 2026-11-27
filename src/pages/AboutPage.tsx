import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { useDesign } from '../contexts/DesignContext';
import { STUDIO_IMAGES } from '../data/initialCatalog';
import { StudioImage } from '../components/StudioImage';
import { SectionHeader } from '../components/SectionHeader';
import { FadeScroll } from '../components/FadeScroll';
import { getDesignTextAlignClass } from '../utils/designSystem';

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
  const { design, viewport } = useDesign();
  const aboutCfg = design.otherPages.about;
  const idCfg = design.identity;

  const padScale = design.responsive[viewport].sectionPaddingScale;
  const padY = Math.round(aboutCfg.paddingYPx * padScale);
  const alignClass = getDesignTextAlignClass(aboutCfg.textAlign);

  const coverUrl = idCfg.coverImageUrl || siteSettings.heroImageUrl || STUDIO_IMAGES.hero;
  const coverDriveId =
    idCfg.coverImageUrl || idCfg.coverDriveFileId
      ? idCfg.coverDriveFileId || undefined
      : siteSettings.heroDriveFileId || undefined;

  const valuesCols =
    viewport === 'mobile'
      ? 1
      : viewport === 'tablet'
        ? Math.min(2, aboutCfg.valuesColsDesktop)
        : aboutCfg.valuesColsDesktop;

  const cardBgStyle = aboutCfg.cardBackgroundColor
    ? { backgroundColor: aboutCfg.cardBackgroundColor }
    : undefined;

  return (
    <div
      className="nb-section"
      style={{
        paddingTop: `${padY}px`,
        paddingBottom: `${padY}px`,
        ...(aboutCfg.backgroundColor ? { backgroundColor: aboutCfg.backgroundColor } : {}),
      }}
    >
      <div
        className="nb-container space-y-6"
        style={{
          maxWidth: `${aboutCfg.maxWidthPx > 0 ? aboutCfg.maxWidthPx : design.global.containerMaxWidthPx}px`,
        }}
      >
        {/* Compact Horizontal Studio Profile Banner */}
        <FadeScroll index={0}>
          <div className="nb-card overflow-hidden" style={cardBgStyle}>
            <div
              className={`grid items-stretch ${
                aboutCfg.showCoverBanner && viewport === 'desktop'
                  ? 'grid-cols-12'
                  : 'grid-cols-1'
              }`}
            >
              <div
                className={`${
                  aboutCfg.showCoverBanner && viewport === 'desktop' ? 'col-span-7' : ''
                } p-4 sm:p-6 flex flex-col justify-center gap-3 ${alignClass}`}
              >
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
                <div
                  className={`pt-1 flex flex-wrap gap-2 ${
                    aboutCfg.textAlign === 'center'
                      ? 'justify-center'
                      : aboutCfg.textAlign === 'right'
                        ? 'justify-end'
                        : 'justify-start'
                  }`}
                >
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

              {aboutCfg.showCoverBanner && (
                <div
                  className={`${
                    viewport === 'desktop' ? 'col-span-5 border-l-2' : 'border-t-2'
                  } border-[#171717] bg-[#F8F8E1] flex overflow-hidden`}
                >
                  <StudioImage
                    src={coverUrl}
                    driveFileId={coverDriveId}
                    cacheVersion={siteSettings.updatedAt}
                    alt={`Ruang kerja ${siteSettings.studioName}`}
                    aspectClass="w-full aspect-[16/10] max-h-[280px] lg:aspect-auto lg:h-full lg:max-h-none"
                    loading="eager"
                  />
                </div>
              )}
            </div>
          </div>
        </FadeScroll>

        {/* Optional Owner / Creative Director Profile Card */}
        {aboutCfg.showOwnerProfile && (
          <FadeScroll index={0}>
            <section
              className="nb-card p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5"
              style={cardBgStyle}
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#171717] bg-[#F8F8E1] shrink-0">
                {idCfg.ownerPhotoUrl || idCfg.ownerPhotoDriveFileId ? (
                  <StudioImage
                    src={idCfg.ownerPhotoUrl}
                    driveFileId={idCfg.ownerPhotoDriveFileId || undefined}
                    alt={idCfg.ownerName}
                    aspectClass="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0F3D3A] text-[#F3C95B] font-display font-bold text-2xl">
                    OC
                  </div>
                )}
              </div>
              <div className={`space-y-1.5 flex-1 ${alignClass}`}>
                <p className="nb-kicker">Profil Pemilik &amp; Pengarah Kreatif</p>
                <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
                  {idCfg.ownerName || 'Tim OSAMA CREATIVE STUDIO'}
                </h2>
                <p className="text-xs font-mono font-semibold text-[#0F3D3A]">
                  {idCfg.ownerRole || 'Founder & Creative Director'}
                </p>
                <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
                  {idCfg.ownerBio}
                </p>
              </div>
            </section>
          </FadeScroll>
        )}

        {/* Values Grid */}
        {aboutCfg.showValues && (
          <section className="space-y-4">
            <FadeScroll index={0}>
              <SectionHeader
                kicker="Prinsip Kerja"
                title="Nilai yang Menjaga Standar Setiap Proyek"
                align={aboutCfg.textAlign}
              />
            </FadeScroll>

            <div
              className="grid gap-4 items-stretch"
              style={{
                gridTemplateColumns: `repeat(${valuesCols}, minmax(0, 1fr))`,
              }}
            >
              {VALUES.map((val, idx) => (
                <FadeScroll
                  key={val.code}
                  index={idx}
                  columnsPerRow={valuesCols}
                  className="h-full"
                >
                  <div
                    style={cardBgStyle}
                    className={`${val.bg} border-2 border-[#171717] nb-shadow rounded-[4px] p-4 sm:p-5 flex flex-col gap-2 h-full ${alignClass}`}
                  >
                    <p className="font-mono font-bold text-xs text-[#6C151E]">{val.code}.</p>
                    <h3 className="font-display font-bold text-base text-[#171717]">
                      {val.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">{val.body}</p>
                  </div>
                </FadeScroll>
              ))}
            </div>
          </section>
        )}

        {/* Services Scope Strip */}
        {aboutCfg.showServicesStrip && (
          <FadeScroll index={0}>
            <section className="nb-card p-4 sm:p-5 space-y-4" style={cardBgStyle}>
              <SectionHeader
                kicker="Ruang Lingkup Keahlian"
                title="Lima Layanan Utama Studio"
                align={aboutCfg.textAlign}
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
          </FadeScroll>
        )}
      </div>
    </div>
  );
}

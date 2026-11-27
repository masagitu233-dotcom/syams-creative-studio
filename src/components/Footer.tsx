import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useDesign } from '../contexts/DesignContext';
import { buildMediaImageCandidates, buildWhatsappLink, sanitizeHttpUrl } from '../utils/studioLogic';
import { FadeScroll } from './FadeScroll';

export function Footer() {
  const { siteSettings } = useStudioData();
  const { user, isAdmin } = useAuth();
  const { design, viewport, isEmbeddedPreview } = useDesign();

  const footerCfg = design.footer;
  const identity = design.identity;

  const logoSrc = useMemo(() => {
    if (!identity.logoUrl && !identity.logoDriveFileId) return '';
    return (
      buildMediaImageCandidates({
        src: identity.logoUrl,
        driveFileId: identity.logoDriveFileId || undefined,
        visibility: 'public',
      })[0]?.url || ''
    );
  }, [identity.logoUrl, identity.logoDriveFileId]);

  if (!footerCfg.visible) return null;

  const socialLinks = [
    { label: 'Instagram', url: sanitizeHttpUrl(siteSettings.instagramUrl) },
    { label: 'TikTok', url: sanitizeHttpUrl(siteSettings.tiktokUrl) },
    { label: 'YouTube', url: sanitizeHttpUrl(siteSettings.youtubeUrl) },
    { label: 'LinkedIn', url: sanitizeHttpUrl(siteSettings.linkedinUrl) },
  ].filter((item) => Boolean(item.url));

  const waHref = buildWhatsappLink(
    siteSettings.whatsappNumber,
    'Halo SYAMS CREATIVE STUDIO, saya ingin berkonsultasi mengenai layanan dan produk digital.'
  );

  const footerStyle: React.CSSProperties = {};
  if (footerCfg.backgroundColor) footerStyle.backgroundColor = footerCfg.backgroundColor;
  if (footerCfg.textColor) footerStyle.color = footerCfg.textColor;
  if (footerCfg.borderColor) footerStyle.borderTopColor = footerCfg.borderColor;

  const accentStyle: React.CSSProperties = footerCfg.accentColor
    ? { color: footerCfg.accentColor }
    : {};

  const alignClass =
    footerCfg.textAlign === 'center'
      ? 'text-center items-center'
      : footerCfg.textAlign === 'right'
        ? 'text-right items-end'
        : 'text-left items-start';

  const isCenteredLayout = footerCfg.layout === 'centered';
  const gridColsClass = (() => {
    if (isCenteredLayout || viewport === 'mobile') return 'grid-cols-1';
    if (footerCfg.layout === '2_col') return 'grid-cols-1 md:grid-cols-2';
    if (footerCfg.layout === '3_col') return 'grid-cols-1 md:grid-cols-3';
    return viewport === 'tablet'
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-12';
  })();

  const brandSpan =
    !isCenteredLayout && footerCfg.layout === '4_col' && viewport === 'desktop'
      ? 'lg:col-span-5'
      : '';
  const menuSpan =
    !isCenteredLayout && footerCfg.layout === '4_col' && viewport === 'desktop'
      ? 'lg:col-span-2'
      : '';
  const contactSpan =
    !isCenteredLayout && footerCfg.layout === '4_col' && viewport === 'desktop'
      ? 'lg:col-span-3'
      : '';

  const blockLink = (e: React.MouseEvent) => {
    if (isEmbeddedPreview) e.preventDefault();
  };

  return (
    <footer
      className="relative z-[25] bg-[#0F3D3A] text-[#F8F8E1] border-t-2 border-[#171717]"
      style={footerStyle}
    >
      <div
        className="nb-container py-9 sm:py-10"
        style={{
          ...(footerCfg.paddingYPx !== 36
            ? { paddingTop: `${footerCfg.paddingYPx}px`, paddingBottom: `${footerCfg.paddingYPx}px` }
            : {}),
          ...(design.global.containerMaxWidthPx !== 1280
            ? { maxWidth: `${design.global.containerMaxWidthPx}px` }
            : {}),
        }}
      >
        <div
          className={`grid ${gridColsClass} gap-7 ${
            isCenteredLayout ? 'max-w-2xl mx-auto text-center justify-items-center' : ''
          }`}
        >
          {footerCfg.showAbout && (
            <FadeScroll
              index={0}
              columnsPerRow={4}
              className={`${brandSpan} space-y-2.5 flex flex-col ${isCenteredLayout ? 'items-center text-center' : alignClass}`}
            >
              <Link
                to="/"
                onClick={blockLink}
                className="font-display font-bold text-lg tracking-tight inline-flex items-center gap-2"
              >
                {logoSrc && (
                  <img
                    src={logoSrc}
                    alt={`Logo ${siteSettings.studioName}`}
                    style={{ height: `${Math.min(40, identity.logoHeightPx)}px` }}
                    className="w-auto object-contain bg-white/95 rounded-[4px] p-0.5"
                  />
                )}
                <span>{siteSettings.studioName}</span>
              </Link>
              <p className="font-display font-semibold text-sm text-[#F3C95B]" style={accentStyle}>
                {siteSettings.slogan}
              </p>
              <p className="text-xs opacity-80 leading-relaxed max-w-sm">
                {siteSettings.aboutSummary}
              </p>
              {footerCfg.showWhatsappButton && (
                <div className="pt-1.5 flex flex-wrap gap-2.5">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={blockLink}
                    className="nb-btn nb-btn-mustard px-3.5 py-1.5 text-xs"
                  >
                    WhatsApp Studio
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                  <Link
                    to="/pesanan-saya"
                    onClick={blockLink}
                    className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs"
                  >
                    {user ? 'Pesanan Saya' : 'Cek Pesanan'}
                  </Link>
                </div>
              )}
            </FadeScroll>
          )}

          {footerCfg.showQuickLinks && (
            footerCfg.layout === '3_col' ? (
              <FadeScroll
                index={1}
                columnsPerRow={3}
                className="grid grid-cols-2 gap-6"
              >
                <div className="space-y-2">
                  <h2 className="font-display font-bold text-xs text-[#F3C95B]" style={accentStyle}>
                    Katalog
                  </h2>
                  <ul className="space-y-1.5 text-xs opacity-90">
                    <li>
                      <Link to="/" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Beranda
                      </Link>
                    </li>
                    <li>
                      <Link to="/layanan" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Layanan Jasa
                      </Link>
                    </li>
                    <li>
                      <Link to="/produk" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Produk Digital
                      </Link>
                    </li>
                    <li>
                      <Link to="/portofolio" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Portofolio
                      </Link>
                    </li>
                    {design.articles.showInNavigation && (
                      <li>
                        <Link to="/artikel" onClick={blockLink} className="hover:opacity-100 hover:underline">
                          Artikel &amp; Konten
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h2 className="font-display font-bold text-xs text-[#F3C95B]" style={accentStyle}>
                    Informasi
                  </h2>
                  <ul className="space-y-1.5 text-xs opacity-90">
                    <li>
                      <Link to="/prosedur" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Prosedur Pemesanan
                      </Link>
                    </li>
                    <li>
                      <Link to="/tentang" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Tentang Studio
                      </Link>
                    </li>
                    <li>
                      <Link to="/faq" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        FAQ
                      </Link>
                    </li>
                    <li>
                      <Link to="/kontak" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Kontak
                      </Link>
                    </li>
                  </ul>
                </div>
              </FadeScroll>
            ) : (
              <>
                <FadeScroll
                  index={1}
                  columnsPerRow={4}
                  className={`${menuSpan} space-y-2 ${isCenteredLayout ? 'text-center' : ''}`}
                >
                  <h2 className="font-display font-bold text-xs text-[#F3C95B]" style={accentStyle}>
                    Katalog
                  </h2>
                  <ul className="space-y-1.5 text-xs opacity-90">
                    <li>
                      <Link to="/" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Beranda
                      </Link>
                    </li>
                    <li>
                      <Link to="/layanan" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Layanan Jasa
                      </Link>
                    </li>
                    <li>
                      <Link to="/produk" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Produk Digital
                      </Link>
                    </li>
                    <li>
                      <Link to="/portofolio" onClick={blockLink} className="hover:opacity-100 hover:underline">
                        Portofolio
                      </Link>
                    </li>
                    {design.articles.showInNavigation && (
                      <li>
                        <Link to="/artikel" onClick={blockLink} className="hover:opacity-100 hover:underline">
                          Artikel &amp; Konten
                        </Link>
                      </li>
                    )}
                  </ul>
                </FadeScroll>

                {footerCfg.layout !== '2_col' && (
                  <FadeScroll
                    index={2}
                    columnsPerRow={4}
                    className={`${menuSpan} space-y-2 ${isCenteredLayout ? 'text-center' : ''}`}
                  >
                    <h2 className="font-display font-bold text-xs text-[#F3C95B]" style={accentStyle}>
                      Informasi
                    </h2>
                    <ul className="space-y-1.5 text-xs opacity-90">
                      <li>
                        <Link to="/prosedur" onClick={blockLink} className="hover:opacity-100 hover:underline">
                          Prosedur Pemesanan
                        </Link>
                      </li>
                      <li>
                        <Link to="/tentang" onClick={blockLink} className="hover:opacity-100 hover:underline">
                          Tentang Studio
                        </Link>
                      </li>
                      <li>
                        <Link to="/faq" onClick={blockLink} className="hover:opacity-100 hover:underline">
                          FAQ
                        </Link>
                      </li>
                      <li>
                        <Link to="/kontak" onClick={blockLink} className="hover:opacity-100 hover:underline">
                          Kontak
                        </Link>
                      </li>
                    </ul>
                  </FadeScroll>
                )}
              </>
            )
          )}

          <FadeScroll
            index={3}
            columnsPerRow={4}
            className={`${contactSpan} space-y-2 ${isCenteredLayout ? 'text-center' : ''}`}
          >
            <h2 className="font-display font-bold text-xs text-[#F3C95B]" style={accentStyle}>
              Kontak Studio
            </h2>
            <div className="space-y-1 text-xs opacity-90">
              <p>{siteSettings.email}</p>
              <p>{siteSettings.operatingHours}</p>
              <p className="opacity-75">{siteSettings.address}</p>
            </div>
            {footerCfg.showSocials && socialLinks.length > 0 && (
              <div
                className={`pt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[#8ACCD5] ${
                  isCenteredLayout ? 'justify-center' : ''
                }`}
                style={accentStyle}
              >
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={blockLink}
                    className="hover:opacity-80 underline underline-offset-4 transition-opacity"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}
          </FadeScroll>
        </div>

        <FadeScroll
          delayMs={180}
          className={`mt-7 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs opacity-80 ${
            isCenteredLayout ? 'sm:flex-col items-center text-center' : ''
          }`}
        >
          <p>
            {footerCfg.copyrightText.trim() ||
              `© ${new Date().getFullYear()} ${siteSettings.studioName}. Seluruh hak cipta dilindungi.`}
          </p>
          <div className="flex items-center gap-4">
            <Link to="/pesanan-saya" onClick={blockLink} className="hover:underline">
              Riwayat Pesanan
            </Link>
            <Link to="/admin" onClick={blockLink} className="hover:underline">
              {isAdmin ? 'Dashboard Admin' : 'Portal Admin'}
            </Link>
          </div>
        </FadeScroll>
      </div>
    </footer>
  );
}

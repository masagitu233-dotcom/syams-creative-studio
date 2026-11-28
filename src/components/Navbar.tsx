import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStudioData } from '../contexts/StudioDataContext';
import { useDesign } from '../contexts/DesignContext';
import { BRAND_ASSETS } from '../data/initialCatalog';
import { buildMediaImageCandidates, isDarkColorHex } from '../utils/studioLogic';

const BASE_DESKTOP_NAV = [
  { to: '/layanan', label: 'Layanan' },
  { to: '/produk', label: 'Produk' },
  { to: '/portofolio', label: 'Portofolio' },
  { to: '/prosedur', label: 'Prosedur' },
  { to: '/kontak', label: 'Kontak' },
];

const MOBILE_EXTRA_NAV = [
  { to: '/tentang', label: 'Tentang Kami' },
  { to: '/faq', label: 'FAQ' },
  { to: '/pesanan-saya', label: 'Riwayat Pesanan' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const { siteSettings } = useStudioData();
  const { design, viewport, isEmbeddedPreview } = useDesign();
  const location = useLocation();

  const headerCfg = design.header;
  const identity = design.identity;

  const desktopNav = useMemo(() => {
    const items = [...BASE_DESKTOP_NAV];
    if (design.articles.showInNavigation) {
      items.splice(3, 0, { to: '/artikel', label: 'Artikel' });
    }
    return items;
  }, [design.articles.showInNavigation]);

  const customLogoSrc = useMemo(() => {
    if (!identity.logoUrl && !identity.logoDriveFileId) return '';
    return (
      buildMediaImageCandidates({
        src: identity.logoUrl,
        driveFileId: identity.logoDriveFileId || undefined,
        visibility: 'public',
      })[0]?.url || ''
    );
  }, [identity.logoUrl, identity.logoDriveFileId]);

  const logoSrc = customLogoSrc || BRAND_ASSETS.logoUrl;
  const isOfficialFullLogo = !customLogoSrc;
  const isDarkHeaderBg = isDarkColorHex(headerCfg.backgroundColor, false);
  const hasCustomLogoHeight = identity.logoHeightPx !== 32;

  if (!headerCfg.visible) return null;

  const isDesktop = viewport === 'desktop';
  const showInlineNav = isEmbeddedPreview ? isDesktop : undefined;

  const headerStyle: React.CSSProperties = {};
  if (headerCfg.backgroundColor) headerStyle.backgroundColor = headerCfg.backgroundColor;
  if (headerCfg.textColor) headerStyle.color = headerCfg.textColor;
  if (headerCfg.borderColor) headerStyle.borderBottomColor = headerCfg.borderColor;

  const ctaStyle: React.CSSProperties = {};
  if (headerCfg.ctaBg) {
    ctaStyle.backgroundColor = headerCfg.ctaBg;
    ctaStyle.borderColor = headerCfg.ctaBg;
  }
  if (headerCfg.ctaText) {
    ctaStyle.color = headerCfg.ctaText;
  }

  const brandElement = (
    <Link
      to="/"
      aria-label={siteSettings.studioName}
      onClick={(e) => {
        if (isEmbeddedPreview) e.preventDefault();
        setMobileOpen(false);
      }}
      className="inline-flex items-center gap-2 font-display font-bold text-sm sm:text-base tracking-tight hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
      style={headerCfg.textColor ? { color: headerCfg.textColor } : undefined}
    >
      <img
        src={logoSrc}
        alt={siteSettings.studioName}
        loading="eager"
        decoding="async"
        style={hasCustomLogoHeight ? { height: `${identity.logoHeightPx}px` } : undefined}
        className={`${
          hasCustomLogoHeight
            ? 'w-auto max-w-[165px] sm:max-w-[210px]'
            : 'h-9 sm:h-11 w-auto max-w-[160px] sm:max-w-[205px]'
        } object-contain shrink-0 select-none ${isDarkHeaderBg ? 'brightness-0 invert opacity-95' : ''}`}
      />
      {!isOfficialFullLogo && identity.showLogoText && <span>{siteSettings.studioName}</span>}
    </Link>
  );

  const navAlignClass =
    headerCfg.navAlign === 'left'
      ? 'justify-start'
      : headerCfg.navAlign === 'right'
        ? 'justify-end'
        : 'justify-center';

  const navItemsElement = (
    <nav
      aria-label="Navigasi utama"
      className={
        isEmbeddedPreview
          ? showInlineNav
            ? `flex items-center flex-1 ${navAlignClass}`
            : 'hidden'
          : `hidden lg:flex items-center flex-1 ${navAlignClass}`
      }
      style={{
        gap: `${headerCfg.navGapPx}px`,
        fontSize: `${headerCfg.navFontSizePx}px`,
      }}
    >
      {desktopNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={(e) => {
            if (isEmbeddedPreview) e.preventDefault();
          }}
          className={({ isActive }) =>
            `py-1 whitespace-nowrap shrink-0 border-b-2 font-medium transition-colors ${
              isActive
                ? 'border-[#0F3D3A] text-[#0F3D3A] font-semibold'
                : 'border-transparent hover:border-current opacity-85 hover:opacity-100'
            }`
          }
          style={headerCfg.textColor ? { color: headerCfg.textColor } : undefined}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <header
      className={`${headerCfg.sticky && !isEmbeddedPreview ? 'sticky top-0' : 'relative'} z-40 bg-[#F8F8E1] border-b-2 border-[#171717]`}
      style={headerStyle}
    >
      <div
        className="nb-container h-14 flex items-center justify-between gap-4"
        style={{
          ...(headerCfg.heightPx !== 56 ? { minHeight: `${headerCfg.heightPx}px`, height: 'auto' } : {}),
          ...(headerCfg.paddingXPx > 0
            ? { paddingLeft: `${headerCfg.paddingXPx}px`, paddingRight: `${headerCfg.paddingXPx}px` }
            : {}),
          ...(design.global.containerMaxWidthPx !== 1280
            ? { maxWidth: `${design.global.containerMaxWidthPx}px` }
            : {}),
        }}
      >
        {headerCfg.layout === 'split_logo_center' && isDesktop ? (
          <>
            <div className="flex-1 flex items-center justify-start">{navItemsElement}</div>
            <div className="shrink-0">{brandElement}</div>
            <div className="flex-1 flex items-center justify-end gap-2.5">
              {headerCfg.showCta && (
                <Link
                  to="/checkout"
                  onClick={(e) => {
                    if (isEmbeddedPreview) e.preventDefault();
                  }}
                  style={ctaStyle}
                  className="nb-btn nb-btn-primary px-3.5 py-1.5 text-xs"
                >
                  {headerCfg.ctaLabel}
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            {brandElement}
            {navItemsElement}
            <div className="flex items-center gap-2.5 shrink-0">
              {headerCfg.showCta && (
                <Link
                  to="/checkout"
                  onClick={(e) => {
                    if (isEmbeddedPreview) e.preventDefault();
                    setMobileOpen(false);
                  }}
                  style={ctaStyle}
                  className={`${
                    isEmbeddedPreview ? (viewport === 'mobile' ? 'hidden' : 'inline-flex') : 'hidden sm:inline-flex'
                  } nb-btn nb-btn-primary px-3.5 py-1.5 text-xs`}
                >
                  {headerCfg.ctaLabel}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                className={`${
                  isEmbeddedPreview ? (isDesktop ? 'hidden' : 'inline-flex') : 'lg:hidden'
                } nb-btn nb-btn-surface p-2 min-w-[40px] min-h-[40px]`}
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            aria-label="Navigasi seluler"
            className={`${isEmbeddedPreview ? '' : 'lg:hidden'} overflow-hidden bg-[#F8F8E1] border-t-2 border-[#171717]`}
            style={headerStyle}
          >
            <div className="nb-container py-3 flex flex-col gap-1">
              <Link
                to="/"
                onClick={(e) => {
                  if (isEmbeddedPreview) e.preventDefault();
                  setMobileOpen(false);
                }}
                className={`px-3 py-2 text-sm font-medium rounded-[4px] border-2 ${
                  location.pathname === '/'
                    ? 'bg-[#F3C95B] border-[#171717] font-semibold text-[#171717]'
                    : 'border-transparent hover:bg-white/70'
                }`}
              >
                Beranda
              </Link>
              {[...desktopNav, ...MOBILE_EXTRA_NAV].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={(e) => {
                    if (isEmbeddedPreview) e.preventDefault();
                    setMobileOpen(false);
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-[4px] border-2 ${
                    location.pathname.startsWith(item.to)
                      ? 'bg-[#F3C95B] border-[#171717] font-semibold text-[#171717]'
                      : 'border-transparent hover:bg-white/70'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && !isEmbeddedPreview && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm font-semibold rounded-[4px] border-2 border-[#171717] bg-[#8ACCD5] text-[#171717]"
                >
                  Dashboard Admin
                </Link>
              )}
              {headerCfg.showCta && (
                <div className="pt-2.5 mt-1 border-t-2 border-[#171717]/15">
                  <Link
                    to="/checkout"
                    onClick={(e) => {
                      if (isEmbeddedPreview) e.preventDefault();
                      setMobileOpen(false);
                    }}
                    style={ctaStyle}
                    className="nb-btn nb-btn-primary px-4 py-2 text-sm w-full"
                  >
                    {headerCfg.ctaLabel}
                  </Link>
                </div>
              )}
              {user && !isEmbeddedPreview && (
                <p className="text-xs opacity-75 px-1 pt-1 truncate">
                  Masuk sebagai {user.displayName || user.email}
                </p>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

import React, { useMemo, useState } from 'react';
import { Maximize2, Minimize2, Monitor, Smartphone, Tablet } from 'lucide-react';
import { DesignPreviewOverrideProvider } from '../../../contexts/DesignContext';
import { Navbar } from '../../Navbar';
import { Footer } from '../../Footer';
import { HomePage } from '../../../pages/HomePage';
import { ProductsPage } from '../../../pages/ProductsPage';
import { ServicesPage } from '../../../pages/ServicesPage';
import { PortfolioPage } from '../../../pages/PortfolioPage';
import { ArticlesPage } from '../../../pages/ArticlesPage';
import { AboutPage } from '../../../pages/AboutPage';
import { OrderProcedurePage } from '../../../pages/OrderProcedurePage';
import { FaqPage } from '../../../pages/FaqPage';
import { ContactPage } from '../../../pages/ContactPage';
import { buildMediaImageCandidates } from '../../../utils/studioLogic';
import type { DesignViewport, SiteDesignConfig } from '../../../types/design';

export type PreviewPageKey =
  | 'home'
  | 'products'
  | 'services'
  | 'portfolio'
  | 'articles'
  | 'about'
  | 'procedure'
  | 'faq'
  | 'contact';

export const PREVIEW_PAGE_OPTIONS: { key: PreviewPageKey; label: string; route: string }[] = [
  { key: 'home', label: 'Beranda', route: '/' },
  { key: 'products', label: 'Produk Digital', route: '/produk' },
  { key: 'services', label: 'Layanan', route: '/layanan' },
  { key: 'portfolio', label: 'Portofolio', route: '/portofolio' },
  { key: 'articles', label: 'Artikel', route: '/artikel' },
  { key: 'about', label: 'Tentang Kami', route: '/tentang' },
  { key: 'procedure', label: 'Prosedur', route: '/prosedur' },
  { key: 'faq', label: 'FAQ', route: '/faq' },
  { key: 'contact', label: 'Kontak', route: '/kontak' },
];

interface DesignLivePreviewProps {
  config: SiteDesignConfig;
  viewport: DesignViewport;
  onViewportChange: (vp: DesignViewport) => void;
  page: PreviewPageKey;
  onPageChange: (page: PreviewPageKey) => void;
}

export function DesignLivePreview({
  config,
  viewport,
  onViewportChange,
  page,
  onPageChange,
}: DesignLivePreviewProps) {
  const [expandedHeight, setExpandedHeight] = useState(false);

  const bgImageUrl = useMemo(() => {
    if (!config.identity.pageBackgroundImageUrl && !config.identity.pageBackgroundDriveFileId) {
      return '';
    }
    const candidates = buildMediaImageCandidates({
      src: config.identity.pageBackgroundImageUrl,
      driveFileId: config.identity.pageBackgroundDriveFileId || undefined,
      visibility: 'public',
    });
    return candidates[0]?.url || '';
  }, [config.identity.pageBackgroundImageUrl, config.identity.pageBackgroundDriveFileId]);

  const activePageMeta =
    PREVIEW_PAGE_OPTIONS.find((opt) => opt.key === page) ?? PREVIEW_PAGE_OPTIONS[0];

  // Prevent anchor navigation inside embedded preview from kicking admin out of /admin/desain
  function handlePreviewClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (href.startsWith('#')) return;
    e.preventDefault();
    e.stopPropagation();

    if (href === '/') onPageChange('home');
    else if (href.startsWith('/produk')) onPageChange('products');
    else if (href.startsWith('/layanan')) onPageChange('services');
    else if (href.startsWith('/portofolio')) onPageChange('portfolio');
    else if (href.startsWith('/artikel')) onPageChange('articles');
    else if (href.startsWith('/tentang')) onPageChange('about');
    else if (href.startsWith('/prosedur')) onPageChange('procedure');
    else if (href.startsWith('/faq')) onPageChange('faq');
    else if (href.startsWith('/kontak')) onPageChange('contact');
  }

  function renderPreviewPage() {
    switch (page) {
      case 'products':
        return <ProductsPage />;
      case 'services':
        return <ServicesPage />;
      case 'portfolio':
        return <PortfolioPage />;
      case 'articles':
        return <ArticlesPage />;
      case 'about':
        return <AboutPage />;
      case 'procedure':
        return <OrderProcedurePage />;
      case 'faq':
        return <FaqPage />;
      case 'contact':
        return <ContactPage />;
      case 'home':
      default:
        return <HomePage />;
    }
  }

  const frameWidth =
    viewport === 'mobile' ? '390px' : viewport === 'tablet' ? '768px' : '100%';

  const viewportBadgeLabel =
    viewport === 'mobile' ? '390px' : viewport === 'tablet' ? '768px' : 'Penuh (Desktop)';

  return (
    <div className="w-full min-w-0 border-2 border-[#171717] nb-shadow rounded-[6px] bg-[#E8E8D0] overflow-hidden flex flex-col">
      {/* Browser-Style Preview Toolbar */}
      <div className="px-3.5 py-2.5 bg-[#171717] text-[#F8F8E1] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 pr-1" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6C151E] border border-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#F3C95B] border border-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#8ACCD5] border border-white/20" />
          </div>
          <span className="font-display font-bold text-xs sm:text-sm truncate">
            Live Preview Real-Time
          </span>
          <span className="px-2 py-0.5 bg-[#0F3D3A] border border-[#8ACCD5]/40 rounded-[3px] font-mono text-[10px] text-[#F3C95B] whitespace-nowrap">
            Tema: {config.global.visualTheme === 'clean_bento' ? 'Clean Bento Grid' : 'Neo Brutalist'}
          </span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 bg-white/10 rounded-[3px] font-mono text-[10px] text-[#F8F8E1]/80">
            syamscreativestudio.id{activePageMeta.route}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Pilih halaman pratinjau"
            value={page}
            onChange={(e) => onPageChange(e.target.value as PreviewPageKey)}
            className="bg-[#262626] text-[#F8F8E1] border border-white/25 rounded-[4px] px-2.5 py-1.5 text-xs font-display font-semibold cursor-pointer"
          >
            {PREVIEW_PAGE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                Halaman: {opt.label}
              </option>
            ))}
          </select>

          <div
            className="inline-flex items-center bg-[#262626] border border-white/25 rounded-[4px] p-0.5"
            role="group"
            aria-label="Pilih ukuran layar pratinjau"
          >
            {(
              [
                { id: 'desktop', label: 'Desktop', icon: Monitor },
                { id: 'tablet', label: 'Tablet', icon: Tablet },
                { id: 'mobile', label: 'Mobile', icon: Smartphone },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = viewport === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onViewportChange(id)}
                  title={label}
                  className={`px-2.5 py-1 rounded-[3px] text-[11px] font-display font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active ? 'bg-[#F3C95B] text-[#171717]' : 'text-[#F8F8E1]/80 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setExpandedHeight((v) => !v)}
            title={expandedHeight ? 'Tinggi standar (720px)' : 'Perbesar tinggi pratinjau (920px)'}
            className="px-2.5 py-1.5 bg-[#262626] hover:bg-[#333333] text-[#F8F8E1] border border-white/25 rounded-[4px] text-[11px] font-display font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            {expandedHeight ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ringkas</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Perbesar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subtle Viewport Info Sub-bar */}
      <div className="px-3.5 py-1.5 bg-[#F1F1D3] border-b border-[#171717]/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#404040]">
        <span>
          Pratinjau langsung halaman <strong>{activePageMeta.label}</strong> — setiap perubahan pada
          panel pengaturan di atas langsung terlihat di sini.
        </span>
        <span className="font-mono text-[10px] font-semibold text-[#0F3D3A]">
          Viewport: {viewportBadgeLabel}
        </span>
      </div>

      {/* Full-Width Scrollable Preview Stage */}
      <div
        className={`w-full overflow-y-auto overflow-x-auto p-3 sm:p-5 flex justify-center items-start bg-[#D9D9C2]/75 transition-[height] duration-200 ${
          expandedHeight ? 'h-[920px]' : 'h-[720px]'
        }`}
      >
        <div
          onClickCapture={handlePreviewClickCapture}
          style={{
            width: frameWidth,
            maxWidth: '100%',
          }}
          className="bg-[#F8F8E1] border-2 border-[#171717] shadow-xl rounded-[6px] overflow-hidden transition-[width] duration-200 shrink-0"
        >
          <DesignPreviewOverrideProvider config={config} viewport={viewport}>
            <div className="relative min-h-[640px] flex flex-col">
              {bgImageUrl && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${bgImageUrl}")`,
                    opacity: config.identity.pageBackgroundOpacity,
                  }}
                />
              )}
              <div className="relative z-10 flex flex-col flex-1">
                {config.header.visible && <Navbar />}
                <div className="flex-1">{renderPreviewPage()}</div>
                {config.footer.visible && <Footer />}
              </div>
            </div>
          </DesignPreviewOverrideProvider>
        </div>
      </div>
    </div>
  );
}

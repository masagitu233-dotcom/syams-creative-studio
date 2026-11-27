import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Briefcase,
  Database,
  FolderKanban,
  HardDrive,
  HelpCircle,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStudioData } from '../contexts/StudioDataContext';
import {
  fetchAllAdminCollections,
  seedInitialStudioData,
} from '../services/firestoreService';
import { formatUserFriendlyError } from '../lib/firestoreErrors';
import {
  buildMediaProxyUrl,
  computeCatalogStats,
  computeOrderStats,
  formatDateTimeId,
  formatRupiah,
  normalizeBrandDisplayText,
  ORDER_STATUS_META,
} from '../utils/studioLogic';
import { logMediaDiagnostic } from '../utils/mediaDiagnostics';
import { INITIAL_SITE_SETTINGS } from '../data/initialCatalog';
import { AdminOrdersPanel } from '../components/admin/AdminOrdersPanel';
import { AdminProductsPanel } from '../components/admin/AdminProductsPanel';
import { AdminServicesPanel } from '../components/admin/AdminServicesPanel';
import { AdminPortfolioPanel } from '../components/admin/AdminPortfolioPanel';
import { AdminMediaPanel } from '../components/admin/AdminMediaPanel';
import { AdminFaqPanel } from '../components/admin/AdminFaqPanel';
import { AdminSettingsPanel } from '../components/admin/AdminSettingsPanel';
import { AdminDesignStudioPanel } from '../components/admin/design/AdminDesignStudioPanel';
import { AdminLogsPanel } from '../components/admin/AdminLogsPanel';
import { ToastStack } from '../components/ToastStack';
import type {
  ActivityLog,
  ContactMessage,
  DigitalProductItem,
  DriveFolderRecord,
  FaqItem,
  MediaAsset,
  OrderItem,
  PortfolioItem,
  ServiceItem,
  SiteSettings,
} from '../types/studio';

type AdminTab =
  | 'overview'
  | 'design'
  | 'products'
  | 'services'
  | 'orders'
  | 'settings'
  | 'portfolio'
  | 'faqs'
  | 'media'
  | 'logs';

interface AdminNavItem {
  id: AdminTab;
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: 'primary' | 'secondary';
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'overview', path: '/admin', label: 'Ringkasan Dashboard', icon: LayoutDashboard, group: 'primary' },
  { id: 'design', path: '/admin/desain', label: 'Website Design Studio', icon: Palette, group: 'primary' },
  { id: 'products', path: '/admin/produk', label: 'Kelola Produk Digital', icon: Package, group: 'primary' },
  { id: 'services', path: '/admin/layanan', label: 'Kelola Layanan', icon: Briefcase, group: 'primary' },
  { id: 'orders', path: '/admin/pesanan', label: 'Kelola Pesanan', icon: ShoppingBag, group: 'primary' },
  { id: 'settings', path: '/admin/pengaturan', label: 'Pengaturan Website', icon: Settings, group: 'primary' },
  { id: 'portfolio', path: '/admin/portofolio', label: 'Portofolio', icon: FolderKanban, group: 'secondary' },
  { id: 'faqs', path: '/admin/faq', label: 'FAQ', icon: HelpCircle, group: 'secondary' },
  { id: 'media', path: '/admin/media', label: 'Media Library', icon: HardDrive, group: 'secondary' },
  { id: 'logs', path: '/admin/logs', label: 'Riwayat Aktivitas', icon: Activity, group: 'secondary' },
];

function resolveTabFromPath(pathname: string): AdminTab {
  const normalized = pathname.replace(/\/+$/, '') || '/admin';
  const match = ADMIN_NAV_ITEMS.find((item) => item.path === normalized);
  return match ? match.id : 'overview';
}

export function AdminDashboardPage() {
  const { user, authReady, isAdmin, checkingRole, authError, signInWithGoogle, logout } = useAuth();
  const { pushToast } = useStudioData();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = resolveTabFromPath(location.pathname);

  const [loadingData, setLoadingData] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [autoOpenTarget, setAutoOpenTarget] = useState<'products' | 'services' | null>(null);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<DigitalProductItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [driveFolders, setDriveFolders] = useState<DriveFolderRecord[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('syams_admin_sidebar_open');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('syams_admin_sidebar_open', String(desktopSidebarOpen));
    } catch {
      // Ignore storage restrictions
    }
  }, [desktopSidebarOpen]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileDrawerOpen]);

  const autoMigratedRef = useRef(false);

  const goToTab = useCallback(
    (tabId: AdminTab, options?: { openCreate?: boolean }) => {
      const target = ADMIN_NAV_ITEMS.find((item) => item.id === tabId);
      if (options?.openCreate && (tabId === 'products' || tabId === 'services')) {
        setAutoOpenTarget(tabId);
      }
      setMobileDrawerOpen(false);
      navigate(target ? target.path : '/admin');
    },
    [navigate]
  );

  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const data = await fetchAllAdminCollections();
      setOrders(data.orders);
      setProducts(data.products);
      setServices(data.services);
      setPortfolio(data.portfolio);
      setMedia(data.media);
      setDriveFolders(data.driveFolders || []);
      logMediaDiagnostic('frontend_media_received', {
        mediaCount: data.media.length,
        latestMedia: data.media.slice(0, 5).map((m) => ({
          id: m.id,
          fileId: m.fileId,
          fileName: m.fileName,
          mimeType: m.mimeType,
          visibility: m.visibility,
          resolvedProxyUrl: buildMediaProxyUrl(m.fileId, m.visibility),
        })),
      });
      setFaqs(data.faqs);
      setLogs(data.logs);
      setMessages(data.messages);
      if (data.siteSettings) {
        setSettings({
          ...data.siteSettings,
          studioName: normalizeBrandDisplayText(data.siteSettings.studioName),
          heroHeadline: normalizeBrandDisplayText(data.siteSettings.heroHeadline),
          heroSubheadline: normalizeBrandDisplayText(data.siteSettings.heroSubheadline),
          aboutSummary: normalizeBrandDisplayText(data.siteSettings.aboutSummary),
          aboutMission: data.siteSettings.aboutMission
            ? normalizeBrandDisplayText(data.siteSettings.aboutMission)
            : data.siteSettings.aboutMission,
        });
      }
      setHasLoadedOnce(true);
      return data;
    } catch (err) {
      setDataError(
        formatUserFriendlyError(err, 'Gagal memuat koleksi dashboard dari Cloud Firestore.')
      );
      return null;
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || checkingRole || !user || !isAdmin) return;

    let cancelled = false;
    void (async () => {
      const data = await loadDashboardData();
      if (cancelled || !data) return;

      const needsAutoMigration =
        !autoMigratedRef.current &&
        (!data.siteSettings?.productsMigrated ||
          !data.siteSettings?.servicesMigrated ||
          !data.siteSettings?.portfolioMigrated ||
          !data.siteSettings?.faqsMigrated);

      if (needsAutoMigration) {
        autoMigratedRef.current = true;
        setSeeding(true);
        try {
          const res = await seedInitialStudioData({
            uid: user.uid,
            email: user.email || '',
          });
          if (!cancelled) {
            await loadDashboardData();
            if (res.productsSeeded > 0 || res.servicesSeeded > 0) {
              pushToast({
                type: 'success',
                title: 'Katalog Produksi Tersinkron ke Firestore',
                description: `${res.productsSeeded} produk digital dan ${res.servicesSeeded} layanan berhasil dimigrasikan tanpa menghapus data lama.`,
              });
            }
          }
        } catch (err) {
          if (!cancelled) {
            pushToast({
              type: 'error',
              title: 'Sinkronisasi Awal Tertunda',
              description: formatUserFriendlyError(
                err,
                'Gunakan tombol sinkronisasi manual untuk menyelesaikan migrasi katalog.'
              ),
            });
          }
        } finally {
          if (!cancelled) setSeeding(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, checkingRole, user, isAdmin, loadDashboardData, pushToast]);

  const orderStats = useMemo(() => computeOrderStats(orders), [orders]);
  const catalogStats = useMemo(
    () => computeCatalogStats(products, services),
    [products, services]
  );

  async function handleSeedCatalog() {
    if (!user) return;
    setSeeding(true);
    try {
      const res = await seedInitialStudioData({
        uid: user.uid,
        email: user.email || '',
      });
      await loadDashboardData();
      pushToast({
        type: 'success',
        title: res.alreadyMigrated
          ? 'Database Sudah Dalam Mode Produksi'
          : 'Katalog Berhasil Disimpan ke Firestore',
        description: res.alreadyMigrated
          ? 'Seluruh koleksi katalog sudah aktif dan dikelola dari Firestore.'
          : `${res.productsSeeded} produk digital, ${res.servicesSeeded} layanan, ${res.portfolioSeeded} portofolio, dan ${res.faqsSeeded} FAQ aktif di database.`,
      });
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Gagal Sinkronisasi Data Awal',
        description: formatUserFriendlyError(err, 'Gagal menulis data awal ke Firestore.'),
      });
    } finally {
      setSeeding(false);
    }
  }

  // Loading auth state
  if (!authReady || checkingRole) {
    return (
      <div className="min-h-screen bg-[#F8F8E1] flex items-center justify-center p-4">
        <div className="nb-card p-6 max-w-md w-full space-y-2.5 text-center">
          <p className="font-display font-bold text-base text-[#171717]">
            Memverifikasi Akses Administrator...
          </p>
          <p className="text-xs text-[#525252]">
            Memeriksa status autentikasi Google dan izin koleksi admins di Firestore.
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated Admin Login Gate (No public signup!)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F8E1] nb-grid-pattern flex items-center justify-center p-4">
        <div className="nb-card max-w-md w-full p-5 sm:p-6 space-y-4">
          <div className="w-9 h-9 bg-[#0F3D3A] text-[#F3C95B] border-2 border-[#171717] rounded-[2px] nb-shadow-sm flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-1.5">
            <p className="nb-kicker">OSAMA CREATIVE STUDIO</p>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-[#171717]">
              Portal Administrator Utama
            </h1>
            <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
              Halaman ini dikhususkan bagi administrator yang UID-nya terdaftar secara manual pada
              koleksi <code className="font-mono text-xs">admins</code> di Cloud Firestore.
              Pendaftaran administrator secara publik tidak tersedia.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-[#6C151E] text-[#F8F8E1] border-2 border-[#171717] text-xs rounded-[4px]">
              {authError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="nb-btn nb-btn-primary nb-btn-md w-full sm:w-auto"
            >
              <LogIn className="w-4 h-4" />
              Masuk dengan Google Admin
            </button>
            <Link to="/" className="nb-btn nb-btn-surface nb-btn-md w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" />
              Beranda
            </Link>
          </div>
        </div>
        <ToastStack />
      </div>
    );
  }

  // Authenticated but NOT registered in admins collection
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F8E1] flex items-center justify-center p-4">
        <div className="nb-card max-w-md w-full p-6 space-y-4">
          <div className="w-10 h-10 bg-[#6C151E] text-[#F8F8E1] border-2 border-[#171717] nb-shadow-sm flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display font-bold text-xl text-[#171717]">
              Akses Administrator Ditolak
            </h1>
            <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
              Akun Google <strong>{user.email}</strong> tidak terdaftar sebagai administrator utama
              pada koleksi <code className="font-mono text-xs">admins</code> di Firestore. Akun
              pelanggan biasa tidak memiliki akses ke dashboard manajemen.
            </p>
          </div>

          <div className="p-3 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] text-xs space-y-1">
            <p className="font-semibold text-[#171717]">
              UID Akun Saat Ini (untuk referensi manual admin):
            </p>
            <p className="font-mono break-all text-[#0F3D3A]">{user.uid}</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link to="/" className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm">
              Kembali ke Website Publik
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="nb-btn nb-btn-surface px-4 py-2 text-xs sm:text-sm"
            >
              <LogOut className="w-4 h-4" />
              Keluar &amp; Ganti Akun
            </button>
          </div>
        </div>
        <ToastStack />
      </div>
    );
  }

  const actor = { uid: user.uid, email: user.email || '' };
  const needsManualSeed =
    hasLoadedOnce &&
    !seeding &&
    (!settings.productsMigrated || !settings.servicesMigrated);

  const primaryNav = ADMIN_NAV_ITEMS.filter((item) => item.group === 'primary');
  const secondaryNav = ADMIN_NAV_ITEMS.filter((item) => item.group === 'secondary');

  function getNavBadge(tabId: AdminTab): number | null {
    if (tabId === 'products') return products.length;
    if (tabId === 'services') return services.length;
    if (tabId === 'orders') return orders.length;
    if (tabId === 'portfolio') return portfolio.length;
    if (tabId === 'faqs') return faqs.length;
    if (tabId === 'media') return media.length;
    return null;
  }

  const activeNavMeta = ADMIN_NAV_ITEMS.find((t) => t.id === activeTab);

  const sidebarNavContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="px-4 h-14 border-b-2 border-[#171717] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <Link to="/" className="font-display font-bold text-sm text-[#F3C95B] leading-tight block truncate">
              OSAMA CREATIVE STUDIO
            </Link>
            <p className="text-[11px] text-[#F8F8E1]/75 truncate">Panel Admin Produksi</p>
          </div>
          <button
            type="button"
            onClick={() => setDesktopSidebarOpen(false)}
            aria-label="Tutup sidebar admin"
            title="Tutup sidebar admin"
            className="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-[4px] border border-[#F8F8E1]/25 text-[#F8F8E1]/90 hover:bg-[#16534F] hover:text-[#F3C95B] transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Tutup menu admin"
            className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-[4px] border border-[#F8F8E1]/25 text-[#F8F8E1] hover:bg-[#16534F] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav aria-label="Menu utama dashboard admin" className="p-2.5 flex flex-col gap-1">
          <p className="px-2.5 pt-1 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#8ACCD5]/80">
            Manajemen Utama
          </p>
          {primaryNav.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badge = getNavBadge(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goToTab(tab.id)}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-xs font-display font-semibold rounded-[4px] border-2 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#F3C95B] text-[#171717] border-[#171717] nb-shadow-sm'
                    : 'border-transparent text-[#F8F8E1]/90 hover:bg-[#16534F]'
                }`}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </span>
                {badge !== null && (
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] border ${
                      active
                        ? 'bg-[#0F3D3A] text-[#F3C95B] border-[#171717]'
                        : 'bg-[#0A2B29] text-[#8ACCD5] border-[#8ACCD5]/30'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="my-2 border-t border-[#F8F8E1]/15" />
          <p className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#8ACCD5]/80">
            Konten &amp; Sistem
          </p>
          {secondaryNav.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badge = getNavBadge(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goToTab(tab.id)}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-xs font-display font-semibold rounded-[4px] border-2 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#F3C95B] text-[#171717] border-[#171717] nb-shadow-sm'
                    : 'border-transparent text-[#F8F8E1]/85 hover:bg-[#16534F]'
                }`}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </span>
                {badge !== null && (
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] border ${
                      active
                        ? 'bg-[#0F3D3A] text-[#F3C95B] border-[#171717]'
                        : 'bg-[#0A2B29] text-[#8ACCD5] border-[#8ACCD5]/30'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3.5 border-t-2 border-[#171717] space-y-2.5">
        <div className="text-xs">
          <p className="font-semibold text-[#F8F8E1] truncate">{user.displayName || 'Admin Utama'}</p>
          <p className="text-[11px] text-[#8ACCD5] truncate">{user.email}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Link to="/" className="nb-btn nb-btn-surface px-2.5 py-1.5 text-xs w-full">
            <ArrowLeft className="w-3.5 h-3.5" />
            Lihat Situs Publik
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="nb-btn nb-btn-burgundy px-2.5 py-1.5 text-xs w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F8E1] flex flex-col lg:flex-row overflow-x-clip">
      {/* Desktop Collapsible Sidebar */}
      <aside
        aria-label="Sidebar navigasi admin"
        aria-hidden={!desktopSidebarOpen}
        className={`hidden lg:block lg:sticky lg:top-0 lg:h-screen shrink-0 bg-[#0F3D3A] text-[#F8F8E1] overflow-y-auto transition-[width,opacity,border-width] duration-200 ease-out ${
          desktopSidebarOpen
            ? 'lg:w-60 opacity-100 border-r-2 border-[#171717]'
            : 'lg:w-0 opacity-0 border-r-0 overflow-hidden pointer-events-none'
        }`}
      >
        <div className="w-60 h-full">{sidebarNavContent}</div>
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi admin"
        >
          <div
            className="fixed inset-0 bg-[#171717]/60 backdrop-blur-[2px]"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-[#0F3D3A] text-[#F8F8E1] border-r-2 border-[#171717] overflow-y-auto shadow-2xl">
            {sidebarNavContent}
          </aside>
        </div>
      )}

      {/* Workspace Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b-2 border-[#171717] px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Desktop Sidebar Toggle */}
            <button
              type="button"
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              aria-expanded={desktopSidebarOpen}
              aria-label={desktopSidebarOpen ? 'Tutup sidebar admin' : 'Buka sidebar admin'}
              title={desktopSidebarOpen ? 'Tutup sidebar admin' : 'Buka sidebar admin'}
              className="hidden lg:inline-flex nb-btn nb-btn-surface px-2.5 py-1.5 text-xs shrink-0"
            >
              {desktopSidebarOpen ? (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span>Tutup Menu</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span>Buka Menu</span>
                </>
              )}
            </button>

            {/* Mobile/Tablet Drawer Toggle */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-expanded={mobileDrawerOpen}
              aria-label="Buka menu navigasi admin"
              className="lg:hidden inline-flex nb-btn nb-btn-surface px-2.5 py-1.5 text-xs shrink-0"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>

            <p className="text-xs sm:text-sm font-display font-bold text-[#171717] truncate">
              Admin / {activeNavMeta?.label || 'Ringkasan Dashboard'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={loadingData}
              onClick={() => void loadDashboardData()}
              className="nb-btn nb-btn-surface px-3 py-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="lg:hidden nb-btn nb-btn-burgundy px-3 py-1.5 text-xs"
            >
              Keluar
            </button>
          </div>
        </header>

        <main
          className={`flex-1 p-3 sm:p-5 lg:p-6 w-full mx-auto space-y-5 min-w-0 ${
            activeTab === 'design' ? 'max-w-[1840px]' : 'max-w-7xl'
          }`}
        >
          {dataError && (
            <div className="p-3.5 bg-[#6C151E] text-[#F8F8E1] border-2 border-[#171717] rounded-[4px] text-xs sm:text-sm">
              {dataError}
            </div>
          )}

          {seeding && (
            <div className="p-3.5 bg-[#8ACCD5]/45 border-2 border-[#171717] rounded-[4px] text-xs sm:text-sm font-medium text-[#171717]">
              Menyinkronkan katalog awal produk digital &amp; layanan ke Cloud Firestore...
            </div>
          )}

          {needsManualSeed && !loadingData && (
            <div className="p-4 bg-[#F3C95B] border-2 border-[#171717] nb-shadow-sm rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-[#171717] mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-display font-bold text-xs sm:text-sm text-[#171717]">
                    Sinkronisasi Katalog Produksi ke Cloud Firestore
                  </p>
                  <p className="text-xs text-[#262626]">
                    Migrasikan katalog produk digital &amp; layanan yang belum tercatat di Firestore
                    tanpa menghapus data yang sudah ada.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedCatalog()}
                className="nb-btn nb-btn-primary px-3.5 py-2 text-xs shrink-0"
              >
                {seeding ? 'Menyimpan...' : 'Sinkronkan ke Firestore'}
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Primary Catalog & Order Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
                <div className="nb-card p-4 flex flex-col justify-between bg-[#F3C95B]/35">
                  <p className="text-[11px] font-semibold text-[#525252]">Total Produk Digital</p>
                  <p className="font-mono font-bold text-2xl text-[#171717] tabular-nums mt-1">
                    {catalogStats.totalProducts}
                  </p>
                  <p className="text-[11px] text-[#404040] mt-1">
                    <strong className="text-[#0F3D3A]">{catalogStats.publishedProducts}</strong> publik ·{' '}
                    <strong>{catalogStats.draftProducts}</strong> draf
                  </p>
                </div>

                <div className="nb-card p-4 flex flex-col justify-between bg-[#8ACCD5]/35">
                  <p className="text-[11px] font-semibold text-[#525252]">Total Layanan</p>
                  <p className="font-mono font-bold text-2xl text-[#0F3D3A] tabular-nums mt-1">
                    {catalogStats.totalServices}
                  </p>
                  <p className="text-[11px] text-[#404040] mt-1">
                    <strong className="text-[#0F3D3A]">{catalogStats.publishedServices}</strong> publik ·{' '}
                    <strong>{catalogStats.draftServices}</strong> draf
                  </p>
                </div>

                <div className="nb-card p-4 flex flex-col justify-between">
                  <p className="text-[11px] font-semibold text-[#525252]">Total Pesanan</p>
                  <p className="font-mono font-bold text-2xl text-[#171717] tabular-nums mt-1">
                    {orderStats.total}
                  </p>
                  <p className="text-[11px] text-[#6C151E] font-medium mt-1">
                    {orderStats.menungguKonfirmasi} menunggu konfirmasi
                  </p>
                </div>

                <div className="nb-card p-4 flex flex-col justify-between bg-[#0F3D3A] text-[#F8F8E1]">
                  <p className="text-[11px] font-semibold text-[#8ACCD5]">Nilai Terkonfirmasi</p>
                  <p className="font-mono font-bold text-lg sm:text-xl text-[#F3C95B] tabular-nums mt-1 truncate">
                    {formatRupiah(orderStats.totalConfirmedRevenue)}
                  </p>
                  <p className="text-[11px] text-[#F8F8E1]/80 mt-1">
                    {orderStats.selesai} pesanan selesai
                  </p>
                </div>
              </div>

              {/* Quick Actions for Content Management */}
              <div className="nb-card p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display font-bold text-base text-[#171717]">
                      Akses Cepat Pengelolaan Konten
                    </h2>
                    <p className="text-xs text-[#525252]">
                      Kelola produk digital dan layanan secara langsung; perubahan langsung tayang
                      di beranda website.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToTab('products', { openCreate: true })}
                    className="nb-btn nb-btn-primary px-3.5 py-2 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Produk Digital
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('products')}
                    className="nb-btn nb-btn-mustard px-3.5 py-2 text-xs"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Kelola Produk Digital ({catalogStats.totalProducts})
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('services', { openCreate: true })}
                    className="nb-btn nb-btn-primary px-3.5 py-2 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Layanan
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('services')}
                    className="nb-btn nb-btn-surface px-3.5 py-2 text-xs"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Kelola Layanan ({catalogStats.totalServices})
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('media')}
                    className="nb-btn nb-btn-surface px-3.5 py-2 text-xs"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Media Library ({media.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('design')}
                    className="nb-btn nb-btn-primary px-3.5 py-2 text-xs"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Website Design Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('settings')}
                    className="nb-btn nb-btn-surface px-3.5 py-2 text-xs"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Pengaturan Website
                  </button>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="nb-card p-4 sm:p-5 space-y-3">
                <h2 className="font-display font-bold text-base text-[#171717]">
                  Statistik Status Pesanan
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-stretch">
                  {(
                    [
                      ['menunggu_konfirmasi', orderStats.menungguKonfirmasi],
                      ['harga_dikonfirmasi', orderStats.hargaDikonfirmasi],
                      ['dalam_pengerjaan', orderStats.dalamPengerjaan],
                      ['revisi', orderStats.revisi],
                      ['selesai', orderStats.selesai],
                      ['dibatalkan', orderStats.dibatalkan],
                    ] as const
                  ).map(([statusKey, count]) => {
                    const meta = ORDER_STATUS_META[statusKey];
                    return (
                      <div
                        key={statusKey}
                        className="p-3 border-2 border-[#171717] bg-[#F8F8E1] rounded-[4px] flex flex-col justify-between"
                      >
                        <p className="text-[11px] font-medium text-[#525252]">{meta.shortLabel}</p>
                        <p className="font-mono font-bold text-xl text-[#171717] tabular-nums mt-1">
                          {count}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="nb-card overflow-hidden">
                <div className="px-4 py-3 bg-[#F8F8E1] border-b-2 border-[#171717] flex items-center justify-between gap-2">
                  <h2 className="font-display font-bold text-base text-[#171717]">Pesanan Terbaru</h2>
                  <button
                    type="button"
                    onClick={() => goToTab('orders')}
                    className="nb-btn nb-btn-surface px-3 py-1.5 text-xs"
                  >
                    Kelola Semua Pesanan
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="p-6 text-center text-xs sm:text-sm text-[#525252]">
                    Belum ada pesanan masuk. Pesanan pelanggan dari halaman Checkout akan tampil
                    otomatis di sini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b-2 border-[#171717]/15 text-[11px] font-display font-bold text-[#525252]">
                          <th className="px-3.5 py-2.5">Kode</th>
                          <th className="px-3.5 py-2.5">Pelanggan</th>
                          <th className="px-3.5 py-2.5">Layanan</th>
                          <th className="px-3.5 py-2.5">Status</th>
                          <th className="px-3.5 py-2.5 text-right">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#171717]/10">
                        {orders.slice(0, 6).map((ord) => {
                          const meta =
                            ORDER_STATUS_META[ord.status] || ORDER_STATUS_META.menunggu_konfirmasi;
                          return (
                            <tr key={ord.id} className="hover:bg-[#F8F8E1]/40">
                              <td className="px-3.5 py-2.5 font-mono text-xs font-bold whitespace-nowrap">
                                {ord.orderCode}
                              </td>
                              <td className="px-3.5 py-2.5">{ord.customerName}</td>
                              <td className="px-3.5 py-2.5 text-xs text-[#404040]">
                                {ord.serviceTitle}
                              </td>
                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 text-[11px] font-bold border-2 rounded-[2px] ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                                >
                                  {meta.shortLabel}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-xs text-[#525252] whitespace-nowrap">
                                {formatDateTimeId(ord.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <AdminDesignStudioPanel
              products={products}
              services={services}
              portfolio={portfolio}
              media={media}
              driveFolders={driveFolders}
              actor={actor}
              onRefresh={async () => {
                await loadDashboardData();
              }}
              onToast={pushToast}
            />
          )}

          {activeTab === 'products' && (
            <AdminProductsPanel
              products={products}
              media={media}
              driveFolders={driveFolders}
              actor={actor}
              autoOpenCreate={autoOpenTarget === 'products'}
              onConsumeAutoOpen={() => setAutoOpenTarget(null)}
              onRefresh={async () => {
                await loadDashboardData();
              }}
              onToast={pushToast}
            />
          )}

          {activeTab === 'services' && (
            <AdminServicesPanel
              services={services}
              media={media}
              driveFolders={driveFolders}
              actor={actor}
              autoOpenCreate={autoOpenTarget === 'services'}
              onConsumeAutoOpen={() => setAutoOpenTarget(null)}
              onRefresh={async () => {
                await loadDashboardData();
              }}
              onToast={pushToast}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersPanel
              orders={orders}
              actor={actor}
              onRefresh={async () => {
                await loadDashboardData();
              }}
              onToast={pushToast}
            />
          )}

          {activeTab === 'portfolio' && (
            <AdminPortfolioPanel
              items={portfolio}
              media={media}
              driveFolders={driveFolders}
              actor={actor}
              onRefresh={async () => {
                await loadDashboardData();
              }}
              onToast={pushToast}
            />
          )}

          {activeTab === 'media' && (
            <AdminMediaPanel
              media={media}
              driveFolders={driveFolders}
              products={products}
              services={services}
              portfolio={portfolio}
              orders={orders}
              siteSettings={settings}
              actor={actor}
              onRefresh={async () => {
                await loadDashboardData();
              }}
              onToast={pushToast}
            />
          )}

          {activeTab === 'faqs' && (
            <AdminFaqPanel
              faqs={faqs}
              actor={actor}
              onRefresh={async () => {
                await loadDashboardData();
              }}
              onToast={pushToast}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsPanel
              settings={settings}
              messages={messages}
              media={media}
              driveFolders={driveFolders}
              actor={actor}
              onRefresh={async () => {
                await loadDashboardData();
              }}
              onToast={pushToast}
            />
          )}

          {activeTab === 'logs' && <AdminLogsPanel logs={logs} />}
        </main>
      </div>

      <ToastStack />
    </div>
  );
}

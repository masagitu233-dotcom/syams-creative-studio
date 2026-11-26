import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  RefreshCw,
  Settings,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStudioData } from '../contexts/StudioDataContext';
import {
  fetchAllAdminCollections,
  seedInitialStudioData,
} from '../services/firestoreService';
import { formatUserFriendlyError } from '../lib/firestoreErrors';
import {
  computeOrderStats,
  formatDateTimeId,
  formatRupiah,
  ORDER_STATUS_META,
} from '../utils/studioLogic';
import { INITIAL_SITE_SETTINGS } from '../data/initialCatalog';
import { AdminOrdersPanel } from '../components/admin/AdminOrdersPanel';
import { AdminServicesPanel } from '../components/admin/AdminServicesPanel';
import { AdminPortfolioPanel } from '../components/admin/AdminPortfolioPanel';
import { AdminMediaPanel } from '../components/admin/AdminMediaPanel';
import { AdminFaqPanel } from '../components/admin/AdminFaqPanel';
import { AdminSettingsPanel } from '../components/admin/AdminSettingsPanel';
import { AdminLogsPanel } from '../components/admin/AdminLogsPanel';
import { ToastStack } from '../components/ToastStack';
import type {
  ActivityLog,
  ContactMessage,
  FaqItem,
  MediaAsset,
  OrderItem,
  PortfolioItem,
  ServiceItem,
  SiteSettings,
} from '../types/studio';

type AdminTab =
  | 'overview'
  | 'orders'
  | 'services'
  | 'portfolio'
  | 'media'
  | 'faqs'
  | 'settings'
  | 'logs';

const ADMIN_TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'orders', label: 'Pesanan', icon: ShoppingBag },
  { id: 'services', label: 'Layanan & Harga', icon: Briefcase },
  { id: 'portfolio', label: 'Portofolio', icon: FolderKanban },
  { id: 'media', label: 'Media Drive', icon: HardDrive },
  { id: 'faqs', label: 'FAQ', icon: HelpCircle },
  { id: 'settings', label: 'Konten & Kontak', icon: Settings },
  { id: 'logs', label: 'Activity Logs', icon: Activity },
];

export function AdminDashboardPage() {
  const { user, authReady, isAdmin, checkingRole, authError, signInWithGoogle, logout } = useAuth();
  const { pushToast } = useStudioData();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loadingData, setLoadingData] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);

  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const data = await fetchAllAdminCollections();
      setOrders(data.orders);
      setServices(data.services);
      setPortfolio(data.portfolio);
      setMedia(data.media);
      setFaqs(data.faqs);
      setLogs(data.logs);
      setMessages(data.messages);
      if (data.siteSettings) {
        setSettings(data.siteSettings);
      }
    } catch (err) {
      setDataError(
        formatUserFriendlyError(err, 'Gagal memuat koleksi dashboard dari Cloud Firestore.')
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (authReady && !checkingRole && user && isAdmin) {
      void loadDashboardData();
    }
  }, [authReady, checkingRole, user, isAdmin, loadDashboardData]);

  const stats = useMemo(() => computeOrderStats(orders), [orders]);

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
        title: 'Katalog Awal Berhasil Disimpan ke Firestore',
        description: `${res.servicesSeeded} layanan, ${res.portfolioSeeded} portofolio, dan ${res.faqsSeeded} FAQ telah aktif di database.`,
      });
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Gagal Inisialisasi Data Awal',
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
            <p className="nb-kicker">SYAMS CREATIVE STUDIO</p>
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
              Keluar & Ganti Akun
            </button>
          </div>
        </div>
        <ToastStack />
      </div>
    );
  }

  const actor = { uid: user.uid, email: user.email || '' };
  const needsSeed = services.length === 0 || portfolio.length === 0 || faqs.length === 0;

  return (
    <div className="min-h-screen bg-[#F8F8E1] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-56 lg:sticky lg:top-0 lg:h-screen shrink-0 bg-[#0F3D3A] text-[#F8F8E1] border-b-2 lg:border-b-0 lg:border-r-2 border-[#171717] flex flex-col justify-between">
        <div>
          <div className="px-4 h-14 border-b-2 border-[#171717] flex flex-col justify-center">
            <Link to="/" className="font-display font-bold text-sm text-[#F3C95B] leading-tight">
              SYAMS CREATIVE STUDIO
            </Link>
            <p className="text-[11px] text-[#F8F8E1]/75">Dashboard Administrator</p>
          </div>

          <nav aria-label="Menu dashboard admin" className="p-2.5 flex lg:flex-col gap-1 overflow-x-auto">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-display font-semibold rounded-[4px] border-2 whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#F3C95B] text-[#171717] border-[#171717] nb-shadow-sm'
                      : 'border-transparent text-[#F8F8E1]/90 hover:bg-[#16534F]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 border-t-2 border-[#171717] space-y-2.5 hidden lg:block">
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
      </aside>

      {/* Workspace Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b-2 border-[#171717] px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm font-display font-bold text-[#171717] truncate">
            Admin / {ADMIN_TABS.find((t) => t.id === activeTab)?.label}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={loadingData}
              onClick={() => void loadDashboardData()}
              className="nb-btn nb-btn-surface px-3 py-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              Segarkan
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

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-5">
          {dataError && (
            <div className="p-3.5 bg-[#6C151E] text-[#F8F8E1] border-2 border-[#171717] rounded-[4px] text-xs sm:text-sm">
              {dataError}
            </div>
          )}

          {needsSeed && !loadingData && (
            <div className="p-4 bg-[#F3C95B] border-2 border-[#171717] nb-shadow-sm rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-[#171717] mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-display font-bold text-xs sm:text-sm text-[#171717]">
                    Inisialisasi Katalog Awal ke Cloud Firestore
                  </p>
                  <p className="text-xs text-[#262626]">
                    Sebagian koleksi awal (5 layanan & harga, portofolio, FAQ, pengaturan) belum
                    tersimpan di Firestore. Klik tombol di samping untuk menuliskan data awal ke
                    database produksi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedCatalog()}
                className="nb-btn nb-btn-primary px-3.5 py-2 text-xs shrink-0"
              >
                {seeding ? 'Menyimpan...' : 'Inisialisasi Data Awal ke Firestore'}
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
                <div className="nb-card p-4 flex flex-col justify-between">
                  <p className="text-[11px] font-medium text-[#525252]">Total Pesanan</p>
                  <p className="font-mono font-bold text-2xl text-[#171717] tabular-nums mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="nb-card p-4 flex flex-col justify-between bg-[#F3C95B]/40">
                  <p className="text-[11px] font-medium text-[#525252]">Menunggu Konfirmasi</p>
                  <p className="font-mono font-bold text-2xl text-[#6C151E] tabular-nums mt-1">
                    {stats.menungguKonfirmasi}
                  </p>
                </div>
                <div className="nb-card p-4 flex flex-col justify-between bg-[#8ACCD5]/35">
                  <p className="text-[11px] font-medium text-[#525252]">Diproses / Revisi</p>
                  <p className="font-mono font-bold text-2xl text-[#0F3D3A] tabular-nums mt-1">
                    {stats.dalamPengerjaan + stats.revisi + stats.hargaDikonfirmasi}
                  </p>
                </div>
                <div className="nb-card p-4 flex flex-col justify-between bg-[#0F3D3A] text-[#F8F8E1]">
                  <p className="text-[11px] font-medium text-[#8ACCD5]">Nilai Terkonfirmasi</p>
                  <p className="font-mono font-bold text-lg sm:text-xl text-[#F3C95B] tabular-nums mt-1 truncate">
                    {formatRupiah(stats.totalConfirmedRevenue)}
                  </p>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="nb-card p-4 sm:p-5 space-y-3">
                <h2 className="font-display font-bold text-base text-[#171717]">
                  Statistik Status Pekerjaan
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-stretch">
                  {(
                    [
                      ['menunggu_konfirmasi', stats.menungguKonfirmasi],
                      ['harga_dikonfirmasi', stats.hargaDikonfirmasi],
                      ['dalam_pengerjaan', stats.dalamPengerjaan],
                      ['revisi', stats.revisi],
                      ['selesai', stats.selesai],
                      ['dibatalkan', stats.dibatalkan],
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
                    onClick={() => setActiveTab('orders')}
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

          {activeTab === 'orders' && (
            <AdminOrdersPanel
              orders={orders}
              actor={actor}
              onRefresh={loadDashboardData}
              onToast={pushToast}
            />
          )}

          {activeTab === 'services' && (
            <AdminServicesPanel
              services={services}
              actor={actor}
              onRefresh={loadDashboardData}
              onToast={pushToast}
            />
          )}

          {activeTab === 'portfolio' && (
            <AdminPortfolioPanel
              items={portfolio}
              actor={actor}
              onRefresh={loadDashboardData}
              onToast={pushToast}
            />
          )}

          {activeTab === 'media' && (
            <AdminMediaPanel
              media={media}
              actor={actor}
              onRefresh={loadDashboardData}
              onToast={pushToast}
            />
          )}

          {activeTab === 'faqs' && (
            <AdminFaqPanel
              faqs={faqs}
              actor={actor}
              onRefresh={loadDashboardData}
              onToast={pushToast}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsPanel
              settings={settings}
              messages={messages}
              actor={actor}
              onRefresh={loadDashboardData}
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

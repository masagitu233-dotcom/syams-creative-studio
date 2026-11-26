import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  LogIn,
  LogOut,
  Package,
  Paperclip,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStudioData } from '../contexts/StudioDataContext';
import {
  cancelPendingOrderByCustomer,
  subscribeCustomerOrders,
} from '../services/firestoreService';
import { fetchPrivateMediaBlobUrl } from '../services/apiService';
import { formatUserFriendlyError } from '../lib/firestoreErrors';
import {
  buildWhatsappLink,
  formatDateId,
  formatRupiah,
  ORDER_STATUS_META,
  sanitizeExternalUrl,
} from '../utils/studioLogic';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SectionHeader } from '../components/SectionHeader';
import type { OrderItem } from '../types/studio';

export function CustomerOrdersPage() {
  const { user, authReady, authError, signInWithGoogle, logout } = useAuth();
  const { siteSettings, pushToast } = useStudioData();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const unsub = subscribeCustomerOrders(
      user.uid,
      (items) => {
        setOrders(items);
        setLoading(false);
      },
      (err) => {
        setErrorMsg(formatUserFriendlyError(err, 'Gagal memuat riwayat pesanan Anda.'));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [authReady, user]);

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelPendingOrderByCustomer(cancelTarget.id);
      pushToast({
        type: 'info',
        title: `Pesanan ${cancelTarget.orderCode} Dibatalkan`,
        description: 'Status pesanan telah diperbarui menjadi Dibatalkan.',
      });
      setCancelTarget(null);
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Tidak Dapat Membatalkan Pesanan',
        description: formatUserFriendlyError(
          error,
          'Pesanan hanya dapat dibatalkan selama status masih Menunggu Konfirmasi.'
        ),
      });
    } finally {
      setCancelling(false);
    }
  }

  async function handleOpenPrivateAttachment(order: OrderItem) {
    if (order.attachmentDriveFileId) {
      try {
        const blobUrl = await fetchPrivateMediaBlobUrl(order.attachmentDriveFileId);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = order.attachmentName || 'lampiran-pesanan';
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      } catch (err) {
        pushToast({
          type: 'error',
          title: 'Gagal Mengunduh Lampiran',
          description: formatUserFriendlyError(err, 'Berkas privat tidak dapat diakses saat ini.'),
        });
      }
      return;
    }
    const safeUrl = sanitizeExternalUrl(order.attachmentUrl);
    if (safeUrl) {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className="nb-section">
      <div className="nb-container space-y-6">
        <SectionHeader
          asPageTitle
          kicker="Area Pelanggan"
          title="Riwayat & Status Pesanan Saya"
          subtitle="Halaman ini hanya menampilkan pesanan yang terhubung dengan akun Google Anda."
          action={
            user ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/checkout" className="nb-btn nb-btn-primary nb-btn-sm">
                  Buat Pesanan Baru
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="nb-btn nb-btn-surface nb-btn-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>
            ) : undefined
          }
        />

        {!authReady ? (
          <div className="nb-card p-5 animate-pulse space-y-3.5">
            <div className="h-5 w-56 bg-[#E5E5C7]" />
            <div className="h-24 w-full bg-[#E5E5C7]" />
          </div>
        ) : !user ? (
          <div className="nb-card p-5 sm:p-6 space-y-4 max-w-xl">
            <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
              Masuk untuk Melihat Pesanan Anda
            </h2>
            <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
              Demi menjaga privasi, data pesanan hanya dapat dilihat oleh pemilik akun Google yang
              melakukan checkout.
            </p>
            {authError && (
              <p className="p-3 bg-[#6C151E] text-[#F8F8E1] border-2 border-[#171717] text-xs rounded-[4px]">
                {authError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="nb-btn nb-btn-primary nb-btn-md w-full sm:w-auto"
            >
              <LogIn className="w-4 h-4" />
              Masuk dengan Google
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3.5">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="nb-card p-5 h-36 animate-pulse bg-[#E5E5C7]/60" />
            ))}
          </div>
        ) : errorMsg ? (
          <div className="nb-card p-6 border-[#6C151E] space-y-2">
            <h2 className="font-display font-bold text-base text-[#6C151E]">Gagal Memuat Data</h2>
            <p className="text-sm text-[#404040]">{errorMsg}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="nb-card p-7 text-center space-y-3 max-w-xl">
            <div className="w-11 h-11 mx-auto bg-[#F3C95B] border-2 border-[#171717] flex items-center justify-center nb-shadow-sm">
              <Package className="w-5 h-5 text-[#171717]" />
            </div>
            <h2 className="font-display font-bold text-lg text-[#171717]">
              Belum Ada Riwayat Pesanan
            </h2>
            <p className="text-sm text-[#525252] max-w-md mx-auto">
              Akun <strong>{user.email}</strong> belum memiliki pesanan aktif. Pilih layanan di
              katalog untuk mulai membuat pesanan pertama Anda.
            </p>
            <Link to="/layanan" className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm">
              Jelajahi Katalog Layanan
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusMeta =
                ORDER_STATUS_META[order.status] || ORDER_STATUS_META.menunggu_konfirmasi;
              const waHref = buildWhatsappLink(
                siteSettings.whatsappNumber,
                `Halo Admin SYAMS CREATIVE STUDIO, saya ingin menanyakan progres pesanan ${order.orderCode} (${order.projectTitle}).`
              );

              return (
                <article key={order.id} className="nb-card p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b-2 border-[#171717]/15">
                    <div className="space-y-0.5">
                      <p className="text-xs text-[#525252]">
                        Kode Pesanan ·{' '}
                        <span className="font-mono font-bold text-[#171717]">
                          {order.orderCode}
                        </span>{' '}
                        · {formatDateId(order.createdAt)}
                      </p>
                      <h2 className="font-display font-bold text-lg text-[#171717]">
                        {order.projectTitle}
                      </h2>
                      <p className="text-xs sm:text-sm font-medium text-[#0F3D3A]">
                        {order.serviceTitle}
                      </p>
                    </div>

                    <div className="text-left sm:text-right space-y-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-display font-bold border-2 rounded-[2px] ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
                      >
                        {statusMeta.label}
                      </span>
                      <p className="text-xs text-[#525252] max-w-xs">{statusMeta.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch text-sm">
                    <div className="p-3 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] flex flex-col justify-between">
                      <p className="text-[11px] text-[#525252]">Estimasi Awal</p>
                      <p className="font-mono font-semibold text-sm text-[#171717] tabular-nums mt-0.5">
                        {order.estimatedPriceLabel}
                      </p>
                      <p className="text-[11px] text-[#525252] mt-1">
                        Jumlah: {order.quantityEstimate}
                      </p>
                    </div>

                    <div className="p-3 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] flex flex-col justify-between">
                      <p className="text-[11px] text-[#525252]">Harga Final (Admin)</p>
                      <p className="font-mono font-bold text-sm text-[#0F3D3A] tabular-nums mt-0.5">
                        {order.finalPrice !== null
                          ? formatRupiah(order.finalPrice)
                          : 'Menunggu konfirmasi'}
                      </p>
                      <p className="text-[11px] text-[#525252] mt-1">Konfirmasi resmi admin</p>
                    </div>

                    <div className="p-3 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] flex flex-col justify-between">
                      <p className="text-[11px] text-[#525252]">Target Tenggat</p>
                      <p className="font-mono font-semibold text-sm text-[#171717] mt-0.5">
                        {order.deadline}
                      </p>
                      <p className="text-[11px] text-[#525252] mt-1">Jadwal penyelesaian</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-[#333333]">
                    <p className="text-xs font-semibold text-[#525252]">Brief Pekerjaan</p>
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                      {order.projectBrief}
                    </p>
                  </div>

                  {order.adminNote && (
                    <div className="p-3.5 bg-[#8ACCD5]/30 border-2 border-[#171717] rounded-[4px] space-y-1">
                      <p className="text-xs font-bold text-[#0F3D3A]">Catatan Resmi Admin</p>
                      <p className="text-xs sm:text-sm text-[#171717] leading-relaxed">
                        {order.adminNote}
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t-2 border-[#171717]/15 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
                      {(order.attachmentDriveFileId || order.attachmentUrl) && (
                        <button
                          type="button"
                          onClick={() => void handleOpenPrivateAttachment(order)}
                          className="nb-btn nb-btn-surface nb-btn-sm max-w-full"
                        >
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {order.attachmentName || 'Lihat Lampiran'}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      )}

                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nb-btn nb-btn-mustard nb-btn-sm"
                      >
                        Tanya Admin via WhatsApp
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {order.status === 'menunggu_konfirmasi' && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(order)}
                        className="nb-btn nb-btn-burgundy nb-btn-sm"
                      >
                        Batalkan Pesanan
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Batalkan Pesanan Ini?"
        description={
          cancelTarget
            ? `Pesanan ${cancelTarget.orderCode} (${cancelTarget.projectTitle}) akan diubah statusnya menjadi Dibatalkan dan tidak dapat dikembalikan.`
            : ''
        }
        confirmLabel="Ya, Batalkan Pesanan"
        busy={cancelling}
        onConfirm={() => void handleConfirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

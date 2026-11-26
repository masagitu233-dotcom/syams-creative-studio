import { useMemo, useState } from 'react';
import { ArrowUpRight, Search, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  deleteOrderByAdmin,
  updateOrderByAdmin,
} from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import {
  buildWhatsappLink,
  filterAndSortOrders,
  formatDateTimeId,
  formatRupiah,
  ORDER_STATUS_META,
} from '../../utils/studioLogic';
import { ConfirmDialog } from '../ConfirmDialog';
import type { OrderItem, OrderStatus } from '../../types/studio';

const STATUS_OPTIONS: OrderStatus[] = [
  'menunggu_konfirmasi',
  'harga_dikonfirmasi',
  'dalam_pengerjaan',
  'revisi',
  'selesai',
  'dibatalkan',
];

interface AdminOrdersPanelProps {
  orders: OrderItem[];
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

export function AdminOrdersPanel({ orders, actor, onRefresh, onToast }: AdminOrdersPanelProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'deadline' | 'price_desc'>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>('menunggu_konfirmasi');
  const [editFinalPrice, setEditFinalPrice] = useState('');
  const [editAdminNote, setEditAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OrderItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () => filterAndSortOrders(orders, { search, status: statusFilter, sortBy }),
    [orders, search, statusFilter, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openEdit(order: OrderItem) {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditFinalPrice(order.finalPrice !== null ? String(order.finalPrice) : '');
    setEditAdminNote(order.adminNote || '');
  }

  async function handleSaveOrder() {
    if (!editingOrder) return;
    const parsedPrice = editFinalPrice.trim() === '' ? null : Number(editFinalPrice);
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      onToast({
        type: 'error',
        title: 'Harga Final Tidak Valid',
        description: 'Masukkan angka Rupiah positif atau kosongkan jika belum dikonfirmasi.',
      });
      return;
    }

    setSaving(true);
    try {
      await updateOrderByAdmin(
        editingOrder.id,
        {
          status: editStatus,
          finalPrice: parsedPrice,
          adminNote: editAdminNote,
        },
        { ...actor, orderCode: editingOrder.orderCode }
      );
      await onRefresh();
      setEditingOrder(null);
      onToast({
        type: 'success',
        title: 'Pesanan Diperbarui',
        description: `Status dan biaya final ${editingOrder.orderCode} berhasil disimpan ke Firestore.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Memperbarui Pesanan',
        description: formatUserFriendlyError(err, 'Periksa koneksi dan hak akses admin.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOrderByAdmin(deleteTarget.id, { ...actor, orderCode: deleteTarget.orderCode });
      await onRefresh();
      setDeleteTarget(null);
      onToast({
        type: 'info',
        title: 'Pesanan Dihapus',
        description: `Dokumen pesanan ${deleteTarget.orderCode} telah dihapus.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menghapus Pesanan',
        description: formatUserFriendlyError(err, 'Gagal menghapus dokumen pesanan.'),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
            Manajemen Pesanan
          </h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            Tinjau brief pelanggan, konfirmasi harga final, dan perbarui status pengerjaan.
          </p>
        </div>
        <p className="text-xs font-mono font-semibold text-[#0F3D3A] tabular-nums">
          Menampilkan {filtered.length} dari {orders.length} pesanan
        </p>
      </div>

      {/* Controls */}
      <div className="nb-card p-3.5 grid grid-cols-1 md:grid-cols-12 gap-2.5">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-[#525252] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="admin-order-search" className="sr-only">
            Cari pesanan
          </label>
          <input
            id="admin-order-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kode pesanan, nama, email, proyek..."
            className="nb-input pl-9 text-xs sm:text-sm"
          />
        </div>

        <div className="md:col-span-4">
          <label htmlFor="admin-order-status" className="sr-only">
            Filter status
          </label>
          <select
            id="admin-order-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as OrderStatus | 'all');
              setPage(1);
            }}
            className="nb-input text-xs sm:text-sm"
          >
            <option value="all">Semua Status</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {ORDER_STATUS_META[st].label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label htmlFor="admin-order-sort" className="sr-only">
            Urutkan pesanan
          </label>
          <select
            id="admin-order-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="nb-input text-xs sm:text-sm"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="deadline">Tenggat Terdekat</option>
            <option value="price_desc">Harga Final Tertinggi</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="nb-card overflow-hidden">
        {paginated.length === 0 ? (
          <div className="p-7 text-center space-y-1.5">
            <p className="font-display font-bold text-sm sm:text-base text-[#171717]">
              Belum ada pesanan yang cocok dengan filter.
            </p>
            <p className="text-xs text-[#525252]">
              Pesanan baru yang dikirim pelanggan dari halaman Checkout akan langsung muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F8F8E1] border-b-2 border-[#171717] text-[11px] font-display font-bold text-[#171717]">
                  <th className="px-3.5 py-2.5">Kode & Tanggal</th>
                  <th className="px-3.5 py-2.5">Pelanggan</th>
                  <th className="px-3.5 py-2.5">Layanan & Proyek</th>
                  <th className="px-3.5 py-2.5">Tenggat</th>
                  <th className="px-3.5 py-2.5 text-right">Harga Final</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171717]/15">
                {paginated.map((order) => {
                  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.menunggu_konfirmasi;
                  return (
                    <tr key={order.id} className="hover:bg-[#F8F8E1]/40 transition-colors">
                      <td className="px-3.5 py-2.5 align-top whitespace-nowrap">
                        <p className="font-mono font-bold text-xs text-[#171717]">
                          {order.orderCode}
                        </p>
                        <p className="text-[11px] text-[#525252] mt-0.5">
                          {formatDateTimeId(order.createdAt)}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 align-top">
                        <p className="font-semibold text-[#171717]">{order.customerName}</p>
                        <p className="text-[11px] text-[#525252]">{order.customerEmail}</p>
                        <a
                          href={buildWhatsappLink(
                            order.customerWhatsapp,
                            `Halo ${order.customerName}, terkait pesanan ${order.orderCode} (${order.projectTitle}) di SYAMS CREATIVE STUDIO...`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#0F3D3A] underline mt-0.5"
                        >
                          +{order.customerWhatsapp}
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-3.5 py-2.5 align-top max-w-xs">
                        <p className="font-semibold text-[#171717]">{order.projectTitle}</p>
                        <p className="text-xs text-[#0F3D3A]">{order.serviceTitle}</p>
                        <p className="text-[11px] text-[#525252] mt-0.5 line-clamp-2">
                          {order.projectBrief}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 align-top font-mono text-xs tabular-nums whitespace-nowrap">
                        {order.deadline}
                      </td>
                      <td className="px-3.5 py-2.5 align-top text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        {order.finalPrice !== null ? (
                          <span className="font-bold text-[#0F3D3A]">
                            {formatRupiah(order.finalPrice)}
                          </span>
                        ) : (
                          <span className="text-[#525252]">Belum diatur</span>
                        )}
                        <p className="text-[11px] text-[#737373] mt-0.5">
                          Est: {order.estimatedPriceLabel}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 align-top whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-display font-bold border-2 rounded-[2px] ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                        >
                          {meta.shortLabel}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(order)}
                            className="nb-btn nb-btn-mustard px-2.5 py-1 text-xs"
                          >
                            Kelola
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(order)}
                            aria-label={`Hapus pesanan ${order.orderCode}`}
                            className="nb-btn nb-btn-surface p-1.5 text-[#6C151E]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3.5 py-2.5 bg-[#F8F8E1] border-t-2 border-[#171717] flex items-center justify-between text-xs">
            <span className="font-mono tabular-nums">
              Halaman {safePage} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="nb-btn nb-btn-surface px-2.5 py-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="nb-btn nb-btn-surface px-2.5 py-1 text-xs"
              >
                Berikutnya
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Edit Modal */}
      {editingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/65"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-order-title"
        >
          <div className="nb-card max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="space-y-0.5">
              <p className="font-mono text-xs text-[#6C151E]">{editingOrder.orderCode}</p>
              <h3 id="edit-order-title" className="font-display font-bold text-lg text-[#171717]">
                Konfirmasi Harga & Status Pesanan
              </h3>
              <p className="text-xs text-[#525252]">
                {editingOrder.customerName} · {editingOrder.serviceTitle}
              </p>
            </div>

            <div className="p-3 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] text-xs space-y-1">
              <p className="font-semibold text-[#171717]">Brief ({editingOrder.projectTitle}):</p>
              <p className="text-[#333333] whitespace-pre-line">{editingOrder.projectBrief}</p>
              <p className="text-[#0F3D3A] font-mono pt-1">
                Estimasi katalog: {editingOrder.estimatedPriceLabel} · Qty:{' '}
                {editingOrder.quantityEstimate} · Tenggat: {editingOrder.deadline}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="edit-order-status" className="block text-xs font-bold">
                  Status Pengerjaan
                </label>
                <select
                  id="edit-order-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                  className="nb-input text-sm"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {ORDER_STATUS_META[st].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="edit-order-price" className="block text-xs font-bold">
                  Harga Final (Rupiah)
                </label>
                <input
                  id="edit-order-price"
                  type="number"
                  min={0}
                  step={1000}
                  value={editFinalPrice}
                  onChange={(e) => setEditFinalPrice(e.target.value)}
                  placeholder="Contoh: 175000"
                  className="nb-input font-mono text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-order-note" className="block text-xs font-bold">
                Catatan Resmi untuk Pelanggan
              </label>
              <textarea
                id="edit-order-note"
                rows={3}
                value={editAdminNote}
                onChange={(e) => setEditAdminNote(e.target.value)}
                placeholder="Tulis rincian konfirmasi harga, jadwal revisi, atau tautan pengiriman hasil..."
                className="nb-input text-sm resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditingOrder(null)}
                className="nb-btn nb-btn-surface px-3.5 py-2 text-xs sm:text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveOrder()}
                className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Pesanan Ini?"
        description={
          deleteTarget
            ? `Pesanan ${deleteTarget.orderCode} milik ${deleteTarget.customerName} akan dihapus permanen dari Firestore.`
            : ''
        }
        confirmLabel="Hapus Permanen"
        busy={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteServiceByAdmin,
  saveServiceByAdmin,
} from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import {
  formatServicePriceLabel,
  SERVICE_CATEGORY_LABELS,
  slugify,
} from '../../utils/studioLogic';
import { STUDIO_IMAGES } from '../../data/initialCatalog';
import { ConfirmDialog } from '../ConfirmDialog';
import type { AccentColor, ServiceCategory, ServiceItem } from '../../types/studio';

interface AdminServicesPanelProps {
  services: ServiceItem[];
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

const EMPTY_FORM = {
  id: '',
  slug: '',
  title: '',
  category: 'web_app' as ServiceCategory,
  shortDescription: '',
  fullDescription: '',
  priceMin: 50000,
  priceMax: 150000,
  priceUnit: 'proyek',
  priceLabel: '',
  estimatedTurnaround: '2–5 hari kerja',
  deliverablesText: 'Desain rapi sesuai brief\n2 kali revisi minor\nFile final siap pakai',
  accentColor: '#0F3D3A' as AccentColor,
  imageUrl: STUDIO_IMAGES.webApp as string,
  driveFileId: '',
  sortOrder: 6,
  isFeatured: true,
  isPublished: true,
};

export function AdminServicesPanel({
  services,
  actor,
  onRefresh,
  onToast,
}: AdminServicesPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setForm({ ...EMPTY_FORM, sortOrder: services.length + 1 });
    setFormOpen(true);
  }

  function openEdit(srv: ServiceItem) {
    setForm({
      id: srv.id,
      slug: srv.slug,
      title: srv.title,
      category: srv.category,
      shortDescription: srv.shortDescription,
      fullDescription: srv.fullDescription,
      priceMin: srv.priceMin,
      priceMax: srv.priceMax,
      priceUnit: srv.priceUnit,
      priceLabel: srv.priceLabel,
      estimatedTurnaround: srv.estimatedTurnaround,
      deliverablesText: srv.deliverables.join('\n'),
      accentColor: srv.accentColor,
      imageUrl: srv.imageUrl,
      driveFileId: srv.driveFileId || '',
      sortOrder: srv.sortOrder,
      isFeatured: srv.isFeatured,
      isPublished: srv.isPublished,
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 3 || form.shortDescription.trim().length < 10) {
      onToast({
        type: 'error',
        title: 'Data Layanan Belum Lengkap',
        description: 'Isi judul layanan minimal 3 karakter dan deskripsi singkat minimal 10 karakter.',
      });
      return;
    }

    setSaving(true);
    try {
      const deliverables = form.deliverablesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const computedPriceLabel =
        form.priceLabel.trim() ||
        formatServicePriceLabel(Number(form.priceMin), Number(form.priceMax), form.priceUnit);

      await saveServiceByAdmin(
        {
          id: form.id || undefined,
          slug: form.slug.trim() || slugify(form.title),
          title: form.title,
          category: form.category,
          shortDescription: form.shortDescription,
          fullDescription:
            form.fullDescription.trim().length >= 20
              ? form.fullDescription
              : `${form.shortDescription.trim()} Dikerjakan secara profesional oleh tim SYAMS CREATIVE STUDIO.`,
          priceMin: Number(form.priceMin),
          priceMax: Number(form.priceMax),
          priceUnit: form.priceUnit,
          priceLabel: computedPriceLabel,
          estimatedTurnaround: form.estimatedTurnaround,
          deliverables,
          accentColor: form.accentColor,
          imageUrl: form.imageUrl,
          driveFileId: form.driveFileId,
          sortOrder: Number(form.sortOrder),
          isFeatured: form.isFeatured,
          isPublished: form.isPublished,
        },
        actor
      );
      await onRefresh();
      setFormOpen(false);
      onToast({
        type: 'success',
        title: 'Layanan Tersimpan',
        description: 'Perubahan layanan dan harga langsung tercermin pada halaman publik.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan Layanan',
        description: formatUserFriendlyError(err, 'Terjadi kesalahan saat menyimpan ke Firestore.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteServiceByAdmin(deleteTarget.id, deleteTarget.title, actor);
      await onRefresh();
      setDeleteTarget(null);
      onToast({
        type: 'info',
        title: 'Layanan Dihapus',
        description: `"${deleteTarget.title}" telah dihapus dari katalog.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menghapus Layanan',
        description: formatUserFriendlyError(err, 'Tidak dapat menghapus layanan.'),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
            Manajemen Layanan & Harga
          </h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            Semua estimasi harga layanan dikelola secara dinamis dari Firestore.
          </p>
        </div>
        <button type="button" onClick={openNew} className="nb-btn nb-btn-primary px-3.5 py-2 text-xs sm:text-sm">
          <Plus className="w-4 h-4" />
          Tambah Layanan
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="nb-card p-5 space-y-4">
          <h3 className="font-display font-bold text-base text-[#171717]">
            {form.id ? 'Edit Layanan & Harga' : 'Tambah Layanan Baru'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="srv-title" className="block text-xs font-bold">
                Nama Layanan *
              </label>
              <input
                id="srv-title"
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.id ? f.slug : slugify(e.target.value),
                  }))
                }
                className="nb-input text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="srv-slug" className="block text-xs font-bold">
                Slug URL *
              </label>
              <input
                id="srv-slug"
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                className="nb-input font-mono text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label htmlFor="srv-cat" className="block text-xs font-bold">
                Kategori
              </label>
              <select
                id="srv-cat"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ServiceCategory }))}
                className="nb-input text-sm"
              >
                {Object.entries(SERVICE_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="srv-min" className="block text-xs font-bold">
                Harga Min (Rp)
              </label>
              <input
                id="srv-min"
                type="number"
                min={0}
                value={form.priceMin}
                onChange={(e) => setForm((f) => ({ ...f, priceMin: Number(e.target.value) }))}
                className="nb-input font-mono text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="srv-max" className="block text-xs font-bold">
                Harga Maks (Rp)
              </label>
              <input
                id="srv-max"
                type="number"
                min={0}
                value={form.priceMax}
                onChange={(e) => setForm((f) => ({ ...f, priceMax: Number(e.target.value) }))}
                className="nb-input font-mono text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="srv-unit" className="block text-xs font-bold">
                Satuan Harga
              </label>
              <input
                id="srv-unit"
                type="text"
                value={form.priceUnit}
                onChange={(e) => setForm((f) => ({ ...f, priceUnit: e.target.value }))}
                placeholder="proyek / per menit / per slide"
                className="nb-input text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="srv-label" className="block text-xs font-bold">
                Label Harga (Opsional, otomatis jika kosong)
              </label>
              <input
                id="srv-label"
                type="text"
                value={form.priceLabel}
                onChange={(e) => setForm((f) => ({ ...f, priceLabel: e.target.value }))}
                placeholder={formatServicePriceLabel(form.priceMin, form.priceMax, form.priceUnit)}
                className="nb-input font-mono text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="srv-turnaround" className="block text-xs font-bold">
                Estimasi Durasi
              </label>
              <input
                id="srv-turnaround"
                type="text"
                value={form.estimatedTurnaround}
                onChange={(e) => setForm((f) => ({ ...f, estimatedTurnaround: e.target.value }))}
                className="nb-input text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="srv-drive" className="block text-xs font-bold">
                Google Drive File ID (Opsional)
              </label>
              <input
                id="srv-drive"
                type="text"
                value={form.driveFileId}
                onChange={(e) => setForm((f) => ({ ...f, driveFileId: e.target.value }))}
                placeholder="ID file Drive publik"
                className="nb-input font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="srv-short" className="block text-xs font-bold">
              Deskripsi Singkat *
            </label>
            <textarea
              id="srv-short"
              rows={2}
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="srv-full" className="block text-xs font-bold">
              Deskripsi Lengkap
            </label>
            <textarea
              id="srv-full"
              rows={3}
              value={form.fullDescription}
              onChange={(e) => setForm((f) => ({ ...f, fullDescription: e.target.value }))}
              className="nb-input text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="srv-deliverables" className="block text-xs font-bold">
                Daftar Deliverable (1 poin per baris)
              </label>
              <textarea
                id="srv-deliverables"
                rows={4}
                value={form.deliverablesText}
                onChange={(e) => setForm((f) => ({ ...f, deliverablesText: e.target.value }))}
                className="nb-input text-sm"
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="srv-img" className="block text-xs font-bold">
                  URL Gambar Fallback
                </label>
                <input
                  id="srv-img"
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  className="nb-input text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                    className="w-4 h-4 accent-[#0F3D3A]"
                  />
                  Publikasikan
                </label>
                <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                    className="w-4 h-4 accent-[#0F3D3A]"
                  />
                  Unggulan Beranda
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="nb-btn nb-btn-surface px-3.5 py-2 text-xs sm:text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Layanan'}
            </button>
          </div>
        </form>
      )}

      <div className="nb-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#F8F8E1] border-b-2 border-[#171717] text-[11px] font-display font-bold">
                <th className="px-3.5 py-2.5">Layanan</th>
                <th className="px-3.5 py-2.5">Kategori</th>
                <th className="px-3.5 py-2.5">Estimasi Harga</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717]/15">
              {services.map((srv) => (
                <tr key={srv.id} className="hover:bg-[#F8F8E1]/40">
                  <td className="px-3.5 py-2.5">
                    <p className="font-semibold text-[#171717]">{srv.title}</p>
                    <p className="text-[11px] font-mono text-[#525252]">/layanan/{srv.slug}</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-xs">{SERVICE_CATEGORY_LABELS[srv.category]}</td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-xs text-[#0F3D3A] tabular-nums whitespace-nowrap">
                    {srv.priceLabel}
                  </td>
                  <td className="px-3.5 py-2.5 text-xs whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 text-[11px] font-bold border-2 border-[#171717] rounded-[2px] ${
                        srv.isPublished ? 'bg-[#8ACCD5] text-[#171717]' : 'bg-[#E5E5C7] text-[#525252]'
                      }`}
                    >
                      {srv.isPublished ? 'Publik' : 'Draf'}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(srv)}
                        aria-label={`Edit layanan ${srv.title}`}
                        className="nb-btn nb-btn-mustard px-2.5 py-1 text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(srv)}
                        aria-label={`Hapus layanan ${srv.title}`}
                        className="nb-btn nb-btn-surface p-1.5 text-[#6C151E]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Layanan Ini?"
        description={
          deleteTarget
            ? `Layanan "${deleteTarget.title}" akan dihapus dari Firestore dan tidak lagi tampil di katalog publik.`
            : ''
        }
        confirmLabel="Hapus Layanan"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

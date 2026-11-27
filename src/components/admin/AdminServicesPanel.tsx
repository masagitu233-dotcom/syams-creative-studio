import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import {
  deleteServiceByAdmin,
  saveServiceByAdmin,
} from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import {
  formatServicePriceLabel,
  SERVICE_CATEGORY_LABELS,
  slugify,
  validateServiceInput,
} from '../../utils/studioLogic';
import { STUDIO_IMAGES } from '../../data/initialCatalog';
import { ConfirmDialog } from '../ConfirmDialog';
import { StudioImage } from '../StudioImage';
import { AdminImagePicker } from './AdminImagePicker';
import type {
  AccentColor,
  DriveFolderRecord,
  MediaAsset,
  MediaGalleryItem,
  ServiceCategory,
  ServiceItem,
} from '../../types/studio';

interface AdminServicesPanelProps {
  services: ServiceItem[];
  media: MediaAsset[];
  driveFolders?: DriveFolderRecord[];
  actor: { uid: string; email: string };
  autoOpenCreate?: boolean;
  onConsumeAutoOpen?: () => void;
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: '#0F3D3A', label: 'Hijau Studio' },
  { value: '#6C151E', label: 'Burgundy' },
  { value: '#8ACCD5', label: 'Sky Blue' },
  { value: '#F3C95B', label: 'Mustard' },
];

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
  gallery: [] as MediaGalleryItem[],
  sortOrder: 6,
  isFeatured: true,
  isPublished: true,
};

export function AdminServicesPanel({
  services,
  media,
  driveFolders = [],
  actor,
  autoOpenCreate,
  onConsumeAutoOpen,
  onRefresh,
  onToast,
}: AdminServicesPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedBaseline, setSavedBaseline] = useState<{
    imageUrl: string;
    driveFileId: string;
    gallery: MediaGalleryItem[];
  }>({
    imageUrl: EMPTY_FORM.imageUrl,
    driveFileId: '',
    gallery: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    if (autoOpenCreate) {
      setForm({ ...EMPTY_FORM, sortOrder: services.length + 1 });
      setSavedBaseline({
        imageUrl: EMPTY_FORM.imageUrl,
        driveFileId: '',
        gallery: [],
      });
      setFormErrors({});
      setFormOpen(true);
      onConsumeAutoOpen?.();
    }
  }, [autoOpenCreate, services.length, onConsumeAutoOpen]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((srv) => {
      if (categoryFilter !== 'all' && srv.category !== categoryFilter) return false;
      if (statusFilter === 'published' && !srv.isPublished) return false;
      if (statusFilter === 'draft' && srv.isPublished) return false;
      if (!q) return true;
      return (
        srv.title.toLowerCase().includes(q) ||
        srv.slug.toLowerCase().includes(q) ||
        srv.priceLabel.toLowerCase().includes(q) ||
        srv.shortDescription.toLowerCase().includes(q)
      );
    });
  }, [services, search, categoryFilter, statusFilter]);

  function openNew() {
    setForm({ ...EMPTY_FORM, sortOrder: services.length + 1 });
    setSavedBaseline({
      imageUrl: EMPTY_FORM.imageUrl,
      driveFileId: '',
      gallery: [],
    });
    setFormErrors({});
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
      gallery: srv.gallery || [],
      sortOrder: srv.sortOrder,
      isFeatured: srv.isFeatured,
      isPublished: srv.isPublished,
    });
    setSavedBaseline({
      imageUrl: srv.imageUrl,
      driveFileId: srv.driveFileId || '',
      gallery: srv.gallery || [],
    });
    setFormErrors({});
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const deliverables = form.deliverablesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const resolvedFullDescription =
      form.fullDescription.trim().length >= 20
        ? form.fullDescription
        : `${form.shortDescription.trim()} Dikerjakan secara profesional oleh tim OSAMA CREATIVE STUDIO.`;

    const validation = validateServiceInput({
      title: form.title,
      slug: form.slug.trim() || slugify(form.title),
      category: form.category,
      shortDescription: form.shortDescription,
      fullDescription: resolvedFullDescription,
      priceMin: Number(form.priceMin),
      priceMax: Number(form.priceMax),
      priceUnit: form.priceUnit,
      estimatedTurnaround: form.estimatedTurnaround,
      deliverables,
      imageUrl: form.imageUrl,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      onToast({
        type: 'error',
        title: 'Data Layanan Belum Lengkap',
        description: Object.values(validation.errors)[0],
      });
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
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
          fullDescription: resolvedFullDescription,
          priceMin: Number(form.priceMin),
          priceMax: Number(form.priceMax),
          priceUnit: form.priceUnit,
          priceLabel: computedPriceLabel,
          estimatedTurnaround: form.estimatedTurnaround,
          deliverables,
          accentColor: form.accentColor,
          imageUrl: form.imageUrl,
          driveFileId: form.driveFileId,
          gallery: form.gallery,
          sortOrder: Number(form.sortOrder) || 1,
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
        description: form.isPublished
          ? 'Perubahan layanan dan harga langsung tercermin pada halaman publik.'
          : 'Layanan disimpan sebagai Draf dan disembunyikan dari publik.',
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

  async function handleQuickToggle(srv: ServiceItem, field: 'isPublished' | 'isFeatured') {
    setTogglingId(`${srv.id}:${field}`);
    try {
      await saveServiceByAdmin(
        {
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
          deliverables: srv.deliverables,
          accentColor: srv.accentColor,
          imageUrl: srv.imageUrl,
          driveFileId: srv.driveFileId,
          gallery: srv.gallery || [],
          sortOrder: srv.sortOrder,
          isFeatured: field === 'isFeatured' ? !srv.isFeatured : srv.isFeatured,
          isPublished: field === 'isPublished' ? !srv.isPublished : srv.isPublished,
        },
        actor
      );
      await onRefresh();
      onToast({
        type: 'success',
        title:
          field === 'isPublished'
            ? !srv.isPublished
              ? 'Layanan Dipublikasikan'
              : 'Layanan Dipindahkan ke Draf'
            : !srv.isFeatured
              ? 'Ditandai Layanan Unggulan'
              : 'Dihapus dari Unggulan',
        description: `"${srv.title}" diperbarui di Firestore.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Mengubah Status Layanan',
        description: formatUserFriendlyError(err, 'Gagal memperbarui status layanan.'),
      });
    } finally {
      setTogglingId(null);
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

  const publishedCount = services.filter((s) => s.isPublished).length;
  const draftCount = services.length - publishedCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
            Kelola Layanan &amp; Harga
          </h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            {services.length} total layanan ({publishedCount} publik, {draftCount} draf) dikelola
            dinamis dari Cloud Firestore.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="nb-btn nb-btn-primary px-3.5 py-2 text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Layanan
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="nb-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-[#171717]">
            <h3 className="font-display font-bold text-base text-[#171717]">
              {form.id ? 'Edit Layanan & Harga' : 'Tambah Layanan Baru'}
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-xs font-semibold text-[#525252] hover:text-[#171717] cursor-pointer"
            >
              Tutup
            </button>
          </div>

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
              {formErrors.title && (
                <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.title}</p>
              )}
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
              {formErrors.slug && (
                <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.slug}</p>
              )}
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as ServiceCategory }))
                }
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
              {formErrors.priceMax && (
                <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.priceMax}</p>
              )}
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1 sm:col-span-2">
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

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="srv-sort" className="block text-xs font-bold">
                  Urutan
                </label>
                <input
                  id="srv-sort"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="nb-input font-mono text-sm tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="srv-accent" className="block text-xs font-bold">
                  Aksen
                </label>
                <select
                  id="srv-accent"
                  value={form.accentColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accentColor: e.target.value as AccentColor }))
                  }
                  className="nb-input text-xs"
                >
                  {ACCENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <AdminImagePicker
            imageUrl={form.imageUrl}
            driveFileId={form.driveFileId}
            savedImageUrl={savedBaseline.imageUrl}
            savedDriveFileId={savedBaseline.driveFileId}
            savedGallery={savedBaseline.gallery}
            entityKey={form.id || 'new-service'}
            entityPublished={form.isPublished}
            usage="service"
            media={media}
            driveFolders={driveFolders}
            entityId={form.id || form.slug || undefined}
            entityName={form.title || undefined}
            gallery={form.gallery}
            onGalleryChange={(gallery) => setForm((f) => ({ ...f, gallery }))}
            actor={actor}
            onChange={({ imageUrl, driveFileId }) => {
              setForm((f) => ({ ...f, imageUrl, driveFileId }));
              if (formErrors.imageUrl) {
                setFormErrors((prev) => ({ ...prev, imageUrl: '' }));
              }
            }}
            onMediaUploaded={onRefresh}
            onToast={onToast}
          />
          {formErrors.imageUrl && (
            <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.imageUrl}</p>
          )}

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
            {formErrors.shortDescription && (
              <p className="text-[11px] font-semibold text-[#6C151E]">
                {formErrors.shortDescription}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="srv-full" className="block text-xs font-bold">
                Deskripsi Lengkap
              </label>
              <textarea
                id="srv-full"
                rows={4}
                value={form.fullDescription}
                onChange={(e) => setForm((f) => ({ ...f, fullDescription: e.target.value }))}
                className="nb-input text-sm"
              />
            </div>

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
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-1">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                className="w-4 h-4 accent-[#0F3D3A]"
              />
              Publikasikan ke Website
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

      {/* Search & Filter Toolbar */}
      <div className="nb-card p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#525252] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama layanan, slug, atau harga..."
            className="nb-input nb-input-compact pl-8"
            aria-label="Cari layanan"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ServiceCategory | 'all')}
            className="nb-input nb-input-compact w-auto"
            aria-label="Filter kategori layanan"
          >
            <option value="all">Semua Kategori</option>
            {Object.entries(SERVICE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1" role="tablist" aria-label="Filter status layanan">
            {(
              [
                ['all', 'Semua'],
                ['published', 'Publik'],
                ['draft', 'Draf'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                role="tab"
                aria-selected={statusFilter === val}
                onClick={() => setStatusFilter(val)}
                className="nb-tab text-xs py-1 px-2.5"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="nb-card overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="p-8 text-center space-y-2.5">
            <p className="font-display font-bold text-sm text-[#171717]">
              {services.length === 0
                ? 'Belum ada layanan di Firestore'
                : 'Tidak ada layanan yang cocok dengan filter'}
            </p>
            <p className="text-xs text-[#525252]">
              {services.length === 0
                ? 'Tambahkan layanan baru untuk menayangkannya di beranda.'
                : 'Ubah kata kunci pencarian atau pilih kategori lain.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F8F8E1] border-b-2 border-[#171717] text-[11px] font-display font-bold">
                  <th className="px-3 py-2.5">Layanan</th>
                  <th className="px-3 py-2.5">Kategori</th>
                  <th className="px-3 py-2.5">Estimasi Harga</th>
                  <th className="px-3 py-2.5 text-center">Urutan</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171717]/15">
                {filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-[#F8F8E1]/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <div className="relative w-14 shrink-0 border-2 border-[#171717] rounded-[2px] overflow-hidden bg-white">
                          <StudioImage
                            src={srv.imageUrl}
                            driveFileId={srv.driveFileId}
                            cacheVersion={srv.updatedAt}
                            alt={srv.title}
                            aspectClass="aspect-[16/10]"
                            onStatusChange={(status) => {
                              setFailedThumbs((prev) => {
                                const nextErr = status === 'error';
                                if (Boolean(prev[srv.id]) === nextErr) return prev;
                                return { ...prev, [srv.id]: nextErr };
                              });
                            }}
                          />
                          {failedThumbs[srv.id] && (
                            <span
                              title="Thumbnail gagal dimuat — klik Edit untuk memeriksa"
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#6C151E] text-[#F8F8E1] rounded-[2px] flex items-center justify-center"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#171717] line-clamp-1">{srv.title}</p>
                          <p className="text-[11px] font-mono text-[#525252] truncate">
                            /layanan/{srv.slug}
                            {srv.gallery && srv.gallery.length > 0
                              ? ` · +${srv.gallery.length} galeri`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {SERVICE_CATEGORY_LABELS[srv.category]}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-xs text-[#0F3D3A] tabular-nums whitespace-nowrap">
                      {srv.priceLabel}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs tabular-nums">
                      #{srv.sortOrder}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={togglingId === `${srv.id}:isPublished`}
                          onClick={() => void handleQuickToggle(srv, 'isPublished')}
                          title={
                            srv.isPublished
                              ? 'Klik untuk ubah ke Draf'
                              : 'Klik untuk publikasikan'
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold border-2 border-[#171717] rounded-[2px] cursor-pointer ${
                            srv.isPublished
                              ? 'bg-[#8ACCD5] text-[#171717]'
                              : 'bg-[#E5E5C7] text-[#525252]'
                          }`}
                        >
                          {srv.isPublished ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                          {srv.isPublished ? 'Publik' : 'Draf'}
                        </button>

                        <button
                          type="button"
                          disabled={togglingId === `${srv.id}:isFeatured`}
                          onClick={() => void handleQuickToggle(srv, 'isFeatured')}
                          title={
                            srv.isFeatured ? 'Hapus dari unggulan' : 'Tandai sebagai unggulan'
                          }
                          aria-label={`Ubah status unggulan ${srv.title}`}
                          className={`p-1 border-2 border-[#171717] rounded-[2px] cursor-pointer ${
                            srv.isFeatured
                              ? 'bg-[#F3C95B] text-[#171717]'
                              : 'bg-white text-[#737373]'
                          }`}
                        >
                          <Star
                            className={`w-3 h-3 ${srv.isFeatured ? 'fill-current' : ''}`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {srv.isPublished && (
                          <Link
                            to={`/layanan/${srv.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Buka halaman publik ${srv.title}`}
                            className="nb-btn nb-btn-surface p-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
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
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Layanan Ini?"
        description={
          deleteTarget
            ? `Layanan "${deleteTarget.title}" akan dihapus dari Firestore dan tidak lagi tampil di katalog publik. Berkas media di Google Drive tetap aman di Media Library.`
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

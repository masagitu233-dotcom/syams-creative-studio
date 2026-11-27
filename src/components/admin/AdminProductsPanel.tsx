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
  deleteDigitalProductByAdmin,
  saveDigitalProductByAdmin,
} from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import {
  DIGITAL_PRODUCT_CATEGORY_LABELS,
  formatRupiah,
  slugify,
  validateDigitalProductInput,
} from '../../utils/studioLogic';
import { PRODUCT_IMAGES } from '../../data/digitalProducts';
import { ConfirmDialog } from '../ConfirmDialog';
import { StudioImage } from '../StudioImage';
import { AdminImagePicker } from './AdminImagePicker';
import type {
  DigitalProductCategory,
  DigitalProductItem,
  DriveFolderRecord,
  MediaAsset,
  MediaGalleryItem,
} from '../../types/studio';

interface AdminProductsPanelProps {
  products: DigitalProductItem[];
  media: MediaAsset[];
  driveFolders?: DriveFolderRecord[];
  actor: { uid: string; email: string };
  autoOpenCreate?: boolean;
  onConsumeAutoOpen?: () => void;
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

const EMPTY_PRODUCT_FORM = {
  id: '',
  slug: '',
  title: '',
  category: 'template_ppt' as DigitalProductCategory,
  price: 25000,
  showPrice: true,
  format: 'PPTX & Google Slides',
  fileSize: '15 MB',
  compatibility: 'PowerPoint, Google Slides',
  summary: '',
  description: '',
  includesText: 'File utama siap sunting\nPanduan pemakaian singkat\nBebas penggunaan komersial',
  imageUrl: PRODUCT_IMAGES.pptDeck as string,
  driveFileId: '',
  gallery: [] as MediaGalleryItem[],
  sortOrder: 1,
  isFeatured: true,
  isPublished: true,
};

export function AdminProductsPanel({
  products,
  media,
  driveFolders = [],
  actor,
  autoOpenCreate,
  onConsumeAutoOpen,
  onRefresh,
  onToast,
}: AdminProductsPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [savedBaseline, setSavedBaseline] = useState<{
    imageUrl: string;
    driveFileId: string;
    gallery: MediaGalleryItem[];
  }>({
    imageUrl: EMPTY_PRODUCT_FORM.imageUrl,
    driveFileId: '',
    gallery: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DigitalProductItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DigitalProductCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    if (autoOpenCreate) {
      setForm({
        ...EMPTY_PRODUCT_FORM,
        sortOrder: products.length + 1,
      });
      setSavedBaseline({
        imageUrl: EMPTY_PRODUCT_FORM.imageUrl,
        driveFileId: '',
        gallery: [],
      });
      setFormErrors({});
      setFormOpen(true);
      onConsumeAutoOpen?.();
    }
  }, [autoOpenCreate, products.length, onConsumeAutoOpen]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter === 'published' && !item.isPublished) return false;
      if (statusFilter === 'draft' && item.isPublished) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.format.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter, statusFilter]);

  function openNew() {
    setForm({
      ...EMPTY_PRODUCT_FORM,
      sortOrder: products.length + 1,
    });
    setSavedBaseline({
      imageUrl: EMPTY_PRODUCT_FORM.imageUrl,
      driveFileId: '',
      gallery: [],
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(item: DigitalProductItem) {
    setForm({
      id: item.id,
      slug: item.slug,
      title: item.title,
      category: item.category,
      price: item.price,
      showPrice: item.showPrice,
      format: item.format,
      fileSize: item.fileSize || '',
      compatibility: item.compatibility || '',
      summary: item.summary,
      description: item.description,
      includesText: (item.includes || []).join('\n'),
      imageUrl: item.imageUrl,
      driveFileId: item.driveFileId || '',
      gallery: item.gallery || [],
      sortOrder: item.sortOrder,
      isFeatured: item.isFeatured,
      isPublished: item.isPublished,
    });
    setSavedBaseline({
      imageUrl: item.imageUrl,
      driveFileId: item.driveFileId || '',
      gallery: item.gallery || [],
    });
    setFormErrors({});
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const includes = form.includesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const validation = validateDigitalProductInput({
      title: form.title,
      slug: form.slug || slugify(form.title),
      category: form.category,
      price: Number(form.price),
      format: form.format,
      summary: form.summary,
      description:
        form.description.trim().length >= 10
          ? form.description
          : `${form.summary.trim()} Produk digital resmi SYAMS CREATIVE STUDIO.`,
      includes,
      imageUrl: form.imageUrl,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      onToast({
        type: 'error',
        title: 'Periksa Isian Produk Digital',
        description: Object.values(validation.errors)[0],
      });
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      await saveDigitalProductByAdmin(
        {
          id: form.id || undefined,
          slug: form.slug.trim() || slugify(form.title),
          title: form.title,
          category: form.category,
          price: Number(form.price),
          showPrice: form.showPrice,
          format: form.format,
          fileSize: form.fileSize,
          compatibility: form.compatibility,
          summary: form.summary,
          description:
            form.description.trim().length >= 10
              ? form.description
              : `${form.summary.trim()} Produk digital resmi SYAMS CREATIVE STUDIO.`,
          includes,
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
        title: form.id ? 'Produk Digital Diperbarui' : 'Produk Digital Ditambahkan',
        description: form.isPublished
          ? 'Perubahan langsung tayang di Beranda dan Katalog Produk publik.'
          : 'Produk disimpan sebagai Draf dan tidak ditampilkan ke pengunjung publik.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan Produk Digital',
        description: formatUserFriendlyError(err, 'Gagal menulis data produk ke Firestore.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickToggle(
    item: DigitalProductItem,
    field: 'isPublished' | 'isFeatured'
  ) {
    setTogglingId(`${item.id}:${field}`);
    try {
      await saveDigitalProductByAdmin(
        {
          id: item.id,
          slug: item.slug,
          title: item.title,
          category: item.category,
          price: item.price,
          showPrice: item.showPrice,
          format: item.format,
          fileSize: item.fileSize,
          compatibility: item.compatibility,
          summary: item.summary,
          description: item.description,
          includes: item.includes,
          imageUrl: item.imageUrl,
          driveFileId: item.driveFileId,
          gallery: item.gallery || [],
          sortOrder: item.sortOrder,
          isFeatured: field === 'isFeatured' ? !item.isFeatured : item.isFeatured,
          isPublished: field === 'isPublished' ? !item.isPublished : item.isPublished,
        },
        actor
      );
      await onRefresh();
      onToast({
        type: 'success',
        title:
          field === 'isPublished'
            ? !item.isPublished
              ? 'Produk Dipublikasikan'
              : 'Produk Dipindahkan ke Draf'
            : !item.isFeatured
              ? 'Ditandai Produk Unggulan'
              : 'Dihapus dari Unggulan',
        description: `"${item.title}" diperbarui di Firestore.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Mengubah Status Produk',
        description: formatUserFriendlyError(err, 'Gagal memperbarui status produk.'),
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDigitalProductByAdmin(deleteTarget.id, deleteTarget.title, actor);
      await onRefresh();
      setDeleteTarget(null);
      onToast({
        type: 'info',
        title: 'Produk Digital Dihapus',
        description: `"${deleteTarget.title}" telah dihapus dari Firestore dan katalog publik.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menghapus Produk',
        description: formatUserFriendlyError(err, 'Tidak dapat menghapus produk digital.'),
      });
    } finally {
      setDeleting(false);
    }
  }

  const publishedCount = products.filter((p) => p.isPublished).length;
  const draftCount = products.length - publishedCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
            Kelola Produk Digital
          </h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            {products.length} total produk ({publishedCount} publik, {draftCount} draf) tersinkron
            langsung dengan Beranda &amp; Katalog Produk.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="nb-btn nb-btn-primary px-3.5 py-2 text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Produk Digital
        </button>
      </div>

      {/* Add / Edit Form */}
      {formOpen && (
        <form onSubmit={handleSubmit} className="nb-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-[#171717]">
            <h3 className="font-display font-bold text-base text-[#171717]">
              {form.id ? 'Edit Produk Digital' : 'Tambah Produk Digital Baru'}
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
              <label htmlFor="prod-title" className="block text-xs font-bold">
                Nama Produk *
              </label>
              <input
                id="prod-title"
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.id ? f.slug : slugify(e.target.value),
                  }))
                }
                placeholder="Contoh: Template PPT Pitch Deck Bisnis (40 Slide)"
                className="nb-input text-sm"
                required
              />
              {formErrors.title && (
                <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.title}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="prod-slug" className="block text-xs font-bold">
                Slug URL *
              </label>
              <input
                id="prod-slug"
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="template-ppt-pitch-deck-bisnis"
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
              <label htmlFor="prod-cat" className="block text-xs font-bold">
                Kategori *
              </label>
              <select
                id="prod-cat"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as DigitalProductCategory }))
                }
                className="nb-input text-sm"
              >
                {Object.entries(DIGITAL_PRODUCT_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="prod-price" className="block text-xs font-bold">
                Harga (Rp) *
              </label>
              <input
                id="prod-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                className="nb-input font-mono text-sm tabular-nums"
                required
              />
              {formErrors.price && (
                <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.price}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="prod-format" className="block text-xs font-bold">
                Format File *
              </label>
              <input
                id="prod-format"
                type="text"
                value={form.format}
                onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
                placeholder="PPTX / Canva / DOCX"
                className="nb-input text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="prod-sort" className="block text-xs font-bold">
                Urutan Tampil
              </label>
              <input
                id="prod-sort"
                type="number"
                min={0}
                max={9999}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="nb-input font-mono text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="prod-filesize" className="block text-xs font-bold">
                Ukuran File
              </label>
              <input
                id="prod-filesize"
                type="text"
                value={form.fileSize}
                onChange={(e) => setForm((f) => ({ ...f, fileSize: e.target.value }))}
                placeholder="Contoh: 18,4 MB"
                className="nb-input text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="prod-compat" className="block text-xs font-bold">
                Kompatibilitas Software
              </label>
              <input
                id="prod-compat"
                type="text"
                value={form.compatibility}
                onChange={(e) => setForm((f) => ({ ...f, compatibility: e.target.value }))}
                placeholder="Contoh: PowerPoint 2019+, Google Slides, Canva"
                className="nb-input text-sm"
              />
            </div>
          </div>

          <AdminImagePicker
            imageUrl={form.imageUrl}
            driveFileId={form.driveFileId}
            savedImageUrl={savedBaseline.imageUrl}
            savedDriveFileId={savedBaseline.driveFileId}
            savedGallery={savedBaseline.gallery}
            entityKey={form.id || 'new-product'}
            entityPublished={form.isPublished}
            usage="product"
            media={media}
            driveFolders={driveFolders}
            entityId={form.id || (form.slug ? `prod-${form.slug}` : undefined)}
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
            <label htmlFor="prod-summary" className="block text-xs font-bold">
              Ringkasan Singkat *
            </label>
            <textarea
              id="prod-summary"
              rows={2}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Ringkasan 1–2 kalimat tentang keunggulan produk digital ini."
              className="nb-input text-sm"
              required
            />
            {formErrors.summary && (
              <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.summary}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="prod-desc" className="block text-xs font-bold">
                Deskripsi Lengkap *
              </label>
              <textarea
                id="prod-desc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Jelaskan detail isi, manfaat, dan cara pemakaian produk digital."
                className="nb-input text-sm"
                required
              />
              {formErrors.description && (
                <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.description}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="prod-includes" className="block text-xs font-bold">
                Isi Paket / Deliverable (1 poin per baris) *
              </label>
              <textarea
                id="prod-includes"
                rows={4}
                value={form.includesText}
                onChange={(e) => setForm((f) => ({ ...f, includesText: e.target.value }))}
                className="nb-input text-sm"
                required
              />
              {formErrors.includes && (
                <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.includes}</p>
              )}
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
                checked={form.showPrice}
                onChange={(e) => setForm((f) => ({ ...f, showPrice: e.target.checked }))}
                className="w-4 h-4 accent-[#0F3D3A]"
              />
              Tampilkan Harga Publik
            </label>
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                className="w-4 h-4 accent-[#0F3D3A]"
              />
              Produk Unggulan
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
              {saving ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="nb-card p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#525252] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, slug, atau format produk..."
            className="nb-input nb-input-compact pl-8"
            aria-label="Cari produk digital"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DigitalProductCategory | 'all')}
            className="nb-input nb-input-compact w-auto"
            aria-label="Filter kategori produk"
          >
            <option value="all">Semua Kategori</option>
            {Object.entries(DIGITAL_PRODUCT_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1" role="tablist" aria-label="Filter status produk">
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

      {/* Products Table */}
      <div className="nb-card overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center space-y-2.5">
            <p className="font-display font-bold text-sm text-[#171717]">
              {products.length === 0
                ? 'Belum ada produk digital di Firestore'
                : 'Tidak ada produk yang cocok dengan filter'}
            </p>
            <p className="text-xs text-[#525252]">
              {products.length === 0
                ? 'Tambahkan produk digital baru atau gunakan sinkronisasi katalog awal.'
                : 'Ubah kata kunci pencarian atau pilih kategori lain.'}
            </p>
            {products.length === 0 && (
              <button type="button" onClick={openNew} className="nb-btn nb-btn-primary nb-btn-sm">
                <Plus className="w-3.5 h-3.5" />
                Tambah Produk Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F8F8E1] border-b-2 border-[#171717] text-[11px] font-display font-bold">
                  <th className="px-3 py-2.5">Produk</th>
                  <th className="px-3 py-2.5">Kategori</th>
                  <th className="px-3 py-2.5">Harga</th>
                  <th className="px-3 py-2.5 text-center">Urutan</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171717]/15">
                {filteredProducts.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8F8E1]/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <div className="relative w-14 shrink-0 border-2 border-[#171717] rounded-[2px] overflow-hidden bg-white">
                          <StudioImage
                            src={item.imageUrl}
                            driveFileId={item.driveFileId}
                            cacheVersion={item.updatedAt}
                            alt={item.title}
                            aspectClass="aspect-[16/10]"
                            onStatusChange={(status) => {
                              setFailedThumbs((prev) => {
                                const nextErr = status === 'error';
                                if (Boolean(prev[item.id]) === nextErr) return prev;
                                return { ...prev, [item.id]: nextErr };
                              });
                            }}
                          />
                          {failedThumbs[item.id] && (
                            <span
                              title="Thumbnail gagal dimuat — klik Edit untuk memeriksa"
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#6C151E] text-[#F8F8E1] rounded-[2px] flex items-center justify-center"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#171717] line-clamp-1">{item.title}</p>
                          <p className="text-[11px] font-mono text-[#525252] truncate">
                            /produk/{item.slug} · {item.format}
                            {item.gallery && item.gallery.length > 0
                              ? ` · +${item.gallery.length} galeri`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {DIGITAL_PRODUCT_CATEGORY_LABELS[item.category]}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <p className="font-mono font-bold text-xs text-[#0F3D3A] tabular-nums">
                        {formatRupiah(item.price)}
                      </p>
                      {!item.showPrice && (
                        <span className="text-[10px] text-[#6C151E] font-medium">
                          Harga disembunyikan
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs tabular-nums">
                      #{item.sortOrder}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={togglingId === `${item.id}:isPublished`}
                          onClick={() => void handleQuickToggle(item, 'isPublished')}
                          title={
                            item.isPublished
                              ? 'Klik untuk ubah ke Draf'
                              : 'Klik untuk publikasikan'
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold border-2 border-[#171717] rounded-[2px] cursor-pointer transition-opacity ${
                            item.isPublished
                              ? 'bg-[#8ACCD5] text-[#171717]'
                              : 'bg-[#E5E5C7] text-[#525252]'
                          }`}
                        >
                          {item.isPublished ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                          {item.isPublished ? 'Publik' : 'Draf'}
                        </button>

                        <button
                          type="button"
                          disabled={togglingId === `${item.id}:isFeatured`}
                          onClick={() => void handleQuickToggle(item, 'isFeatured')}
                          title={
                            item.isFeatured ? 'Hapus dari unggulan' : 'Tandai sebagai unggulan'
                          }
                          aria-label={`Ubah status unggulan ${item.title}`}
                          className={`p-1 border-2 border-[#171717] rounded-[2px] cursor-pointer ${
                            item.isFeatured
                              ? 'bg-[#F3C95B] text-[#171717]'
                              : 'bg-white text-[#737373]'
                          }`}
                        >
                          <Star
                            className={`w-3 h-3 ${item.isFeatured ? 'fill-current' : ''}`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {item.isPublished && (
                          <Link
                            to={`/produk/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Buka halaman publik ${item.title}`}
                            className="nb-btn nb-btn-surface p-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          aria-label={`Edit produk ${item.title}`}
                          className="nb-btn nb-btn-mustard px-2.5 py-1 text-xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Hapus produk ${item.title}`}
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
        title="Hapus Produk Digital Ini?"
        description={
          deleteTarget
            ? `Produk "${deleteTarget.title}" akan dihapus permanen dari Firestore dan tidak lagi tampil di beranda maupun katalog produk. Berkas media di Google Drive tetap aman di Media Library.`
            : ''
        }
        confirmLabel="Hapus Produk"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

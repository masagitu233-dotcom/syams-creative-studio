import React, { useState } from 'react';
import { AlertTriangle, Images, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deletePortfolioByAdmin,
  savePortfolioByAdmin,
} from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import {
  SERVICE_CATEGORY_LABELS,
  validatePortfolioInput,
} from '../../utils/studioLogic';
import { STUDIO_IMAGES } from '../../data/initialCatalog';
import { ConfirmDialog } from '../ConfirmDialog';
import { StudioImage } from '../StudioImage';
import { AdminImagePicker } from './AdminImagePicker';
import type {
  DriveFolderRecord,
  MediaAsset,
  MediaGalleryItem,
  PortfolioItem,
  ServiceCategory,
} from '../../types/studio';

interface AdminPortfolioPanelProps {
  items: PortfolioItem[];
  media: MediaAsset[];
  driveFolders?: DriveFolderRecord[];
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

const EMPTY_FORM = {
  id: '',
  title: '',
  clientName: '',
  category: 'web_app' as ServiceCategory,
  year: '2026',
  summary: '',
  challenge: '',
  outcome: '',
  metrics: '',
  imageUrl: STUDIO_IMAGES.webApp as string,
  driveFileId: '',
  gallery: [] as MediaGalleryItem[],
  projectUrl: '',
  isFeatured: true,
  isPublished: true,
  sortOrder: 1,
};

export function AdminPortfolioPanel({
  items,
  media,
  driveFolders = [],
  actor,
  onRefresh,
  onToast,
}: AdminPortfolioPanelProps) {
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
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setForm({ ...EMPTY_FORM, sortOrder: items.length + 1 });
    setSavedBaseline({
      imageUrl: EMPTY_FORM.imageUrl,
      driveFileId: '',
      gallery: [],
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(item: PortfolioItem) {
    setForm({
      id: item.id,
      title: item.title,
      clientName: item.clientName,
      category: item.category,
      year: item.year,
      summary: item.summary,
      challenge: item.challenge || '',
      outcome: item.outcome,
      metrics: item.metrics,
      imageUrl: item.imageUrl,
      driveFileId: item.driveFileId || '',
      gallery: item.gallery || [],
      projectUrl: item.projectUrl || '',
      isFeatured: item.isFeatured,
      isPublished: item.isPublished,
      sortOrder: item.sortOrder,
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
    const resolvedOutcome = form.outcome.trim() || form.summary.trim();
    const resolvedMetrics = form.metrics.trim() || 'Selesai sesuai target klien';
    const resolvedClient = form.clientName.trim() || 'Klien OSAMA';
    const validation = validatePortfolioInput({
      title: form.title,
      clientName: resolvedClient,
      category: form.category,
      year: form.year || '2026',
      summary: form.summary,
      outcome: resolvedOutcome,
      metrics: resolvedMetrics,
      imageUrl: form.imageUrl,
      projectUrl: form.projectUrl,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      onToast({
        type: 'error',
        title: 'Data Portofolio Belum Lengkap',
        description: Object.values(validation.errors)[0],
      });
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      await savePortfolioByAdmin(
        {
          id: form.id || undefined,
          title: form.title,
          clientName: resolvedClient,
          category: form.category,
          year: form.year || '2026',
          summary: form.summary,
          challenge: form.challenge,
          outcome: resolvedOutcome,
          metrics: resolvedMetrics,
          imageUrl: form.imageUrl,
          driveFileId: form.driveFileId,
          gallery: form.gallery,
          projectUrl: form.projectUrl,
          isFeatured: form.isFeatured,
          isPublished: form.isPublished,
          sortOrder: Number(form.sortOrder),
        },
        actor
      );
      await onRefresh();
      setFormOpen(false);
      onToast({
        type: 'success',
        title: 'Portofolio Tersimpan',
        description: 'Karya dan thumbnail berhasil diperbarui pada Firestore.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan Portofolio',
        description: formatUserFriendlyError(err, 'Gagal menyimpan data portofolio.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePortfolioByAdmin(deleteTarget.id, deleteTarget.title, actor);
      await onRefresh();
      setDeleteTarget(null);
      onToast({
        type: 'info',
        title: 'Portofolio Dihapus',
        description: `"${deleteTarget.title}" telah dihapus.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menghapus Portofolio',
        description: formatUserFriendlyError(err, 'Tidak dapat menghapus item portofolio.'),
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
            Manajemen Portofolio
          </h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            Kelola studi kasus pilihan dan tautkan media publik Google Drive berdasarkan fileId.
          </p>
        </div>
        <button type="button" onClick={openNew} className="nb-btn nb-btn-primary px-3.5 py-2 text-xs sm:text-sm">
          <Plus className="w-4 h-4" />
          Tambah Portofolio
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="nb-card p-5 space-y-3.5">
          <h3 className="font-display font-bold text-base text-[#171717]">
            {form.id ? 'Edit Portofolio' : 'Tambah Karya Baru'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="pf-title" className="block text-xs font-bold">
                Judul Proyek *
              </label>
              <input
                id="pf-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="nb-input text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pf-client" className="block text-xs font-bold">
                Nama Klien *
              </label>
              <input
                id="pf-client"
                type="text"
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                className="nb-input text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="pf-cat" className="block text-xs font-bold">
                Kategori
              </label>
              <select
                id="pf-cat"
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
              <label htmlFor="pf-year" className="block text-xs font-bold">
                Tahun
              </label>
              <input
                id="pf-year"
                type="text"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                className="nb-input font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pf-metrics" className="block text-xs font-bold">
                Dampak Terukur *
              </label>
              <input
                id="pf-metrics"
                type="text"
                value={form.metrics}
                onChange={(e) => setForm((f) => ({ ...f, metrics: e.target.value }))}
                placeholder="Contoh: 42.000+ penayangan organik"
                className="nb-input text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="pf-summary" className="block text-xs font-bold">
              Ringkasan Singkat *
            </label>
            <textarea
              id="pf-summary"
              rows={2}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="pf-challenge" className="block text-xs font-bold">
                Tantangan Awal
              </label>
              <textarea
                id="pf-challenge"
                rows={2}
                value={form.challenge}
                onChange={(e) => setForm((f) => ({ ...f, challenge: e.target.value }))}
                className="nb-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pf-outcome" className="block text-xs font-bold">
                Solusi & Hasil *
              </label>
              <textarea
                id="pf-outcome"
                rows={2}
                value={form.outcome}
                onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                className="nb-input text-sm"
                required
              />
            </div>
          </div>

          <AdminImagePicker
            label="Foto Utama & Galeri Dokumentasi Proyek (Google Drive)"
            imageUrl={form.imageUrl}
            driveFileId={form.driveFileId}
            savedImageUrl={savedBaseline.imageUrl}
            savedDriveFileId={savedBaseline.driveFileId}
            savedGallery={savedBaseline.gallery}
            entityKey={form.id || 'new-portfolio'}
            entityPublished={form.isPublished}
            usage="portfolio"
            media={media}
            driveFolders={driveFolders}
            entityId={form.id || undefined}
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
            <label htmlFor="pf-url" className="block text-xs font-bold">
              Tautan Proyek (Opsional)
            </label>
            <input
              id="pf-url"
              type="url"
              value={form.projectUrl}
              onChange={(e) => setForm((f) => ({ ...f, projectUrl: e.target.value }))}
              placeholder="https://..."
              className="nb-input text-sm"
            />
            {formErrors.projectUrl && (
              <p className="text-[11px] font-semibold text-[#6C151E]">{formErrors.projectUrl}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-4">
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
                Tampilkan di Beranda
              </label>
            </div>
            <div className="flex gap-2.5">
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
                {saving ? 'Menyimpan...' : 'Simpan Portofolio'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
        {items.map((item) => {
          const galleryCount = item.gallery?.length || 0;
          const isBroken = Boolean(failedThumbs[item.id]);
          return (
            <div key={item.id} className="nb-card overflow-hidden h-full flex flex-col justify-between">
              <div>
                <div className="relative border-b-2 border-[#171717] bg-[#F1F1D3]">
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
                  {item.driveFileId && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#0F3D3A] text-[#F3C95B] border border-[#171717] font-mono text-[9px] font-bold rounded-[2px]">
                      DRIVE
                    </span>
                  )}
                  {galleryCount > 0 && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-[#171717]/90 text-[#F8F8E1] font-mono text-[9px] font-bold rounded-[2px] inline-flex items-center gap-1">
                      <Images className="w-2.5 h-2.5 text-[#F3C95B]" />+{galleryCount}
                    </span>
                  )}
                  {isBroken && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-[#6C151E] text-[#F8F8E1] border border-[#171717] font-mono text-[9px] font-bold rounded-[2px] inline-flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Periksa Gambar
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-1.5">
                  <p className="text-[11px] text-[#525252] truncate">
                    {SERVICE_CATEGORY_LABELS[item.category]} · {item.clientName} · {item.year}
                  </p>
                  <h3 className="font-display font-bold text-sm sm:text-base text-[#171717] line-clamp-2 min-h-[2.4rem]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#404040] line-clamp-2">{item.summary}</p>
                  <p className="text-xs font-semibold text-[#0F3D3A] pt-0.5 line-clamp-1">
                    {item.metrics}
                  </p>
                </div>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between border-t border-[#171717]/15 bg-[#F8F8E1]/40 mt-auto">
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold border-2 border-[#171717] rounded-[2px] ${
                    item.isPublished ? 'bg-[#8ACCD5]' : 'bg-[#E5E5C7]'
                  }`}
                >
                  {item.isPublished ? 'Publik' : 'Draf'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="nb-btn nb-btn-mustard px-2.5 py-1 text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit / Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Hapus portofolio ${item.title}`}
                    className="nb-btn nb-btn-surface p-1.5 text-[#6C151E]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Item Portofolio?"
        description={
          deleteTarget ? `Karya "${deleteTarget.title}" akan dihapus permanen dari Firestore.` : ''
        }
        confirmLabel="Hapus Portofolio"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

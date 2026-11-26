import React, { useEffect, useState } from 'react';
import { Copy, FileUp, HardDrive, Lock, Globe, Trash2 } from 'lucide-react';
import {
  deleteMediaByAdmin,
  saveMediaMetadata,
} from '../../services/firestoreService';
import {
  fetchDriveIntegrationStatus,
  uploadFileToDriveBackend,
  type DriveStatusResponse,
} from '../../services/apiService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import {
  buildMediaProxyUrl,
  formatDateTimeId,
  formatFileSize,
} from '../../utils/studioLogic';
import { ConfirmDialog } from '../ConfirmDialog';
import type { MediaAsset, MediaUsage, MediaVisibility } from '../../types/studio';

interface AdminMediaPanelProps {
  media: MediaAsset[];
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

export function AdminMediaPanel({ media, actor, onRefresh, onToast }: AdminMediaPanelProps) {
  const [driveStatus, setDriveStatus] = useState<DriveStatusResponse | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | MediaVisibility>('all');

  const [uploadVisibility, setUploadVisibility] = useState<MediaVisibility>('public');
  const [uploadUsage, setUploadUsage] = useState<MediaUsage>('portfolio');
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploading, setUploading] = useState(false);

  const [manualFileId, setManualFileId] = useState('');
  const [manualFileName, setManualFileName] = useState('');
  const [manualMime, setManualMime] = useState('image/jpeg');
  const [registering, setRegistering] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchDriveIntegrationStatus().then(setDriveStatus);
  }, []);

  const filtered = media.filter((item) =>
    visibilityFilter === 'all' ? true : item.visibility === visibilityFilter
  );

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFileToDriveBackend({
        file,
        visibility: uploadVisibility,
        usage: uploadUsage,
      });
      await saveMediaMetadata(
        {
          fileId: uploaded.fileId,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          visibility: uploadVisibility,
          usage: uploadUsage,
          altText: uploadAlt || uploaded.fileName,
          ownerUid: actor.uid,
        },
        { ...actor, isAdmin: true }
      );
      setUploadAlt('');
      await onRefresh();
      onToast({
        type: 'success',
        title: 'Unggahan Google Drive Berhasil',
        description: `File "${uploaded.fileName}" tersimpan dengan fileId ${uploaded.fileId}.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Unggahan Google Drive Gagal',
        description: formatUserFriendlyError(err, 'Pastikan kredensial Google Drive API aktif di server.'),
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleManualRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_\-]{3,200}$/.test(manualFileId.trim())) {
      onToast({
        type: 'error',
        title: 'Format fileId Tidak Valid',
        description: 'Gunakan ID file Google Drive yang valid (huruf, angka, garis bawah, atau tanda hubung).',
      });
      return;
    }

    setRegistering(true);
    try {
      await saveMediaMetadata(
        {
          fileId: manualFileId.trim(),
          fileName: manualFileName.trim() || `drive-asset-${manualFileId.trim().slice(0, 8)}`,
          mimeType: manualMime.trim() || 'image/jpeg',
          sizeBytes: 0,
          visibility: uploadVisibility,
          usage: uploadUsage,
          altText: uploadAlt.trim() || manualFileName.trim(),
          ownerUid: actor.uid,
        },
        { ...actor, isAdmin: true }
      );
      setManualFileId('');
      setManualFileName('');
      setUploadAlt('');
      await onRefresh();
      onToast({
        type: 'success',
        title: 'Metadata Drive Terdaftar',
        description: 'File ID berhasil disimpan ke koleksi media Firestore.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Mendaftarkan Media',
        description: formatUserFriendlyError(err, 'Gagal menyimpan metadata media.'),
      });
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMediaByAdmin(deleteTarget.id, deleteTarget.fileName, actor);
      await onRefresh();
      setDeleteTarget(null);
      onToast({
        type: 'info',
        title: 'Metadata Media Dihapus',
        description: `Catatan "${deleteTarget.fileName}" dihapus dari Firestore.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menghapus Media',
        description: formatUserFriendlyError(err, 'Tidak dapat menghapus metadata media.'),
      });
    } finally {
      setDeleting(false);
    }
  }

  function copyProxyUrl(asset: MediaAsset) {
    const url = buildMediaProxyUrl(asset.fileId, asset.visibility);
    void navigator.clipboard?.writeText(url);
    onToast({
      type: 'info',
      title: 'URL Proxy Disalin',
      description: url,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
          Manajemen Media Google Drive
        </h2>
        <p className="text-xs sm:text-sm text-[#525252]">
          Seluruh media dilayani melalui endpoint proxy backend berdasarkan fileId dengan pemisahan
          folder publik dan berkas privat.
        </p>
      </div>

      {/* Drive Integration Status */}
      <div
        className={`p-4 border-2 border-[#171717] nb-shadow-sm rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          driveStatus?.configured ? 'bg-[#8ACCD5]/45' : 'bg-[#F3C95B]/45'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <HardDrive className="w-4 h-4 text-[#0F3D3A] mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-display font-bold text-xs sm:text-sm text-[#171717]">
              {driveStatus?.configured
                ? 'Google Drive API Terhubung (Produksi)'
                : 'Menunggu Konfigurasi Environment Google Drive API'}
            </p>
            <p className="text-xs text-[#333333]">
              {driveStatus?.message || 'Memeriksa status endpoint /api/drive/status...'}
            </p>
          </div>
        </div>
        <span className="font-mono text-[11px] font-bold px-2.5 py-1 bg-white border-2 border-[#171717] rounded-[2px] whitespace-nowrap self-start sm:self-center">
          Endpoint: /api/media/:fileId
        </span>
      </div>

      {/* Upload & Manual Registration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="nb-card p-5 h-full flex flex-col justify-between gap-3.5">
          <div className="space-y-3">
            <h3 className="font-display font-bold text-base text-[#171717]">
              Unggah Berkas ke Google Drive
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="media-vis" className="block text-xs font-bold">
                  Visibilitas
                </label>
                <select
                  id="media-vis"
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value as MediaVisibility)}
                  className="nb-input text-xs sm:text-sm"
                >
                  <option value="public">Publik (Cache aman)</option>
                  <option value="private">Privat (Auth Bearer)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="media-usage" className="block text-xs font-bold">
                  Penggunaan
                </label>
                <select
                  id="media-usage"
                  value={uploadUsage}
                  onChange={(e) => setUploadUsage(e.target.value as MediaUsage)}
                  className="nb-input text-xs sm:text-sm"
                >
                  <option value="portfolio">Portofolio</option>
                  <option value="service">Layanan</option>
                  <option value="hero">Hero / Banner</option>
                  <option value="order_attachment">Lampiran Pesanan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="media-alt" className="block text-xs font-bold">
                Teks Alternatif / Keterangan
              </label>
              <input
                id="media-alt"
                type="text"
                value={uploadAlt}
                onChange={(e) => setUploadAlt(e.target.value)}
                placeholder="Deskripsi singkat media..."
                className="nb-input text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-drive-file"
              className={`nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm w-full cursor-pointer ${
                uploading ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              <FileUp className="w-4 h-4" />
              {uploading ? 'Mengunggah ke Google Drive...' : 'Pilih & Unggah Berkas'}
            </label>
            <input
              id="admin-drive-file"
              type="file"
              accept="image/*,.pdf,.docx,.pptx"
              onChange={(e) => void handleFileUpload(e)}
              className="sr-only"
            />
          </div>
        </div>

        <form onSubmit={handleManualRegister} className="nb-card p-5 h-full flex flex-col justify-between gap-3.5">
          <div className="space-y-3">
            <h3 className="font-display font-bold text-base text-[#171717]">
              Daftarkan File ID Google Drive Eksisting
            </h3>
            <div className="space-y-1">
              <label htmlFor="manual-file-id" className="block text-xs font-bold">
                Google Drive fileId *
              </label>
              <input
                id="manual-file-id"
                type="text"
                value={manualFileId}
                onChange={(e) => setManualFileId(e.target.value)}
                placeholder="Contoh: 1A2b3C4d5E6f7G8h9I0j"
                className="nb-input font-mono text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="manual-file-name" className="block text-xs font-bold">
                  Nama Berkas *
                </label>
                <input
                  id="manual-file-name"
                  type="text"
                  value={manualFileName}
                  onChange={(e) => setManualFileName(e.target.value)}
                  placeholder="poster-kajian.jpg"
                  className="nb-input text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="manual-mime" className="block text-xs font-bold">
                  MIME Type
                </label>
                <input
                  id="manual-mime"
                  type="text"
                  value={manualMime}
                  onChange={(e) => setManualMime(e.target.value)}
                  className="nb-input font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={registering}
            className="nb-btn nb-btn-mustard px-4 py-2 text-xs sm:text-sm w-full"
          >
            {registering ? 'Menyimpan...' : 'Simpan Metadata ke Firestore'}
          </button>
        </form>
      </div>

      {/* Media List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'public', 'private'] as const).map((vis) => (
            <button
              key={vis}
              type="button"
              aria-selected={visibilityFilter === vis}
              onClick={() => setVisibilityFilter(vis)}
              className="nb-tab"
            >
              {vis === 'all' ? 'Semua Media' : vis === 'public' ? 'Publik' : 'Privat'}
            </button>
          ))}
        </div>

        <div className="nb-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs sm:text-sm text-[#525252]">
              Belum ada metadata media Google Drive yang terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F8F8E1] border-b-2 border-[#171717] text-[11px] font-display font-bold">
                    <th className="px-3.5 py-2.5">Nama & File ID</th>
                    <th className="px-3.5 py-2.5">Akses</th>
                    <th className="px-3.5 py-2.5">Penggunaan</th>
                    <th className="px-3.5 py-2.5">Ukuran</th>
                    <th className="px-3.5 py-2.5">Tanggal</th>
                    <th className="px-3.5 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171717]/15">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8F8E1]/40">
                      <td className="px-3.5 py-2.5">
                        <p className="font-semibold text-[#171717]">{item.fileName}</p>
                        <p className="font-mono text-[11px] text-[#525252]">{item.fileId}</p>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold border-2 border-[#171717] rounded-[2px] ${
                            item.visibility === 'public'
                              ? 'bg-[#8ACCD5] text-[#171717]'
                              : 'bg-[#6C151E] text-[#F8F8E1]'
                          }`}
                        >
                          {item.visibility === 'public' ? (
                            <Globe className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {item.visibility === 'public' ? 'Publik' : 'Privat'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-mono">{item.usage}</td>
                      <td className="px-3.5 py-2.5 text-xs font-mono tabular-nums whitespace-nowrap">
                        {formatFileSize(item.sizeBytes)}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#525252] whitespace-nowrap">
                        {formatDateTimeId(item.createdAt)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyProxyUrl(item)}
                            className="nb-btn nb-btn-surface px-2.5 py-1 text-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Salin URL
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={`Hapus media ${item.fileName}`}
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
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Metadata Media?"
        description={
          deleteTarget
            ? `Catatan "${deleteTarget.fileName}" (${deleteTarget.fileId}) akan dihapus dari Firestore.`
            : ''
        }
        confirmLabel="Hapus Metadata"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

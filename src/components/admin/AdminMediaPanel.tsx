import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileText,
  Film,
  FolderOpen,
  FolderSync,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Link2,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Replace,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteMediaAndCleanupReferences,
  saveCachedDriveFolders,
  saveMediaMetadata,
  updateMediaMetadataByAdmin,
} from '../../services/firestoreService';
import {
  deleteDriveMediaBackend,
  ensureDriveFoldersBackend,
  fetchDriveIntegrationStatus,
  fetchPrivateMediaBlobUrl,
  replaceDriveMediaBackend,
  updateDriveMediaBackend,
  type DriveStatusResponse,
} from '../../services/apiService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import {
  buildMediaProxyUrl,
  DRIVE_CATEGORY_FOLDER_NAMES,
  findMediaUsages,
  formatDateTimeId,
  formatFileSize,
  isImageMimeType,
  isVideoMimeType,
  MEDIA_USAGE_LABELS,
  type MediaUsageReference,
} from '../../utils/studioLogic';
import { STUDIO_IMAGES } from '../../data/initialCatalog';
import { StudioImage } from '../StudioImage';
import { AdminMediaUploader } from './AdminMediaUploader';
import type {
  DigitalProductItem,
  DriveFolderRecord,
  MediaAsset,
  MediaEntityType,
  MediaUsage,
  MediaVisibility,
  OrderItem,
  PortfolioItem,
  ServiceItem,
  SiteSettings,
} from '../../types/studio';

interface AdminMediaPanelProps {
  media: MediaAsset[];
  driveFolders: DriveFolderRecord[];
  products: DigitalProductItem[];
  services: ServiceItem[];
  portfolio: PortfolioItem[];
  orders: OrderItem[];
  siteSettings: SiteSettings;
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

const CORE_FOLDER_ORDER: Array<{ key: string; usage: MediaUsage | 'root'; label: string }> = [
  { key: 'root', usage: 'root', label: 'SYAMS CREATIVE STUDIO' },
  { key: 'cat_product', usage: 'product', label: DRIVE_CATEGORY_FOLDER_NAMES.product },
  { key: 'cat_service', usage: 'service', label: DRIVE_CATEGORY_FOLDER_NAMES.service },
  { key: 'cat_portfolio', usage: 'portfolio', label: DRIVE_CATEGORY_FOLDER_NAMES.portfolio },
  { key: 'cat_hero', usage: 'hero', label: DRIVE_CATEGORY_FOLDER_NAMES.hero },
  { key: 'cat_other', usage: 'other', label: DRIVE_CATEGORY_FOLDER_NAMES.other },
  { key: 'cat_order_attachment', usage: 'order_attachment', label: DRIVE_CATEGORY_FOLDER_NAMES.order_attachment },
];

export function AdminMediaPanel({
  media,
  driveFolders,
  products,
  services,
  portfolio,
  orders,
  siteSettings,
  actor,
  onRefresh,
  onToast,
}: AdminMediaPanelProps) {
  const [driveStatus, setDriveStatus] = useState<DriveStatusResponse | null>(null);
  const [syncingFolders, setSyncingFolders] = useState(false);
  const [showFolderTree, setShowFolderTree] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // Upload context controls
  const [uploadVisibility, setUploadVisibility] = useState<MediaVisibility>('public');
  const [uploadUsage, setUploadUsage] = useState<MediaUsage>('product');
  const [uploadAlt, setUploadAlt] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  // Manual fileId registration
  const [manualFileId, setManualFileId] = useState('');
  const [manualFileName, setManualFileName] = useState('');
  const [manualMime, setManualMime] = useState('image/jpeg');
  const [registering, setRegistering] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MediaUsage>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | MediaVisibility>('all');

  // Preview modal & private blob loading
  const [previewItem, setPreviewItem] = useState<MediaAsset | null>(null);
  const [privatePreviewUrl, setPrivatePreviewUrl] = useState<string | null>(null);
  const [loadingPrivatePreview, setLoadingPrivatePreview] = useState(false);

  // Row busy states
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [replacingItem, setReplacingItem] = useState<MediaAsset | null>(null);
  const [replacingBusyId, setReplacingBusyId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  // Safe delete dialog
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchDriveIntegrationStatus().then(setDriveStatus);
  }, []);

  // Load authenticated blob URL when previewing a private media item
  useEffect(() => {
    let revoked = false;
    let createdUrl: string | null = null;

    if (!previewItem || previewItem.visibility !== 'private') {
      setPrivatePreviewUrl(null);
      setLoadingPrivatePreview(false);
      return;
    }

    setLoadingPrivatePreview(true);
    setPrivatePreviewUrl(null);

    void fetchPrivateMediaBlobUrl(previewItem.fileId)
      .then((url) => {
        if (revoked) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setPrivatePreviewUrl(url);
      })
      .catch(() => {
        if (!revoked) {
          setPrivatePreviewUrl(null);
        }
      })
      .finally(() => {
        if (!revoked) setLoadingPrivatePreview(false);
      });

    return () => {
      revoked = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [previewItem]);

  const cachedFolderMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of driveFolders) {
      if (f.folderKey && f.folderId) {
        map[f.folderKey] = f.folderId;
      }
    }
    return map;
  }, [driveFolders]);

  const entitySubfolders = useMemo(
    () => driveFolders.filter((f) => Boolean(f.entityId)),
    [driveFolders]
  );

  // Selected entity metadata for product/service targeted uploads
  const selectedEntityInfo = useMemo(() => {
    if (!selectedEntityId) return { entityId: undefined, entityName: undefined };
    if (uploadUsage === 'product') {
      const p = products.find((item) => item.id === selectedEntityId);
      return p ? { entityId: p.id, entityName: p.title } : { entityId: undefined, entityName: undefined };
    }
    if (uploadUsage === 'service') {
      const s = services.find((item) => item.id === selectedEntityId);
      return s ? { entityId: s.id, entityName: s.title } : { entityId: undefined, entityName: undefined };
    }
    if (uploadUsage === 'portfolio') {
      const w = portfolio.find((item) => item.id === selectedEntityId);
      return w ? { entityId: w.id, entityName: w.title } : { entityId: undefined, entityName: undefined };
    }
    return { entityId: undefined, entityName: undefined };
  }, [selectedEntityId, uploadUsage, products, services, portfolio]);

  // Usage reference map by fileId for fast rendering & safe delete warnings
  const usageMap = useMemo(() => {
    const map = new Map<string, MediaUsageReference[]>();
    for (const item of media) {
      map.set(
        item.fileId,
        findMediaUsages(item.fileId, {
          products,
          services,
          portfolio,
          siteSettings,
          orders,
        })
      );
    }
    return map;
  }, [media, products, services, portfolio, siteSettings, orders]);

  const filteredMedia = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media.filter((item) => {
      if (categoryFilter !== 'all' && item.usage !== categoryFilter) return false;
      if (visibilityFilter !== 'all' && item.visibility !== visibilityFilter) return false;
      if (typeFilter === 'image' && !isImageMimeType(item.mimeType)) return false;
      if (typeFilter === 'video' && !isVideoMimeType(item.mimeType)) return false;
      if (
        typeFilter === 'document' &&
        (isImageMimeType(item.mimeType) || isVideoMimeType(item.mimeType))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.fileName.toLowerCase().includes(q) ||
        item.fileId.toLowerCase().includes(q) ||
        (item.altText || '').toLowerCase().includes(q) ||
        (item.folderPath || '').toLowerCase().includes(q) ||
        (item.entityName || '').toLowerCase().includes(q)
      );
    });
  }, [media, search, categoryFilter, typeFilter, visibilityFilter]);

  const stats = useMemo(() => {
    const images = media.filter((m) => isImageMimeType(m.mimeType)).length;
    const videos = media.filter((m) => isVideoMimeType(m.mimeType)).length;
    const pub = media.filter((m) => m.visibility === 'public').length;
    const totalBytes = media.reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
    return { images, videos, pub, priv: media.length - pub, totalBytes };
  }, [media]);

  async function handleSyncFolders() {
    setSyncingFolders(true);
    try {
      const res = await ensureDriveFoldersBackend({ cachedFolderIds: cachedFolderMap });
      await saveCachedDriveFolders(res.folders);
      await onRefresh();
      setShowFolderTree(true);
      onToast({
        type: 'success',
        title: 'Struktur Folder Google Drive Tersinkron',
        description: `${res.folders.length} folder SYAMS CREATIVE STUDIO terverifikasi dan disimpan di Firestore.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Sinkronisasi Folder Gagal',
        description: formatUserFriendlyError(
          err,
          'Pastikan kredensial Google Drive API sudah dikonfigurasi di environment server.'
        ),
      });
    } finally {
      setSyncingFolders(false);
    }
  }

  async function handleManualRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_-]{3,200}$/.test(manualFileId.trim())) {
      onToast({
        type: 'error',
        title: 'Format fileId Tidak Valid',
        description: 'Gunakan ID file Google Drive yang valid (huruf, angka, garis bawah, atau tanda hubung).',
      });
      return;
    }

    setRegistering(true);
    try {
      const resolvedEntityType: MediaEntityType =
        uploadUsage === 'product' ||
        uploadUsage === 'service' ||
        uploadUsage === 'portfolio' ||
        uploadUsage === 'hero'
          ? uploadUsage
          : 'none';

      await saveMediaMetadata(
        {
          fileId: manualFileId.trim(),
          fileName: manualFileName.trim() || `drive-asset-${manualFileId.trim().slice(0, 8)}`,
          mimeType: manualMime.trim() || 'image/jpeg',
          sizeBytes: 0,
          visibility: uploadVisibility,
          usage: uploadUsage,
          altText: uploadAlt.trim() || manualFileName.trim(),
          folderPath: `SYAMS CREATIVE STUDIO / ${DRIVE_CATEGORY_FOLDER_NAMES[uploadUsage]}`,
          entityType: resolvedEntityType,
          entityId: selectedEntityInfo.entityId,
          entityName: selectedEntityInfo.entityName,
          isPublished: uploadVisibility === 'public',
          ownerUid: actor.uid,
        },
        { ...actor, isAdmin: true }
      );
      setManualFileId('');
      setManualFileName('');
      setUploadAlt('');
      setShowManualForm(false);
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

  async function handleToggleVisibility(asset: MediaAsset) {
    const nextVisibility: MediaVisibility = asset.visibility === 'public' ? 'private' : 'public';
    setTogglingVisibilityId(asset.id);
    try {
      await updateDriveMediaBackend({
        fileId: asset.fileId,
        visibility: nextVisibility,
      });
      await updateMediaMetadataByAdmin(
        asset.id,
        {
          visibility: nextVisibility,
          isPublished: nextVisibility === 'public',
        },
        actor
      );
      await onRefresh();
      if (previewItem?.id === asset.id) {
        setPreviewItem({ ...asset, visibility: nextVisibility, isPublished: nextVisibility === 'public' });
      }
      onToast({
        type: 'success',
        title: nextVisibility === 'public' ? 'Akses Diubah ke Publik' : 'Akses Diubah ke Privat',
        description: `Izin berkas "${asset.fileName}" diperbarui di Google Drive & Firestore.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Mengubah Visibilitas Media',
        description: formatUserFriendlyError(
          err,
          'Tidak dapat memperbarui izin file pada Google Drive.'
        ),
      });
    } finally {
      setTogglingVisibilityId(null);
    }
  }

  function triggerReplaceFile(asset: MediaAsset) {
    setReplacingItem(asset);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  }

  async function handleReplaceFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = replacingItem;
    if (!file || !target) return;

    setReplacingBusyId(target.id);
    try {
      const replaced = await replaceDriveMediaBackend({
        fileId: target.fileId,
        file,
        visibility: target.visibility,
      });
      await updateMediaMetadataByAdmin(
        target.id,
        {
          fileName: replaced.fileName,
          mimeType: replaced.mimeType,
          sizeBytes: replaced.sizeBytes,
        },
        actor
      );
      await onRefresh();
      onToast({
        type: 'success',
        title: 'Berkas Media Berhasil Diganti',
        description: `"${replaced.fileName}" menggantikan isi fileId ${target.fileId}. Seluruh referensi tetap terhubung.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Mengganti Berkas',
        description: formatUserFriendlyError(err, 'Gagal memperbarui isi berkas di Google Drive.'),
      });
    } finally {
      setReplacingBusyId(null);
      setReplacingItem(null);
      e.target.value = '';
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const targetUsages = usageMap.get(deleteTarget.fileId) || [];
    setDeleting(true);
    try {
      // Step 1: Delete from Google Drive FIRST for strict Drive <-> Firestore consistency
      const driveResult = await deleteDriveMediaBackend(deleteTarget.fileId);

      // Step 2: Clean up Firestore active references & delete media metadata atomically
      await deleteMediaAndCleanupReferences({
        mediaId: deleteTarget.id,
        fileId: deleteTarget.fileId,
        fileName: deleteTarget.fileName,
        usages: targetUsages,
        products,
        services,
        portfolio,
        siteSettings,
        actor,
      });

      await onRefresh();
      if (previewItem?.id === deleteTarget.id) {
        setPreviewItem(null);
      }
      setDeleteTarget(null);
      onToast({
        type: 'info',
        title: 'Media Dihapus dari Google Drive & Firestore',
        description: driveResult.alreadyMissing
          ? `Berkas sudah tidak ada di Drive; metadata "${deleteTarget.fileName}" dan ${targetUsages.length} referensi dibersihkan.`
          : `"${deleteTarget.fileName}" berhasil dihapus beserta ${targetUsages.length} referensi aktif.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Penghapusan Media Dibatalkan',
        description: formatUserFriendlyError(
          err,
          'Gagal menghapus berkas di Google Drive sehingga metadata Firestore dipertahankan demi konsistensi.'
        ),
      });
    } finally {
      setDeleting(false);
    }
  }

  function copyText(value: string, label: string) {
    void navigator.clipboard?.writeText(value);
    onToast({
      type: 'info',
      title: `${label} Disalin`,
      description: value,
    });
  }

  const deleteUsages = deleteTarget ? usageMap.get(deleteTarget.fileId) || [] : [];

  return (
    <div className="space-y-4">
      {/* Hidden input for in-place file replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.docx,.pptx"
        onChange={(e) => void handleReplaceFileSelected(e)}
        className="sr-only"
      />

      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
            Media Library &amp; Google Drive Manager
          </h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            {media.length} berkas ({stats.images} gambar · {stats.videos} video · {stats.pub} publik ·{' '}
            {stats.priv} privat · {formatFileSize(stats.totalBytes)}) dikelola melalui backend Google Drive API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={syncingFolders}
            onClick={() => void handleSyncFolders()}
            className="nb-btn nb-btn-primary px-3 py-1.5 text-xs"
          >
            <FolderSync className={`w-3.5 h-3.5 ${syncingFolders ? 'animate-spin' : ''}`} />
            {syncingFolders ? 'Menyinkronkan...' : 'Sinkronkan Folder Drive'}
          </button>
          <button
            type="button"
            onClick={() => setShowManualForm((v) => !v)}
            className="nb-btn nb-btn-surface px-3 py-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Daftarkan File ID
          </button>
        </div>
      </div>

      {/* Drive Integration Status & Folder Hierarchy Drawer */}
      <div className="nb-card overflow-hidden">
        <div
          className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            driveStatus?.configured ? 'bg-[#8ACCD5]/40' : 'bg-[#F3C95B]/40'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <HardDrive className="w-4 h-4 text-[#0F3D3A] mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-display font-bold text-xs sm:text-sm text-[#171717]">
                {driveStatus?.configured
                  ? 'Google Drive API Terhubung (OAuth2 Backend Netlify/Express)'
                  : 'Menunggu Kredensial Environment Google Drive API'}
              </p>
              <p className="text-xs text-[#333333]">
                {driveStatus?.message || 'Memeriksa status endpoint /api/drive/status...'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFolderTree((v) => !v)}
            className="nb-btn nb-btn-surface px-2.5 py-1.5 text-xs self-start sm:self-center shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Struktur Folder ({driveFolders.length})
            {showFolderTree ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showFolderTree && (
          <div className="p-4 bg-white border-t-2 border-[#171717] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-display font-bold text-[#171717]">
                Hierarki Otomatis: SYAMS CREATIVE STUDIO (Tersimpan di Firestore /drive_folders)
              </p>
              <span className="font-mono text-[10px] text-[#525252]">
                Subfolder entitas menggunakan ID unik agar aman saat judul diubah
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {CORE_FOLDER_ORDER.map((item) => {
                const cachedId = cachedFolderMap[item.key];
                return (
                  <div
                    key={item.key}
                    className={`p-2.5 border-2 border-[#171717] rounded-[4px] ${
                      item.key === 'root' ? 'bg-[#0F3D3A] text-[#F8F8E1]' : 'bg-[#F8F8E1]/70 text-[#171717]'
                    }`}
                  >
                    <p className="text-xs font-display font-bold truncate">{item.label}</p>
                    <p
                      className={`font-mono text-[10px] truncate mt-0.5 ${
                        item.key === 'root' ? 'text-[#F3C95B]' : 'text-[#525252]'
                      }`}
                    >
                      {cachedId ? `ID: ${cachedId}` : 'Dibuat otomatis saat sinkron/unggah'}
                    </p>
                  </div>
                );
              })}
            </div>

            {entitySubfolders.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#171717]/15">
                <p className="text-[11px] font-bold text-[#525252]">
                  Subfolder Entitas Terdaftar ({entitySubfolders.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entitySubfolders.map((sf) => (
                    <span
                      key={sf.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F8F8E1] border border-[#171717] rounded-[2px] font-mono text-[10px]"
                    >
                      <FolderOpen className="w-3 h-3 text-[#0F3D3A]" />
                      {sf.folderPath}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="nb-card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-[#171717]/15">
          <div>
            <h3 className="font-display font-bold text-sm sm:text-base text-[#171717]">
              Unggah Gambar, Video, &amp; Dokumentasi ke Google Drive
            </h3>
            <p className="text-[11px] text-[#525252]">
              Pilih kategori folder tujuan, visibilitas, lalu tarik &amp; lepas berkas (mendukung unggah multi-file &amp; video hingga 50 MB).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label htmlFor="media-usage" className="block text-xs font-bold">
              Kategori / Folder Tujuan
            </label>
            <select
              id="media-usage"
              value={uploadUsage}
              onChange={(e) => {
                setUploadUsage(e.target.value as MediaUsage);
                setSelectedEntityId('');
              }}
              className="nb-input text-xs sm:text-sm"
            >
              {(Object.keys(MEDIA_USAGE_LABELS) as MediaUsage[]).map((k) => (
                <option key={k} value={k}>
                  {MEDIA_USAGE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="media-vis" className="block text-xs font-bold">
              Visibilitas Akses
            </label>
            <select
              id="media-vis"
              value={uploadVisibility}
              onChange={(e) => setUploadVisibility(e.target.value as MediaVisibility)}
              className="nb-input text-xs sm:text-sm"
            >
              <option value="public">Publik (Tampil di Website)</option>
              <option value="private">Privat (Hanya Admin &amp; Pemilik)</option>
            </select>
          </div>

          {(uploadUsage === 'product' || uploadUsage === 'service' || uploadUsage === 'portfolio') && (
            <div className="space-y-1">
              <label htmlFor="media-entity" className="block text-xs font-bold">
                Subfolder Entitas (Opsional)
              </label>
              <select
                id="media-entity"
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="nb-input text-xs sm:text-sm"
              >
                <option value="">Folder Kategori Utama</option>
                {uploadUsage === 'product' &&
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                {uploadUsage === 'service' &&
                  services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                {uploadUsage === 'portfolio' &&
                  portfolio.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="media-alt" className="block text-xs font-bold">
              Keterangan / Alt Text
            </label>
            <input
              id="media-alt"
              type="text"
              value={uploadAlt}
              onChange={(e) => setUploadAlt(e.target.value)}
              placeholder="Deskripsi singkat media..."
              className="nb-input text-xs sm:text-sm"
            />
          </div>
        </div>

        <AdminMediaUploader
          usage={uploadUsage}
          visibility={uploadVisibility}
          entityType={
            uploadUsage === 'product' ||
            uploadUsage === 'service' ||
            uploadUsage === 'portfolio' ||
            uploadUsage === 'hero'
              ? uploadUsage
              : 'none'
          }
          entityId={selectedEntityInfo.entityId}
          entityName={selectedEntityInfo.entityName}
          altText={uploadAlt}
          allowMultiple
          allowVideos
          allowDocuments
          driveFolders={driveFolders}
          actor={actor}
          onUploaded={async () => {
            setUploadAlt('');
            await onRefresh();
          }}
          onToast={onToast}
        />
      </div>

      {/* Optional Manual Registration Drawer */}
      {showManualForm && (
        <form onSubmit={handleManualRegister} className="nb-card p-4 space-y-3 bg-[#F8F8E1]/60">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-sm text-[#171717]">
              Daftarkan File ID Google Drive Eksisting
            </h3>
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="text-xs font-bold text-[#6C151E] cursor-pointer"
            >
              Tutup
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="manual-file-id" className="block text-xs font-bold">
                Google Drive fileId *
              </label>
              <input
                id="manual-file-id"
                type="text"
                value={manualFileId}
                onChange={(e) => setManualFileId(e.target.value)}
                placeholder="1A2b3C4d5E6f7G8h9I0j"
                className="nb-input font-mono text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="manual-file-name" className="block text-xs font-bold">
                Nama Berkas *
              </label>
              <input
                id="manual-file-name"
                type="text"
                value={manualFileName}
                onChange={(e) => setManualFileName(e.target.value)}
                placeholder="banner-utama.webp"
                className="nb-input text-xs"
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
                className="nb-input font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={registering}
              className="nb-btn nb-btn-mustard px-4 py-1.5 text-xs"
            >
              {registering ? 'Menyimpan...' : 'Simpan Metadata ke Firestore'}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Toolbar */}
      <div className="nb-card p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#525252] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama file, fileId, folder, atau produk..."
            className="nb-input nb-input-compact pl-8"
            aria-label="Cari media di Media Library"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | MediaUsage)}
            className="nb-input nb-input-compact w-auto"
            aria-label="Filter kategori folder media"
          >
            <option value="all">Semua Folder</option>
            {(Object.keys(MEDIA_USAGE_LABELS) as MediaUsage[]).map((k) => (
              <option key={k} value={k}>
                {MEDIA_USAGE_LABELS[k]}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | 'image' | 'video' | 'document')
            }
            className="nb-input nb-input-compact w-auto"
            aria-label="Filter tipe media"
          >
            <option value="all">Semua Tipe</option>
            <option value="image">Gambar</option>
            <option value="video">Video</option>
            <option value="document">Dokumen</option>
          </select>

          <div className="flex items-center gap-1" role="tablist" aria-label="Filter visibilitas media">
            {(
              [
                ['all', 'Semua'],
                ['public', 'Publik'],
                ['private', 'Privat'],
              ] as const
            ).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                role="tab"
                aria-selected={visibilityFilter === val}
                onClick={() => setVisibilityFilter(val)}
                className="nb-tab text-xs py-1 px-2.5"
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Media Library Grid */}
      {filteredMedia.length === 0 ? (
        <div className="nb-card p-8 text-center space-y-2">
          <p className="font-display font-bold text-sm text-[#171717]">
            {media.length === 0
              ? 'Belum ada media tersimpan di Media Library'
              : 'Tidak ada media yang cocok dengan filter'}
          </p>
          <p className="text-xs text-[#525252]">
            {media.length === 0
              ? 'Unggah gambar atau video melalui panel di atas agar otomatis tersimpan di Google Drive dan Firestore.'
              : 'Ubah kata kunci pencarian atau pilih kategori folder lain.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
          {filteredMedia.map((item) => {
            const isImg = isImageMimeType(item.mimeType);
            const isVid = isVideoMimeType(item.mimeType);
            const usages = usageMap.get(item.fileId) || [];
            const proxyUrl = buildMediaProxyUrl(item.fileId, item.visibility);
            const isToggling = togglingVisibilityId === item.id;
            const isReplacing = replacingBusyId === item.id;

            return (
              <article
                key={item.id}
                className="nb-card overflow-hidden flex flex-col justify-between bg-white"
              >
                {/* Visual Thumbnail */}
                <div>
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="relative w-full aspect-[16/10] bg-[#171717] border-b-2 border-[#171717] overflow-hidden flex items-center justify-center group cursor-pointer"
                  >
                    {item.visibility === 'private' ? (
                      <div className="flex flex-col items-center gap-1 text-[#F8F8E1]">
                        <Lock className="w-6 h-6 text-[#F3C95B]" />
                        <span className="font-mono text-[10px]">BERKAS PRIVAT · KLIK PRATINJAU</span>
                      </div>
                    ) : isImg ? (
                      <StudioImage
                        src={STUDIO_IMAGES.hero}
                        driveFileId={item.fileId}
                        alt={item.altText || item.fileName}
                        aspectClass="w-full h-full"
                        className="group-hover:scale-[1.03]"
                      />
                    ) : isVid ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-[#0F3D3A]">
                        <video
                          src={proxyUrl}
                          muted
                          preload="metadata"
                          playsInline
                          className="w-full h-full object-cover opacity-80"
                        />
                        <span className="absolute w-9 h-9 bg-[#F3C95B] text-[#171717] border-2 border-[#171717] rounded-[4px] flex items-center justify-center">
                          <Play className="w-4 h-4 fill-current" />
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#F8F8E1]">
                        <FileText className="w-6 h-6 text-[#8ACCD5]" />
                        <span className="font-mono text-[10px]">{item.mimeType}</span>
                      </div>
                    )}

                    {/* Top badges */}
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#171717] text-[#F8F8E1] font-mono text-[9px] font-bold rounded-[2px] inline-flex items-center gap-1">
                      {isImg ? (
                        <ImageIcon className="w-2.5 h-2.5 text-[#8ACCD5]" />
                      ) : isVid ? (
                        <Film className="w-2.5 h-2.5 text-[#F3C95B]" />
                      ) : (
                        <FileText className="w-2.5 h-2.5 text-[#8ACCD5]" />
                      )}
                      {isImg ? 'IMG' : isVid ? 'VID' : 'DOC'}
                    </span>

                    {usages.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-[#F3C95B] text-[#171717] border border-[#171717] font-mono text-[9px] font-bold rounded-[2px] inline-flex items-center gap-0.5">
                        <Link2 className="w-2.5 h-2.5" />
                        Dipakai ({usages.length})
                      </span>
                    )}
                  </button>

                  {/* Metadata */}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="font-display font-bold text-xs text-[#171717] line-clamp-1"
                        title={item.fileName}
                      >
                        {item.fileName}
                      </p>
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => void handleToggleVisibility(item)}
                        title="Klik untuk mengubah akses Publik/Privat di Google Drive"
                        className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold border border-[#171717] rounded-[2px] cursor-pointer ${
                          item.visibility === 'public'
                            ? 'bg-[#8ACCD5] text-[#171717]'
                            : 'bg-[#6C151E] text-[#F8F8E1]'
                        }`}
                      >
                        {item.visibility === 'public' ? (
                          <Globe className="w-2.5 h-2.5" />
                        ) : (
                          <Lock className="w-2.5 h-2.5" />
                        )}
                        {isToggling
                          ? '...'
                          : item.visibility === 'public'
                            ? 'Publik'
                            : 'Privat'}
                      </button>
                    </div>

                    <p className="text-[11px] font-mono text-[#0F3D3A] truncate">
                      {MEDIA_USAGE_LABELS[item.usage]}
                      {item.entityName ? ` · ${item.entityName}` : ''}
                    </p>

                    <p className="text-[10px] font-mono text-[#525252] truncate" title={item.folderPath}>
                      {item.folderPath || `SYAMS CREATIVE STUDIO / ${DRIVE_CATEGORY_FOLDER_NAMES[item.usage]}`}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#525252] pt-0.5">
                      <span>{formatFileSize(item.sizeBytes)}</span>
                      <span>{formatDateTimeId(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="px-3 py-2 bg-[#F8F8E1]/70 border-t border-[#171717]/15 flex items-center justify-between gap-1">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      title="Pratinjau & detail lengkap"
                      className="nb-btn nb-btn-surface px-2 py-1 text-[11px]"
                    >
                      <Eye className="w-3 h-3" />
                      Lihat
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(proxyUrl, 'URL Proxy')}
                      title="Salin URL media proxy"
                      className="nb-btn nb-btn-surface p-1"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isReplacing}
                      onClick={() => triggerReplaceFile(item)}
                      title="Ganti isi berkas di Google Drive (fileId tetap sama)"
                      className="nb-btn nb-btn-mustard p-1"
                    >
                      {isReplacing ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Replace className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Hapus media ${item.fileName}`}
                    title="Hapus dari Google Drive & Firestore"
                    className="nb-btn nb-btn-surface p-1 text-[#6C151E]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Full Preview & Metadata Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-[#171717]/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Detail media ${previewItem.fileName}`}
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="nb-card max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 px-4 py-2.5 bg-[#F8F8E1] border-b-2 border-[#171717] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-[#171717] truncate">
                  {previewItem.fileName}
                </p>
                <p className="font-mono text-[10px] text-[#525252] truncate">
                  {previewItem.folderPath || `SYAMS CREATIVE STUDIO / ${DRIVE_CATEGORY_FOLDER_NAMES[previewItem.usage]}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                aria-label="Tutup modal detail media"
                className="nb-btn nb-btn-surface p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#171717] flex items-center justify-center min-h-[220px] max-h-[58vh] overflow-hidden">
              {previewItem.visibility === 'private' && loadingPrivatePreview ? (
                <p className="text-xs font-mono text-[#F3C95B] p-6">
                  Memuat berkas privat terautentikasi dari Google Drive...
                </p>
              ) : isVideoMimeType(previewItem.mimeType) ? (
                <video
                  src={
                    previewItem.visibility === 'private'
                      ? privatePreviewUrl || undefined
                      : buildMediaProxyUrl(previewItem.fileId, 'public')
                  }
                  controls
                  playsInline
                  className="max-h-[58vh] w-full object-contain"
                />
              ) : isImageMimeType(previewItem.mimeType) ? (
                <img
                  src={
                    previewItem.visibility === 'private'
                      ? privatePreviewUrl || STUDIO_IMAGES.hero
                      : buildMediaProxyUrl(previewItem.fileId, 'public')
                  }
                  alt={previewItem.altText || previewItem.fileName}
                  className="max-h-[58vh] w-auto object-contain"
                />
              ) : (
                <div className="p-8 text-center text-[#F8F8E1] space-y-2">
                  <FileText className="w-10 h-10 text-[#8ACCD5] mx-auto" />
                  <p className="text-xs font-mono">{previewItem.mimeType}</p>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-[#F8F8E1] border border-[#171717] rounded-[4px]">
                  <p className="text-[10px] text-[#525252]">Kategori</p>
                  <p className="font-bold">{MEDIA_USAGE_LABELS[previewItem.usage]}</p>
                </div>
                <div className="p-2.5 bg-[#F8F8E1] border border-[#171717] rounded-[4px]">
                  <p className="text-[10px] text-[#525252]">Ukuran / MIME</p>
                  <p className="font-mono font-bold truncate">
                    {formatFileSize(previewItem.sizeBytes)} · {previewItem.mimeType}
                  </p>
                </div>
                <div className="p-2.5 bg-[#F8F8E1] border border-[#171717] rounded-[4px]">
                  <p className="text-[10px] text-[#525252]">Visibilitas</p>
                  <p className="font-bold">
                    {previewItem.visibility === 'public' ? 'Publik (Website)' : 'Privat (Auth)'}
                  </p>
                </div>
                <div className="p-2.5 bg-[#F8F8E1] border border-[#171717] rounded-[4px]">
                  <p className="text-[10px] text-[#525252]">Tanggal Unggah</p>
                  <p className="font-mono font-bold">{formatDateTimeId(previewItem.createdAt)}</p>
                </div>
              </div>

              <div className="p-2.5 bg-[#F8F8E1]/60 border border-[#171717]/30 rounded-[4px] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[11px] break-all">
                  File ID: <strong>{previewItem.fileId}</strong>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyText(previewItem.fileId, 'Google Drive File ID')}
                    className="nb-btn nb-btn-surface px-2.5 py-1 text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    Salin File ID
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        buildMediaProxyUrl(previewItem.fileId, previewItem.visibility),
                        'URL Proxy'
                      )
                    }
                    className="nb-btn nb-btn-mustard px-2.5 py-1 text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    Salin URL Media
                  </button>
                </div>
              </div>

              {/* Active References */}
              {(usageMap.get(previewItem.fileId) || []).length > 0 && (
                <div className="p-3 bg-[#8ACCD5]/25 border-2 border-[#171717] rounded-[4px] space-y-1.5">
                  <p className="text-xs font-display font-bold text-[#0F3D3A]">
                    Sedang Digunakan Pada ({(usageMap.get(previewItem.fileId) || []).length}):
                  </p>
                  <ul className="space-y-1 text-xs">
                    {(usageMap.get(previewItem.fileId) || []).map((ref, idx) => (
                      <li key={`${ref.entityType}-${ref.entityId}-${idx}`} className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-white border border-[#171717] font-mono text-[10px] rounded-[2px]">
                          {ref.role === 'primary'
                            ? 'Utama'
                            : ref.role === 'gallery'
                              ? 'Galeri'
                              : ref.role === 'banner'
                                ? 'Hero'
                                : 'Pesanan'}
                        </span>
                        <span className="font-medium text-[#171717]">{ref.entityTitle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation Modal with Active Reference Warnings */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-[#171717]/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-media-title"
        >
          <div className="nb-card max-w-lg w-full bg-[#F8F8E1] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-[#6C151E] text-[#F8F8E1] border-2 border-[#171717] rounded-[4px] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3
                  id="delete-media-title"
                  className="font-display font-bold text-base text-[#171717]"
                >
                  Hapus Media dari Google Drive &amp; Firestore?
                </h3>
                <p className="text-xs text-[#404040] leading-relaxed">
                  Berkas <strong>&ldquo;{deleteTarget.fileName}&rdquo;</strong> (
                  <code className="font-mono text-[11px]">{deleteTarget.fileId}</code>) akan dihapus
                  secara permanen dari Google Drive sekaligus metadata-nya di Firestore.
                </p>
              </div>
            </div>

            {deleteUsages.length > 0 && (
              <div className="p-3 bg-[#F3C95B]/60 border-2 border-[#171717] rounded-[4px] space-y-1.5">
                <p className="text-xs font-display font-bold text-[#6C151E]">
                  Peringatan: Media ini sedang digunakan oleh {deleteUsages.length} konten aktif!
                </p>
                <p className="text-[11px] text-[#171717]">
                  Jika dilanjutkan, referensi media pada konten berikut akan dibersihkan otomatis agar
                  tidak menimbulkan gambar rusak:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-[#171717] max-h-32 overflow-y-auto">
                  {deleteUsages.map((u, idx) => (
                    <li key={`${u.entityId}-${idx}`}>
                      <strong>{u.entityTitle}</strong> (
                      {u.role === 'primary'
                        ? 'Gambar Utama'
                        : u.role === 'gallery'
                          ? 'Galeri'
                          : u.role === 'banner'
                            ? 'Banner Hero'
                            : 'Lampiran Pesanan'}
                      )
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="nb-btn nb-btn-surface px-3.5 py-2 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="nb-btn nb-btn-burgundy px-4 py-2 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting
                  ? 'Menghapus...'
                  : deleteUsages.length > 0
                    ? 'Hapus & Bersihkan Referensi'
                    : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

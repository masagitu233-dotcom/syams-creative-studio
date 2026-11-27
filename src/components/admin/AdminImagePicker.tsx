import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  FileUp,
  Film,
  HardDrive,
  Image as ImageIcon,
  Images,
  Link2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { STUDIO_IMAGES } from '../../data/initialCatalog';
import { PRODUCT_IMAGES } from '../../data/digitalProducts';
import {
  appendMediaCacheVersion,
  buildMediaProxyUrl,
  extractDriveFileId,
  extractMediaCacheVersion,
  isImageMimeType,
  isPublicPublishedMediaAsset,
  isVideoMimeType,
  MEDIA_USAGE_LABELS,
  promoteGalleryItemToPrimary,
  reorderGalleryItems,
} from '../../utils/studioLogic';
import { clearMediaProbeCache } from '../../utils/mediaDiagnostics';
import { StudioImage } from '../StudioImage';
import { AdminMediaUploader, type UploadedMediaSummary } from './AdminMediaUploader';
import type {
  DriveFolderRecord,
  MediaAsset,
  MediaGalleryItem,
  MediaUsage,
} from '../../types/studio';

interface AdminImagePickerProps {
  imageUrl: string;
  driveFileId: string;
  savedImageUrl?: string;
  savedDriveFileId?: string;
  savedGallery?: MediaGalleryItem[];
  entityKey?: string;
  entityPublished?: boolean;
  allowEmpty?: boolean;
  emptyHint?: string;
  onRestoreDefault?: () => void;
  restoreDefaultLabel?: string;
  usage: Extract<MediaUsage, 'product' | 'service' | 'portfolio' | 'hero'>;
  media: MediaAsset[];
  driveFolders?: DriveFolderRecord[];
  entityId?: string;
  entityName?: string;
  gallery?: MediaGalleryItem[];
  onGalleryChange?: (next: MediaGalleryItem[]) => void;
  actor: { uid: string; email: string };
  onChange: (next: { imageUrl: string; driveFileId: string }) => void;
  onMediaUploaded?: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
  label?: string;
}

const CURATED_STUDIO_GALLERY: { label: string; url: string }[] = [
  { label: 'Banner Utama', url: STUDIO_IMAGES.hero },
  { label: 'Template PPT', url: PRODUCT_IMAGES.pptDeck },
  { label: 'Paket Poster', url: PRODUCT_IMAGES.posterPack },
  { label: 'Web & UI Kit', url: PRODUCT_IMAGES.webKit },
  { label: 'Video & Naskah', url: PRODUCT_IMAGES.scriptVideo },
  { label: 'Layanan Web', url: STUDIO_IMAGES.webApp },
  { label: 'Layanan Video', url: STUDIO_IMAGES.video },
  { label: 'Layanan Poster', url: STUDIO_IMAGES.poster },
  { label: 'Layanan PPT', url: STUDIO_IMAGES.ppt },
  { label: 'Layanan Naskah', url: STUDIO_IMAGES.speech },
];

type PickerMode = 'upload' | 'drive' | 'gallery' | 'url';

export function AdminImagePicker({
  imageUrl,
  driveFileId,
  savedImageUrl,
  savedDriveFileId,
  savedGallery,
  entityKey,
  entityPublished = true,
  allowEmpty = false,
  emptyHint,
  onRestoreDefault,
  restoreDefaultLabel = 'Pakai Bawaan',
  usage,
  media,
  driveFolders = [],
  entityId,
  entityName,
  gallery,
  onGalleryChange,
  actor,
  onChange,
  onMediaUploaded,
  onToast,
  label = 'Gambar Utama & Media Google Drive',
}: AdminImagePickerProps) {
  const [mode, setMode] = useState<PickerMode>('upload');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState<MediaUsage | 'all'>('all');
  const [galleryPickerOpen, setGalleryPickerOpen] = useState<'none' | 'upload' | 'library'>('none');
  const [previewRetryKey, setPreviewRetryKey] = useState(0);
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const cleanImageUrl = (imageUrl || '').trim();
  const cleanDriveFileId = (driveFileId || '').trim();
  const hasThumbnail = Boolean(cleanImageUrl || cleanDriveFileId);

  const hasSavedBaseline =
    savedImageUrl !== undefined || savedDriveFileId !== undefined;
  const baselineImageUrl = (savedImageUrl ?? '').trim();
  const baselineDriveFileId = (savedDriveFileId ?? '').trim();
  const hasSavedThumbnail = Boolean(baselineImageUrl || baselineDriveFileId);

  const isPrimaryChanged =
    hasSavedBaseline &&
    (cleanImageUrl !== baselineImageUrl || cleanDriveFileId !== baselineDriveFileId);

  const isGalleryChanged = useMemo(() => {
    if (!hasSavedBaseline || savedGallery === undefined) return false;
    return JSON.stringify(gallery || []) !== JSON.stringify(savedGallery || []);
  }, [hasSavedBaseline, savedGallery, gallery]);

  const hasUnsavedMediaChanges = isPrimaryChanged || isGalleryChanged;

  const lastValidRef = useRef<{ imageUrl: string; driveFileId: string } | null>(
    hasSavedThumbnail
      ? { imageUrl: baselineImageUrl, driveFileId: baselineDriveFileId }
      : hasThumbnail
        ? { imageUrl: cleanImageUrl, driveFileId: cleanDriveFileId }
        : null
  );

  useEffect(() => {
    lastValidRef.current = hasSavedThumbnail
      ? { imageUrl: baselineImageUrl, driveFileId: baselineDriveFileId }
      : null;
    setPreviewModalOpen(false);
    setPreviewStatus('loading');
  }, [entityKey, baselineImageUrl, baselineDriveFileId, hasSavedThumbnail]);

  const activeCacheVersion = useMemo(
    () => extractMediaCacheVersion(cleanImageUrl) || undefined,
    [cleanImageUrl]
  );

  const publicPublishedMediaCount = useMemo(
    () =>
      media.filter(
        (m) => isPublicPublishedMediaAsset(m) && isImageMimeType(m.mimeType)
      ).length,
    [media]
  );

  const publicMedia = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return media.filter((m) => {
      if (!isPublicPublishedMediaAsset(m)) return false;
      if (libraryCategory !== 'all' && m.usage !== libraryCategory) return false;
      if (!q) return true;
      return (
        m.fileName.toLowerCase().includes(q) ||
        (m.altText || '').toLowerCase().includes(q) ||
        (m.folderPath || '').toLowerCase().includes(q) ||
        (m.entityName || '').toLowerCase().includes(q)
      );
    });
  }, [media, librarySearch, libraryCategory]);

  const publicDriveImages = useMemo(
    () => publicMedia.filter((m) => isImageMimeType(m.mimeType)),
    [publicMedia]
  );

  async function handlePrimaryUploaded(uploaded: UploadedMediaSummary[]) {
    const first = uploaded[0];
    if (first) {
      const versionTs = Date.now();
      const versionedProxy =
        buildMediaProxyUrl(first.fileId, 'public', versionTs) ||
        appendMediaCacheVersion(first.proxyUrl, versionTs) ||
        imageUrl;
      clearMediaProbeCache(buildMediaProxyUrl(first.fileId, 'public'));
      onChange({
        imageUrl: versionedProxy,
        driveFileId: first.fileId,
      });
      setPreviewRetryKey((k) => k + 1);
    }
    if (onMediaUploaded) {
      await onMediaUploaded();
    }
  }

  async function handleGalleryUploaded(uploaded: UploadedMediaSummary[]) {
    if (!onGalleryChange) return;
    const current = gallery || [];
    const versionTs = Date.now();
    const additions: MediaGalleryItem[] = uploaded
      .filter((u) => !current.some((g) => g.fileId === u.fileId))
      .map((u) => ({
        fileId: u.fileId,
        fileName: u.fileName,
        mimeType: u.mimeType,
        caption: u.fileName.replace(/\.[^.]+$/, ''),
        imageUrl:
          buildMediaProxyUrl(u.fileId, 'public', versionTs) ||
          appendMediaCacheVersion(u.proxyUrl, versionTs),
      }));
    if (additions.length > 0) {
      onGalleryChange([...current, ...additions].slice(0, 12));
    }
    if (onMediaUploaded) {
      await onMediaUploaded();
    }
  }

  function handleAddFromLibraryToGallery(asset: MediaAsset) {
    if (!onGalleryChange) return;
    const current = gallery || [];
    if (current.some((g) => g.fileId === asset.fileId)) {
      onToast({
        type: 'info',
        title: 'Media Sudah Ada di Galeri',
        description: `"${asset.fileName}" sudah terpasang di dokumentasi ini.`,
      });
      return;
    }
    if (current.length >= 12) {
      onToast({
        type: 'error',
        title: 'Batas Maksimum Galeri Tercapai',
        description: 'Maksimal 12 foto/video dokumentasi per entitas.',
      });
      return;
    }
    onGalleryChange([
      ...current,
      {
        fileId: asset.fileId,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        caption: asset.altText || asset.fileName.replace(/\.[^.]+$/, ''),
        imageUrl: buildMediaProxyUrl(asset.fileId, 'public', asset.updatedAt || Date.now()),
      },
    ]);
    onToast({
      type: 'success',
      title: 'Media Ditambahkan ke Galeri',
      description: `"${asset.fileName}" ditautkan tanpa perlu unggah ulang.`,
    });
  }

  function handlePromoteToPrimary(index: number) {
    if (!onGalleryChange || !gallery) return;
    const result = promoteGalleryItemToPrimary(
      { imageUrl, driveFileId: driveFileId || undefined },
      gallery,
      index
    );
    const versionedUrl = result.driveFileId
      ? appendMediaCacheVersion(result.imageUrl, Date.now())
      : result.imageUrl;
    onChange({
      imageUrl: versionedUrl,
      driveFileId: result.driveFileId || '',
    });
    onGalleryChange(result.gallery);
    setPreviewRetryKey((k) => k + 1);
    onToast({
      type: 'success',
      title: 'Gambar Utama Diperbarui',
      description: 'Foto dokumentasi dipromosikan menjadi thumbnail utama.',
    });
  }

  function handleMoveGallery(from: number, to: number) {
    if (!onGalleryChange || !gallery) return;
    onGalleryChange(reorderGalleryItems(gallery, from, to));
  }

  function handleRemoveGalleryItem(index: number) {
    if (!onGalleryChange || !gallery) return;
    onGalleryChange(gallery.filter((_, idx) => idx !== index));
    onToast({
      type: 'info',
      title: 'Item Dilepas dari Galeri',
      description: 'Berkas asli tetap aman di Google Drive & Media Library.',
    });
  }

  function handleGalleryCaption(index: number, caption: string) {
    if (!onGalleryChange || !gallery) return;
    onGalleryChange(
      gallery.map((item, idx) => (idx === index ? { ...item, caption } : item))
    );
  }

  function handleDetachThumbnail() {
    onChange({ imageUrl: '', driveFileId: '' });
    setPreviewStatus('loading');
    onToast({
      type: 'info',
      title: 'Thumbnail Dilepas dari Konten',
      description: allowEmpty
        ? 'Banner dikosongkan untuk entri ini. Berkas asli di Google Drive tetap aman.'
        : 'Pilih atau unggah thumbnail baru sebelum menyimpan perubahan. Berkas asli di Google Drive tetap aman.',
    });
  }

  function handleRevertChanges() {
    onChange({
      imageUrl: baselineImageUrl,
      driveFileId: baselineDriveFileId,
    });
    if (onGalleryChange && savedGallery !== undefined) {
      onGalleryChange(savedGallery);
    }
    setPreviewRetryKey((k) => k + 1);
    onToast({
      type: 'info',
      title: 'Perubahan Gambar Dibatalkan',
      description: 'Thumbnail dan galeri dikembalikan ke versi terakhir yang tersimpan.',
    });
  }

  function handleRecoverPreviousValid() {
    const prev = lastValidRef.current;
    if (!prev) return;
    onChange({
      imageUrl: prev.imageUrl,
      driveFileId: prev.driveFileId,
    });
    setPreviewRetryKey((k) => k + 1);
    onToast({
      type: 'info',
      title: 'Thumbnail Sebelumnya Dipulihkan',
      description: 'Referensi gambar valid terakhir berhasil dikembalikan.',
    });
  }

  const canRecoverPrevious =
    previewStatus === 'error' &&
    lastValidRef.current !== null &&
    (lastValidRef.current.imageUrl !== cleanImageUrl ||
      lastValidRef.current.driveFileId !== cleanDriveFileId);

  return (
    <div className="border-2 border-[#171717] rounded-[4px] bg-[#F8F8E1]/60 p-3.5 space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-display font-bold text-[#171717]">{label}</span>
          {hasSavedBaseline && (
            <span
              className={`px-1.5 py-0.5 border border-[#171717] rounded-[2px] font-mono text-[10px] font-bold ${
                isPrimaryChanged
                  ? 'bg-[#F3C95B] text-[#171717]'
                  : hasThumbnail
                    ? 'bg-[#8ACCD5]/65 text-[#171717]'
                    : 'bg-[#E5E5C7] text-[#525252]'
              }`}
            >
              {isPrimaryChanged
                ? 'Preview Gambar Baru (Belum Disimpan)'
                : hasThumbnail
                  ? 'Thumbnail Saat Ini'
                  : 'Kosong'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('upload')}
            aria-selected={mode === 'upload'}
            className="nb-tab text-[11px] py-1 px-2"
          >
            <FileUp className="w-3 h-3 inline mr-1" />
            Unggah Gambar
          </button>
          <button
            type="button"
            onClick={() => setMode('drive')}
            aria-selected={mode === 'drive'}
            className="nb-tab text-[11px] py-1 px-2"
          >
            <HardDrive className="w-3 h-3 inline mr-1" />
            Media Library ({publicPublishedMediaCount})
          </button>
          <button
            type="button"
            onClick={() => setMode('gallery')}
            aria-selected={mode === 'gallery'}
            className="nb-tab text-[11px] py-1 px-2"
          >
            <ImageIcon className="w-3 h-3 inline mr-1" />
            Aset Studio
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            aria-selected={mode === 'url'}
            className="nb-tab text-[11px] py-1 px-2"
          >
            <Link2 className="w-3 h-3 inline mr-1" />
            URL / File ID
          </button>
        </div>
      </div>

      {/* Primary Image Preview + Controls + Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
        <div className="sm:col-span-5 space-y-2">
          <div className="border-2 border-[#171717] rounded-[4px] overflow-hidden bg-white relative">
            {hasThumbnail ? (
              <>
                <StudioImage
                  src={cleanImageUrl}
                  driveFileId={cleanDriveFileId || undefined}
                  cacheVersion={activeCacheVersion}
                  alt={isPrimaryChanged ? 'Preview gambar baru' : 'Thumbnail saat ini'}
                  aspectClass="aspect-[16/10]"
                  allowSrcFallback={!cleanDriveFileId}
                  showErrorDetails
                  retryKey={previewRetryKey}
                  onStatusChange={(status) => {
                    setPreviewStatus(status);
                    if (status === 'loaded' && hasThumbnail) {
                      lastValidRef.current = {
                        imageUrl: cleanImageUrl,
                        driveFileId: cleanDriveFileId,
                      };
                    }
                  }}
                />
                <span
                  className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 border border-[#171717] font-mono text-[9px] font-bold rounded-[2px] ${
                    isPrimaryChanged
                      ? 'bg-[#F3C95B] text-[#171717]'
                      : 'bg-[#0F3D3A] text-[#F3C95B]'
                  }`}
                >
                  {isPrimaryChanged
                    ? 'PREVIEW BARU'
                    : cleanDriveFileId
                      ? 'SAAT INI · DRIVE'
                      : 'SAAT INI'}
                </span>
              </>
            ) : (
              <div className="aspect-[16/10] bg-[#F1F1D3] p-4 flex flex-col items-center justify-center text-center gap-2">
                <ImageIcon className="w-6 h-6 text-[#6C151E]" />
                <div className="space-y-0.5">
                  <p className="text-xs font-display font-bold text-[#171717]">
                    Belum Ada Thumbnail Dipilih
                  </p>
                  <p className="text-[11px] text-[#525252] leading-snug">
                    {emptyHint ||
                      'Pilih gambar dari Media Library, Aset Studio, atau unggah gambar baru.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('drive')}
                    className="nb-btn nb-btn-surface px-2 py-1 text-[10px]"
                  >
                    Pilih Gambar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('upload')}
                    className="nb-btn nb-btn-mustard px-2 py-1 text-[10px]"
                  >
                    Unggah Gambar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode('drive')}
              className="nb-btn nb-btn-surface px-2 py-1 text-[11px]"
            >
              <HardDrive className="w-3 h-3" />
              Ganti Thumbnail
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className="nb-btn nb-btn-mustard px-2 py-1 text-[11px]"
            >
              <FileUp className="w-3 h-3" />
              Unggah
            </button>
            {hasThumbnail && (
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="nb-btn nb-btn-surface px-2 py-1 text-[11px]"
              >
                <Eye className="w-3 h-3" />
                Lihat Preview
              </button>
            )}
            {hasThumbnail && (
              <button
                type="button"
                onClick={handleDetachThumbnail}
                title="Lepas thumbnail dari konten ini (tidak menghapus berkas asli di Google Drive)"
                className="nb-btn nb-btn-surface px-2 py-1 text-[11px] text-[#6C151E]"
              >
                <Trash2 className="w-3 h-3" />
                Hapus Gambar
              </button>
            )}
            {hasUnsavedMediaChanges && (
              <button
                type="button"
                onClick={handleRevertChanges}
                className="nb-btn nb-btn-surface px-2 py-1 text-[11px] text-[#0F3D3A]"
              >
                <RotateCcw className="w-3 h-3" />
                Batalkan Perubahan
              </button>
            )}
            {onRestoreDefault && (
              <button
                type="button"
                onClick={() => {
                  onRestoreDefault();
                  setPreviewRetryKey((k) => k + 1);
                }}
                className="nb-btn nb-btn-surface px-2 py-1 text-[11px]"
              >
                {restoreDefaultLabel}
              </button>
            )}
          </div>

          {/* Drive File ID & Preview Error Recovery */}
          {cleanDriveFileId && (
            <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-[#525252] px-1">
              <span className="truncate" title={cleanDriveFileId}>
                Drive ID: {cleanDriveFileId}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearMediaProbeCache(buildMediaProxyUrl(cleanDriveFileId, 'public'));
                  setPreviewRetryKey((k) => k + 1);
                }}
                className="text-[#0F3D3A] font-sans font-semibold hover:underline shrink-0 cursor-pointer"
              >
                Muat Ulang
              </button>
            </div>
          )}

          {hasThumbnail && previewStatus === 'error' && (
            <div className="p-2.5 bg-[#6C151E]/10 border-2 border-[#6C151E] rounded-[4px] space-y-1.5">
              <p className="text-[11px] font-bold text-[#6C151E] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Preview gambar gagal dimuat.
              </p>
              <p className="text-[10px] text-[#404040] leading-snug">
                Periksa URL/File ID atau muat ulang proxy. Gambar lama tetap aman hingga Anda menyimpan perubahan.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (cleanDriveFileId) {
                      clearMediaProbeCache(buildMediaProxyUrl(cleanDriveFileId, 'public'));
                    }
                    setPreviewRetryKey((k) => k + 1);
                  }}
                  className="nb-btn nb-btn-surface px-2 py-0.5 text-[10px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  Muat Ulang
                </button>
                {canRecoverPrevious && (
                  <button
                    type="button"
                    onClick={handleRecoverPreviousValid}
                    className="nb-btn nb-btn-mustard px-2 py-0.5 text-[10px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Kembalikan Thumbnail Sebelumnya
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Side-by-side Saved Thumbnail Comparison when changed */}
          {isPrimaryChanged && (
            <div className="p-2 bg-white border border-[#171717] rounded-[4px] flex items-center gap-2.5">
              <div className="w-16 shrink-0 border border-[#171717] rounded-[2px] overflow-hidden bg-[#F1F1D3]">
                {hasSavedThumbnail ? (
                  <StudioImage
                    src={baselineImageUrl}
                    driveFileId={baselineDriveFileId || undefined}
                    cacheVersion={extractMediaCacheVersion(baselineImageUrl) || undefined}
                    alt="Thumbnail tersimpan saat ini"
                    aspectClass="aspect-[16/10]"
                    allowSrcFallback={!baselineDriveFileId}
                  />
                ) : (
                  <div className="aspect-[16/10] flex items-center justify-center text-[9px] font-mono text-[#737373]">
                    Kosong
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-[#0F3D3A]">
                  Thumbnail Tersimpan Saat Ini
                </p>
                <p className="text-[10px] font-mono text-[#525252] truncate">
                  {baselineDriveFileId
                    ? `Drive: ${baselineDriveFileId}`
                    : baselineImageUrl || 'Tidak ada thumbnail tersimpan'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Picker Panel */}
        <div className="sm:col-span-7 space-y-2.5">
          {mode === 'upload' && (
            <AdminMediaUploader
              usage={usage}
              visibility="public"
              isPublished={entityPublished !== false}
              entityType={usage}
              entityId={entityId}
              entityName={entityName}
              allowMultiple={false}
              allowVideos={false}
              compact
              driveFolders={driveFolders}
              actor={actor}
              onUploaded={handlePrimaryUploaded}
              onToast={onToast}
            />
          )}

          {mode === 'drive' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="w-3 h-3 text-[#525252] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Cari nama atau folder..."
                    className="nb-input text-xs py-1 pl-7"
                  />
                </div>
                <select
                  value={libraryCategory}
                  onChange={(e) => setLibraryCategory(e.target.value as MediaUsage | 'all')}
                  className="nb-input text-xs py-1 w-auto"
                >
                  <option value="all">Semua Folder</option>
                  {(['product', 'service', 'portfolio', 'hero', 'other'] as const).map((k) => (
                    <option key={k} value={k}>
                      {MEDIA_USAGE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              {publicDriveImages.length === 0 ? (
                <div className="p-3 bg-white border-2 border-[#171717] rounded-[4px] text-xs text-[#525252]">
                  Belum ada gambar publik terbit yang cocok di Media Library. Gunakan tab{' '}
                  <strong>Unggah Gambar</strong> untuk mengunggah langsung ke Google Drive.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                  {publicDriveImages.map((asset) => {
                    const selected = cleanDriveFileId === asset.fileId;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          onChange({
                            imageUrl:
                              buildMediaProxyUrl(
                                asset.fileId,
                                'public',
                                asset.updatedAt || Date.now()
                              ) ||
                              imageUrl ||
                              CURATED_STUDIO_GALLERY[0].url,
                            driveFileId: asset.fileId,
                          });
                          setPreviewRetryKey((k) => k + 1);
                        }}
                        className={`relative border-2 rounded-[4px] overflow-hidden text-left cursor-pointer ${
                          selected
                            ? 'border-[#0F3D3A] ring-2 ring-[#F3C95B]'
                            : 'border-[#171717] hover:border-[#0F3D3A]'
                        }`}
                      >
                        <StudioImage
                          driveFileId={asset.fileId}
                          visibility={asset.visibility}
                          cacheVersion={asset.updatedAt}
                          alt={asset.altText || asset.fileName}
                          aspectClass="aspect-[16/10]"
                          allowSrcFallback={false}
                          showErrorDetails
                        />
                        <span className="block px-1.5 py-1 bg-white border-t border-[#171717] text-[10px] font-semibold truncate">
                          {asset.fileName}
                        </span>
                        {selected && (
                          <span className="absolute top-1 right-1 w-4 h-4 bg-[#0F3D3A] text-[#F3C95B] border border-[#171717] flex items-center justify-center rounded-[2px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {mode === 'gallery' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CURATED_STUDIO_GALLERY.map((asset) => {
                const selected = !cleanDriveFileId && cleanImageUrl === asset.url;
                return (
                  <button
                    key={asset.url}
                    type="button"
                    onClick={() => onChange({ imageUrl: asset.url, driveFileId: '' })}
                    className={`relative border-2 rounded-[4px] overflow-hidden text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-[#0F3D3A] ring-2 ring-[#F3C95B]'
                        : 'border-[#171717] hover:border-[#0F3D3A]'
                    }`}
                  >
                    <StudioImage
                      src={asset.url}
                      alt={asset.label}
                      aspectClass="aspect-[16/10]"
                    />
                    <span className="block px-1.5 py-1 bg-white border-t border-[#171717] text-[10px] font-semibold truncate">
                      {asset.label}
                    </span>
                    {selected && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-[#0F3D3A] text-[#F3C95B] border border-[#171717] flex items-center justify-center rounded-[2px]">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {mode === 'url' && (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#171717]">
                  URL Gambar (HTTPS, /api/media/..., atau tautan Google Drive)
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    const extracted = extractDriveFileId(val);
                    if (extracted && !cleanDriveFileId) {
                      onChange({
                        imageUrl: buildMediaProxyUrl(extracted, 'public', Date.now()) || val,
                        driveFileId: extracted,
                      });
                    } else {
                      onChange({ imageUrl: val, driveFileId });
                    }
                  }}
                  placeholder="https://... atau /api/media/..."
                  className="nb-input text-xs py-1.5"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-[11px] font-bold text-[#171717]">
                    Google Drive File ID (Opsional, diprioritaskan jika diisi)
                  </label>
                  {cleanDriveFileId && (
                    <button
                      type="button"
                      onClick={() => onChange({ imageUrl, driveFileId: '' })}
                      className="text-[11px] font-semibold text-[#6C151E] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      Hapus Drive ID
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={driveFileId}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const extracted = extractDriveFileId(raw);
                    const nextId = extracted || raw.trim();
                    const proxyUrl = extracted
                      ? buildMediaProxyUrl(extracted, 'public', Date.now())
                      : '';
                    onChange({
                      imageUrl: proxyUrl || imageUrl,
                      driveFileId: nextId,
                    });
                  }}
                  placeholder="Contoh: 1A2b3C4d5E6f7G8h9I0j atau tempel tautan Drive"
                  className="nb-input font-mono text-xs py-1.5"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentation Gallery Section (Multiple Photos & Videos) */}
      {onGalleryChange && (
        <div className="pt-3 border-t-2 border-[#171717]/20 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5 text-[#0F3D3A]" />
              <span className="text-xs font-display font-bold text-[#171717]">
                Galeri Dokumentasi Tambahan ({gallery?.length || 0}/12 · Foto &amp; Video)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setGalleryPickerOpen((v) => (v === 'upload' ? 'none' : 'upload'))
                }
                className={`nb-btn px-2.5 py-1 text-[11px] ${
                  galleryPickerOpen === 'upload' ? 'nb-btn-primary' : 'nb-btn-mustard'
                }`}
              >
                <Plus className="w-3 h-3" />
                Unggah Foto/Video
              </button>
              <button
                type="button"
                onClick={() =>
                  setGalleryPickerOpen((v) => (v === 'library' ? 'none' : 'library'))
                }
                className={`nb-btn px-2.5 py-1 text-[11px] ${
                  galleryPickerOpen === 'library' ? 'nb-btn-primary' : 'nb-btn-surface'
                }`}
              >
                <HardDrive className="w-3 h-3" />
                Pilih dari Library
              </button>
            </div>
          </div>

          {galleryPickerOpen === 'upload' && (
            <div className="p-2.5 bg-white border-2 border-[#171717] rounded-[4px]">
              <AdminMediaUploader
                usage={usage}
                visibility="public"
                isPublished={entityPublished !== false}
                entityType={usage}
                entityId={entityId}
                entityName={entityName}
                allowMultiple
                allowVideos
                compact
                driveFolders={driveFolders}
                actor={actor}
                onUploaded={handleGalleryUploaded}
                onToast={onToast}
              />
            </div>
          )}

          {galleryPickerOpen === 'library' && (
            <div className="p-2.5 bg-white border-2 border-[#171717] rounded-[4px] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#525252]">
                  Klik media publik terbit untuk menambahkannya ke galeri tanpa mengunggah ulang:
                </span>
                <button
                  type="button"
                  onClick={() => setGalleryPickerOpen('none')}
                  className="text-[11px] font-bold text-[#6C151E] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
              {publicMedia.length === 0 ? (
                <p className="text-xs text-[#525252]">
                  Belum ada media publik terbit di Media Library.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                  {publicMedia.map((asset) => {
                    const alreadyIn = (gallery || []).some((g) => g.fileId === asset.fileId);
                    const isVid = isVideoMimeType(asset.mimeType);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleAddFromLibraryToGallery(asset)}
                        className={`relative border-2 rounded-[4px] overflow-hidden text-left cursor-pointer ${
                          alreadyIn
                            ? 'border-[#0F3D3A] opacity-65'
                            : 'border-[#171717] hover:border-[#0F3D3A]'
                        }`}
                      >
                        <div className="aspect-[16/10] bg-[#171717] flex items-center justify-center overflow-hidden">
                          {isVid ? (
                            <div className="flex flex-col items-center text-[#F3C95B]">
                              <Film className="w-5 h-5" />
                              <span className="text-[9px] font-mono">VIDEO</span>
                            </div>
                          ) : (
                            <StudioImage
                              driveFileId={asset.fileId}
                              visibility={asset.visibility}
                              cacheVersion={asset.updatedAt}
                              alt={asset.altText || asset.fileName}
                              aspectClass="aspect-[16/10]"
                              allowSrcFallback={false}
                              showErrorDetails
                            />
                          )}
                        </div>
                        <span className="block px-1.5 py-1 bg-white border-t border-[#171717] text-[10px] font-semibold truncate">
                          {asset.fileName}
                        </span>
                        {alreadyIn && (
                          <span className="absolute top-1 right-1 px-1 py-0.5 bg-[#0F3D3A] text-[#F3C95B] text-[9px] font-bold rounded-[2px]">
                            Terpasang
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Gallery Cards with Reorder, Promote to Primary, Caption, Remove */}
          {gallery && gallery.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {gallery.map((item, idx) => {
                const isVid = isVideoMimeType(item.mimeType);
                const itemVer = extractMediaCacheVersion(item.imageUrl) || undefined;
                return (
                  <div
                    key={item.fileId}
                    className="border-2 border-[#171717] rounded-[4px] bg-white overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-[16/10] bg-[#171717] flex items-center justify-center overflow-hidden">
                      {isVid ? (
                        <video
                          src={buildMediaProxyUrl(item.fileId, 'public', itemVer)}
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <StudioImage
                          src={item.imageUrl}
                          driveFileId={item.fileId}
                          cacheVersion={itemVer}
                          alt={item.caption || item.fileName}
                          aspectClass="aspect-[16/10]"
                          allowSrcFallback={!item.fileId}
                          showErrorDetails={Boolean(item.fileId)}
                        />
                      )}
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#171717] text-[#F8F8E1] font-mono text-[9px] font-bold rounded-[2px]">
                        #{idx + 1} {isVid ? 'VIDEO' : 'FOTO'}
                      </span>
                    </div>

                    <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
                      <input
                        type="text"
                        value={item.caption || ''}
                        onChange={(e) => handleGalleryCaption(idx, e.target.value)}
                        placeholder="Keterangan singkat..."
                        className="nb-input text-[11px] py-1 px-2"
                      />

                      <div className="flex items-center justify-between gap-1 pt-1">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveGallery(idx, idx - 1)}
                            title="Geser kiri"
                            className="nb-btn nb-btn-surface p-1 disabled:opacity-40"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === gallery.length - 1}
                            onClick={() => handleMoveGallery(idx, idx + 1)}
                            title="Geser kanan"
                            className="nb-btn nb-btn-surface p-1 disabled:opacity-40"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="inline-flex items-center gap-1">
                          {!isVid && (
                            <button
                              type="button"
                              onClick={() => handlePromoteToPrimary(idx)}
                              title="Jadikan gambar utama"
                              className="nb-btn nb-btn-mustard px-1.5 py-1 text-[10px]"
                            >
                              <Star className="w-3 h-3" />
                              Utama
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryItem(idx)}
                            title="Hapus dari galeri (tidak menghapus file Drive)"
                            className="nb-btn nb-btn-surface p-1 text-[#6C151E]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full-Size Preview Modal Before Saving */}
      {previewModalOpen && hasThumbnail && (
        <div
          className="fixed inset-0 z-50 bg-[#171717]/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Preview Thumbnail Sebelum Disimpan"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="nb-card max-w-3xl w-full bg-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 bg-[#F8F8E1] border-b-2 border-[#171717] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-[#171717] truncate">
                  {isPrimaryChanged
                    ? 'Preview Gambar Baru (Belum Disimpan)'
                    : 'Preview Thumbnail Saat Ini'}
                </p>
                <p className="font-mono text-[10px] text-[#525252] truncate">
                  {cleanDriveFileId
                    ? `Drive File ID: ${cleanDriveFileId}`
                    : cleanImageUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                aria-label="Tutup preview thumbnail"
                className="nb-btn nb-btn-surface p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#171717] flex items-center justify-center p-2 max-h-[65vh] overflow-hidden">
              <StudioImage
                src={cleanImageUrl}
                driveFileId={cleanDriveFileId || undefined}
                cacheVersion={activeCacheVersion}
                alt="Preview ukuran penuh thumbnail"
                aspectClass="w-full h-[55vh] max-h-[62vh]"
                fit="contain"
                loading="eager"
                allowSrcFallback={!cleanDriveFileId}
                showErrorDetails
                retryKey={previewRetryKey}
              />
            </div>

            <div className="px-4 py-2.5 bg-[#F8F8E1] border-t-2 border-[#171717] flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-[#404040] truncate max-w-md">
                {cleanImageUrl || 'Menggunakan proxy Google Drive'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="nb-btn nb-btn-primary px-3 py-1.5 text-xs"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

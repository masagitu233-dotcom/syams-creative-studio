import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileUp,
  Film,
  HardDrive,
  Image as ImageIcon,
  Images,
  Link2,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { STUDIO_IMAGES } from '../../data/initialCatalog';
import { PRODUCT_IMAGES } from '../../data/digitalProducts';
import {
  buildMediaProxyUrl,
  isVideoMimeType,
  MEDIA_USAGE_LABELS,
  promoteGalleryItemToPrimary,
  reorderGalleryItems,
} from '../../utils/studioLogic';
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

  const publicMedia = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return media.filter((m) => {
      if (m.visibility !== 'public') return false;
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
    () => publicMedia.filter((m) => m.mimeType.startsWith('image/')),
    [publicMedia]
  );

  async function handlePrimaryUploaded(uploaded: UploadedMediaSummary[]) {
    const first = uploaded[0];
    if (first) {
      onChange({
        imageUrl: first.proxyUrl || imageUrl || CURATED_STUDIO_GALLERY[0].url,
        driveFileId: first.fileId,
      });
    }
    if (onMediaUploaded) {
      await onMediaUploaded();
    }
  }

  async function handleGalleryUploaded(uploaded: UploadedMediaSummary[]) {
    if (!onGalleryChange) return;
    const current = gallery || [];
    const additions: MediaGalleryItem[] = uploaded
      .filter((u) => !current.some((g) => g.fileId === u.fileId))
      .map((u) => ({
        fileId: u.fileId,
        fileName: u.fileName,
        mimeType: u.mimeType,
        caption: u.fileName.replace(/\.[^.]+$/, ''),
        imageUrl: u.proxyUrl,
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
        imageUrl: buildMediaProxyUrl(asset.fileId, 'public'),
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
    onChange({
      imageUrl: result.imageUrl,
      driveFileId: result.driveFileId || '',
    });
    onGalleryChange(result.gallery);
    onToast({
      type: 'success',
      title: 'Gambar Utama Diperbarui',
      description: 'Foto dokumentasi dipromosikan menjadi gambar utama.',
    });
  }

  function handleMoveGallery(from: number, to: number) {
    if (!onGalleryChange || !gallery) return;
    onGalleryChange(reorderGalleryItems(gallery, from, to));
  }

  function handleRemoveGalleryItem(index: number) {
    if (!onGalleryChange || !gallery) return;
    onGalleryChange(gallery.filter((_, idx) => idx !== index));
  }

  function handleGalleryCaption(index: number, caption: string) {
    if (!onGalleryChange || !gallery) return;
    onGalleryChange(
      gallery.map((item, idx) => (idx === index ? { ...item, caption } : item))
    );
  }

  return (
    <div className="border-2 border-[#171717] rounded-[4px] bg-[#F8F8E1]/60 p-3.5 space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-display font-bold text-[#171717]">{label}</span>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('upload')}
            aria-selected={mode === 'upload'}
            className="nb-tab text-[11px] py-1 px-2"
          >
            <FileUp className="w-3 h-3 inline mr-1" />
            Upload Drive
          </button>
          <button
            type="button"
            onClick={() => setMode('drive')}
            aria-selected={mode === 'drive'}
            className="nb-tab text-[11px] py-1 px-2"
          >
            <HardDrive className="w-3 h-3 inline mr-1" />
            Media Library ({media.filter((m) => m.visibility === 'public' && m.mimeType.startsWith('image/')).length})
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

      {/* Primary Image Preview + Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
        <div className="sm:col-span-4 space-y-1.5">
          <div className="border-2 border-[#171717] rounded-[4px] overflow-hidden bg-white relative">
            <StudioImage
              src={imageUrl || CURATED_STUDIO_GALLERY[0].url}
              driveFileId={driveFileId || undefined}
              alt="Pratinjau gambar utama"
              aspectClass="aspect-[16/10]"
            />
            {driveFileId && (
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#0F3D3A] text-[#F3C95B] border border-[#171717] font-mono text-[9px] font-bold rounded-[2px]">
                DRIVE
              </span>
            )}
          </div>
          {driveFileId && (
            <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-[#525252]">
              <span className="truncate">ID: {driveFileId}</span>
              <button
                type="button"
                onClick={() => onChange({ imageUrl, driveFileId: '' })}
                className="text-[#6C151E] font-sans font-semibold hover:underline shrink-0 cursor-pointer"
              >
                Lepas
              </button>
            </div>
          )}
        </div>

        <div className="sm:col-span-8 space-y-2.5">
          {mode === 'upload' && (
            <AdminMediaUploader
              usage={usage}
              visibility="public"
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
                  Belum ada gambar publik yang cocok di Media Library. Gunakan tab{' '}
                  <strong>Upload Drive</strong> di sebelah kiri untuk mengunggah langsung ke Google
                  Drive.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {publicDriveImages.map((asset) => {
                    const selected = driveFileId === asset.fileId;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() =>
                          onChange({
                            imageUrl:
                              buildMediaProxyUrl(asset.fileId, 'public') ||
                              imageUrl ||
                              CURATED_STUDIO_GALLERY[0].url,
                            driveFileId: asset.fileId,
                          })
                        }
                        className={`relative border-2 rounded-[4px] overflow-hidden text-left cursor-pointer ${
                          selected
                            ? 'border-[#0F3D3A] ring-2 ring-[#F3C95B]'
                            : 'border-[#171717] hover:border-[#0F3D3A]'
                        }`}
                      >
                        <StudioImage
                          src={CURATED_STUDIO_GALLERY[0].url}
                          driveFileId={asset.fileId}
                          alt={asset.altText || asset.fileName}
                          aspectClass="aspect-[16/10]"
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
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CURATED_STUDIO_GALLERY.map((asset) => {
                const selected = !driveFileId && imageUrl === asset.url;
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
                  URL Gambar (HTTPS atau path lokal /src/...) *
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => onChange({ imageUrl: e.target.value, driveFileId })}
                  placeholder="https://... atau /api/media/..."
                  className="nb-input text-xs py-1.5"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-[11px] font-bold text-[#171717]">
                    Google Drive File ID (Opsional, diprioritaskan jika diisi)
                  </label>
                  {driveFileId && (
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
                  onChange={(e) => onChange({ imageUrl, driveFileId: e.target.value })}
                  placeholder="Contoh: 1A2b3C4d5E6f7G8h9I0j"
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
                  Klik media publik untuk menambahkannya ke galeri tanpa mengunggah ulang:
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
                  Belum ada media publik di Media Library.
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
                              src={CURATED_STUDIO_GALLERY[0].url}
                              driveFileId={asset.fileId}
                              alt={asset.fileName}
                              aspectClass="aspect-[16/10]"
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
                return (
                  <div
                    key={item.fileId}
                    className="border-2 border-[#171717] rounded-[4px] bg-white overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-[16/10] bg-[#171717] flex items-center justify-center overflow-hidden">
                      {isVid ? (
                        <video
                          src={buildMediaProxyUrl(item.fileId, 'public')}
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <StudioImage
                          src={item.imageUrl}
                          driveFileId={item.fileId}
                          alt={item.caption || item.fileName}
                          aspectClass="aspect-[16/10]"
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
    </div>
  );
}

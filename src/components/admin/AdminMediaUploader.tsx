import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Film,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  uploadFileToDriveWithProgress,
  type DriveUploadResponse,
} from '../../services/apiService';
import {
  saveCachedDriveFolders,
  saveMediaMetadata,
} from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import {
  DRIVE_CATEGORY_FOLDER_NAMES,
  formatFileSize,
  isImageMimeType,
  isVideoMimeType,
  validateMediaFileBeforeUpload,
} from '../../utils/studioLogic';
import type {
  DriveFolderRecord,
  MediaEntityType,
  MediaUsage,
  MediaVisibility,
} from '../../types/studio';

export interface UploadedMediaSummary {
  mediaDocId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: MediaVisibility;
  usage: MediaUsage;
  folderId?: string;
  folderPath?: string;
  proxyUrl: string;
}

interface QueueItem {
  localId: string;
  file: File;
  previewUrl: string | null;
  mediaKind: 'image' | 'video' | 'document';
  status: 'queued' | 'uploading' | 'success' | 'error' | 'cancelled';
  progress: number;
  error?: string;
  result?: UploadedMediaSummary;
}

interface AdminMediaUploaderProps {
  usage: MediaUsage;
  visibility?: MediaVisibility;
  entityType?: MediaEntityType;
  entityId?: string;
  entityName?: string;
  altText?: string;
  allowMultiple?: boolean;
  allowVideos?: boolean;
  allowDocuments?: boolean;
  compact?: boolean;
  driveFolders?: DriveFolderRecord[];
  actor: { uid: string; email: string };
  onUploaded?: (items: UploadedMediaSummary[]) => void | Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

export function AdminMediaUploader({
  usage,
  visibility = 'public',
  entityType,
  entityId,
  entityName,
  altText,
  allowMultiple = true,
  allowVideos = true,
  allowDocuments = false,
  compact = false,
  driveFolders = [],
  actor,
  onUploaded,
  onToast,
}: AdminMediaUploaderProps) {
  const inputId = useId();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const cachedFolderIds = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of driveFolders) {
      if (f.folderKey && f.folderId) {
        map[f.folderKey] = f.folderId;
      }
    }
    return map;
  }, [driveFolders]);

  useEffect(() => {
    return () => {
      for (const controller of Object.values(abortControllersRef.current)) {
        controller.abort();
      }
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const acceptAttr = [
    'image/jpeg,image/png,image/webp,image/gif',
    allowVideos ? 'video/mp4,video/webm,video/quicktime' : '',
    allowDocuments ? '.pdf,.doc,.docx,.pptx,.txt' : '',
  ]
    .filter(Boolean)
    .join(',');

  function enqueueFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;

    const toProcess = allowMultiple ? files : [files[0]];
    const added: QueueItem[] = [];

    for (const file of toProcess) {
      const check = validateMediaFileBeforeUpload(file, {
        allowVideos,
        allowDocuments,
      });

      let previewUrl: string | null = null;
      if (isImageMimeType(file.type) || isVideoMimeType(file.type)) {
        previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
      }

      if (!check.valid) {
        added.push({
          localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl,
          mediaKind: isVideoMimeType(file.type)
            ? 'video'
            : isImageMimeType(file.type)
              ? 'image'
              : 'document',
          status: 'error',
          progress: 0,
          error: check.error,
        });
      } else {
        added.push({
          localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl,
          mediaKind: check.mediaKind || 'image',
          status: 'queued',
          progress: 0,
        });
      }
    }

    setQueue((prev) => (allowMultiple ? [...prev, ...added] : added));
  }

  function removeItem(localId: string) {
    abortControllersRef.current[localId]?.abort();
    delete abortControllersRef.current[localId];
    setQueue((prev) => {
      const target = prev.find((q) => q.localId === localId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        previewUrlsRef.current.delete(target.previewUrl);
      }
      return prev.filter((q) => q.localId !== localId);
    });
  }

  function cancelItem(localId: string) {
    abortControllersRef.current[localId]?.abort();
    delete abortControllersRef.current[localId];
    setQueue((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? { ...item, status: 'cancelled', error: 'Unggahan dibatalkan.' }
          : item
      )
    );
  }

  async function uploadSingleQueueItem(item: QueueItem): Promise<UploadedMediaSummary | null> {
    const controller = new AbortController();
    abortControllersRef.current[item.localId] = controller;

    setQueue((prev) =>
      prev.map((q) =>
        q.localId === item.localId
          ? { ...q, status: 'uploading', progress: 2, error: undefined }
          : q
      )
    );

    try {
      const uploaded: DriveUploadResponse = await uploadFileToDriveWithProgress({
        file: item.file,
        visibility,
        usage,
        entityId,
        entityName,
        cachedFolderIds,
        signal: controller.signal,
        onProgress: (pct) => {
          setQueue((prev) =>
            prev.map((q) => (q.localId === item.localId ? { ...q, progress: pct } : q))
          );
        },
      });

      if (uploaded.syncedFolders && uploaded.syncedFolders.length > 0) {
        await saveCachedDriveFolders(uploaded.syncedFolders).catch(() => {});
      }

      const resolvedEntityType: MediaEntityType =
        entityType ||
        (usage === 'product' || usage === 'service' || usage === 'portfolio' || usage === 'hero'
          ? usage
          : 'none');

      const mediaDocId = await saveMediaMetadata(
        {
          fileId: uploaded.fileId,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          visibility,
          usage,
          altText: (altText || '').trim() || uploaded.fileName,
          folderId: uploaded.folderId,
          folderPath: uploaded.folderPath,
          entityType: resolvedEntityType,
          entityId,
          entityName,
          isPublished: visibility === 'public',
          ownerUid: actor.uid,
        },
        { ...actor, isAdmin: true }
      );

      const summary: UploadedMediaSummary = {
        mediaDocId,
        fileId: uploaded.fileId,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        visibility,
        usage,
        folderId: uploaded.folderId,
        folderPath: uploaded.folderPath,
        proxyUrl: uploaded.proxyUrl,
      };

      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? { ...q, status: 'success', progress: 100, result: summary }
            : q
        )
      );
      return summary;
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const errorMsg = isAbort
        ? 'Unggahan dibatalkan oleh pengguna.'
        : formatUserFriendlyError(
            err,
            'Gagal mengunggah berkas ke Google Drive. Periksa koneksi atau konfigurasi server.'
          );

      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? {
                ...q,
                status: isAbort ? 'cancelled' : 'error',
                error: errorMsg,
              }
            : q
        )
      );
      return null;
    } finally {
      delete abortControllersRef.current[item.localId];
    }
  }

  async function handleStartUpload(targetIds?: string[]) {
    const candidates = queue.filter((q) =>
      targetIds
        ? targetIds.includes(q.localId)
        : q.status === 'queued' || q.status === 'error' || q.status === 'cancelled'
    );
    if (!candidates.length) return;

    setIsUploading(true);
    const succeeded: UploadedMediaSummary[] = [];
    let failedCount = 0;

    for (const item of candidates) {
      // Re-validate before retry
      const check = validateMediaFileBeforeUpload(item.file, { allowVideos, allowDocuments });
      if (!check.valid) {
        failedCount += 1;
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId ? { ...q, status: 'error', error: check.error } : q
          )
        );
        continue;
      }

      const res = await uploadSingleQueueItem(item);
      if (res) {
        succeeded.push(res);
      } else {
        failedCount += 1;
      }
    }

    setIsUploading(false);

    if (succeeded.length > 0) {
      await onUploaded?.(succeeded);
      onToast({
        type: 'success',
        title: `${succeeded.length} Berkas Berhasil Diunggah ke Google Drive`,
        description:
          succeeded[0].folderPath
            ? `Tersimpan di ${succeeded[0].folderPath}`
            : 'Metadata tersimpan di Firestore Media Library.',
      });
    } else if (failedCount > 0) {
      onToast({
        type: 'error',
        title: 'Unggahan Gagal',
        description: 'Periksa pesan error pada daftar antrean dan klik Coba Lagi bila siap.',
      });
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      enqueueFiles(e.dataTransfer.files);
    }
  }

  const pendingCount = queue.filter(
    (q) => q.status === 'queued' || q.status === 'error' || q.status === 'cancelled'
  ).length;
  const folderTargetLabel = `SYAMS CREATIVE STUDIO / ${DRIVE_CATEGORY_FOLDER_NAMES[usage]}${
    entityName ? ` / ${entityName}` : ''
  }`;

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-[4px] transition-colors ${
          compact ? 'p-3.5' : 'p-5'
        } ${
          dragActive
            ? 'border-[#0F3D3A] bg-[#8ACCD5]/30'
            : 'border-[#171717] bg-[#F8F8E1]/65 hover:bg-[#F8F8E1]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 bg-[#0F3D3A] text-[#F3C95B] border-2 border-[#171717] rounded-[4px] flex items-center justify-center shrink-0">
              <FileUp className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="font-display font-bold text-xs sm:text-sm text-[#171717]">
                Tarik &amp; Lepas {allowMultiple ? 'Foto / Video' : 'Berkas'} ke Sini
              </p>
              <p className="text-[11px] text-[#525252]">
                Gambar (JPG, PNG, WEBP, GIF ≤ 10 MB)
                {allowVideos ? ' · Video (MP4, WEBM, MOV ≤ 50 MB)' : ''}
                {allowDocuments ? ' · Dokumen (PDF, DOCX, PPTX ≤ 15 MB)' : ''}
              </p>
              <p className="text-[10px] font-mono text-[#0F3D3A] truncate">
                Tujuan Drive: {folderTargetLabel}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <label
              htmlFor={inputId}
              className="nb-btn nb-btn-mustard px-3 py-1.5 text-xs cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              Pilih Berkas
            </label>
            <input
              id={inputId}
              type="file"
              multiple={allowMultiple}
              accept={acceptAttr}
              onChange={(e) => {
                if (e.target.files) enqueueFiles(e.target.files);
                e.target.value = '';
              }}
              className="sr-only"
            />
          </div>
        </div>
      </div>

      {/* Upload Queue with Previews, Progress Bar, Cancel & Retry */}
      {queue.length > 0 && (
        <div className="border-2 border-[#171717] rounded-[4px] bg-white divide-y divide-[#171717]/15 overflow-hidden">
          <div className="px-3 py-2 bg-[#F8F8E1] border-b-2 border-[#171717] flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-display font-bold text-[#171717]">
              Antrean Unggahan ({queue.length} berkas)
            </span>
            <div className="flex items-center gap-1.5">
              {pendingCount > 0 && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => void handleStartUpload()}
                  className="nb-btn nb-btn-primary px-3 py-1 text-[11px]"
                >
                  <FileUp className="w-3 h-3" />
                  {isUploading ? 'Mengunggah...' : `Unggah ${pendingCount} Berkas`}
                </button>
              )}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  for (const item of queue) {
                    if (item.previewUrl) {
                      URL.revokeObjectURL(item.previewUrl);
                      previewUrlsRef.current.delete(item.previewUrl);
                    }
                  }
                  setQueue([]);
                }}
                className="nb-btn nb-btn-surface px-2.5 py-1 text-[11px]"
              >
                Bersihkan
              </button>
            </div>
          </div>

          {queue.map((item) => (
            <div key={item.localId} className="p-2.5 flex items-center gap-3">
              {/* Thumbnail Preview */}
              <div className="w-14 h-11 shrink-0 border-2 border-[#171717] rounded-[2px] overflow-hidden bg-[#F1F1D3] flex items-center justify-center">
                {item.previewUrl && item.mediaKind === 'image' ? (
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : item.previewUrl && item.mediaKind === 'video' ? (
                  <video
                    src={item.previewUrl}
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : item.mediaKind === 'video' ? (
                  <Film className="w-4 h-4 text-[#6C151E]" />
                ) : item.mediaKind === 'document' ? (
                  <FileText className="w-4 h-4 text-[#0F3D3A]" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-[#0F3D3A]" />
                )}
              </div>

              {/* Metadata & Progress */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#171717] truncate">
                    {item.file.name}
                  </p>
                  <span className="font-mono text-[10px] text-[#525252] shrink-0">
                    {formatFileSize(item.file.size)} · {item.file.type || 'unknown'}
                  </span>
                </div>

                {/* Progress Bar */}
                {(item.status === 'uploading' || item.status === 'success') && (
                  <div className="w-full h-2 bg-[#F1F1D3] border border-[#171717] rounded-[2px] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        item.status === 'success' ? 'bg-[#0F3D3A]' : 'bg-[#F3C95B]'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px]">
                  {item.status === 'queued' && (
                    <span className="text-[#525252]">Siap diunggah ke Google Drive</span>
                  )}
                  {item.status === 'uploading' && (
                    <span className="font-mono font-semibold text-[#0F3D3A]">
                      Mengunggah... {item.progress}%
                    </span>
                  )}
                  {item.status === 'success' && (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0F3D3A]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Berhasil ({item.result?.fileId})
                    </span>
                  )}
                  {(item.status === 'error' || item.status === 'cancelled') && (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#6C151E]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="line-clamp-2">{item.error}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Row Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {item.status === 'uploading' ? (
                  <button
                    type="button"
                    onClick={() => cancelItem(item.localId)}
                    title="Batalkan unggahan"
                    className="nb-btn nb-btn-burgundy px-2 py-1 text-[11px]"
                  >
                    <X className="w-3 h-3" />
                    Batal
                  </button>
                ) : (
                  <>
                    {(item.status === 'error' || item.status === 'cancelled') && (
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => void handleStartUpload([item.localId])}
                        title="Coba unggah ulang"
                        className="nb-btn nb-btn-mustard px-2 py-1 text-[11px]"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Ulangi
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => removeItem(item.localId)}
                      aria-label={`Hapus ${item.file.name} dari antrean`}
                      className="nb-btn nb-btn-surface p-1 text-[#6C151E]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

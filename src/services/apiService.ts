import { auth } from '../lib/firebase';
import { generateOrderCode } from '../utils/studioLogic';
import type { MediaUsage, MediaVisibility } from '../types/studio';

async function getBearerToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) || null;
  } catch {
    return null;
  }
}

async function getBearerHeaders(): Promise<Record<string, string>> {
  const token = await getBearerToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas lokal.'));
    reader.readAsDataURL(blob);
  });
}

function xhrJsonWithProgress<T>(options: {
  method: 'POST' | 'PUT';
  url: string;
  headers: Record<string, string>;
  body: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<{ status: number; data: T }> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException('Unggahan dibatalkan oleh pengguna.', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(options.method, options.url, true);
    for (const [k, v] of Object.entries(options.headers)) {
      xhr.setRequestHeader(k, v);
    }

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException('Unggahan dibatalkan oleh pengguna.', 'AbortError'));
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0 && options.onProgress) {
        const pct = Math.min(96, Math.max(1, Math.round((ev.loaded / ev.total) * 95)));
        options.onProgress(pct);
      }
    };

    xhr.onload = () => {
      options.signal?.removeEventListener('abort', onAbort);
      let parsed = {} as T;
      try {
        parsed = JSON.parse(xhr.responseText || '{}') as T;
      } catch {
        parsed = {} as T;
      }
      resolve({ status: xhr.status, data: parsed });
    };

    xhr.onerror = () => {
      options.signal?.removeEventListener('abort', onAbort);
      reject(new Error('Koneksi jaringan terputus saat mengunggah ke server.'));
    };

    xhr.ontimeout = () => {
      options.signal?.removeEventListener('abort', onAbort);
      reject(new Error('Permintaan unggahan melebihi batas waktu (timeout).'));
    };

    xhr.timeout = 120_000;
    xhr.send(options.body);
  });
}

export interface DriveFolderSyncItem {
  folderKey: string;
  folderId: string;
  folderName: string;
  parentFolderId?: string;
  category: MediaUsage | 'root';
  entityId?: string;
  folderPath: string;
}

export interface DriveStatusResponse {
  configured: boolean;
  hasPublicFolder: boolean;
  hasPrivateFolder: boolean;
  hasRootFolderEnv?: boolean;
  rootFolderName?: string;
  categoryFolders?: Record<string, string>;
  mode: 'live_google_drive' | 'unconfigured';
  message: string;
}

export async function fetchDriveIntegrationStatus(): Promise<DriveStatusResponse> {
  try {
    const res = await fetch('/api/drive/status', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Status endpoint unavailable');
    }
    return (await res.json()) as DriveStatusResponse;
  } catch {
    return {
      configured: false,
      hasPublicFolder: false,
      hasPrivateFolder: false,
      mode: 'unconfigured',
      message: 'Kredensial Google Drive API belum diatur pada environment server.',
    };
  }
}

export async function ensureDriveFoldersBackend(params?: {
  cachedFolderIds?: Record<string, string>;
  usage?: MediaUsage;
  entityId?: string;
  entityName?: string;
}): Promise<{ target?: DriveFolderSyncItem; folders: DriveFolderSyncItem[] }> {
  const headers = await getBearerHeaders();
  const res = await fetch('/api/drive/folders', {
    method: 'POST',
    headers,
    body: JSON.stringify(params || {}),
  });

  const body = (await res.json().catch(() => ({}))) as {
    target?: DriveFolderSyncItem;
    folders?: DriveFolderSyncItem[];
    error?: string;
  };

  if (!res.ok || !Array.isArray(body.folders)) {
    throw new Error(body.error || 'Gagal menyinkronkan struktur folder Google Drive.');
  }

  return { target: body.target, folders: body.folders };
}

export interface PrepareOrderResponse {
  orderCode: string;
  validatedAt: string;
  source: 'backend' | 'local_fallback';
}

export async function requestValidatedOrderCode(payload: {
  serviceId: string;
  customerWhatsapp: string;
  projectTitle: string;
  projectBrief: string;
  deadline: string;
  quantityEstimate: number;
}): Promise<PrepareOrderResponse> {
  try {
    const headers = await getBearerHeaders();
    const res = await fetch('/api/orders/prepare', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 400 || res.status === 401) {
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errData.error || 'Validasi pesanan di server gagal.');
    }

    if (!res.ok) {
      throw new Error('Server sedang sibuk');
    }

    const data = (await res.json()) as { orderCode: string; validatedAt: string };
    return {
      orderCode: data.orderCode,
      validatedAt: data.validatedAt,
      source: 'backend',
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('Validasi')) {
      throw err;
    }
    return {
      orderCode: generateOrderCode(),
      validatedAt: new Date().toISOString(),
      source: 'local_fallback',
    };
  }
}

export interface DriveUploadResponse {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: MediaVisibility;
  usage?: MediaUsage;
  folderId?: string;
  folderPath?: string;
  syncedFolders?: DriveFolderSyncItem[];
  proxyUrl: string;
}

const DIRECT_UPLOAD_THRESHOLD_BYTES = 3 * 1024 * 1024; // 3 MB -> above this, use resumable chunked relay

export async function uploadFileToDriveWithProgress(params: {
  file: File;
  visibility: MediaVisibility;
  usage: MediaUsage;
  entityId?: string;
  entityName?: string;
  cachedFolderIds?: Record<string, string>;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<DriveUploadResponse> {
  const mimeType = params.file.type || 'application/octet-stream';
  const headers = await getBearerHeaders();

  // Path A: Direct single-shot upload with XHR upload progress for files <= 3 MB
  if (params.file.size <= DIRECT_UPLOAD_THRESHOLD_BYTES) {
    params.onProgress?.(5);
    const contentBase64 = await blobToBase64(params.file);
    if (params.signal?.aborted) {
      throw new DOMException('Unggahan dibatalkan oleh pengguna.', 'AbortError');
    }

    const { status, data } = await xhrJsonWithProgress<
      Partial<DriveUploadResponse> & { error?: string }
    >({
      method: 'POST',
      url: '/api/drive/upload',
      headers,
      body: JSON.stringify({
        fileName: params.file.name,
        mimeType,
        sizeBytes: params.file.size,
        visibility: params.visibility,
        usage: params.usage,
        entityId: params.entityId,
        entityName: params.entityName,
        cachedFolderIds: params.cachedFolderIds,
        contentBase64,
      }),
      onProgress: params.onProgress,
      signal: params.signal,
    });

    if (status < 200 || status >= 300 || !data.fileId) {
      throw new Error(
        data.error ||
          'Unggahan ke Google Drive gagal. Pastikan kredensial Google Drive API aktif pada server.'
      );
    }

    params.onProgress?.(100);
    return data as DriveUploadResponse;
  }

  // Path B: Chunked resumable upload for larger images & videos (up to 50 MB)
  params.onProgress?.(3);
  const initRes = await fetch('/api/drive/upload-init', {
    method: 'POST',
    headers,
    signal: params.signal,
    body: JSON.stringify({
      fileName: params.file.name,
      mimeType,
      totalSize: params.file.size,
      visibility: params.visibility,
      usage: params.usage,
      entityId: params.entityId,
      entityName: params.entityName,
      cachedFolderIds: params.cachedFolderIds,
    }),
  });

  const initBody = (await initRes.json().catch(() => ({}))) as {
    sessionToken?: string;
    chunkSizeBytes?: number;
    folderId?: string;
    folderPath?: string;
    syncedFolders?: DriveFolderSyncItem[];
    error?: string;
  };

  if (!initRes.ok || !initBody.sessionToken) {
    throw new Error(initBody.error || 'Gagal menginisialisasi sesi unggah resumable Google Drive.');
  }

  const chunkSize = Math.max(512 * 1024, Math.min(2 * 1024 * 1024, initBody.chunkSizeBytes || 2 * 1024 * 1024));
  let offset = 0;

  while (offset < params.file.size) {
    if (params.signal?.aborted) {
      throw new DOMException('Unggahan dibatalkan oleh pengguna.', 'AbortError');
    }

    const sliceEnd = Math.min(offset + chunkSize, params.file.size);
    const sliceBlob = params.file.slice(offset, sliceEnd);
    const chunkBase64 = await blobToBase64(sliceBlob);

    let attempt = 0;
    let chunkDone = false;
    let finalResponse: DriveUploadResponse | null = null;

    while (!chunkDone) {
      attempt += 1;
      try {
        const chunkRes = await fetch('/api/drive/upload-chunk', {
          method: 'POST',
          headers,
          signal: params.signal,
          body: JSON.stringify({
            sessionToken: initBody.sessionToken,
            offset,
            chunkBase64,
          }),
        });

        const chunkData = (await chunkRes.json().catch(() => ({}))) as Partial<DriveUploadResponse> & {
          completed?: boolean;
          nextOffset?: number;
          error?: string;
        };

        if (!chunkRes.ok) {
          if (chunkRes.status >= 500 && attempt < 3) {
            await new Promise((r) => setTimeout(r, 700 * attempt));
            continue;
          }
          throw new Error(chunkData.error || 'Gagal mengirim potongan berkas ke Google Drive.');
        }

        const pct = Math.min(98, Math.round((sliceEnd / params.file.size) * 95) + 3);
        params.onProgress?.(pct);

        if (chunkData.completed && chunkData.fileId) {
          finalResponse = {
            ...(chunkData as DriveUploadResponse),
            folderId: chunkData.folderId || initBody.folderId,
            folderPath: chunkData.folderPath || initBody.folderPath,
            syncedFolders: initBody.syncedFolders,
          };
          chunkDone = true;
        } else {
          offset = chunkData.nextOffset ?? sliceEnd;
          chunkDone = true;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 700 * attempt));
          continue;
        }
        throw err;
      }
    }

    if (finalResponse) {
      params.onProgress?.(100);
      return finalResponse;
    }
  }

  throw new Error('Unggahan resumable selesai tanpa konfirmasi ID berkas dari Google Drive.');
}

// Backward-compatible wrapper used by customer checkout order attachments
export async function uploadFileToDriveBackend(params: {
  file: File;
  visibility: MediaVisibility;
  usage: MediaUsage;
}): Promise<DriveUploadResponse> {
  return uploadFileToDriveWithProgress(params);
}

export async function replaceDriveMediaBackend(params: {
  fileId: string;
  file: File;
  visibility: MediaVisibility;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<DriveUploadResponse> {
  if (params.file.size > 4 * 1024 * 1024) {
    throw new Error(
      'Penggantian berkas langsung maksimal 4 MB. Untuk berkas lebih besar, unggah sebagai media baru.'
    );
  }

  const headers = await getBearerHeaders();
  const contentBase64 = await blobToBase64(params.file);
  const { status, data } = await xhrJsonWithProgress<
    Partial<DriveUploadResponse> & { error?: string }
  >({
    method: 'PUT',
    url: `/api/drive/media/${encodeURIComponent(params.fileId)}`,
    headers,
    body: JSON.stringify({
      fileName: params.file.name,
      mimeType: params.file.type || 'application/octet-stream',
      visibility: params.visibility,
      contentBase64,
    }),
    onProgress: params.onProgress,
    signal: params.signal,
  });

  if (status < 200 || status >= 300 || !data.fileId) {
    throw new Error(data.error || 'Gagal mengganti berkas di Google Drive.');
  }

  params.onProgress?.(100);
  return data as DriveUploadResponse;
}

export async function updateDriveMediaBackend(params: {
  fileId: string;
  visibility?: MediaVisibility;
  fileName?: string;
}): Promise<void> {
  const headers = await getBearerHeaders();
  const res = await fetch(`/api/drive/media/${encodeURIComponent(params.fileId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      visibility: params.visibility,
      fileName: params.fileName,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memperbarui izin/nama berkas di Google Drive.');
  }
}

export async function deleteDriveMediaBackend(
  fileId: string
): Promise<{ deleted: boolean; alreadyMissing: boolean }> {
  const headers = await getBearerHeaders();
  const res = await fetch(`/api/drive/media/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as {
    deleted?: boolean;
    alreadyMissing?: boolean;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menghapus berkas dari Google Drive.');
  }
  return {
    deleted: Boolean(data.deleted),
    alreadyMissing: Boolean(data.alreadyMissing),
  };
}

export async function fetchPrivateMediaBlobUrl(fileId: string): Promise<string> {
  const token = await getBearerToken();
  const res = await fetch(`/api/media/${encodeURIComponent(fileId)}?visibility=private`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error('Gagal memuat berkas privat dari server.');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

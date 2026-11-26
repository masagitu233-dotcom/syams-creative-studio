import { auth } from '../lib/firebase';
import { generateOrderCode } from '../utils/studioLogic';
import type { MediaUsage, MediaVisibility } from '../types/studio';

async function getBearerHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export interface DriveStatusResponse {
  configured: boolean;
  hasPublicFolder: boolean;
  hasPrivateFolder: boolean;
  mode: 'live_google_drive' | 'unconfigured';
  message: string;
}

export async function fetchDriveIntegrationStatus(): Promise<DriveStatusResponse> {
  try {
    const res = await fetch('/api/drive/status');
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
  proxyUrl: string;
}

export async function uploadFileToDriveBackend(params: {
  file: File;
  visibility: MediaVisibility;
  usage: MediaUsage;
}): Promise<DriveUploadResponse> {
  const maxBytes = 8 * 1024 * 1024; // 8 MB safe limit for serverless payloads
  if (params.file.size > maxBytes) {
    throw new Error('Ukuran berkas melebihi batas maksimal 8 MB.');
  }

  const base64Content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas lokal.'));
    reader.readAsDataURL(params.file);
  });

  const headers = await getBearerHeaders();
  const res = await fetch('/api/drive/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fileName: params.file.name,
      mimeType: params.file.type || 'application/octet-stream',
      sizeBytes: params.file.size,
      visibility: params.visibility,
      usage: params.usage,
      contentBase64: base64Content,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as Partial<DriveUploadResponse> & {
    error?: string;
  };

  if (!res.ok || !body.fileId) {
    throw new Error(
      body.error ||
        'Unggahan ke Google Drive belum tersedia. Pastikan kredensial OAuth Google Drive telah diatur pada environment server.'
    );
  }

  return body as DriveUploadResponse;
}

export async function fetchPrivateMediaBlobUrl(fileId: string): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/media/${encodeURIComponent(fileId)}?visibility=private`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error('Gagal memuat berkas privat dari server.');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

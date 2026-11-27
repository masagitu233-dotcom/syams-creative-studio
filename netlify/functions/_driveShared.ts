import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { google, type drive_v3 } from 'googleapis';
import firebaseConfig from '../../firebase-applet-config.json';

export interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  rawQuery?: string;
  path?: string;
  rawUrl?: string;
  body: string | null;
}

export interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

export const BOOTSTRAP_ADMIN_EMAIL = 'masagitu233@gmail.com';
export const STUDIO_ROOT_FOLDER_NAME = 'SYAMS CREATIVE STUDIO';

export type MediaUsageKey =
  | 'product'
  | 'service'
  | 'portfolio'
  | 'hero'
  | 'other'
  | 'order_attachment';

export type MediaVisibilityKey = 'public' | 'private';

export const CATEGORY_FOLDER_NAMES: Record<MediaUsageKey, string> = {
  product: 'Produk Digital',
  service: 'Layanan',
  portfolio: 'Dokumentasi Proyek',
  hero: 'Banner Website',
  other: 'Media Lainnya',
  order_attachment: 'Lampiran Pesanan',
};

export const CATEGORY_FOLDER_KEYS: Record<MediaUsageKey, string> = {
  product: 'cat_product',
  service: 'cat_service',
  portfolio: 'cat_portfolio',
  hero: 'cat_hero',
  other: 'cat_other',
  order_attachment: 'cat_order_attachment',
};

export interface DriveFolderDescriptor {
  folderKey: string;
  folderId: string;
  folderName: string;
  parentFolderId?: string;
  category: MediaUsageKey | 'root';
  entityId?: string;
  folderPath: string;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  token: string;
}

export interface DriveErrorInfo {
  status: number;
  code: string;
  error: string;
}

export interface DriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  rootFolderId: string;
  publicFolderId: string;
  privateFolderId: string;
  configured: boolean;
}

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const DOC_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'mp4',
  'webm',
  'mov',
  'pdf',
  'doc',
  'docx',
  'pptx',
  'txt',
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB (safe for Netlify 6 MB limit)
export const RESUMABLE_CHUNK_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB raw (~2.67 MB base64)

export function getDriveConfig(): DriveConfig {
  const clientId = (process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim();
  const redirectUri = (
    process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
  ).trim();
  const refreshToken = (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '').trim();
  const rootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim();
  const publicFolderId = (process.env.GOOGLE_DRIVE_PUBLIC_FOLDER_ID || '').trim();
  const privateFolderId = (process.env.GOOGLE_DRIVE_PRIVATE_FOLDER_ID || '').trim();

  return {
    clientId,
    clientSecret,
    redirectUri,
    refreshToken,
    rootFolderId,
    publicFolderId,
    privateFolderId,
    configured: Boolean(clientId && clientSecret && refreshToken),
  };
}

export function createDriveOAuthClient() {
  const cfg = getDriveConfig();
  if (!cfg.configured) return null;
  const oauth2Client = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
  oauth2Client.setCredentials({ refresh_token: cfg.refreshToken });
  return oauth2Client;
}

export function createDriveClient(): drive_v3.Drive | null {
  const auth = createDriveOAuthClient();
  if (!auth) return null;
  return google.drive({ version: 'v3', auth });
}

export function isValidDriveId(id: string): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_\-]{3,200}$/.test(id.trim());
}

export function extractMediaParamsFromEvent(event: NetlifyEvent): {
  fileId: string;
  visibility: MediaVisibilityKey;
} {
  let fileId = (event.queryStringParameters?.fileId || '').trim();
  let visibilityRaw = (event.queryStringParameters?.visibility || '').trim();

  if ((!fileId || !visibilityRaw) && typeof event.rawQuery === 'string' && event.rawQuery) {
    const sp = new URLSearchParams(event.rawQuery);
    if (!fileId) fileId = (sp.get('fileId') || '').trim();
    if (!visibilityRaw) visibilityRaw = (sp.get('visibility') || '').trim();
  }

  if ((!fileId || !visibilityRaw) && typeof event.rawUrl === 'string' && event.rawUrl) {
    try {
      const parsed = new URL(event.rawUrl);
      if (!fileId) fileId = (parsed.searchParams.get('fileId') || '').trim();
      if (!visibilityRaw) visibilityRaw = (parsed.searchParams.get('visibility') || '').trim();
      if (!fileId) {
        const m = parsed.pathname.match(/\/(?:api\/media|\.netlify\/functions\/media)\/([a-zA-Z0-9_\-]{3,200})/);
        if (m?.[1]) fileId = decodeURIComponent(m[1]).trim();
      }
    } catch {
      // Ignore malformed rawUrl
    }
  }

  if (!fileId && typeof event.path === 'string' && event.path) {
    const m = event.path.match(/\/(?:api\/media|\.netlify\/functions\/media)\/([a-zA-Z0-9_\-]{3,200})/);
    if (m?.[1]) fileId = decodeURIComponent(m[1]).trim();
  }

  const visibility: MediaVisibilityKey = visibilityRaw === 'private' ? 'private' : 'public';
  return { fileId, visibility };
}

export async function coerceDriveBinaryToBuffer(data: unknown): Promise<Buffer> {
  if (!data) return Buffer.alloc(0);
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof (data as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function') {
    const ab = await (data as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    return Buffer.from(ab);
  }
  if (typeof (data as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of data as AsyncIterable<Uint8Array | Buffer | string>) {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      else if (typeof chunk === 'string') chunks.push(Buffer.from(chunk));
      else chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  return Buffer.alloc(0);
}

export function isValidEntityId(id: string): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_\-]{1,128}$/.test(id.trim());
}

export function normalizeMediaUsage(value: unknown): MediaUsageKey {
  if (
    value === 'product' ||
    value === 'service' ||
    value === 'portfolio' ||
    value === 'hero' ||
    value === 'other' ||
    value === 'order_attachment'
  ) {
    return value;
  }
  return 'other';
}

export function sanitizeFileName(raw: string): string {
  const cleaned = raw
    .replace(/[\r\n\t/\\:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return cleaned || 'media-syams';
}

export function sanitizeFolderDisplayName(raw: string): string {
  const cleaned = raw
    .replace(/[\r\n\t/\\:*?"<>|']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);
  return cleaned || 'Entitas';
}

export function escapeDriveQueryValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function buildEntityFolderKey(usage: 'product' | 'service', entityId: string): string {
  const safeId = entityId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 100);
  return `${usage}_${safeId}`;
}

export function buildEntityFolderName(entityName: string, entityId: string): string {
  const safeName = sanitizeFolderDisplayName(entityName);
  const shortId = entityId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 12);
  if (!shortId) return safeName;
  return `${safeName} [${shortId}]`;
}

export function validateUploadMetadata(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  usage: MediaUsageKey;
}): { ok: true; maxBytes: number; mediaKind: 'image' | 'video' | 'document' } | { ok: false; error: string } {
  const fileName = params.fileName.trim();
  const mimeType = params.mimeType.trim().toLowerCase();
  const sizeBytes = Number(params.sizeBytes);

  if (!fileName || fileName.length > 200) {
    return { ok: false, error: 'Nama berkas tidak valid (1–200 karakter).' };
  }

  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: `Ekstensi berkas .${ext} tidak diizinkan. Gunakan JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, PDF, DOCX, atau PPTX.`,
    };
  }

  let mediaKind: 'image' | 'video' | 'document' | null = null;
  let maxBytes = MAX_IMAGE_BYTES;

  if (IMAGE_MIME_TYPES.has(mimeType)) {
    mediaKind = 'image';
    maxBytes = MAX_IMAGE_BYTES;
  } else if (VIDEO_MIME_TYPES.has(mimeType)) {
    mediaKind = 'video';
    maxBytes = MAX_VIDEO_BYTES;
  } else if (DOC_MIME_TYPES.has(mimeType)) {
    mediaKind = 'document';
    maxBytes = MAX_DOC_BYTES;
  }

  if (!mediaKind) {
    return {
      ok: false,
      error: `Format berkas (${mimeType || 'tidak dikenal'}) tidak didukung. Gunakan gambar (JPG/PNG/WEBP/GIF), video (MP4/WEBM/MOV), atau dokumen (PDF/DOCX/PPTX).`,
    };
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: 'Ukuran berkas kosong atau tidak valid.' };
  }

  if (sizeBytes > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      ok: false,
      error: `Ukuran berkas melebihi batas maksimum ${maxMb} MB untuk tipe ${mediaKind}.`,
    };
  }

  return { ok: true, maxBytes, mediaKind };
}

export function classifyDriveError(err: unknown): DriveErrorInfo {
  const e = err as {
    code?: number | string;
    status?: number;
    message?: string;
    response?: { status?: number; data?: { error?: string | { message?: string; errors?: Array<{ reason?: string }> } } };
  };

  const statusCode = Number(e?.response?.status || e?.status || e?.code || 0);
  const rawError = e?.response?.data?.error;
  const errStr =
    typeof rawError === 'string'
      ? rawError
      : typeof rawError === 'object' && rawError?.message
        ? rawError.message
        : String(e?.message || '');
  const lower = errStr.toLowerCase();

  if (
    lower.includes('invalid_grant') ||
    lower.includes('invalid credentials') ||
    lower.includes('unauthorized') ||
    statusCode === 401
  ) {
    return {
      status: 502,
      code: 'drive_token_expired',
      error:
        'Sesi autentikasi Google Drive kedaluwarsa atau refresh token tidak valid. Perbarui GOOGLE_DRIVE_REFRESH_TOKEN di environment server.',
    };
  }

  if (lower.includes('storagequotaexceeded') || lower.includes('quota')) {
    return {
      status: 507,
      code: 'drive_quota_exceeded',
      error: 'Kapasitas penyimpanan Google Drive penuh. Kosongkan ruang penyimpanan lalu coba lagi.',
    };
  }

  if (statusCode === 403 || lower.includes('insufficient') || lower.includes('forbidden')) {
    return {
      status: 502,
      code: 'drive_forbidden',
      error: 'Izin akses Google Drive ditolak. Pastikan scope Google Drive API aktif pada akun OAuth.',
    };
  }

  if (statusCode === 404 || lower.includes('file not found') || lower.includes('not found')) {
    return {
      status: 404,
      code: 'drive_not_found',
      error: 'Berkas atau folder tidak ditemukan di Google Drive.',
    };
  }

  if (
    lower.includes('etimedout') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('timeout') ||
    lower.includes('network')
  ) {
    return {
      status: 504,
      code: 'drive_network_error',
      error: 'Koneksi ke Google Drive terganggu atau timeout. Silakan coba lagi beberapa saat.',
    };
  }

  return {
    status: 502,
    code: 'drive_error',
    error: 'Terjadi kesalahan saat berkomunikasi dengan Google Drive API.',
  };
}

// ---------------------------------------------------------------------------
// Firebase ID Token Cryptographic Verification (RS256 via Google Public Certs)
// ---------------------------------------------------------------------------

interface CertCache {
  certs: Record<string, string>;
  expiresAtMs: number;
}

let cachedCerts: CertCache | null = null;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && cachedCerts.expiresAtMs > now) {
    return cachedCerts.certs;
  }

  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!response.ok) {
    throw new Error('Gagal memuat sertifikat verifikasi Firebase Auth.');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlSec = maxAgeMatch ? Math.min(Number(maxAgeMatch[1]), 21600) : 3600;
  const certs = (await response.json()) as Record<string, string>;

  cachedCerts = {
    certs,
    expiresAtMs: now + ttlSec * 1000,
  };
  return certs;
}

function decodeBase64UrlJson<T>(segment: string): T | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const jsonStr = Buffer.from(normalized + pad, 'base64').toString('utf8');
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

export function extractBearerTokenFromHeader(authHeader?: string | null): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 20 ? token : null;
}

export async function verifyFirebaseBearerToken(
  authHeader?: string | null
): Promise<VerifiedFirebaseUser | null> {
  const token = extractBearerTokenFromHeader(authHeader);
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
  }>(payloadB64);

  if (!header || !payload || header.alg !== 'RS256' || !header.kid) {
    return null;
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || '').trim();
  if (!projectId) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (
    payload.aud !== projectId ||
    payload.iss !== `https://securetoken.google.com/${projectId}` ||
    !payload.sub ||
    !isValidEntityId(payload.sub) ||
    typeof payload.exp !== 'number' ||
    payload.exp <= nowSec ||
    typeof payload.iat !== 'number' ||
    payload.iat > nowSec + 300 ||
    payload.email_verified !== true ||
    typeof payload.email !== 'string'
  ) {
    return null;
  }

  try {
    const certs = await getFirebasePublicCerts();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();

    const sigBuf = Buffer.from(
      signatureB64.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );
    const valid = verifier.verify(cert, sigBuf);
    if (!valid) return null;

    return {
      uid: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: true,
      token,
    };
  } catch {
    return null;
  }
}

export async function requireVerifiedAdmin(
  authHeader?: string | null
): Promise<{ ok: true; user: VerifiedFirebaseUser } | { ok: false; status: number; error: string }> {
  const user = await verifyFirebaseBearerToken(authHeader);
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: 'Autentikasi Google administrator tidak valid atau sesi telah berakhir.',
    };
  }

  if (user.email === BOOTSTRAP_ADMIN_EMAIL) {
    return { ok: true, user };
  }

  // Verify admin membership against Firestore /admins/{uid} using caller's verified token
  const projectId = (process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || '').trim();
  const databaseId = (
    process.env.FIREBASE_DATABASE_ID ||
    firebaseConfig.firestoreDatabaseId ||
    '(default)'
  ).trim();

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/${encodeURIComponent(databaseId)}/documents/admins/${encodeURIComponent(user.uid)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
    if (res.ok) {
      return { ok: true, user };
    }
  } catch {
    // Fall through to 403
  }

  return {
    ok: false,
    status: 403,
    error: 'Akses ditolak: fitur Media Manager hanya dapat digunakan oleh administrator terdaftar.',
  };
}

// ---------------------------------------------------------------------------
// Automatic Google Drive Folder Hierarchy Manager (Idempotent)
// ---------------------------------------------------------------------------

async function verifyFolderExists(
  drive: drive_v3.Drive,
  folderId: string
): Promise<{ id: string; name: string; parents?: string[] } | null> {
  if (!isValidDriveId(folderId)) return null;
  try {
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,trashed,parents',
      supportsAllDrives: true,
    });
    if (
      res.data.id &&
      res.data.mimeType === 'application/vnd.google-apps.folder' &&
      !res.data.trashed
    ) {
      return {
        id: res.data.id,
        name: res.data.name || '',
        parents: res.data.parents || undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  options: {
    name: string;
    parentId?: string;
    appPropertyKey?: string;
    appPropertyValue?: string;
    cachedFolderId?: string;
  }
): Promise<{ id: string; name: string }> {
  // 1. Validate cached folder ID first to avoid unnecessary searches & duplicates
  if (options.cachedFolderId) {
    const existing = await verifyFolderExists(drive, options.cachedFolderId);
    if (existing) {
      return { id: existing.id, name: existing.name || options.name };
    }
  }

  const parentClause = options.parentId
    ? ` and '${escapeDriveQueryValue(options.parentId)}' in parents`
    : '';

  // 2. Search by immutable appProperties key/value (prevents duplicates even if renamed!)
  if (options.appPropertyKey && options.appPropertyValue) {
    const propQ = `mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause} and appProperties has { key='${escapeDriveQueryValue(
      options.appPropertyKey
    )}' and value='${escapeDriveQueryValue(options.appPropertyValue)}' }`;
    const propSearch = await drive.files.list({
      q: propQ,
      fields: 'files(id,name)',
      pageSize: 1,
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const foundByProp = propSearch.data.files?.[0];
    if (foundByProp?.id) {
      return { id: foundByProp.id, name: foundByProp.name || options.name };
    }
  }

  // 3. Search by exact folder name within parent
  const nameQ = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${escapeDriveQueryValue(
    options.name
  )}'${parentClause}`;
  const nameSearch = await drive.files.list({
    q: nameQ,
    fields: 'files(id,name)',
    pageSize: 1,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const foundByName = nameSearch.data.files?.[0];
  if (foundByName?.id) {
    // Attach immutable appProperties marker if missing
    if (options.appPropertyKey && options.appPropertyValue) {
      await drive.files
        .update({
          fileId: foundByName.id,
          supportsAllDrives: true,
          requestBody: {
            appProperties: {
              [options.appPropertyKey]: options.appPropertyValue,
            },
          },
          fields: 'id',
        })
        .catch(() => {});
    }
    return { id: foundByName.id, name: foundByName.name || options.name };
  }

  // 4. Create folder once
  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: options.name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: options.parentId ? [options.parentId] : undefined,
      appProperties:
        options.appPropertyKey && options.appPropertyValue
          ? { [options.appPropertyKey]: options.appPropertyValue }
          : undefined,
    },
    fields: 'id,name',
  });

  if (!created.data.id) {
    throw new Error(`Gagal membuat folder Google Drive: ${options.name}`);
  }

  return { id: created.data.id, name: created.data.name || options.name };
}

export async function ensureStudioFolderStructure(
  drive: drive_v3.Drive,
  cachedFolderIds?: Record<string, string>
): Promise<{
  root: DriveFolderDescriptor;
  categories: Record<MediaUsageKey, DriveFolderDescriptor>;
  allFolders: DriveFolderDescriptor[];
}> {
  const cfg = getDriveConfig();
  const rootCached = cachedFolderIds?.root || cfg.rootFolderId || undefined;

  const rootRes = await findOrCreateFolder(drive, {
    name: STUDIO_ROOT_FOLDER_NAME,
    appPropertyKey: 'syamsFolderKey',
    appPropertyValue: 'root',
    cachedFolderId: rootCached,
  });

  const root: DriveFolderDescriptor = {
    folderKey: 'root',
    folderId: rootRes.id,
    folderName: rootRes.name,
    category: 'root',
    folderPath: rootRes.name,
  };

  const usages: MediaUsageKey[] = [
    'product',
    'service',
    'portfolio',
    'hero',
    'other',
    'order_attachment',
  ];

  const categories = {} as Record<MediaUsageKey, DriveFolderDescriptor>;
  for (const usage of usages) {
    const folderKey = CATEGORY_FOLDER_KEYS[usage];
    const folderName = CATEGORY_FOLDER_NAMES[usage];
    const cachedId = cachedFolderIds?.[folderKey];
    const res = await findOrCreateFolder(drive, {
      name: folderName,
      parentId: root.folderId,
      appPropertyKey: 'syamsFolderKey',
      appPropertyValue: folderKey,
      cachedFolderId: cachedId,
    });
    categories[usage] = {
      folderKey,
      folderId: res.id,
      folderName: res.name,
      parentFolderId: root.folderId,
      category: usage,
      folderPath: `${root.folderName}/${res.name}`,
    };
  }

  return {
    root,
    categories,
    allFolders: [root, ...usages.map((u) => categories[u])],
  };
}

export async function resolveTargetFolderForUpload(
  drive: drive_v3.Drive,
  params: {
    usage: MediaUsageKey;
    entityId?: string;
    entityName?: string;
    cachedFolderIds?: Record<string, string>;
  }
): Promise<{
  target: DriveFolderDescriptor;
  syncedFolders: DriveFolderDescriptor[];
}> {
  const structure = await ensureStudioFolderStructure(drive, params.cachedFolderIds);
  const categoryFolder = structure.categories[params.usage] || structure.categories.other;
  const syncedFolders: DriveFolderDescriptor[] = [...structure.allFolders];

  if (
    (params.usage === 'product' || params.usage === 'service') &&
    params.entityId &&
    isValidEntityId(params.entityId)
  ) {
    const entityKey = buildEntityFolderKey(params.usage, params.entityId);
    const displayName = buildEntityFolderName(
      params.entityName || params.entityId,
      params.entityId
    );
    const cachedEntityId = params.cachedFolderIds?.[entityKey];
    const entityRes = await findOrCreateFolder(drive, {
      name: displayName,
      parentId: categoryFolder.folderId,
      appPropertyKey: 'syamsEntityId',
      appPropertyValue: `${params.usage}:${params.entityId}`,
      cachedFolderId: cachedEntityId,
    });

    const entityFolder: DriveFolderDescriptor = {
      folderKey: entityKey,
      folderId: entityRes.id,
      folderName: entityRes.name,
      parentFolderId: categoryFolder.folderId,
      category: params.usage,
      entityId: params.entityId,
      folderPath: `${categoryFolder.folderPath}/${entityRes.name}`,
    };
    syncedFolders.push(entityFolder);
    return { target: entityFolder, syncedFolders };
  }

  return { target: categoryFolder, syncedFolders };
}

// ---------------------------------------------------------------------------
// Per-File Visibility Access Control (NEVER opens whole folders!)
// ---------------------------------------------------------------------------

export async function setDriveFilePublicAccess(
  drive: drive_v3.Drive,
  fileId: string,
  isPublic: boolean
): Promise<boolean> {
  if (!isValidDriveId(fileId)) return false;

  if (isPublic) {
    try {
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      return true;
    } catch (err) {
      const info = classifyDriveError(err);
      console.warn('[SYAMS DRIVE] permissions.create notice', {
        fileId,
        code: info.code,
        status: info.status,
      });
      return false;
    }
  }

  // Private: revoke only 'anyone' public permissions on this individual file
  const perms = await drive.permissions
    .list({
      fileId,
      supportsAllDrives: true,
      fields: 'permissions(id,type)',
    })
    .catch(() => null);

  const anyonePerms = (perms?.data.permissions || []).filter((p) => p.type === 'anyone' && p.id);
  for (const perm of anyonePerms) {
    if (perm.id) {
      await drive.permissions
        .delete({ fileId, permissionId: perm.id, supportsAllDrives: true })
        .catch(() => {});
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Resumable Upload Session Signing (HMAC-SHA256 Anti-SSRF)
// ---------------------------------------------------------------------------

export interface ResumableSessionPayload {
  uploadUrl: string;
  fileName: string;
  mimeType: string;
  totalSize: number;
  visibility: MediaVisibilityKey;
  usage: MediaUsageKey;
  folderId: string;
  folderPath: string;
  folderKey: string;
  entityId?: string;
  exp: number;
}

const GOOGLE_RESUMABLE_UPLOAD_PREFIX = 'https://www.googleapis.com/upload/drive/v3/files';

export function isTrustedGoogleUploadUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith(GOOGLE_RESUMABLE_UPLOAD_PREFIX);
}

function getSessionSigningKey(): string {
  const cfg = getDriveConfig();
  const base = cfg.clientSecret || cfg.refreshToken || 'syams-fallback-dev-key';
  return crypto.createHash('sha256').update(`syams-resumable-v1:${base}`).digest('hex');
}

export function signResumableSession(payload: ResumableSessionPayload, signingKey?: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', signingKey || getSessionSigningKey())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyResumableSession(
  token: string,
  signingKey?: string
): ResumableSessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, providedSig] = token.split('.');
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', signingKey || getSessionSigningKey())
    .update(encoded)
    .digest('base64url');

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ResumableSessionPayload;
    if (
      !parsed ||
      !isTrustedGoogleUploadUrl(parsed.uploadUrl) ||
      typeof parsed.exp !== 'number' ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function initResumableDriveUpload(params: {
  fileName: string;
  mimeType: string;
  totalSize: number;
  visibility: MediaVisibilityKey;
  usage: MediaUsageKey;
  entityId?: string;
  entityName?: string;
  cachedFolderIds?: Record<string, string>;
}) {
  const oauth2Client = createDriveOAuthClient();
  const drive = createDriveClient();
  if (!oauth2Client || !drive) {
    throw new Error('UNCONFIGURED');
  }

  const { target, syncedFolders } = await resolveTargetFolderForUpload(drive, {
    usage: params.usage,
    entityId: params.entityId,
    entityName: params.entityName,
    cachedFolderIds: params.cachedFolderIds,
  });

  const tokenRes = await oauth2Client.getAccessToken();
  const accessToken = tokenRes.token;
  if (!accessToken) {
    throw new Error('invalid_grant: Gagal memperoleh access token Google Drive.');
  }

  const initRes = await fetch(
    `${GOOGLE_RESUMABLE_UPLOAD_PREFIX}?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size,parents`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': params.mimeType,
        'X-Upload-Content-Length': String(params.totalSize),
      },
      body: JSON.stringify({
        name: params.fileName,
        parents: [target.folderId],
      }),
    }
  );

  if (!initRes.ok) {
    const text = await initRes.text().catch(() => '');
    const err = new Error(`Google Drive resumable init failed (${initRes.status}): ${text}`) as Error & {
      status?: number;
    };
    err.status = initRes.status;
    throw err;
  }

  const uploadUrl = initRes.headers.get('location') || '';
  if (!isTrustedGoogleUploadUrl(uploadUrl)) {
    throw new Error('Google Drive tidak mengembalikan URL sesi unggah resumable yang valid.');
  }

  const sessionToken = signResumableSession({
    uploadUrl,
    fileName: params.fileName,
    mimeType: params.mimeType,
    totalSize: params.totalSize,
    visibility: params.visibility,
    usage: params.usage,
    folderId: target.folderId,
    folderPath: target.folderPath,
    folderKey: target.folderKey,
    entityId: params.entityId,
    exp: Date.now() + 30 * 60 * 1000,
  });

  return {
    sessionToken,
    chunkSizeBytes: RESUMABLE_CHUNK_SIZE_BYTES,
    folderId: target.folderId,
    folderPath: target.folderPath,
    folderKey: target.folderKey,
    syncedFolders,
  };
}

export async function uploadResumableDriveChunk(params: {
  sessionToken: string;
  offset: number;
  chunkBase64: string;
}) {
  const session = verifyResumableSession(params.sessionToken);
  if (!session) {
    return {
      ok: false as const,
      status: 400,
      error: 'Sesi unggah resumable tidak valid atau sudah kedaluwarsa. Ulangi unggahan.',
    };
  }

  const chunkBuf = Buffer.from(params.chunkBase64, 'base64');
  if (chunkBuf.byteLength === 0 || chunkBuf.byteLength > 4 * 1024 * 1024) {
    return {
      ok: false as const,
      status: 400,
      error: 'Ukuran potongan (chunk) tidak valid.',
    };
  }

  const start = Math.max(0, Math.floor(params.offset));
  const end = start + chunkBuf.byteLength - 1;
  if (end >= session.totalSize) {
    return {
      ok: false as const,
      status: 400,
      error: 'Rentang byte chunk melebihi ukuran total berkas.',
    };
  }

  const putRes = await fetch(session.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': session.mimeType,
      'Content-Length': String(chunkBuf.byteLength),
      'Content-Range': `bytes ${start}-${end}/${session.totalSize}`,
    },
    body: chunkBuf,
  });

  if (putRes.status === 308) {
    return {
      ok: true as const,
      completed: false as const,
      nextOffset: end + 1,
    };
  }

  if (putRes.status === 200 || putRes.status === 201) {
    const data = (await putRes.json()) as {
      id?: string;
      name?: string;
      mimeType?: string;
      size?: string | number;
    };
    const fileId = data.id || '';
    if (!fileId) {
      return {
        ok: false as const,
        status: 502,
        error: 'Google Drive tidak mengembalikan ID berkas setelah unggahan selesai.',
      };
    }

    const drive = createDriveClient();
    let publicPermissionApplied = false;
    if (drive) {
      publicPermissionApplied = await setDriveFilePublicAccess(
        drive,
        fileId,
        session.visibility === 'public'
      );
    }

    const proxyUrl =
      session.visibility === 'private'
        ? `/api/media/${encodeURIComponent(fileId)}?visibility=private`
        : `/api/media/${encodeURIComponent(fileId)}`;

    console.info('[SYAMS DRIVE] resumable_upload_completed', {
      fileId,
      fileName: data.name || session.fileName,
      mimeType: data.mimeType || session.mimeType,
      sizeBytes: Number(data.size || session.totalSize),
      visibility: session.visibility,
      usage: session.usage,
      folderId: session.folderId,
      publicPermissionApplied,
      proxyUrl,
    });

    return {
      ok: true as const,
      completed: true as const,
      fileId,
      fileName: data.name || session.fileName,
      mimeType: data.mimeType || session.mimeType,
      sizeBytes: Number(data.size || session.totalSize),
      visibility: session.visibility,
      usage: session.usage,
      folderId: session.folderId,
      folderPath: session.folderPath,
      publicPermissionApplied,
      proxyUrl,
    };
  }

  const errText = await putRes.text().catch(() => '');
  const err = new Error(`Chunk upload failed (${putRes.status}): ${errText}`) as Error & {
    status?: number;
  };
  err.status = putRes.status;
  throw err;
}

// ---------------------------------------------------------------------------
// Direct Small File Upload, Replace & Delete
// ---------------------------------------------------------------------------

export async function uploadDirectToDrive(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  visibility: MediaVisibilityKey;
  usage: MediaUsageKey;
  entityId?: string;
  entityName?: string;
  cachedFolderIds?: Record<string, string>;
}) {
  const drive = createDriveClient();
  if (!drive) {
    throw new Error('UNCONFIGURED');
  }

  const { target, syncedFolders } = await resolveTargetFolderForUpload(drive, {
    usage: params.usage,
    entityId: params.entityId,
    entityName: params.entityName,
    cachedFolderIds: params.cachedFolderIds,
  });

  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: params.fileName,
      parents: [target.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: 'id,name,mimeType,size,parents',
  });

  const fileId = created.data.id || '';
  if (!fileId) {
    throw new Error('Google Drive tidak mengembalikan fileId.');
  }

  const publicPermissionApplied = await setDriveFilePublicAccess(
    drive,
    fileId,
    params.visibility === 'public'
  );

  const proxyUrl =
    params.visibility === 'private'
      ? `/api/media/${encodeURIComponent(fileId)}?visibility=private`
      : `/api/media/${encodeURIComponent(fileId)}`;

  console.info('[SYAMS DRIVE] direct_upload_completed', {
    fileId,
    fileName: created.data.name || params.fileName,
    mimeType: created.data.mimeType || params.mimeType,
    sizeBytes: Number(created.data.size || params.buffer.byteLength),
    visibility: params.visibility,
    usage: params.usage,
    folderId: target.folderId,
    publicPermissionApplied,
    proxyUrl,
  });

  return {
    fileId,
    fileName: created.data.name || params.fileName,
    mimeType: created.data.mimeType || params.mimeType,
    sizeBytes: Number(created.data.size || params.buffer.byteLength),
    visibility: params.visibility,
    usage: params.usage,
    folderId: target.folderId,
    folderPath: target.folderPath,
    syncedFolders,
    publicPermissionApplied,
    proxyUrl,
  };
}

export async function replaceDriveFileContent(params: {
  fileId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  visibility: MediaVisibilityKey;
}) {
  const drive = createDriveClient();
  if (!drive) {
    throw new Error('UNCONFIGURED');
  }

  const updated = await drive.files.update({
    fileId: params.fileId,
    supportsAllDrives: true,
    requestBody: {
      name: params.fileName,
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: 'id,name,mimeType,size',
  });

  const publicPermissionApplied = await setDriveFilePublicAccess(
    drive,
    params.fileId,
    params.visibility === 'public'
  );

  return {
    fileId: updated.data.id || params.fileId,
    fileName: updated.data.name || params.fileName,
    mimeType: updated.data.mimeType || params.mimeType,
    sizeBytes: Number(updated.data.size || params.buffer.byteLength),
    visibility: params.visibility,
    publicPermissionApplied,
    proxyUrl:
      params.visibility === 'private'
        ? `/api/media/${encodeURIComponent(params.fileId)}?visibility=private`
        : `/api/media/${encodeURIComponent(params.fileId)}`,
  };
}

export async function deleteDriveFile(fileId: string): Promise<{ deleted: true; alreadyMissing: boolean }> {
  const drive = createDriveClient();
  if (!drive) {
    throw new Error('UNCONFIGURED');
  }

  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
    return { deleted: true, alreadyMissing: false };
  } catch (err) {
    const info = classifyDriveError(err);
    if (info.status === 404) {
      return { deleted: true, alreadyMissing: true };
    }
    throw err;
  }
}

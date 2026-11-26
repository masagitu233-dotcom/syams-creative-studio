import {
  classifyDriveError,
  getDriveConfig,
  initResumableDriveUpload,
  isValidEntityId,
  normalizeMediaUsage,
  requireVerifiedAdmin,
  sanitizeFileName,
  validateUploadMetadata,
  verifyFirebaseBearerToken,
  type NetlifyEvent,
  type NetlifyResponse,
} from './_driveShared';

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const cfg = getDriveConfig();
  if (!cfg.configured) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error:
          'Google Drive API belum aktif. Konfigurasikan variabel lingkungan Google Drive di Netlify.',
      }),
    };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Payload inisialisasi unggahan tidak valid.' }),
    };
  }

  const usage = normalizeMediaUsage(body.usage);
  const visibility = body.visibility === 'public' ? 'public' : 'private';
  const isOrderAttachment = usage === 'order_attachment' && visibility === 'private';

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (isOrderAttachment) {
    const user = await verifyFirebaseBearerToken(authHeader);
    if (!user) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Autentikasi Google diperlukan untuk mengunggah lampiran.' }),
      };
    }
  } else {
    const adminAuth = await requireVerifiedAdmin(authHeader);
    if (!adminAuth.ok) {
      return {
        statusCode: adminAuth.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: adminAuth.error }),
      };
    }
  }

  const fileName = sanitizeFileName(typeof body.fileName === 'string' ? body.fileName : '');
  const mimeType =
    typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase().slice(0, 100) : '';
  const totalSize = Number(body.totalSize || 0);
  const entityId =
    typeof body.entityId === 'string' && isValidEntityId(body.entityId)
      ? body.entityId.trim()
      : undefined;
  const entityName =
    typeof body.entityName === 'string' ? body.entityName.trim().slice(0, 140) : undefined;
  const cachedFolderIds =
    body.cachedFolderIds && typeof body.cachedFolderIds === 'object'
      ? (body.cachedFolderIds as Record<string, string>)
      : undefined;

  const validation = validateUploadMetadata({
    fileName,
    mimeType,
    sizeBytes: totalSize,
    usage,
  });
  if (!validation.ok) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: validation.error }),
    };
  }

  try {
    const session = await initResumableDriveUpload({
      fileName,
      mimeType,
      totalSize,
      visibility,
      usage,
      entityId,
      entityName,
      cachedFolderIds,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    };
  } catch (err) {
    const info = classifyDriveError(err);
    return {
      statusCode: info.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: info.error, code: info.code }),
    };
  }
};

import {
  MAX_DIRECT_UPLOAD_BYTES,
  classifyDriveError,
  getDriveConfig,
  isValidEntityId,
  normalizeMediaUsage,
  requireVerifiedAdmin,
  sanitizeFileName,
  uploadDirectToDrive,
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
          'Google Drive API belum aktif. Konfigurasikan GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN pada Netlify Environment Variables.',
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
      body: JSON.stringify({ error: 'Payload JSON unggahan tidak valid.' }),
    };
  }

  const usage = normalizeMediaUsage(body.usage);
  const requestedVisibility = body.visibility === 'public' ? 'public' : 'private';
  const isOrderAttachment = usage === 'order_attachment' && requestedVisibility === 'private';

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (isOrderAttachment) {
    const user = await verifyFirebaseBearerToken(authHeader);
    if (!user) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Autentikasi Google terverifikasi diperlukan untuk mengunggah lampiran pesanan.' }),
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
  const contentBase64 = typeof body.contentBase64 === 'string' ? body.contentBase64 : '';
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

  if (!contentBase64) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Data berkas (contentBase64) tidak boleh kosong.' }),
    };
  }

  const buffer = Buffer.from(contentBase64, 'base64');
  if (buffer.byteLength > MAX_DIRECT_UPLOAD_BYTES) {
    return {
      statusCode: 413,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Berkas lebih dari 4 MB harus menggunakan jalur unggah bertahap (resumable upload).',
      }),
    };
  }

  const validation = validateUploadMetadata({
    fileName,
    mimeType,
    sizeBytes: buffer.byteLength,
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
    const result = await uploadDirectToDrive({
      fileName,
      mimeType,
      buffer,
      visibility: requestedVisibility,
      usage,
      entityId,
      entityName,
      cachedFolderIds,
    });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
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

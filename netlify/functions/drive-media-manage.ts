import {
  MAX_DIRECT_UPLOAD_BYTES,
  classifyDriveError,
  createDriveClient,
  deleteDriveFile,
  extractMediaParamsFromEvent,
  isValidDriveId,
  replaceDriveFileContent,
  requireVerifiedAdmin,
  sanitizeFileName,
  setDriveFilePublicAccess,
  validateUploadMetadata,
  type NetlifyEvent,
  type NetlifyResponse,
} from './_driveShared';

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const method = event.httpMethod;
  if (method !== 'DELETE' && method !== 'PATCH' && method !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const adminAuth = await requireVerifiedAdmin(authHeader);
  if (!adminAuth.ok) {
    return {
      statusCode: adminAuth.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: adminAuth.error }),
    };
  }

  let { fileId } = extractMediaParamsFromEvent(event);
  if (!fileId && typeof event.path === 'string') {
    const m = event.path.match(/\/(?:api\/drive\/media|\.netlify\/functions\/drive-media-manage)\/([a-zA-Z0-9_\-]{3,200})/);
    if (m?.[1]) fileId = decodeURIComponent(m[1]).trim();
  }
  if (!isValidDriveId(fileId)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Format fileId Google Drive tidak valid.' }),
    };
  }

  const drive = createDriveClient();
  if (!drive) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Google Drive API belum aktif pada environment server.',
      }),
    };
  }

  try {
    if (method === 'DELETE') {
      const result = await deleteDriveFile(fileId);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, ...result }),
      };
    }

    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(event.body || '{}') as Record<string, unknown>;
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Payload JSON tidak valid.' }),
      };
    }

    if (method === 'PATCH') {
      const visibility =
        body.visibility === 'public' || body.visibility === 'private' ? body.visibility : undefined;
      const newName =
        typeof body.fileName === 'string' && body.fileName.trim()
          ? sanitizeFileName(body.fileName)
          : undefined;

      if (newName) {
        await drive.files.update({
          fileId,
          supportsAllDrives: true,
          requestBody: { name: newName },
          fields: 'id,name',
        });
      }
      if (visibility) {
        await setDriveFilePublicAccess(drive, fileId, visibility === 'public');
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          fileName: newName,
          visibility,
          updated: true,
        }),
      };
    }

    // PUT: Replace file content in-place while preserving fileId
    const fileName = sanitizeFileName(typeof body.fileName === 'string' ? body.fileName : '');
    const mimeType =
      typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase().slice(0, 100) : '';
    const visibility = body.visibility === 'public' ? 'public' : 'private';
    const contentBase64 = typeof body.contentBase64 === 'string' ? body.contentBase64 : '';

    if (!contentBase64) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Berkas pengganti (contentBase64) wajib disertakan.' }),
      };
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    if (buffer.byteLength > MAX_DIRECT_UPLOAD_BYTES) {
      return {
        statusCode: 413,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Berkas pengganti langsung maksimal 4 MB. Untuk berkas lebih besar gunakan unggah baru lalu perbarui referensi.',
        }),
      };
    }

    const validation = validateUploadMetadata({
      fileName,
      mimeType,
      sizeBytes: buffer.byteLength,
      usage: 'other',
    });
    if (!validation.ok) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: validation.error }),
      };
    }

    const replaced = await replaceDriveFileContent({
      fileId,
      fileName,
      mimeType,
      buffer,
      visibility,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replaced),
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

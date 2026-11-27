import {
  classifyDriveError,
  coerceDriveBinaryToBuffer,
  createDriveClient,
  extractMediaParamsFromEvent,
  isValidDriveId,
  verifyFirebaseBearerToken,
  type NetlifyEvent,
  type NetlifyResponse,
} from './_driveShared';

// Netlify Lambda response payloads (JSON envelope + base64 body) cap at 6 MB.
// 3.5 MB raw = ~4.67 MB base64, leaving safe headroom below the 6 MB limit.
const MAX_LAMBDA_INLINE_BYTES = 3.5 * 1024 * 1024;

function buildPublicRedirectUrl(fileId: string, mimeType: string): string {
  if (mimeType.toLowerCase().startsWith('image/')) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`;
  }
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed.' }),
    };
  }

  const { fileId, visibility } = extractMediaParamsFromEvent(event);

  if (!isValidDriveId(fileId)) {
    console.warn('[SYAMS MEDIA PROXY] invalid_file_id', {
      hasQuery: Boolean(event.queryStringParameters?.fileId),
      hasRawQuery: Boolean(event.rawQuery),
      path: event.path || null,
    });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Format fileId Google Drive tidak valid.' }),
    };
  }

  if (visibility === 'private') {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const user = await verifyFirebaseBearerToken(authHeader);
    if (!user) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          error: 'Berkas privat hanya dapat diakses oleh pengguna terautentikasi.',
        }),
      };
    }
  }

  const drive = createDriveClient();
  if (!drive) {
    console.error('[SYAMS MEDIA PROXY] drive_unconfigured', { fileId, visibility });
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        error: 'Integrasi Google Drive API belum dikonfigurasi pada environment server.',
      }),
    };
  }

  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size',
      supportsAllDrives: true,
    });

    const mimeType = meta.data.mimeType || 'application/octet-stream';
    const sizeBytes = Number(meta.data.size || 0);
    const safeName = (meta.data.name || fileId).replace(/[^a-zA-Z0-9._-]/g, '_');

    if (visibility === 'public' && sizeBytes > MAX_LAMBDA_INLINE_BYTES) {
      const location = buildPublicRedirectUrl(fileId, mimeType);
      console.info('[SYAMS MEDIA PROXY] redirect_large_public', {
        fileId,
        mimeType,
        sizeBytes,
      });
      return {
        statusCode: 302,
        headers: {
          Location: location,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
        body: '',
      };
    }

    const contentRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    const buffer = await coerceDriveBinaryToBuffer(contentRes.data);
    if (buffer.byteLength === 0) {
      console.error('[SYAMS MEDIA PROXY] empty_drive_payload', {
        fileId,
        mimeType,
        metaSizeBytes: sizeBytes,
      });
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          error: 'Google Drive mengembalikan payload media kosong.',
          code: 'empty_drive_payload',
        }),
      };
    }

    // Safety guard in case Drive metadata omitted `size` for a large public file
    if (visibility === 'public' && buffer.byteLength > MAX_LAMBDA_INLINE_BYTES) {
      const location = buildPublicRedirectUrl(fileId, mimeType);
      console.info('[SYAMS MEDIA PROXY] redirect_oversized_buffer', {
        fileId,
        mimeType,
        actualBytes: buffer.byteLength,
      });
      return {
        statusCode: 302,
        headers: {
          Location: location,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
        body: '',
      };
    }

    console.info('[SYAMS MEDIA PROXY] serve_inline', {
      fileId,
      mimeType,
      bytes: buffer.byteLength,
      visibility,
    });

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control':
        visibility === 'public'
          ? 'public, max-age=86400, stale-while-revalidate=604800'
          : 'private, no-store',
    };
    if (visibility === 'public') {
      headers['Access-Control-Allow-Origin'] = '*';
    }

    return {
      statusCode: 200,
      isBase64Encoded: event.httpMethod !== 'HEAD',
      headers,
      body: event.httpMethod === 'HEAD' ? '' : buffer.toString('base64'),
    };
  } catch (err) {
    const info = classifyDriveError(err);
    console.error('[SYAMS MEDIA PROXY] serve_failed', {
      fileId,
      visibility,
      status: info.status,
      code: info.code,
    });
    return {
      statusCode: info.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: info.error, code: info.code }),
    };
  }
}

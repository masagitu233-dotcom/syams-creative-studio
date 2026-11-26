import {
  classifyDriveError,
  createDriveClient,
  isValidDriveId,
  verifyFirebaseBearerToken,
  type NetlifyEvent,
  type NetlifyResponse,
} from './_driveShared';

const MAX_LAMBDA_INLINE_BYTES = 4.5 * 1024 * 1024;

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const fileId = (event.queryStringParameters?.fileId || '').trim();
  const visibility = event.queryStringParameters?.visibility === 'private' ? 'private' : 'public';

  if (!isValidDriveId(fileId)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Format fileId Google Drive tidak valid.' }),
    };
  }

  if (visibility === 'private') {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const user = await verifyFirebaseBearerToken(authHeader);
    if (!user) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Berkas privat hanya dapat diakses oleh pengguna terautentikasi.' }),
      };
    }
  }

  const drive = createDriveClient();
  if (!drive) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Integrasi Google Drive API belum dikonfigurasi pada environment server.',
      }),
    };
  }

  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size',
    });

    const sizeBytes = Number(meta.data.size || 0);
    // Netlify Functions cap response bodies at ~6 MB; redirect large public video/media to Drive CDN directly
    if (visibility === 'public' && sizeBytes > MAX_LAMBDA_INLINE_BYTES) {
      return {
        statusCode: 302,
        headers: {
          Location: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
          'Cache-Control': 'public, max-age=3600',
        },
        body: '',
      };
    }

    const contentRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const mimeType = meta.data.mimeType || 'application/octet-stream';
    const safeName = (meta.data.name || fileId).replace(/[^a-zA-Z0-9._-]/g, '_');

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Cache-Control':
          visibility === 'public'
            ? 'public, max-age=86400, stale-while-revalidate=604800'
            : 'private, no-store',
      },
      body: Buffer.from(contentRes.data as ArrayBuffer).toString('base64'),
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

import { google } from 'googleapis';

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

function getDriveClient() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2 });
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const fileId = (event.queryStringParameters?.fileId || '').trim();
  const visibility = event.queryStringParameters?.visibility === 'private' ? 'private' : 'public';

  if (!/^[a-zA-Z0-9_\-]{3,200}$/.test(fileId)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Format fileId Google Drive tidak valid.' }),
    };
  }

  if (visibility === 'private') {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ') || authHeader.slice(7).trim().length < 20) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Autentikasi diperlukan untuk mengakses berkas privat.' }),
      };
    }
  }

  const drive = getDriveClient();
  if (!drive) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Kredensial Google Drive API belum diatur pada environment variables Netlify.',
      }),
    };
  }

  try {
    const meta = await drive.files.get({ fileId, fields: 'id,name,mimeType' });
    const fileRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const mimeType = meta.data.mimeType || 'application/octet-stream';
    const safeName = (meta.data.name || fileId).replace(/[^a-zA-Z0-9._-]/g, '_');
    const buffer = Buffer.from(fileRes.data as ArrayBuffer);

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
      body: buffer.toString('base64'),
    };
  } catch {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Berkas tidak ditemukan di Google Drive.' }),
    };
  }
}

import { Readable } from 'node:stream';
import { google } from 'googleapis';

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

const ALLOWED_MIME_PREFIXES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument',
  'application/msword',
  'text/plain',
];

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7).trim().length < 20) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Token autentikasi Google diperlukan.' }),
    };
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Kredensial Google Drive OAuth belum dikonfigurasi pada environment Netlify.',
      }),
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Format body JSON tidak valid.' }),
    };
  }

  const fileName = typeof parsed.fileName === 'string' ? parsed.fileName.trim().slice(0, 180) : '';
  const mimeType =
    typeof parsed.mimeType === 'string'
      ? parsed.mimeType.trim().slice(0, 100)
      : 'application/octet-stream';
  const visibility = parsed.visibility === 'public' ? 'public' : 'private';
  const contentBase64 = typeof parsed.contentBase64 === 'string' ? parsed.contentBase64 : '';

  const mimeOk = ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
  if (!fileName || !contentBase64 || !mimeOk) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Berkas tidak didukung atau payload tidak lengkap.' }),
    };
  }

  const buffer = Buffer.from(contentBase64, 'base64');
  if (buffer.byteLength === 0 || buffer.byteLength > 8 * 1024 * 1024) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Ukuran berkas harus antara 1 byte hingga 8 MB.' }),
    };
  }

  const folderId =
    visibility === 'public'
      ? process.env.GOOGLE_DRIVE_PUBLIC_FOLDER_ID || ''
      : process.env.GOOGLE_DRIVE_PRIVATE_FOLDER_ID || '';

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2 });

    const uploaded = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id,name,mimeType,size',
    });

    const fileId = uploaded.data.id || '';
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        fileName: uploaded.data.name || fileName,
        mimeType: uploaded.data.mimeType || mimeType,
        sizeBytes: Number(uploaded.data.size || buffer.byteLength),
        visibility,
        proxyUrl:
          visibility === 'private'
            ? `/api/media/${encodeURIComponent(fileId)}?visibility=private`
            : `/api/media/${encodeURIComponent(fileId)}`,
      }),
    };
  } catch {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Gagal mengunggah berkas ke Google Drive.' }),
    };
  }
}

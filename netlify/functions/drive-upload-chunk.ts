import {
  classifyDriveError,
  getDriveConfig,
  uploadResumableDriveChunk,
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
      body: JSON.stringify({ error: 'Google Drive API belum dikonfigurasi.' }),
    };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const user = await verifyFirebaseBearerToken(authHeader);
  if (!user) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Autentikasi Google diperlukan untuk melanjutkan unggahan.' }),
    };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Payload chunk unggahan tidak valid.' }),
    };
  }

  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken.trim() : '';
  const offset = Number(body.offset ?? 0);
  const chunkBase64 = typeof body.chunkBase64 === 'string' ? body.chunkBase64 : '';

  if (!sessionToken || !chunkBase64 || !Number.isFinite(offset) || offset < 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Parameter chunk unggahan tidak lengkap.' }),
    };
  }

  try {
    const result = await uploadResumableDriveChunk({
      sessionToken,
      offset,
      chunkBase64,
    });

    if (!result.ok) {
      return {
        statusCode: result.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: result.error }),
      };
    }

    return {
      statusCode: result.completed ? 201 : 200,
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

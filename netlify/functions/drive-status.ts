import {
  CATEGORY_FOLDER_NAMES,
  STUDIO_ROOT_FOLDER_NAME,
  getDriveConfig,
  type NetlifyEvent,
  type NetlifyResponse,
} from './_driveShared';

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const cfg = getDriveConfig();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({
      configured: cfg.configured,
      hasPublicFolder: Boolean(cfg.publicFolderId),
      hasPrivateFolder: Boolean(cfg.privateFolderId),
      hasRootFolderEnv: Boolean(cfg.rootFolderId),
      rootFolderName: STUDIO_ROOT_FOLDER_NAME,
      categoryFolders: CATEGORY_FOLDER_NAMES,
      mode: cfg.configured ? 'live_google_drive' : 'unconfigured',
      message: cfg.configured
        ? 'Google Drive API aktif dan siap mengelola struktur folder serta media SYAMS CREATIVE STUDIO.'
        : 'Variabel GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN belum diisi pada Netlify Environment Variables.',
    }),
  };
};

import {
  classifyDriveError,
  createDriveClient,
  ensureStudioFolderStructure,
  isValidEntityId,
  normalizeMediaUsage,
  requireVerifiedAdmin,
  resolveTargetFolderForUpload,
  type NetlifyEvent,
  type NetlifyResponse,
} from './_driveShared';

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
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

  const drive = createDriveClient();
  if (!drive) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error:
          'Google Drive API belum aktif. Konfigurasikan GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN pada environment server.',
      }),
    };
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    body = {};
  }

  const cachedFolderIds =
    body.cachedFolderIds && typeof body.cachedFolderIds === 'object'
      ? (body.cachedFolderIds as Record<string, string>)
      : undefined;
  const usage = body.usage ? normalizeMediaUsage(body.usage) : undefined;
  const entityId =
    typeof body.entityId === 'string' && isValidEntityId(body.entityId)
      ? body.entityId.trim()
      : undefined;
  const entityName =
    typeof body.entityName === 'string' ? body.entityName.trim().slice(0, 140) : undefined;

  try {
    if (usage && entityId && (usage === 'product' || usage === 'service')) {
      const resolved = await resolveTargetFolderForUpload(drive, {
        usage,
        entityId,
        entityName,
        cachedFolderIds,
      });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: resolved.target,
          folders: resolved.syncedFolders,
        }),
      };
    }

    const structure = await ensureStudioFolderStructure(drive, cachedFolderIds);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        root: structure.root,
        categories: structure.categories,
        folders: structure.allFolders,
      }),
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

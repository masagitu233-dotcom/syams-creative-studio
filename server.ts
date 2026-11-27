import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  generateOrderCode,
  isValidWhatsappNumber,
} from './src/utils/studioLogic';
import {
  CATEGORY_FOLDER_NAMES,
  MAX_DIRECT_UPLOAD_BYTES,
  STUDIO_ROOT_FOLDER_NAME,
  classifyDriveError,
  createDriveClient,
  deleteDriveFile,
  ensureStudioFolderStructure,
  getDriveConfig,
  initResumableDriveUpload,
  isValidDriveId,
  isValidEntityId,
  normalizeMediaUsage,
  replaceDriveFileContent,
  requireVerifiedAdmin,
  resolveTargetFolderForUpload,
  sanitizeFileName,
  setDriveFilePublicAccess,
  uploadDirectToDrive,
  uploadResumableDriveChunk,
  validateUploadMetadata,
  verifyFirebaseBearerToken,
} from './netlify/functions/_driveShared';

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'syams-creative-studio' });
  });

  // Google Drive integration status check (zero credentials exposed)
  app.get('/api/drive/status', (_req: Request, res: Response) => {
    const cfg = getDriveConfig();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      configured: cfg.configured,
      hasPublicFolder: Boolean(cfg.publicFolderId),
      hasPrivateFolder: Boolean(cfg.privateFolderId),
      hasRootFolderEnv: Boolean(cfg.rootFolderId),
      rootFolderName: STUDIO_ROOT_FOLDER_NAME,
      categoryFolders: CATEGORY_FOLDER_NAMES,
      mode: cfg.configured ? 'live_google_drive' : 'unconfigured',
      message: cfg.configured
        ? 'Google Drive API aktif dan siap mengelola struktur folder serta media SYAMS CREATIVE STUDIO.'
        : 'Variabel GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN belum diisi di environment server.',
    });
  });

  // Server-side order validation & unique order code generator
  app.post('/api/orders/prepare', async (req: Request, res: Response) => {
    const user = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Validasi gagal: autentikasi Google terverifikasi diperlukan.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const serviceId = typeof body.serviceId === 'string' ? body.serviceId.trim() : '';
    const whatsapp = typeof body.customerWhatsapp === 'string' ? body.customerWhatsapp.trim() : '';
    const projectTitle = typeof body.projectTitle === 'string' ? body.projectTitle.trim() : '';
    const projectBrief = typeof body.projectBrief === 'string' ? body.projectBrief.trim() : '';
    const deadline = typeof body.deadline === 'string' ? body.deadline.trim() : '';
    const quantityEstimate = Number(body.quantityEstimate ?? 1);

    if (!/^[a-zA-Z0-9_\-]+$/.test(serviceId)) {
      res.status(400).json({ error: 'Validasi gagal: ID layanan tidak valid.' });
      return;
    }
    if (whatsapp.length > 0 && !isValidWhatsappNumber(whatsapp)) {
      res.status(400).json({ error: 'Validasi gagal: format nomor WhatsApp tidak valid.' });
      return;
    }
    if (projectTitle.length < 3 || projectTitle.length > 160) {
      res.status(400).json({ error: 'Validasi gagal: judul proyek harus 3–160 karakter.' });
      return;
    }
    if (projectBrief.length < 15 || projectBrief.length > 3000) {
      res.status(400).json({ error: 'Validasi gagal: deskripsi pekerjaan minimal 15 karakter.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      res.status(400).json({ error: 'Validasi gagal: format tanggal tenggat tidak valid.' });
      return;
    }
    if (!Number.isFinite(quantityEstimate) || quantityEstimate < 1 || quantityEstimate > 1000) {
      res.status(400).json({ error: 'Validasi gagal: estimasi jumlah harus 1–1000.' });
      return;
    }

    res.json({
      orderCode: generateOrderCode(new Date()),
      validatedAt: new Date().toISOString(),
    });
  });

  // Google Drive media proxy endpoint by fileId (supports Range for video, public cache & private auth guard)
  app.get('/api/media/:fileId', async (req: Request, res: Response) => {
    const fileId = String(req.params.fileId || '').trim();
    const visibility = req.query.visibility === 'private' ? 'private' : 'public';

    if (!isValidDriveId(fileId)) {
      res.status(400).json({ error: 'Format fileId Google Drive tidak valid.' });
      return;
    }

    if (visibility === 'private') {
      const user = await verifyFirebaseBearerToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Berkas privat hanya dapat diakses pengguna terautentikasi.' });
        return;
      }
    }

    const drive = createDriveClient();
    if (!drive) {
      res.status(503).json({
        error: 'Integrasi Google Drive API belum dikonfigurasi pada environment server.',
      });
      return;
    }

    try {
      const meta = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size',
        supportsAllDrives: true,
      });
      const mimeType = meta.data.mimeType || 'application/octet-stream';
      const safeName = (meta.data.name || fileId).replace(/[^a-zA-Z0-9._-]/g, '_');
      const totalSize = Number(meta.data.size || 0);
      const rangeHeader = req.headers.range;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (visibility === 'public') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      } else {
        res.setHeader('Cache-Control', 'private, no-store');
      }

      if (rangeHeader && totalSize > 0) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = Number(match[1]);
          const end = match[2] ? Math.min(Number(match[2]), totalSize - 1) : totalSize - 1;
          if (start <= end && start < totalSize) {
            const rangeRes = await drive.files.get(
              { fileId, alt: 'media', supportsAllDrives: true },
              {
                responseType: 'stream',
                headers: { Range: `bytes=${start}-${end}` },
              }
            );
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
            res.setHeader('Content-Length', String(end - start + 1));
            (rangeRes.data as NodeJS.ReadableStream).pipe(res);
            return;
          }
        }
      }

      const streamRes = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );
      if (totalSize > 0) {
        res.setHeader('Content-Length', String(totalSize));
      }
      (streamRes.data as NodeJS.ReadableStream).pipe(res);
    } catch (err) {
      const info = classifyDriveError(err);
      console.error('[SYAMS EXPRESS MEDIA] serve_failed', {
        fileId,
        visibility,
        status: info.status,
        code: info.code,
      });
      res.status(info.status).json({ error: info.error, code: info.code });
    }
  });

  // Sync/Ensure automatic Google Drive studio folder tree (Admin only)
  app.post('/api/drive/folders', async (req: Request, res: Response) => {
    const adminAuth = await requireVerifiedAdmin(req.headers.authorization);
    if (!adminAuth.ok) {
      res.status(adminAuth.status).json({ error: adminAuth.error });
      return;
    }

    const drive = createDriveClient();
    if (!drive) {
      res.status(503).json({
        error:
          'Google Drive API belum aktif. Tambahkan GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN pada environment server.',
      });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
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
        res.json({ target: resolved.target, folders: resolved.syncedFolders });
        return;
      }

      const structure = await ensureStudioFolderStructure(drive, cachedFolderIds);
      res.json({
        root: structure.root,
        categories: structure.categories,
        folders: structure.allFolders,
      });
    } catch (err) {
      const info = classifyDriveError(err);
      res.status(info.status).json({ error: info.error, code: info.code });
    }
  });

  // Direct upload for files <= 4 MB
  app.post('/api/drive/upload', async (req: Request, res: Response) => {
    const cfg = getDriveConfig();
    if (!cfg.configured) {
      res.status(503).json({
        error:
          'Google Drive API belum aktif. Tambahkan GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN pada environment server.',
      });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const usage = normalizeMediaUsage(body.usage);
    const visibility = body.visibility === 'public' ? 'public' : 'private';
    const isOrderAttachment = usage === 'order_attachment' && visibility === 'private';

    if (isOrderAttachment) {
      const user = await verifyFirebaseBearerToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Autentikasi Google diperlukan untuk mengunggah lampiran.' });
        return;
      }
    } else {
      const adminAuth = await requireVerifiedAdmin(req.headers.authorization);
      if (!adminAuth.ok) {
        res.status(adminAuth.status).json({ error: adminAuth.error });
        return;
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
      res.status(400).json({ error: 'Payload berkas tidak boleh kosong.' });
      return;
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    if (buffer.byteLength > MAX_DIRECT_UPLOAD_BYTES) {
      res.status(413).json({
        error: 'Berkas lebih dari 4 MB harus menggunakan unggah bertahap (resumable upload).',
      });
      return;
    }

    const validation = validateUploadMetadata({
      fileName,
      mimeType,
      sizeBytes: buffer.byteLength,
      usage,
    });
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const result = await uploadDirectToDrive({
        fileName,
        mimeType,
        buffer,
        visibility,
        usage,
        entityId,
        entityName,
        cachedFolderIds,
      });
      res.status(201).json(result);
    } catch (err) {
      const info = classifyDriveError(err);
      res.status(info.status).json({ error: info.error, code: info.code });
    }
  });

  // Resumable upload initialization (supports large images & videos up to 50 MB)
  app.post('/api/drive/upload-init', async (req: Request, res: Response) => {
    const cfg = getDriveConfig();
    if (!cfg.configured) {
      res.status(503).json({ error: 'Google Drive API belum aktif pada environment server.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const usage = normalizeMediaUsage(body.usage);
    const visibility = body.visibility === 'public' ? 'public' : 'private';
    const isOrderAttachment = usage === 'order_attachment' && visibility === 'private';

    if (isOrderAttachment) {
      const user = await verifyFirebaseBearerToken(req.headers.authorization);
      if (!user) {
        res.status(401).json({ error: 'Autentikasi Google diperlukan.' });
        return;
      }
    } else {
      const adminAuth = await requireVerifiedAdmin(req.headers.authorization);
      if (!adminAuth.ok) {
        res.status(adminAuth.status).json({ error: adminAuth.error });
        return;
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
      res.status(400).json({ error: validation.error });
      return;
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
      res.json(session);
    } catch (err) {
      const info = classifyDriveError(err);
      res.status(info.status).json({ error: info.error, code: info.code });
    }
  });

  // Resumable upload chunk relay
  app.post('/api/drive/upload-chunk', async (req: Request, res: Response) => {
    const cfg = getDriveConfig();
    if (!cfg.configured) {
      res.status(503).json({ error: 'Google Drive API belum dikonfigurasi.' });
      return;
    }

    const user = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Autentikasi Google diperlukan untuk melanjutkan unggahan.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken.trim() : '';
    const offset = Number(body.offset ?? 0);
    const chunkBase64 = typeof body.chunkBase64 === 'string' ? body.chunkBase64 : '';

    if (!sessionToken || !chunkBase64 || !Number.isFinite(offset) || offset < 0) {
      res.status(400).json({ error: 'Parameter chunk unggahan tidak lengkap.' });
      return;
    }

    try {
      const result = await uploadResumableDriveChunk({
        sessionToken,
        offset,
        chunkBase64,
      });
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.status(result.completed ? 201 : 200).json(result);
    } catch (err) {
      const info = classifyDriveError(err);
      res.status(info.status).json({ error: info.error, code: info.code });
    }
  });

  // Admin Media Management: DELETE, PATCH (visibility/rename), PUT (replace content)
  app.delete('/api/drive/media/:fileId', async (req: Request, res: Response) => {
    const adminAuth = await requireVerifiedAdmin(req.headers.authorization);
    if (!adminAuth.ok) {
      res.status(adminAuth.status).json({ error: adminAuth.error });
      return;
    }

    const fileId = String(req.params.fileId || '').trim();
    if (!isValidDriveId(fileId)) {
      res.status(400).json({ error: 'Format fileId Google Drive tidak valid.' });
      return;
    }

    try {
      const result = await deleteDriveFile(fileId);
      res.json({ fileId, ...result });
    } catch (err) {
      const info = classifyDriveError(err);
      res.status(info.status).json({ error: info.error, code: info.code });
    }
  });

  app.patch('/api/drive/media/:fileId', async (req: Request, res: Response) => {
    const adminAuth = await requireVerifiedAdmin(req.headers.authorization);
    if (!adminAuth.ok) {
      res.status(adminAuth.status).json({ error: adminAuth.error });
      return;
    }

    const fileId = String(req.params.fileId || '').trim();
    if (!isValidDriveId(fileId)) {
      res.status(400).json({ error: 'Format fileId Google Drive tidak valid.' });
      return;
    }

    const drive = createDriveClient();
    if (!drive) {
      res.status(503).json({ error: 'Google Drive API belum aktif.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const visibility =
      body.visibility === 'public' || body.visibility === 'private' ? body.visibility : undefined;
    const newName =
      typeof body.fileName === 'string' && body.fileName.trim()
        ? sanitizeFileName(body.fileName)
        : undefined;

    try {
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
      res.json({ fileId, fileName: newName, visibility, updated: true });
    } catch (err) {
      const info = classifyDriveError(err);
      res.status(info.status).json({ error: info.error, code: info.code });
    }
  });

  app.put('/api/drive/media/:fileId', async (req: Request, res: Response) => {
    const adminAuth = await requireVerifiedAdmin(req.headers.authorization);
    if (!adminAuth.ok) {
      res.status(adminAuth.status).json({ error: adminAuth.error });
      return;
    }

    const fileId = String(req.params.fileId || '').trim();
    if (!isValidDriveId(fileId)) {
      res.status(400).json({ error: 'Format fileId Google Drive tidak valid.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const fileName = sanitizeFileName(typeof body.fileName === 'string' ? body.fileName : '');
    const mimeType =
      typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase().slice(0, 100) : '';
    const visibility = body.visibility === 'public' ? 'public' : 'private';
    const contentBase64 = typeof body.contentBase64 === 'string' ? body.contentBase64 : '';

    if (!contentBase64) {
      res.status(400).json({ error: 'Payload berkas pengganti tidak boleh kosong.' });
      return;
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    if (buffer.byteLength > MAX_DIRECT_UPLOAD_BYTES) {
      res.status(413).json({ error: 'Berkas pengganti langsung maksimal 4 MB.' });
      return;
    }

    const validation = validateUploadMetadata({
      fileName,
      mimeType,
      sizeBytes: buffer.byteLength,
      usage: 'other',
    });
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const replaced = await replaceDriveFileContent({
        fileId,
        fileName,
        mimeType,
        buffer,
        visibility,
      });
      res.json(replaced);
    } catch (err) {
      const info = classifyDriveError(err);
      res.status(info.status).json({ error: info.error, code: info.code });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SYAMS CREATIVE STUDIO running on http://localhost:${PORT}`);
  });
}

void startServer();

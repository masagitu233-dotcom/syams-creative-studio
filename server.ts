import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import {
  generateOrderCode,
  isValidWhatsappNumber,
} from './src/utils/studioLogic';

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

function getDriveConfig() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
  const publicFolderId = process.env.GOOGLE_DRIVE_PUBLIC_FOLDER_ID || '';
  const privateFolderId = process.env.GOOGLE_DRIVE_PRIVATE_FOLDER_ID || '';
  const configured = Boolean(clientId && clientSecret && refreshToken);
  return {
    clientId,
    clientSecret,
    redirectUri,
    refreshToken,
    publicFolderId,
    privateFolderId,
    configured,
  };
}

function createDriveClient() {
  const cfg = getDriveConfig();
  if (!cfg.configured) return null;
  const oauth2Client = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
  oauth2Client.setCredentials({ refresh_token: cfg.refreshToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 20 ? token : null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'syams-creative-studio' });
  });

  // Google Drive integration status check (no secrets exposed)
  app.get('/api/drive/status', (_req: Request, res: Response) => {
    const cfg = getDriveConfig();
    res.json({
      configured: cfg.configured,
      hasPublicFolder: Boolean(cfg.publicFolderId),
      hasPrivateFolder: Boolean(cfg.privateFolderId),
      mode: cfg.configured ? 'live_google_drive' : 'unconfigured',
      message: cfg.configured
        ? 'Google Drive API aktif dan siap menerima unggahan serta melayani media.'
        : 'Variabel GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN belum diisi di server.',
    });
  });

  // Server-side order validation & unique order code generator
  app.post('/api/orders/prepare', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Validasi gagal: autentikasi Google diperlukan.' });
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
    if (!isValidWhatsappNumber(whatsapp)) {
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

  // Google Drive media proxy endpoint by fileId (supports public caching & private auth guard)
  app.get('/api/media/:fileId', async (req: Request, res: Response) => {
    const fileId = String(req.params.fileId || '').trim();
    const visibility = req.query.visibility === 'private' ? 'private' : 'public';

    if (!/^[a-zA-Z0-9_\-]{3,200}$/.test(fileId)) {
      res.status(400).json({ error: 'Format fileId Google Drive tidak valid.' });
      return;
    }

    if (visibility === 'private') {
      const token = extractBearerToken(req);
      if (!token) {
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
      });
      const contentRes = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      const mimeType = meta.data.mimeType || 'application/octet-stream';
      const safeName = (meta.data.name || fileId).replace(/[^a-zA-Z0-9._-]/g, '_');

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
      if (visibility === 'public') {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      } else {
        res.setHeader('Cache-Control', 'private, no-store');
      }
      res.send(Buffer.from(contentRes.data as ArrayBuffer));
    } catch {
      res.status(404).json({ error: 'Berkas tidak ditemukan di Google Drive atau akses ditolak.' });
    }
  });

  // Google Drive authenticated upload endpoint
  app.post('/api/drive/upload', async (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Autentikasi Google diperlukan untuk mengunggah berkas.' });
      return;
    }

    const cfg = getDriveConfig();
    const drive = createDriveClient();
    if (!drive) {
      res.status(503).json({
        error:
          'Google Drive API belum aktif. Tambahkan GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN pada environment server.',
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const fileName = typeof body.fileName === 'string' ? body.fileName.trim().slice(0, 180) : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().slice(0, 100) : 'application/octet-stream';
    const visibility = body.visibility === 'public' ? 'public' : 'private';
    const contentBase64 = typeof body.contentBase64 === 'string' ? body.contentBase64 : '';

    const allowedMimePrefixes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument',
      'application/msword',
      'text/plain',
    ];
    const mimeAllowed = allowedMimePrefixes.some((prefix) => mimeType.startsWith(prefix));
    if (!fileName || !contentBase64 || !mimeAllowed) {
      res.status(400).json({ error: 'Jenis berkas atau payload unggahan tidak valid.' });
      return;
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    if (buffer.byteLength === 0 || buffer.byteLength > 8 * 1024 * 1024) {
      res.status(400).json({ error: 'Ukuran berkas harus antara 1 byte hingga 8 MB.' });
      return;
    }

    const folderId = visibility === 'public' ? cfg.publicFolderId : cfg.privateFolderId;
    try {
      const created = await drive.files.create({
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

      const fileId = created.data.id || '';
      res.status(201).json({
        fileId,
        fileName: created.data.name || fileName,
        mimeType: created.data.mimeType || mimeType,
        sizeBytes: Number(created.data.size || buffer.byteLength),
        visibility,
        proxyUrl:
          visibility === 'private'
            ? `/api/media/${encodeURIComponent(fileId)}?visibility=private`
            : `/api/media/${encodeURIComponent(fileId)}`,
      });
    } catch {
      res.status(502).json({ error: 'Gagal mengunggah berkas ke Google Drive.' });
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

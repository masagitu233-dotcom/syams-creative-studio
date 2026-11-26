import {
  generateOrderCode,
  isValidWhatsappNumber,
} from '../../src/utils/studioLogic';

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

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7).trim().length < 20) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Validasi gagal: autentikasi Google diperlukan.' }),
    };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Format payload JSON tidak valid.' }),
    };
  }

  const serviceId = typeof body.serviceId === 'string' ? body.serviceId.trim() : '';
  const whatsapp = typeof body.customerWhatsapp === 'string' ? body.customerWhatsapp.trim() : '';
  const projectTitle = typeof body.projectTitle === 'string' ? body.projectTitle.trim() : '';
  const projectBrief = typeof body.projectBrief === 'string' ? body.projectBrief.trim() : '';
  const deadline = typeof body.deadline === 'string' ? body.deadline.trim() : '';
  const quantityEstimate = Number(body.quantityEstimate ?? 1);

  if (!/^[a-zA-Z0-9_\-]+$/.test(serviceId)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Validasi gagal: ID layanan tidak valid.' }),
    };
  }
  if (whatsapp.length > 0 && !isValidWhatsappNumber(whatsapp)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Validasi gagal: nomor WhatsApp Indonesia tidak valid.' }),
    };
  }
  if (projectTitle.length < 3 || projectTitle.length > 160) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Validasi gagal: judul proyek harus 3–160 karakter.' }),
    };
  }
  if (projectBrief.length < 15 || projectBrief.length > 3000) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Validasi gagal: deskripsi pekerjaan minimal 15 karakter.' }),
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Validasi gagal: format tanggal tenggat tidak valid.' }),
    };
  }
  if (!Number.isFinite(quantityEstimate) || quantityEstimate < 1 || quantityEstimate > 1000) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Validasi gagal: estimasi jumlah harus 1–1000.' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderCode: generateOrderCode(new Date()),
      validatedAt: new Date().toISOString(),
    }),
  };
}

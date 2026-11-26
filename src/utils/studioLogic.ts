import type {
  DigitalProductCategory,
  DigitalProductItem,
  MediaGalleryItem,
  MediaUsage,
  MediaVisibility,
  OrderItem,
  OrderStatus,
  PortfolioItem,
  ServiceCategory,
  ServiceItem,
  SiteSettings,
  VisualThemeMode,
} from '../types/studio';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  web_app: 'Website & Aplikasi',
  video: 'Editing Video',
  desain: 'Desain Grafis',
  presentasi: 'Materi PPT',
  naskah: 'Naskah & Pidato',
};

export const FAQ_CATEGORY_LABELS: Record<'pemesanan' | 'harga' | 'revisi' | 'teknis', string> = {
  pemesanan: 'Pemesanan',
  harga: 'Harga & Estimasi',
  revisi: 'Revisi & Pengiriman',
  teknis: 'Teknis & Berkas',
};

export interface OrderStatusMeta {
  value: OrderStatus;
  label: string;
  shortLabel: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  menunggu_konfirmasi: {
    value: 'menunggu_konfirmasi',
    label: 'Menunggu Konfirmasi',
    shortLabel: 'Menunggu',
    description: 'Pesanan masuk dan menunggu peninjauan serta konfirmasi biaya final dari admin.',
    bgClass: 'bg-[#F3C95B]',
    textClass: 'text-[#171717]',
    borderClass: 'border-[#171717]',
  },
  harga_dikonfirmasi: {
    value: 'harga_dikonfirmasi',
    label: 'Harga Dikonfirmasi',
    shortLabel: 'Dikonfirmasi',
    description: 'Biaya final dan ruang lingkup pekerjaan telah ditetapkan oleh admin studio.',
    bgClass: 'bg-[#8ACCD5]',
    textClass: 'text-[#171717]',
    borderClass: 'border-[#171717]',
  },
  dalam_pengerjaan: {
    value: 'dalam_pengerjaan',
    label: 'Dalam Pengerjaan',
    shortLabel: 'Diproses',
    description: 'Tim kreatif sedang mengerjakan proyek sesuai brief dan tenggat waktu.',
    bgClass: 'bg-[#0F3D3A]',
    textClass: 'text-[#F8F8E1]',
    borderClass: 'border-[#171717]',
  },
  revisi: {
    value: 'revisi',
    label: 'Tahap Revisi',
    shortLabel: 'Revisi',
    description: 'Penyesuaian minor sedang dilakukan berdasarkan masukan pelanggan.',
    bgClass: 'bg-[#F1F1D3]',
    textClass: 'text-[#6C151E]',
    borderClass: 'border-[#6C151E]',
  },
  selesai: {
    value: 'selesai',
    label: 'Selesai',
    shortLabel: 'Selesai',
    description: 'Hasil akhir telah diserahkan dan proyek dinyatakan selesai.',
    bgClass: 'bg-[#0F3D3A]',
    textClass: 'text-[#F3C95B]',
    borderClass: 'border-[#171717]',
  },
  dibatalkan: {
    value: 'dibatalkan',
    label: 'Dibatalkan',
    shortLabel: 'Dibatalkan',
    description: 'Pesanan dibatalkan sebelum tahap pengerjaan dimulai.',
    bgClass: 'bg-[#6C151E]',
    textClass: 'text-[#F8F8E1]',
    borderClass: 'border-[#171717]',
  },
};

export function formatRupiah(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `Rp${new Intl.NumberFormat('id-ID').format(safeAmount)}`;
}

export function formatServicePriceLabel(priceMin: number, priceMax: number, priceUnit: string): string {
  const unitClean = priceUnit.trim();
  const suffix = unitClean && unitClean !== 'proyek' ? ` ${unitClean}` : '';
  if (priceMin === priceMax || priceMax <= priceMin) {
    return `${formatRupiah(priceMin)}${suffix}`;
  }
  return `${formatRupiah(priceMin)}–${formatRupiah(priceMax)}${suffix}`;
}

export function generateOrderCode(date: Date = new Date(), randomSuffix?: string): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = randomSuffix?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (!suffix || suffix.length < 4) {
    let generated = '';
    for (let i = 0; i < 6; i += 1) {
      generated += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    suffix = generated;
  }
  return `SCS-${year}${month}${day}-${suffix}`;
}

export function normalizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/[^0-9+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+62')) return `62${digits.slice(3)}`;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits.replace(/^\+/, '');
}

export function isValidWhatsappNumber(raw: string): boolean {
  const normalized = normalizeWhatsappNumber(raw);
  return /^62[0-9]{8,14}$/.test(normalized);
}

export function buildWhatsappLink(phone: string, message?: string): string {
  const normalized = normalizeWhatsappNumber(phone);
  if (!normalized) return '#';
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function sanitizeExternalUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function buildMediaProxyUrl(fileId: string, visibility: MediaVisibility = 'public'): string {
  const cleanId = fileId.trim();
  if (!/^[a-zA-Z0-9_\-]+$/.test(cleanId)) {
    return '';
  }
  const query = visibility === 'private' ? '?visibility=private' : '';
  return `/api/media/${encodeURIComponent(cleanId)}${query}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export interface OrderValidationInput {
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  serviceId: string;
  quantityEstimate: number;
  projectTitle: string;
  projectBrief: string;
  deadline: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateOrderInput(input: OrderValidationInput, todayIso?: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.customerName || input.customerName.trim().length < 2) {
    errors.customerName = 'Nama lengkap minimal 2 karakter.';
  } else if (input.customerName.trim().length > 120) {
    errors.customerName = 'Nama lengkap maksimal 120 karakter.';
  }

  if (!input.customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail.trim())) {
    errors.customerEmail = 'Alamat email Google tidak valid.';
  }

  if (!input.customerWhatsapp || !isValidWhatsappNumber(input.customerWhatsapp)) {
    errors.customerWhatsapp = 'Masukkan nomor WhatsApp Indonesia yang valid (contoh: 081234567890).';
  }

  if (!input.serviceId || !/^[a-zA-Z0-9_\-]+$/.test(input.serviceId)) {
    errors.serviceId = 'Silakan pilih layanan terlebih dahulu.';
  }

  if (!Number.isFinite(input.quantityEstimate) || input.quantityEstimate < 1 || input.quantityEstimate > 1000) {
    errors.quantityEstimate = 'Estimasi jumlah harus antara 1 hingga 1000.';
  }

  if (!input.projectTitle || input.projectTitle.trim().length < 3) {
    errors.projectTitle = 'Judul proyek minimal 3 karakter.';
  } else if (input.projectTitle.trim().length > 160) {
    errors.projectTitle = 'Judul proyek maksimal 160 karakter.';
  }

  if (!input.projectBrief || input.projectBrief.trim().length < 15) {
    errors.projectBrief = 'Jelaskan detail kebutuhan pekerjaan minimal 15 karakter.';
  } else if (input.projectBrief.trim().length > 3000) {
    errors.projectBrief = 'Deskripsi pekerjaan maksimal 3000 karakter.';
  }

  if (!input.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) {
    errors.deadline = 'Pilih tanggal tenggat pengerjaan yang valid.';
  } else {
    const compareToday = todayIso || new Date().toISOString().slice(0, 10);
    if (input.deadline < compareToday) {
      errors.deadline = 'Tenggat pengerjaan tidak boleh sebelum hari ini.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ContactValidationInput {
  name: string;
  email: string;
  whatsapp?: string;
  subject: string;
  message: string;
}

export function validateContactInput(input: ContactValidationInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Nama minimal 2 karakter.';
  }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = 'Masukkan alamat email yang valid.';
  }
  if (input.whatsapp && input.whatsapp.trim().length > 0 && !isValidWhatsappNumber(input.whatsapp)) {
    errors.whatsapp = 'Format nomor WhatsApp tidak valid (contoh: 081234567890).';
  }
  if (!input.subject || input.subject.trim().length < 3) {
    errors.subject = 'Subjek pesan minimal 3 karakter.';
  }
  if (!input.message || input.message.trim().length < 10) {
    errors.message = 'Isi pesan minimal 10 karakter agar tim kami dapat membantu.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface OrderDashboardStats {
  total: number;
  menungguKonfirmasi: number;
  hargaDikonfirmasi: number;
  dalamPengerjaan: number;
  revisi: number;
  selesai: number;
  dibatalkan: number;
  totalConfirmedRevenue: number;
}

export function computeOrderStats(orders: OrderItem[]): OrderDashboardStats {
  const stats: OrderDashboardStats = {
    total: orders.length,
    menungguKonfirmasi: 0,
    hargaDikonfirmasi: 0,
    dalamPengerjaan: 0,
    revisi: 0,
    selesai: 0,
    dibatalkan: 0,
    totalConfirmedRevenue: 0,
  };

  for (const order of orders) {
    if (order.status === 'menunggu_konfirmasi') stats.menungguKonfirmasi += 1;
    else if (order.status === 'harga_dikonfirmasi') stats.hargaDikonfirmasi += 1;
    else if (order.status === 'dalam_pengerjaan') stats.dalamPengerjaan += 1;
    else if (order.status === 'revisi') stats.revisi += 1;
    else if (order.status === 'selesai') stats.selesai += 1;
    else if (order.status === 'dibatalkan') stats.dibatalkan += 1;

    if (order.status !== 'dibatalkan' && typeof order.finalPrice === 'number' && order.finalPrice > 0) {
      stats.totalConfirmedRevenue += order.finalPrice;
    }
  }

  return stats;
}

export function extractTimestampMs(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof ts === 'object') {
    const record = ts as { toMillis?: () => number; seconds?: number };
    if (typeof record.toMillis === 'function') return record.toMillis();
    if (typeof record.seconds === 'number') return record.seconds * 1000;
  }
  return 0;
}

export function formatDateId(ts: unknown): string {
  const ms = extractTimestampMs(ts);
  if (!ms) return 'Baru saja';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ms));
}

export function formatDateTimeId(ts: unknown): string {
  const ms = extractTimestampMs(ts);
  if (!ms) return 'Baru saja';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

export function filterAndSortOrders(
  orders: OrderItem[],
  options: {
    search?: string;
    status?: OrderStatus | 'all';
    sortBy?: 'newest' | 'oldest' | 'deadline' | 'price_desc';
  }
): OrderItem[] {
  const query = (options.search || '').trim().toLowerCase();
  const statusFilter = options.status || 'all';
  const sortBy = options.sortBy || 'newest';

  const filtered = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      order.orderCode,
      order.customerName,
      order.customerEmail,
      order.serviceTitle,
      order.projectTitle,
      order.customerWhatsapp,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') {
      return extractTimestampMs(a.createdAt) - extractTimestampMs(b.createdAt);
    }
    if (sortBy === 'deadline') {
      return a.deadline.localeCompare(b.deadline);
    }
    if (sortBy === 'price_desc') {
      return (b.finalPrice || 0) - (a.finalPrice || 0);
    }
    return extractTimestampMs(b.createdAt) - extractTimestampMs(a.createdAt);
  });
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const DIGITAL_PRODUCT_CATEGORY_LABELS: Record<DigitalProductCategory, string> = {
  template_ppt: 'Template PPT',
  template_poster: 'Template Poster',
  ui_web_kit: 'Web & UI Kit',
  aset_video: 'Aset Video',
  naskah_siap_pakai: 'Naskah Siap Pakai',
};

/**
 * Shared dense, symmetrical catalog grid columns across ALL category, subcategory,
 * and search/filter pages (Services, Digital Products, Portfolio):
 * - Ultra-narrow (<340px): 1 column
 * - Standard smartphone (>=340px): 2 columns
 * - Tablet (md >=768px): 3 columns
 * - Desktop (lg >=1024px): fixed 5 columns (never expands cards when filtered to 1–4 items)
 */
export const CATALOG_GRID_COLS_CLASS =
  'grid-cols-1 min-[340px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5';

export function getProductGridColsClass(_itemCount: number): string {
  return CATALOG_GRID_COLS_CLASS;
}

export function filterDigitalProducts(
  products: DigitalProductItem[],
  options: {
    category?: DigitalProductCategory | 'all';
    search?: string;
  }
): DigitalProductItem[] {
  const category = options.category || 'all';
  const query = (options.search || '').trim().toLowerCase();

  return products.filter((item) => {
    if (!item.isPublished) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (!query) return true;
    const categoryLabel = DIGITAL_PRODUCT_CATEGORY_LABELS[item.category].toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.format.toLowerCase().includes(query) ||
      categoryLabel.includes(query) ||
      item.summary.toLowerCase().includes(query)
    );
  });
}

export function buildProductWhatsappMessage(product: DigitalProductItem): string {
  const priceText = product.showPrice ? ` (${formatRupiah(product.price)})` : '';
  return `Halo Admin SYAMS CREATIVE STUDIO, saya ingin memesan produk digital "${product.title}"${priceText}. Mohon informasi cara pembayaran dan pengiriman filenya.`;
}

export interface CatalogDashboardStats {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  featuredProducts: number;
  totalServices: number;
  publishedServices: number;
  draftServices: number;
  featuredServices: number;
}

export function computeCatalogStats(
  products: Pick<DigitalProductItem, 'isPublished' | 'isFeatured'>[],
  services: Pick<import('../types/studio').ServiceItem, 'isPublished' | 'isFeatured'>[]
): CatalogDashboardStats {
  let publishedProducts = 0;
  let draftProducts = 0;
  let featuredProducts = 0;
  for (const item of products) {
    if (item.isPublished) publishedProducts += 1;
    else draftProducts += 1;
    if (item.isFeatured) featuredProducts += 1;
  }

  let publishedServices = 0;
  let draftServices = 0;
  let featuredServices = 0;
  for (const item of services) {
    if (item.isPublished) publishedServices += 1;
    else draftServices += 1;
    if (item.isFeatured) featuredServices += 1;
  }

  return {
    totalProducts: products.length,
    publishedProducts,
    draftProducts,
    featuredProducts,
    totalServices: services.length,
    publishedServices,
    draftServices,
    featuredServices,
  };
}

export interface DigitalProductValidationInput {
  title: string;
  slug: string;
  category: DigitalProductCategory;
  price: number;
  format: string;
  summary: string;
  description: string;
  includes: string[];
  imageUrl: string;
}

const VALID_PRODUCT_CATEGORIES: DigitalProductCategory[] = [
  'template_ppt',
  'template_poster',
  'ui_web_kit',
  'aset_video',
  'naskah_siap_pakai',
];

const VALID_SERVICE_CATEGORIES: ServiceCategory[] = [
  'web_app',
  'video',
  'desain',
  'presentasi',
  'naskah',
];

export function validateDigitalProductInput(
  input: DigitalProductValidationInput
): ValidationResult {
  const errors: Record<string, string> = {};
  const cleanTitle = (input.title || '').trim();
  const cleanSlug = slugify(input.slug || cleanTitle);
  const cleanFormat = (input.format || '').trim();
  const cleanSummary = (input.summary || '').trim();
  const cleanDescription = (input.description || '').trim();
  const cleanImage = sanitizeExternalUrl(input.imageUrl);

  if (cleanTitle.length < 3 || cleanTitle.length > 140) {
    errors.title = 'Nama produk wajib 3–140 karakter.';
  }
  if (cleanSlug.length < 2 || cleanSlug.length > 80) {
    errors.slug = 'Slug produk minimal 2 karakter huruf kecil/angka.';
  }
  if (!VALID_PRODUCT_CATEGORIES.includes(input.category)) {
    errors.category = 'Pilih kategori produk digital yang valid.';
  }
  if (!Number.isFinite(input.price) || input.price < 0 || input.price > 1000000000) {
    errors.price = 'Harga harus berupa angka 0 hingga Rp1.000.000.000.';
  }
  if (cleanFormat.length < 1 || cleanFormat.length > 80) {
    errors.format = 'Format file wajib diisi (contoh: PPTX & Google Slides).';
  }
  if (cleanSummary.length < 5 || cleanSummary.length > 320) {
    errors.summary = 'Ringkasan produk wajib 5–320 karakter.';
  }
  if (cleanDescription.length < 10 || cleanDescription.length > 3000) {
    errors.description = 'Deskripsi lengkap wajib 10–3000 karakter.';
  }
  const cleanIncludes = (input.includes || []).map((v) => v.trim()).filter(Boolean);
  if (cleanIncludes.length === 0) {
    errors.includes = 'Masukkan minimal 1 isi paket yang didapatkan pembeli.';
  }
  if (!cleanImage) {
    errors.imageUrl = 'Gunakan URL gambar https:// atau pilih gambar dari galeri/Drive.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ServiceValidationInput {
  title: string;
  slug: string;
  category: ServiceCategory;
  shortDescription: string;
  fullDescription: string;
  priceMin: number;
  priceMax: number;
  priceUnit: string;
  estimatedTurnaround: string;
  deliverables: string[];
  imageUrl: string;
}

export function validateServiceInput(input: ServiceValidationInput): ValidationResult {
  const errors: Record<string, string> = {};
  const cleanTitle = (input.title || '').trim();
  const cleanSlug = slugify(input.slug || cleanTitle);
  const cleanShort = (input.shortDescription || '').trim();
  const cleanFull = (input.fullDescription || '').trim();
  const cleanUnit = (input.priceUnit || '').trim();
  const cleanEta = (input.estimatedTurnaround || '').trim();
  const cleanImage = sanitizeExternalUrl(input.imageUrl);

  if (cleanTitle.length < 3 || cleanTitle.length > 140) {
    errors.title = 'Nama layanan wajib 3–140 karakter.';
  }
  if (cleanSlug.length < 2 || cleanSlug.length > 80) {
    errors.slug = 'Slug layanan minimal 2 karakter.';
  }
  if (!VALID_SERVICE_CATEGORIES.includes(input.category)) {
    errors.category = 'Pilih kategori layanan yang valid.';
  }
  if (cleanShort.length < 10 || cleanShort.length > 320) {
    errors.shortDescription = 'Ringkasan singkat wajib 10–320 karakter.';
  }
  if (cleanFull.length < 20 || cleanFull.length > 3000) {
    errors.fullDescription = 'Deskripsi lengkap wajib 20–3000 karakter.';
  }
  if (!Number.isFinite(input.priceMin) || input.priceMin < 0 || input.priceMin > 1000000000) {
    errors.priceMin = 'Harga minimum tidak valid.';
  }
  if (
    !Number.isFinite(input.priceMax) ||
    input.priceMax < input.priceMin ||
    input.priceMax > 1000000000
  ) {
    errors.priceMax = 'Harga maksimum tidak boleh lebih kecil dari harga minimum.';
  }
  if (cleanUnit.length < 1 || cleanUnit.length > 40) {
    errors.priceUnit = 'Satuan harga wajib diisi (contoh: proyek, per menit).';
  }
  if (cleanEta.length < 2 || cleanEta.length > 60) {
    errors.estimatedTurnaround = 'Estimasi pengerjaan wajib diisi.';
  }
  const cleanDeliverables = (input.deliverables || []).map((v) => v.trim()).filter(Boolean);
  if (cleanDeliverables.length === 0) {
    errors.deliverables = 'Masukkan minimal 1 output/deliverable layanan.';
  }
  if (!cleanImage) {
    errors.imageUrl = 'Gunakan URL gambar https:// atau pilih gambar dari galeri/Drive.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export const MEDIA_USAGE_LABELS: Record<MediaUsage, string> = {
  product: 'Produk Digital',
  service: 'Layanan',
  portfolio: 'Dokumentasi Proyek',
  hero: 'Banner Website',
  other: 'Media Lainnya',
  order_attachment: 'Lampiran Pesanan',
};

export const DRIVE_CATEGORY_FOLDER_NAMES: Record<MediaUsage, string> = {
  product: 'Produk Digital',
  service: 'Layanan',
  portfolio: 'Dokumentasi Proyek',
  hero: 'Banner Website',
  other: 'Media Lainnya',
  order_attachment: 'Lampiran Pesanan',
};

export function isVideoMimeType(mimeType?: string | null): boolean {
  return Boolean(mimeType && mimeType.toLowerCase().startsWith('video/'));
}

export function isImageMimeType(mimeType?: string | null): boolean {
  return Boolean(mimeType && mimeType.toLowerCase().startsWith('image/'));
}

const CLIENT_ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const CLIENT_ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const CLIENT_ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

export interface ClientFileValidationResult {
  valid: boolean;
  mediaKind?: 'image' | 'video' | 'document';
  error?: string;
}

export function validateMediaFileBeforeUpload(
  file: { name: string; type: string; size: number },
  options?: { allowVideos?: boolean; allowDocuments?: boolean }
): ClientFileValidationResult {
  const allowVideos = options?.allowVideos ?? true;
  const allowDocuments = options?.allowDocuments ?? false;
  const mime = (file.type || '').toLowerCase().trim();
  const size = Number(file.size || 0);

  if (!file.name || file.name.trim().length === 0) {
    return { valid: false, error: 'Nama berkas tidak boleh kosong.' };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { valid: false, error: 'Berkas kosong (0 byte).' };
  }

  if (CLIENT_ALLOWED_IMAGE_MIMES.has(mime)) {
    if (size > 10 * 1024 * 1024) {
      return { valid: false, error: 'Ukuran gambar maksimal 10 MB.' };
    }
    return { valid: true, mediaKind: 'image' };
  }

  if (allowVideos && CLIENT_ALLOWED_VIDEO_MIMES.has(mime)) {
    if (size > 50 * 1024 * 1024) {
      return { valid: false, error: 'Ukuran video maksimal 50 MB.' };
    }
    return { valid: true, mediaKind: 'video' };
  }

  if (allowDocuments && CLIENT_ALLOWED_DOC_MIMES.has(mime)) {
    if (size > 15 * 1024 * 1024) {
      return { valid: false, error: 'Ukuran dokumen maksimal 15 MB.' };
    }
    return { valid: true, mediaKind: 'document' };
  }

  const allowedLabel = [
    'JPG, PNG, WEBP, GIF',
    allowVideos ? 'MP4, WEBM, MOV' : '',
    allowDocuments ? 'PDF, DOCX, PPTX' : '',
  ]
    .filter(Boolean)
    .join(', ');

  return {
    valid: false,
    error: `Format berkas (${mime || 'tidak dikenal'}) tidak didukung. Gunakan ${allowedLabel}.`,
  };
}

export interface MediaUsageReference {
  entityType: 'product' | 'service' | 'portfolio' | 'site_settings' | 'order';
  entityId: string;
  entityTitle: string;
  role: 'primary' | 'gallery' | 'banner' | 'attachment';
}

export function findMediaUsages(
  fileId: string,
  collections: {
    products?: Pick<DigitalProductItem, 'id' | 'title' | 'driveFileId' | 'imageUrl' | 'gallery'>[];
    services?: Pick<ServiceItem, 'id' | 'title' | 'driveFileId' | 'imageUrl' | 'gallery'>[];
    portfolio?: Pick<PortfolioItem, 'id' | 'title' | 'driveFileId' | 'imageUrl' | 'gallery'>[];
    siteSettings?: Pick<SiteSettings, 'heroDriveFileId' | 'heroImageUrl'> | null;
    orders?: Pick<OrderItem, 'id' | 'orderCode' | 'projectTitle' | 'attachmentDriveFileId'>[];
  }
): MediaUsageReference[] {
  const cleanId = (fileId || '').trim();
  if (!cleanId) return [];

  const refs: MediaUsageReference[] = [];
  const proxyFragment = `/api/media/${encodeURIComponent(cleanId)}`;

  for (const product of collections.products || []) {
    if (product.driveFileId === cleanId || product.imageUrl?.includes(proxyFragment)) {
      refs.push({
        entityType: 'product',
        entityId: product.id,
        entityTitle: product.title,
        role: 'primary',
      });
    }
    if ((product.gallery || []).some((g) => g.fileId === cleanId)) {
      refs.push({
        entityType: 'product',
        entityId: product.id,
        entityTitle: product.title,
        role: 'gallery',
      });
    }
  }

  for (const service of collections.services || []) {
    if (service.driveFileId === cleanId || service.imageUrl?.includes(proxyFragment)) {
      refs.push({
        entityType: 'service',
        entityId: service.id,
        entityTitle: service.title,
        role: 'primary',
      });
    }
    if ((service.gallery || []).some((g) => g.fileId === cleanId)) {
      refs.push({
        entityType: 'service',
        entityId: service.id,
        entityTitle: service.title,
        role: 'gallery',
      });
    }
  }

  for (const work of collections.portfolio || []) {
    if (work.driveFileId === cleanId || work.imageUrl?.includes(proxyFragment)) {
      refs.push({
        entityType: 'portfolio',
        entityId: work.id,
        entityTitle: work.title,
        role: 'primary',
      });
    }
    if ((work.gallery || []).some((g) => g.fileId === cleanId)) {
      refs.push({
        entityType: 'portfolio',
        entityId: work.id,
        entityTitle: work.title,
        role: 'gallery',
      });
    }
  }

  if (
    collections.siteSettings &&
    (collections.siteSettings.heroDriveFileId === cleanId ||
      collections.siteSettings.heroImageUrl?.includes(proxyFragment))
  ) {
    refs.push({
      entityType: 'site_settings',
      entityId: 'general',
      entityTitle: 'Banner Hero Beranda',
      role: 'banner',
    });
  }

  for (const order of collections.orders || []) {
    if (order.attachmentDriveFileId === cleanId) {
      refs.push({
        entityType: 'order',
        entityId: order.id,
        entityTitle: `${order.orderCode} (${order.projectTitle})`,
        role: 'attachment',
      });
    }
  }

  return refs;
}

export function reorderGalleryItems(
  items: MediaGalleryItem[],
  fromIndex: number,
  toIndex: number
): MediaGalleryItem[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function promoteGalleryItemToPrimary(
  currentPrimary: { imageUrl: string; driveFileId?: string },
  gallery: MediaGalleryItem[],
  index: number
): { imageUrl: string; driveFileId?: string; gallery: MediaGalleryItem[] } {
  const target = gallery[index];
  if (!target || isVideoMimeType(target.mimeType)) {
    return {
      imageUrl: currentPrimary.imageUrl,
      driveFileId: currentPrimary.driveFileId,
      gallery: [...gallery],
    };
  }

  const nextPrimaryUrl = target.fileId
    ? buildMediaProxyUrl(target.fileId, 'public') || target.imageUrl || currentPrimary.imageUrl
    : target.imageUrl || currentPrimary.imageUrl;

  const remaining = gallery.filter((_, idx) => idx !== index);

  if (
    currentPrimary.driveFileId &&
    currentPrimary.driveFileId !== target.fileId &&
    !remaining.some((g) => g.fileId === currentPrimary.driveFileId)
  ) {
    remaining.unshift({
      fileId: currentPrimary.driveFileId,
      fileName: 'Gambar Utama Sebelumnya',
      mimeType: 'image/jpeg',
      imageUrl: currentPrimary.imageUrl,
    });
  }

  return {
    imageUrl: nextPrimaryUrl,
    driveFileId: target.fileId || undefined,
    gallery: remaining.slice(0, 12),
  };
}

// -----------------------------------------------------------------------------
// Dual Visual Theme Helpers (Pure Presentation Layer)
// -----------------------------------------------------------------------------

export const DEFAULT_VISUAL_THEME: VisualThemeMode = 'neo_brutalist';

export interface VisualThemeOptionMeta {
  id: VisualThemeMode;
  name: string;
  tagline: string;
  description: string;
  traits: string[];
}

export const VISUAL_THEME_OPTIONS: VisualThemeOptionMeta[] = [
  {
    id: 'neo_brutalist',
    name: 'Neo Brutalist',
    tagline: 'Tema Bawaan Studio',
    description:
      'Gaya ekspresif khas SYAMS CREATIVE STUDIO dengan garis tegas, bayangan offset tajam, dan palet krem-hijau-mustard kontras tinggi.',
    traits: ['Outline tegas 2px', 'Hard offset shadow', 'Sudut tajam 4px'],
  },
  {
    id: 'clean_bento',
    name: 'Clean Bento Grid',
    tagline: 'Minimalis Modern',
    description:
      'Tampilan bersih berbasis kartu bento modern dengan sudut lebih halus, garis tipis lembut, dan bayangan elevasi minimal yang tetap nyaman dibaca.',
    traits: ['Sudut kartu halus', 'Border tipis elegan', 'Bayangan lembut minimal'],
  },
];

export function isValidVisualTheme(value: unknown): value is VisualThemeMode {
  return value === 'neo_brutalist' || value === 'clean_bento';
}

export function normalizeVisualTheme(value: unknown): VisualThemeMode {
  return isValidVisualTheme(value) ? value : DEFAULT_VISUAL_THEME;
}

export function resolveEffectiveVisualTheme(
  persistedTheme: unknown,
  previewTheme: VisualThemeMode | null
): VisualThemeMode {
  if (previewTheme && isValidVisualTheme(previewTheme)) {
    return previewTheme;
  }
  return normalizeVisualTheme(persistedTheme);
}



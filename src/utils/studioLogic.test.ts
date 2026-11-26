import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMediaProxyUrl,
  buildProductWhatsappMessage,
  computeOrderStats,
  filterAndSortOrders,
  filterDigitalProducts,
  formatRupiah,
  formatServicePriceLabel,
  generateOrderCode,
  getProductGridColsClass,
  isValidWhatsappNumber,
  normalizeWhatsappNumber,
  sanitizeExternalUrl,
  validateContactInput,
  validateOrderInput,
} from './studioLogic';
import type { DigitalProductItem, OrderItem } from '../types/studio';

test('formatRupiah and formatServicePriceLabel format Indonesian Rupiah accurately', () => {
  assert.equal(formatRupiah(50000), 'Rp50.000');
  assert.equal(formatRupiah(300000), 'Rp300.000');
  assert.equal(
    formatServicePriceLabel(50000, 300000, 'proyek'),
    'Rp50.000–Rp300.000'
  );
  assert.equal(
    formatServicePriceLabel(25000, 35000, 'per menit'),
    'Rp25.000–Rp35.000 per menit'
  );
  assert.equal(
    formatServicePriceLabel(15000, 15000, 'per slide'),
    'Rp15.000 per slide'
  );
  assert.equal(
    formatServicePriceLabel(10000, 10000, 'per halaman'),
    'Rp10.000 per halaman'
  );
});

test('generateOrderCode produces valid deterministic SCS-YYYYMMDD-XXXXXX format', () => {
  const fixedDate = new Date('2026-11-26T08:00:00.000Z');
  const code = generateOrderCode(fixedDate, 'AB12CD');
  assert.equal(code, 'SCS-20261126-AB12CD');
  assert.match(generateOrderCode(fixedDate), /^SCS-20261126-[A-Z0-9]{6}$/);
});

test('WhatsApp normalization and validation handles 08, +62, and rejects invalid inputs', () => {
  assert.equal(normalizeWhatsappNumber('0812-3456-7890'), '6281234567890');
  assert.equal(normalizeWhatsappNumber('+62 812 3456 7890'), '6281234567890');
  assert.equal(isValidWhatsappNumber('081234567890'), true);
  assert.equal(isValidWhatsappNumber('+6281234567890'), true);
  assert.equal(isValidWhatsappNumber('12345'), false);
  assert.equal(isValidWhatsappNumber('abcde'), false);
});

test('sanitizeExternalUrl blocks javascript: and data: XSS URLs while allowing https and relative paths', () => {
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(sanitizeExternalUrl('https://syamscreativestudio.com/work'), 'https://syamscreativestudio.com/work');
  assert.equal(sanitizeExternalUrl('/src/assets/images/hero.jpg'), '/src/assets/images/hero.jpg');
});

test('buildMediaProxyUrl validates Drive fileId and distinguishes public vs private', () => {
  assert.equal(buildMediaProxyUrl('1A2b3C_4d-5E', 'public'), '/api/media/1A2b3C_4d-5E');
  assert.equal(
    buildMediaProxyUrl('1A2b3C_4d-5E', 'private'),
    '/api/media/1A2b3C_4d-5E?visibility=private'
  );
  assert.equal(buildMediaProxyUrl('../../etc/passwd', 'public'), '');
});

test('validateOrderInput rejects empty/past deadline and accepts complete order', () => {
  const badResult = validateOrderInput(
    {
      customerName: 'A',
      customerEmail: 'bukan-email',
      customerWhatsapp: '081',
      serviceId: '',
      quantityEstimate: 0,
      projectTitle: 'Hi',
      projectBrief: 'Terlalu singkat',
      deadline: '2026-11-01',
    },
    '2026-11-26'
  );
  assert.equal(badResult.valid, false);
  assert.ok(badResult.errors.customerName);
  assert.ok(badResult.errors.customerEmail);
  assert.ok(badResult.errors.customerWhatsapp);
  assert.ok(badResult.errors.serviceId);
  assert.ok(badResult.errors.deadline);

  const okResult = validateOrderInput(
    {
      customerName: 'Nadia Pratama',
      customerEmail: 'nadia@example.com',
      customerWhatsapp: '081234567890',
      serviceId: 'website-aplikasi',
      quantityEstimate: 1,
      projectTitle: 'Company Profile Sekolah',
      projectBrief: 'Membutuhkan website profil sekolah dengan katalog program dan formulir PPDB.',
      deadline: '2026-12-10',
    },
    '2026-11-26'
  );
  assert.equal(okResult.valid, true);
  assert.deepEqual(okResult.errors, {});
});

test('validateContactInput validates email and message length', () => {
  const invalid = validateContactInput({
    name: 'B',
    email: 'invalid',
    subject: 'Hi',
    message: 'Pendek',
  });
  assert.equal(invalid.valid, false);

  const valid = validateContactInput({
    name: 'Budi Santoso',
    email: 'budi@instansi.id',
    whatsapp: '081299887766',
    subject: 'Konsultasi Website',
    message: 'Halo tim SYAMS, kami ingin konsultasi pembuatan portal kegiatan sekolah.',
  });
  assert.equal(valid.valid, true);
});

test('computeOrderStats and filterAndSortOrders calculate accurate counts, revenue, and filtering', () => {
  const sampleOrders: OrderItem[] = [
    {
      id: '1',
      orderCode: 'SCS-20261126-AAA111',
      customerUid: 'u1',
      customerName: 'Raka',
      customerEmail: 'raka@mail.com',
      customerWhatsapp: '6281234567890',
      serviceId: 'website-aplikasi',
      serviceTitle: 'Pembuatan Website & Aplikasi',
      estimatedPriceLabel: 'Rp50.000–Rp300.000',
      quantityEstimate: 1,
      projectTitle: 'Landing Page UMKM',
      projectBrief: 'Landing page modern untuk produk kopi lokal.',
      deadline: '2026-12-05',
      status: 'selesai',
      finalPrice: 250000,
      adminNote: 'Selesai tepat waktu',
      createdAt: 1700000000000,
    },
    {
      id: '2',
      orderCode: 'SCS-20261126-BBB222',
      customerUid: 'u2',
      customerName: 'Siti',
      customerEmail: 'siti@mail.com',
      customerWhatsapp: '6281234567891',
      serviceId: 'poster-desain',
      serviceTitle: 'Pembuatan Poster & Desain Grafis',
      estimatedPriceLabel: 'Rp15.000–Rp30.000 per desain',
      quantityEstimate: 3,
      projectTitle: 'Poster Kajian Akbar',
      projectBrief: 'Tiga poster ukuran feed Instagram dan cetak A3.',
      deadline: '2026-11-30',
      status: 'menunggu_konfirmasi',
      finalPrice: null,
      adminNote: '',
      createdAt: 1700005000000,
    },
    {
      id: '3',
      orderCode: 'SCS-20261126-CCC333',
      customerUid: 'u3',
      customerName: 'Doni',
      customerEmail: 'doni@mail.com',
      customerWhatsapp: '6281234567892',
      serviceId: 'video-editing',
      serviceTitle: 'Editing Video & Konten Digital',
      estimatedPriceLabel: 'Rp25.000–Rp35.000 per menit',
      quantityEstimate: 5,
      projectTitle: 'Video Profil',
      projectBrief: 'Video profil berdurasi 5 menit untuk acara wisuda.',
      deadline: '2026-12-01',
      status: 'dibatalkan',
      finalPrice: 150000,
      adminNote: 'Dibatalkan klien',
      createdAt: 1700002000000,
    },
  ];

  const stats = computeOrderStats(sampleOrders);
  assert.equal(stats.total, 3);
  assert.equal(stats.selesai, 1);
  assert.equal(stats.menungguKonfirmasi, 1);
  assert.equal(stats.dibatalkan, 1);
  assert.equal(stats.totalConfirmedRevenue, 250000);

  const filtered = filterAndSortOrders(sampleOrders, {
    search: 'poster',
    status: 'menunggu_konfirmasi',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].orderCode, 'SCS-20261126-BBB222');

  const sortedByDeadline = filterAndSortOrders(sampleOrders, { sortBy: 'deadline' });
  assert.equal(sortedByDeadline[0].id, '2');
});

test('getProductGridColsClass keeps fixed 5-col desktop, 3-col tablet, 2-col phone regardless of item count', () => {
  for (const count of [1, 2, 3, 4, 5, 10]) {
    const cls = getProductGridColsClass(count);
    assert.match(cls, /min-\[340px\]:grid-cols-2/);
    assert.match(cls, /md:grid-cols-3/);
    assert.match(cls, /lg:grid-cols-5/);
  }
});

test('filterDigitalProducts filters by published status, category, and query and formats WhatsApp text', () => {
  const sampleProducts: DigitalProductItem[] = [
    {
      id: 'p1',
      slug: 'deck-kuliah-modern',
      title: 'Deck Presentasi Kuliah Modern',
      category: 'template_ppt',
      price: 25000,
      showPrice: true,
      format: 'PPTX',
      fileSize: '14 MB',
      compatibility: 'PowerPoint & Google Slides',
      summary: '40 slide edukatif siap edit',
      description: 'Deskripsi lengkap deck presentasi.',
      includes: ['40 slide'],
      imageUrl: '/src/assets/images/product_ppt_deck_1795694063042.jpg',
      isFeatured: true,
      isPublished: true,
      sortOrder: 1,
    },
    {
      id: 'p2',
      slug: 'draf-tersembunyi',
      title: 'Produk Draf',
      category: 'template_ppt',
      price: 15000,
      showPrice: false,
      format: 'PPTX',
      fileSize: '5 MB',
      compatibility: 'PowerPoint',
      summary: 'Tidak dipublikasikan',
      description: 'Draf.',
      includes: [],
      imageUrl: '/src/assets/images/product_ppt_deck_1795694063042.jpg',
      isFeatured: false,
      isPublished: false,
      sortOrder: 2,
    },
  ];

  const publishedOnly = filterDigitalProducts(sampleProducts, { category: 'all' });
  assert.equal(publishedOnly.length, 1);
  assert.equal(publishedOnly[0].id, 'p1');

  const searched = filterDigitalProducts(sampleProducts, { category: 'template_ppt', search: 'kuliah' });
  assert.equal(searched.length, 1);

  const msg = buildProductWhatsappMessage(sampleProducts[0]);
  assert.match(msg, /Deck Presentasi Kuliah Modern/);
  assert.match(msg, /Rp25\.000/);

  const hiddenPriceMsg = buildProductWhatsappMessage(sampleProducts[1]);
  assert.doesNotMatch(hiddenPriceMsg, /Rp15\.000/);
});

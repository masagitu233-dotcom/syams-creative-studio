import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMediaProxyUrl,
  buildProductWhatsappMessage,
  computeCatalogStats,
  computeOrderStats,
  DEFAULT_VISUAL_THEME,
  filterAndSortOrders,
  filterDigitalProducts,
  findMediaUsages,
  formatRupiah,
  formatServicePriceLabel,
  generateOrderCode,
  getProductGridColsClass,
  isValidVisualTheme,
  isValidWhatsappNumber,
  isVideoMimeType,
  normalizeVisualTheme,
  normalizeWhatsappNumber,
  promoteGalleryItemToPrimary,
  readCachedVisualTheme,
  reorderGalleryItems,
  resolveEffectiveVisualTheme,
  resolveInitialThemeState,
  sanitizeExternalUrl,
  sanitizeHttpUrl,
  THEME_CACHE_STORAGE_KEY,
  validateContactInput,
  validateDigitalProductInput,
  validateMediaFileBeforeUpload,
  validateOptionalSocialUrls,
  validateOrderInput,
  validateServiceInput,
  VISUAL_THEME_OPTIONS,
  writeCachedVisualTheme,
} from './studioLogic';
import { handler as createOrderHandler } from '../../netlify/functions/create-order';
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

test('computeCatalogStats counts published, draft, and featured products and services accurately', () => {
  const stats = computeCatalogStats(
    [
      { isPublished: true, isFeatured: true },
      { isPublished: true, isFeatured: false },
      { isPublished: false, isFeatured: false },
    ],
    [
      { isPublished: true, isFeatured: true },
      { isPublished: false, isFeatured: true },
    ]
  );

  assert.deepEqual(stats, {
    totalProducts: 3,
    publishedProducts: 2,
    draftProducts: 1,
    featuredProducts: 1,
    totalServices: 2,
    publishedServices: 1,
    draftServices: 1,
    featuredServices: 2,
  });
});

test('validateDigitalProductInput rejects unsafe URLs and short fields while accepting valid payload', () => {
  const invalid = validateDigitalProductInput({
    title: 'A',
    slug: 'x',
    category: 'template_ppt',
    price: -100,
    format: '',
    summary: 'Hi',
    description: 'Pendek',
    includes: [],
    imageUrl: 'javascript:alert(1)',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.price);
  assert.ok(invalid.errors.imageUrl);
  assert.ok(invalid.errors.includes);

  const valid = validateDigitalProductInput({
    title: 'Template Pitch Deck Bisnis',
    slug: 'template-pitch-deck-bisnis',
    category: 'template_ppt',
    price: 35000,
    format: 'PPTX & Google Slides',
    summary: '50 slide siap pakai untuk presentasi investor.',
    description: 'Paket lengkap template presentasi investor dengan grafik dan tabel siap edit.',
    includes: ['50 slide 16:9', 'Panduan warna'],
    imageUrl: 'https://example.com/deck.jpg',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('validateServiceInput validates price range, descriptions, and deliverables', () => {
  const invalid = validateServiceInput({
    title: 'A',
    slug: '',
    category: 'web_app',
    shortDescription: 'Singkat',
    fullDescription: 'Terlalu singkat',
    priceMin: 100000,
    priceMax: 50000,
    priceUnit: '',
    estimatedTurnaround: '',
    deliverables: [],
    imageUrl: 'data:text/html,xss',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.priceMax);
  assert.ok(invalid.errors.imageUrl);
  assert.ok(invalid.errors.deliverables);

  const valid = validateServiceInput({
    title: 'Pembuatan Website Profil Sekolah',
    slug: 'website-profil-sekolah',
    category: 'web_app',
    shortDescription: 'Website cepat, responsif, dan mudah dikelola untuk instansi pendidikan.',
    fullDescription: 'Layanan pembuatan website profil sekolah lengkap dengan katalog program, berita, dan formulir pendaftaran.',
    priceMin: 150000,
    priceMax: 300000,
    priceUnit: 'proyek',
    estimatedTurnaround: '3–5 hari kerja',
    deliverables: ['Source code rapi', 'Panduan pengelolaan'],
    imageUrl: '/src/assets/images/service_web_app_1795655644279.jpg',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('validateMediaFileBeforeUpload accepts valid images/videos and blocks oversized or unsupported files', () => {
  assert.equal(
    validateMediaFileBeforeUpload({ name: 'banner.webp', type: 'image/webp', size: 2_000_000 }).valid,
    true
  );
  assert.equal(
    validateMediaFileBeforeUpload({ name: 'demo.mp4', type: 'video/mp4', size: 25_000_000 }).valid,
    true
  );
  assert.equal(
    validateMediaFileBeforeUpload({ name: 'huge.png', type: 'image/png', size: 12 * 1024 * 1024 }).valid,
    false
  );
  assert.equal(
    validateMediaFileBeforeUpload({ name: 'huge.mp4', type: 'video/mp4', size: 60 * 1024 * 1024 }).valid,
    false
  );
  assert.equal(
    validateMediaFileBeforeUpload({ name: 'malware.exe', type: 'application/x-msdownload', size: 5000 }).valid,
    false
  );
  assert.equal(isVideoMimeType('video/mp4'), true);
  assert.equal(isVideoMimeType('image/png'), false);
});

test('findMediaUsages detects active references across products, services, portfolio, banner, and orders', () => {
  const fileId = '1AbCdEfGhIjKlMnOpQr';
  const usages = findMediaUsages(fileId, {
    products: [
      {
        id: 'prod-1',
        title: 'Template Deck',
        driveFileId: fileId,
        imageUrl: `/api/media/${fileId}`,
        gallery: [{ fileId, fileName: 'slide.png', mimeType: 'image/png' }],
      },
    ],
    services: [
      {
        id: 'svc-1',
        title: 'Jasa Website',
        imageUrl: '/fallback.jpg',
        gallery: [{ fileId, fileName: 'demo.mp4', mimeType: 'video/mp4' }],
      },
    ],
    portfolio: [],
    siteSettings: {
      heroDriveFileId: fileId,
      heroImageUrl: `/api/media/${fileId}`,
    },
    orders: [
      {
        id: 'ord-1',
        orderCode: 'SCS-20261126-AA11BB',
        projectTitle: 'Profil Sekolah',
        attachmentDriveFileId: fileId,
      },
    ],
  });

  assert.equal(usages.length, 5);
  assert.ok(usages.some((u) => u.entityType === 'product' && u.role === 'primary'));
  assert.ok(usages.some((u) => u.entityType === 'product' && u.role === 'gallery'));
  assert.ok(usages.some((u) => u.entityType === 'service' && u.role === 'gallery'));
  assert.ok(usages.some((u) => u.entityType === 'site_settings' && u.role === 'banner'));
  assert.ok(usages.some((u) => u.entityType === 'order' && u.role === 'attachment'));
});

test('reorderGalleryItems and promoteGalleryItemToPrimary preserve data integrity and skip video promotion', () => {
  const gallery = [
    { fileId: 'file_a', fileName: 'a.jpg', mimeType: 'image/jpeg' },
    { fileId: 'file_b', fileName: 'b.mp4', mimeType: 'video/mp4' },
    { fileId: 'file_c', fileName: 'c.webp', mimeType: 'image/webp' },
  ];

  const reordered = reorderGalleryItems(gallery, 0, 2);
  assert.deepEqual(
    reordered.map((g) => g.fileId),
    ['file_b', 'file_c', 'file_a']
  );

  // Attempting to promote a video keeps primary unchanged
  const skipped = promoteGalleryItemToPrimary(
    { imageUrl: '/api/media/orig_1', driveFileId: 'orig_1' },
    gallery,
    1
  );
  assert.equal(skipped.driveFileId, 'orig_1');

  // Promoting an image swaps it to primary and retains previous primary in gallery
  const promoted = promoteGalleryItemToPrimary(
    { imageUrl: '/api/media/orig_1', driveFileId: 'orig_1' },
    gallery,
    2
  );
  assert.equal(promoted.driveFileId, 'file_c');
  assert.equal(promoted.imageUrl, '/api/media/file_c');
  assert.ok(promoted.gallery.some((g) => g.fileId === 'orig_1'));
  assert.ok(!promoted.gallery.some((g) => g.fileId === 'file_c'));
});

test('visual theme helpers validate enum, default to neo_brutalist, and prioritize preview mode', () => {
  assert.equal(DEFAULT_VISUAL_THEME, 'neo_brutalist');
  assert.deepEqual(
    VISUAL_THEME_OPTIONS.map((o) => o.id),
    ['neo_brutalist', 'clean_bento']
  );

  assert.equal(isValidVisualTheme('neo_brutalist'), true);
  assert.equal(isValidVisualTheme('clean_bento'), true);
  assert.equal(isValidVisualTheme('dark_mode'), false);
  assert.equal(isValidVisualTheme(''), false);
  assert.equal(isValidVisualTheme(undefined), false);

  assert.equal(normalizeVisualTheme(undefined), 'neo_brutalist');
  assert.equal(normalizeVisualTheme(null), 'neo_brutalist');
  assert.equal(normalizeVisualTheme('unknown_theme'), 'neo_brutalist');
  assert.equal(normalizeVisualTheme('clean_bento'), 'clean_bento');

  assert.equal(resolveEffectiveVisualTheme(undefined, null), 'neo_brutalist');
  assert.equal(resolveEffectiveVisualTheme('clean_bento', null), 'clean_bento');
  assert.equal(resolveEffectiveVisualTheme('neo_brutalist', 'clean_bento'), 'clean_bento');
  assert.equal(resolveEffectiveVisualTheme('clean_bento', 'neo_brutalist'), 'neo_brutalist');
});

test('theme cache and initial resolution prevent theme flash on both cached and uncached visits', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };

  // Uncached cold visit: hold rendering (themeReady = false) until Firestore resolves
  assert.equal(readCachedVisualTheme(mockStorage), null);
  const coldLoading = resolveInitialThemeState({
    cachedTheme: null,
    firestoreTheme: undefined,
    loadingSettings: true,
    previewTheme: null,
  });
  assert.equal(coldLoading.themeReady, false);

  // Cold visit once Firestore resolves to clean_bento: render directly in clean_bento
  const coldResolved = resolveInitialThemeState({
    cachedTheme: null,
    firestoreTheme: 'clean_bento',
    loadingSettings: false,
    previewTheme: null,
  });
  assert.equal(coldResolved.themeReady, true);
  assert.equal(coldResolved.activeTheme, 'clean_bento');
  assert.equal(coldResolved.persistedTheme, 'clean_bento');

  // Persist to cache and verify instant hydration on subsequent load before Firestore returns
  writeCachedVisualTheme('clean_bento', mockStorage);
  assert.equal(store.get(THEME_CACHE_STORAGE_KEY), 'clean_bento');
  assert.equal(readCachedVisualTheme(mockStorage), 'clean_bento');

  const warmLoading = resolveInitialThemeState({
    cachedTheme: readCachedVisualTheme(mockStorage),
    firestoreTheme: undefined,
    loadingSettings: true,
    previewTheme: null,
  });
  assert.equal(warmLoading.themeReady, true);
  assert.equal(warmLoading.activeTheme, 'clean_bento');

  // Firestore remains authoritative if Admin later switches theme back to neo_brutalist
  const firestoreOverride = resolveInitialThemeState({
    cachedTheme: 'clean_bento',
    firestoreTheme: 'neo_brutalist',
    loadingSettings: false,
    previewTheme: null,
  });
  assert.equal(firestoreOverride.themeReady, true);
  assert.equal(firestoreOverride.persistedTheme, 'neo_brutalist');
  assert.equal(firestoreOverride.activeTheme, 'neo_brutalist');
});

test('validateOrderInput and Netlify create-order handler allow optional empty buyer WhatsApp', async () => {
  const baseOrder = {
    customerName: 'Nadia Pratama',
    customerEmail: 'nadia@example.com',
    serviceId: 'website-aplikasi',
    quantityEstimate: 1,
    projectTitle: 'Company Profile Sekolah',
    projectBrief: 'Membutuhkan website profil sekolah dengan katalog program dan formulir PPDB.',
    deadline: '2026-12-10',
  };

  // Empty WhatsApp is accepted
  const emptyWa = validateOrderInput({ ...baseOrder, customerWhatsapp: '' }, '2026-11-26');
  assert.equal(emptyWa.valid, true);
  assert.deepEqual(emptyWa.errors, {});

  // Whitespace-only WhatsApp is accepted
  const spacesWa = validateOrderInput({ ...baseOrder, customerWhatsapp: '   ' }, '2026-11-26');
  assert.equal(spacesWa.valid, true);

  // Invalid non-empty WhatsApp is still rejected
  const invalidWa = validateOrderInput({ ...baseOrder, customerWhatsapp: '0812' }, '2026-11-26');
  assert.equal(invalidWa.valid, false);
  assert.ok(invalidWa.errors.customerWhatsapp);

  // Netlify create-order handler accepts empty WhatsApp, accepts valid WhatsApp, rejects malformed WhatsApp
  const authHeader = 'Bearer ' + 'a'.repeat(32);
  const resEmpty = await createOrderHandler({
    httpMethod: 'POST',
    headers: { authorization: authHeader },
    body: JSON.stringify({ ...baseOrder, customerWhatsapp: '' }),
  });
  assert.equal(resEmpty.statusCode, 200);
  assert.match(JSON.parse(resEmpty.body).orderCode, /^SCS-\d{8}-[A-Z0-9]{6}$/);

  const resValid = await createOrderHandler({
    httpMethod: 'POST',
    headers: { authorization: authHeader },
    body: JSON.stringify({ ...baseOrder, customerWhatsapp: '081234567890' }),
  });
  assert.equal(resValid.statusCode, 200);

  const resInvalid = await createOrderHandler({
    httpMethod: 'POST',
    headers: { authorization: authHeader },
    body: JSON.stringify({ ...baseOrder, customerWhatsapp: '123' }),
  });
  assert.equal(resInvalid.statusCode, 400);
});

test('validateOptionalSocialUrls and sanitizeHttpUrl allow empty/partial social URLs and reject invalid non-empty URLs', () => {
  // All empty is valid
  const allEmpty = validateOptionalSocialUrls({
    instagramUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    linkedinUrl: '',
  });
  assert.equal(allEmpty.valid, true);
  assert.deepEqual(allEmpty.errors, {});

  // Partially filled is valid
  const partial = validateOptionalSocialUrls({
    instagramUrl: 'https://instagram.com/syamscreativestudio',
    tiktokUrl: '',
    youtubeUrl: '   ',
    linkedinUrl: 'https://linkedin.com/company/syams-creative-studio',
  });
  assert.equal(partial.valid, true);

  // Invalid non-empty URL is rejected
  const invalid = validateOptionalSocialUrls({
    instagramUrl: 'instagram.com/tanpa-protokol',
    tiktokUrl: 'javascript:alert(1)',
    youtubeUrl: 'https://youtube.com/@syamscreativestudio',
    linkedinUrl: '',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.instagramUrl);
  assert.ok(invalid.errors.tiktokUrl);
  assert.equal(invalid.errors.youtubeUrl, undefined);
  assert.equal(invalid.errors.linkedinUrl, undefined);

  // sanitizeHttpUrl blocks relative paths and XSS while allowing valid http/https domains
  assert.equal(sanitizeHttpUrl('/relative/path'), '');
  assert.equal(sanitizeHttpUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeHttpUrl('https://instagram.com/syams'), 'https://instagram.com/syams');
});




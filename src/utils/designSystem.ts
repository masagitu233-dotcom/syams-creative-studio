import type React from 'react';
import type {
  ArticlesDesignConfig,
  CardAspectRatio,
  CardDesignConfig,
  CardHoverEffect,
  CardImagePosition,
  CardShadowPreset,
  CardShapePreset,
  CardSizePreset,
  CatalogDesignConfig,
  DesignAlign,
  DesignCategoryTab,
  DesignFontKey,
  DesignLayoutMode,
  DesignViewport,
  DeviceResponsiveOverride,
  FooterDesignConfig,
  GlobalDesignConfig,
  HeaderDesignConfig,
  HomeDesignConfig,
  HomeSectionId,
  OtherPagesDesignConfig,
  ResponsiveDesignConfig,
  SectionLayoutDesignConfig,
  SiteDesignConfig,
  SiteIdentityDesignConfig,
  StudioArticleItem,
} from '../types/design';
import type { VisualThemeMode } from '../types/studio';
import {
  normalizeBrandDisplayText,
  normalizeVisualTheme,
  sanitizeExternalUrl,
} from './studioLogic';
import { STUDIO_IMAGES } from '../data/initialCatalog';

export const SITE_DESIGN_CACHE_KEY = 'syams_site_design_published_cache_v1';

export interface DesignFontMeta {
  key: DesignFontKey;
  label: string;
  stack: string;
  category: 'Sans Display' | 'Sans UI' | 'Editorial Serif' | 'Monospace';
}

export const DESIGN_FONT_OPTIONS: DesignFontMeta[] = [
  {
    key: 'space_grotesk',
    label: 'Space Grotesk (Default Display)',
    stack: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    category: 'Sans Display',
  },
  {
    key: 'inter',
    label: 'Inter (Default Body)',
    stack: '"Inter", ui-sans-serif, system-ui, sans-serif',
    category: 'Sans UI',
  },
  {
    key: 'plus_jakarta',
    label: 'Plus Jakarta Sans',
    stack: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    category: 'Sans UI',
  },
  {
    key: 'dm_sans',
    label: 'DM Sans',
    stack: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    category: 'Sans UI',
  },
  {
    key: 'outfit',
    label: 'Outfit',
    stack: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    category: 'Sans Display',
  },
  {
    key: 'sora',
    label: 'Sora',
    stack: '"Sora", ui-sans-serif, system-ui, sans-serif',
    category: 'Sans Display',
  },
  {
    key: 'poppins',
    label: 'Poppins',
    stack: '"Poppins", ui-sans-serif, system-ui, sans-serif',
    category: 'Sans UI',
  },
  {
    key: 'playfair',
    label: 'Playfair Display',
    stack: '"Playfair Display", Georgia, serif',
    category: 'Editorial Serif',
  },
  {
    key: 'lora',
    label: 'Lora',
    stack: '"Lora", Georgia, serif',
    category: 'Editorial Serif',
  },
  {
    key: 'jetbrains_mono',
    label: 'JetBrains Mono',
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    category: 'Monospace',
  },
];

export const HOME_SECTION_LABELS: Record<HomeSectionId, { label: string; description: string }> = {
  hero: { label: 'Banner Utama (Hero)', description: 'Headline, subheadline, tombol CTA, dan visual utama.' },
  categories: { label: 'Strip Kategori Layanan', description: 'Daftar akses cepat kategori layanan unggulan.' },
  services: { label: 'Katalog Layanan Jasa', description: 'Menampilkan layanan jasa digital studio.' },
  products: { label: 'Katalog Produk Digital', description: 'Produk digital siap pakai beserta filter kategori.' },
  articles: { label: 'Artikel & Wawasan Studio', description: 'Blok artikel panduan, tips kreatif, dan kabar studio.' },
  advantages: { label: 'Keunggulan Studio', description: 'Empat pilar keunggulan OSAMA CREATIVE STUDIO.' },
  portfolio: { label: 'Cuplikan Portofolio', description: 'Karya pilihan lengkap dengan modal studi kasus.' },
  procedure: { label: 'Prosedur Pemesanan', description: 'Empat langkah alur kerja dari brief hingga file final.' },
  about: { label: 'Cuplikan Profil Studio', description: 'Ringkasan profil studio, statistik, dan tombol tentang.' },
  faq: { label: 'FAQ Ringkas', description: 'Daftar pertanyaan yang paling sering diajukan.' },
  cta: { label: 'Banner CTA Penutup', description: 'Ajakan mulai proyek & konsultasi sebelum footer.' },
};

export const DEFAULT_HOME_SECTION_ORDER: HomeSectionId[] = [
  'hero',
  'categories',
  'services',
  'products',
  'advantages',
  'portfolio',
  'articles',
  'procedure',
  'about',
  'faq',
  'cta',
];

export const DEFAULT_ARTICLES: StudioArticleItem[] = [
  {
    id: 'art_panduan_brief',
    slug: 'cara-menyiapkan-brief-website-rapi',
    title: 'Cara Menyiapkan Brief Website & Aplikasi agar Pengerjaan Lebih Cepat',
    category: 'Panduan Proyek',
    summary:
      'Langkah praktis menyusun tujuan halaman, daftar fitur utama, referensi visual, serta materi teks sebelum memulai proyek digital.',
    content:
      'Brief yang terstruktur membantu tim desain dan pengembangan memahami kebutuhan sejak hari pertama. Mulailah dengan menuliskan tujuan utama website, target audiens, halaman wajib, dan contoh referensi visual yang Anda sukai.\n\nDengan materi awal yang jelas, estimasi biaya dan durasi pengerjaan dapat ditetapkan lebih akurat serta mengurangi revisi berulang.',
    imageUrl: STUDIO_IMAGES.webApp,
    publishedDate: '2026-10-12',
    readTime: '3 menit baca',
    isPublished: true,
  },
  {
    id: 'art_desain_poster',
    slug: 'prinsip-hierarki-visual-poster-kajian-dan-event',
    title: 'Prinsip Hierarki Visual pada Poster Kajian, Seminar, dan Promosi',
    category: 'Desain Grafis',
    summary:
      'Mengatur ukuran judul, kontras warna, jadwal kegiatan, dan ruang kosong agar pesan utama terbaca dalam 3 detik pertama.',
    content:
      'Poster yang efektif tidak menumpuk seluruh informasi dengan ukuran huruf yang sama. Pisahkan informasi ke dalam tiga tingkatan: judul utama, detail tanggal/lokasi, dan informasi pendukung.\n\nPastikan rasio kontras warna teks terhadap latar belakang tetap tinggi agar mudah dibaca baik pada layar ponsel maupun saat dicetak.',
    imageUrl: STUDIO_IMAGES.poster,
    publishedDate: '2026-10-20',
    readTime: '4 menit baca',
    isPublished: true,
  },
  {
    id: 'art_slide_ppt',
    slug: 'struktur-slide-presentasi-pembelajaran-interaktif',
    title: 'Menyusun Slide Presentasi Pembelajaran yang Ringkas dan Tidak Membosankan',
    category: 'Presentasi',
    summary:
      'Tips membagi satu gagasan per slide, memakai diagram sederhana, dan menjaga konsistensi warna sepanjang materi.',
    content:
      'Slide presentasi berfungsi memperkuat penjelasan pemateri, bukan menggantikan naskah penuh. Batasi setiap slide maksimal 3–5 poin ringkas dan gunakan visual diagram atau tabel perbandingan.\n\nPenggunaan template yang konsisten membuat audiens lebih fokus pada inti materi yang disampaikan.',
    imageUrl: STUDIO_IMAGES.ppt,
    publishedDate: '2026-11-02',
    readTime: '3 menit baca',
    isPublished: true,
  },
];

function createDefaultSection(
  overrides: Partial<SectionLayoutDesignConfig> = {}
): SectionLayoutDesignConfig {
  return {
    visible: true,
    layout: 'grid',
    colsDesktop: 5,
    colsTablet: 3,
    colsMobile: 2,
    maxItems: 0,
    gapPx: 12,
    paddingYPx: 36,
    marginYPx: 0,
    minHeightPx: 0,
    maxWidthPx: 0,
    textAlign: 'left',
    contentPosition: 'start',
    backgroundColor: '',
    textColor: '',
    accentColor: '',
    borderColor: '',
    buttonBg: '',
    buttonText: '',
    fontFamily: '',
    headingSizePx: 0,
    descriptionSizePx: 0,
    customTitle: '',
    customSubtitle: '',
    ...overrides,
  };
}

function createDefaultCard(overrides: Partial<CardDesignConfig> = {}): CardDesignConfig {
  return {
    size: 'normal',
    maxWidthPx: 0,
    minHeightPx: 0,
    shape: 'theme',
    borderRadiusPx: null,
    borderWidthPx: null,
    borderColor: '',
    backgroundColor: '',
    textColor: '',
    accentColor: '',
    buttonBg: '',
    buttonText: '',
    shadow: 'theme',
    gapPx: 12,
    aspectRatio: '16/10',
    imagePosition: 'top',
    textAlign: 'left',
    titleSizePx: 13,
    titleWeight: 700,
    descriptionSizePx: 12,
    priceSizePx: 13,
    pricePosition: 'bottom',
    showCategory: true,
    showDescription: false,
    showPrice: true,
    showActionButton: true,
    showMeta: true,
    hoverEffect: 'theme',
    ...overrides,
  };
}

export const DEFAULT_GLOBAL_DESIGN: GlobalDesignConfig = {
  visualTheme: 'neo_brutalist',
  containerMaxWidthPx: 1280,
  sectionPaddingYPx: 36,
  elementGapPx: 12,
  colors: {
    primary: '',
    secondary: '',
    background: '',
    surface: '',
    border: '',
    textPrimary: '',
    textMuted: '',
    buttonBg: '',
    buttonText: '',
  },
  typography: {
    displayFont: 'space_grotesk',
    bodyFont: 'inter',
    baseFontSizePx: 16,
    headingScale: 1,
    subheadingScale: 1,
    descriptionSizePx: 14,
    buttonFontSizePx: 12,
    headingWeight: 700,
    bodyWeight: 400,
    lineHeight: 1.5,
    letterSpacingEm: 0,
    textAlign: 'left',
  },
};

export const DEFAULT_IDENTITY_DESIGN: SiteIdentityDesignConfig = {
  logoUrl: '',
  logoDriveFileId: '',
  logoHeightPx: 32,
  showLogoText: true,
  faviconUrl: '',
  faviconDriveFileId: '',
  ownerPhotoUrl: '',
  ownerPhotoDriveFileId: '',
  ownerName: 'Tim OSAMA CREATIVE STUDIO',
  ownerRole: 'Founder & Creative Director',
  ownerBio:
    'Memimpin arah kreatif, kurasi editorial, dan standar kualitas proyek digital untuk lembaga, pendidik, dan pelaku usaha.',
  coverImageUrl: '',
  coverDriveFileId: '',
  heroImageOverrideUrl: '',
  heroImageOverrideDriveFileId: '',
  pageBackgroundImageUrl: '',
  pageBackgroundDriveFileId: '',
  pageBackgroundOpacity: 0.08,
};

export const DEFAULT_HEADER_DESIGN: HeaderDesignConfig = {
  visible: true,
  sticky: true,
  heightPx: 56,
  layout: 'standard',
  navAlign: 'center',
  navGapPx: 24,
  navFontSizePx: 13,
  showCta: true,
  ctaLabel: 'Pesan Sekarang',
  backgroundColor: '',
  textColor: '',
  borderColor: '',
  ctaBg: '',
  ctaText: '',
  paddingXPx: 0,
};

export const DEFAULT_FOOTER_DESIGN: FooterDesignConfig = {
  visible: true,
  layout: '4_col',
  textAlign: 'left',
  showAbout: true,
  showQuickLinks: true,
  showSocials: true,
  showWhatsappButton: true,
  copyrightText: '',
  paddingYPx: 36,
  backgroundColor: '',
  textColor: '',
  accentColor: '',
  borderColor: '',
};

export const DEFAULT_HOME_DESIGN: HomeDesignConfig = {
  sectionOrder: [...DEFAULT_HOME_SECTION_ORDER],
  sections: {
    hero: createDefaultSection({
      heroLayout: 'split_right',
      colsDesktop: 2,
      colsTablet: 1,
      colsMobile: 1,
      paddingYPx: 0,
      gapPx: 20,
    }),
    categories: createDefaultSection({
      colsDesktop: 5,
      colsTablet: 3,
      colsMobile: 2,
      maxItems: 5,
      paddingYPx: 0,
      gapPx: 10,
    }),
    services: createDefaultSection({
      colsDesktop: 5,
      colsTablet: 3,
      colsMobile: 2,
      maxItems: 5,
      paddingYPx: 0,
      gapPx: 12,
    }),
    products: createDefaultSection({
      colsDesktop: 5,
      colsTablet: 3,
      colsMobile: 2,
      maxItems: 10,
      paddingYPx: 0,
      gapPx: 12,
    }),
    articles: createDefaultSection({
      visible: false,
      colsDesktop: 3,
      colsTablet: 2,
      colsMobile: 1,
      maxItems: 3,
      paddingYPx: 0,
      gapPx: 16,
    }),
    advantages: createDefaultSection({
      colsDesktop: 4,
      colsTablet: 2,
      colsMobile: 1,
      maxItems: 4,
      paddingYPx: 0,
      gapPx: 14,
    }),
    portfolio: createDefaultSection({
      colsDesktop: 5,
      colsTablet: 3,
      colsMobile: 2,
      maxItems: 5,
      paddingYPx: 0,
      gapPx: 12,
    }),
    procedure: createDefaultSection({
      colsDesktop: 4,
      colsTablet: 2,
      colsMobile: 1,
      maxItems: 4,
      paddingYPx: 0,
      gapPx: 14,
    }),
    about: createDefaultSection({
      colsDesktop: 2,
      colsTablet: 1,
      colsMobile: 1,
      paddingYPx: 0,
      gapPx: 20,
    }),
    faq: createDefaultSection({
      colsDesktop: 1,
      colsTablet: 1,
      colsMobile: 1,
      maxItems: 4,
      maxWidthPx: 896,
      paddingYPx: 0,
      gapPx: 12,
    }),
    cta: createDefaultSection({
      colsDesktop: 1,
      colsTablet: 1,
      colsMobile: 1,
      paddingYPx: 0,
      gapPx: 16,
    }),
  },
};

export const DEFAULT_PRODUCTS_DESIGN: CatalogDesignConfig = {
  section: createDefaultSection({
    colsDesktop: 5,
    colsTablet: 3,
    colsMobile: 2,
    maxItems: 0,
    paddingYPx: 24,
    gapPx: 12,
  }),
  card: createDefaultCard({
    showCategory: false,
    showDescription: false,
    showPrice: true,
    showActionButton: false,
    aspectRatio: '16/10',
  }),
  itemOverrides: {},
};

export const DEFAULT_SERVICES_DESIGN: CatalogDesignConfig = {
  section: createDefaultSection({
    colsDesktop: 5,
    colsTablet: 3,
    colsMobile: 2,
    maxItems: 0,
    paddingYPx: 24,
    gapPx: 12,
  }),
  card: createDefaultCard({
    showCategory: false,
    showDescription: false,
    showPrice: true,
    showActionButton: true,
    aspectRatio: '16/10',
  }),
  itemOverrides: {},
};

export const DEFAULT_PORTFOLIO_DESIGN: CatalogDesignConfig = {
  section: createDefaultSection({
    colsDesktop: 5,
    colsTablet: 3,
    colsMobile: 2,
    maxItems: 0,
    paddingYPx: 24,
    gapPx: 12,
  }),
  card: createDefaultCard({
    showCategory: true,
    showDescription: false,
    showPrice: false,
    showActionButton: true,
    showMeta: false,
    aspectRatio: '16/10',
  }),
  itemOverrides: {},
};

export const DEFAULT_ARTICLES_DESIGN: ArticlesDesignConfig = {
  showInNavigation: false,
  pageTitle: 'Artikel, Panduan & Wawasan Studio',
  pageSubtitle:
    'Kumpulan panduan ringkas seputar desain, website, presentasi, dan strategi konten dari tim OSAMA CREATIVE STUDIO.',
  section: createDefaultSection({
    colsDesktop: 3,
    colsTablet: 2,
    colsMobile: 1,
    maxItems: 0,
    paddingYPx: 28,
    gapPx: 16,
  }),
  card: createDefaultCard({
    aspectRatio: '16/9',
    titleSizePx: 15,
    descriptionSizePx: 13,
    showCategory: true,
    showDescription: true,
    showPrice: false,
    showActionButton: true,
    showMeta: true,
  }),
  items: DEFAULT_ARTICLES.map((a) => ({ ...a })),
};

export const DEFAULT_OTHER_PAGES_DESIGN: OtherPagesDesignConfig = {
  about: {
    showOwnerProfile: false,
    showCoverBanner: true,
    showValues: true,
    showServicesStrip: true,
    valuesColsDesktop: 3,
    paddingYPx: 36,
    maxWidthPx: 0,
    backgroundColor: '',
    cardBackgroundColor: '',
    textAlign: 'left',
  },
  procedure: {
    layout: 'grid',
    colsDesktop: 3,
    colsTablet: 2,
    colsMobile: 1,
    showGuarantees: true,
    paddingYPx: 36,
    maxWidthPx: 0,
    backgroundColor: '',
  },
  faq: {
    showSearch: true,
    showCategoryTabs: true,
    showBottomCta: true,
    maxWidthPx: 896,
    paddingYPx: 36,
    backgroundColor: '',
    cardBackgroundColor: '',
  },
  contact: {
    layout: 'info_left',
    showSocials: true,
    paddingYPx: 36,
    maxWidthPx: 0,
    backgroundColor: '',
  },
  detailPages: {
    imagePosition: 'left',
    imageAspectRatio: '4/3',
    showGallery: true,
    showRelated: true,
    relatedColsDesktop: 5,
    maxWidthPx: 0,
  },
};

export const DEFAULT_RESPONSIVE_DESIGN: ResponsiveDesignConfig = {
  desktop: {
    textScale: 1,
    sectionPaddingScale: 1,
    gapPx: 12,
    cardSize: 'normal',
    imagePositionOverride: 'inherit',
    productsCols: 5,
    servicesCols: 5,
    portfolioCols: 5,
    articlesCols: 3,
  },
  tablet: {
    textScale: 1,
    sectionPaddingScale: 1,
    gapPx: 12,
    cardSize: 'normal',
    imagePositionOverride: 'inherit',
    productsCols: 3,
    servicesCols: 3,
    portfolioCols: 3,
    articlesCols: 2,
  },
  mobile: {
    textScale: 1,
    sectionPaddingScale: 1,
    gapPx: 10,
    cardSize: 'normal',
    imagePositionOverride: 'inherit',
    productsCols: 2,
    servicesCols: 2,
    portfolioCols: 2,
    articlesCols: 1,
  },
};

export function createDefaultSiteDesignConfig(
  status: 'published' | 'draft' | 'previous' = 'published'
): SiteDesignConfig {
  return {
    schemaVersion: 2,
    status,
    global: structuredClone(DEFAULT_GLOBAL_DESIGN),
    identity: structuredClone(DEFAULT_IDENTITY_DESIGN),
    header: structuredClone(DEFAULT_HEADER_DESIGN),
    footer: structuredClone(DEFAULT_FOOTER_DESIGN),
    home: structuredClone(DEFAULT_HOME_DESIGN),
    products: structuredClone(DEFAULT_PRODUCTS_DESIGN),
    services: structuredClone(DEFAULT_SERVICES_DESIGN),
    portfolio: structuredClone(DEFAULT_PORTFOLIO_DESIGN),
    articles: structuredClone(DEFAULT_ARTICLES_DESIGN),
    otherPages: structuredClone(DEFAULT_OTHER_PAGES_DESIGN),
    responsive: structuredClone(DEFAULT_RESPONSIVE_DESIGN),
    updatedBy: 'system',
  };
}

export const DEFAULT_SITE_DESIGN: SiteDesignConfig = createDefaultSiteDesignConfig('published');

// -----------------------------------------------------------------------------
// Validation, Clamping & Deep Merge
// -----------------------------------------------------------------------------

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function safeColor(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return trimmed;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function safeStr(val: unknown, fallback: string, maxLen = 400): string {
  if (typeof val !== 'string') return fallback;
  return val.slice(0, maxLen);
}

function safeBool(val: unknown, fallback: boolean): boolean {
  return typeof val === 'boolean' ? val : fallback;
}

function safeFontKey(val: unknown, fallback: DesignFontKey): DesignFontKey {
  if (typeof val === 'string' && DESIGN_FONT_OPTIONS.some((f) => f.key === val)) {
    return val as DesignFontKey;
  }
  return fallback;
}

function safeOptionalFontKey(val: unknown): DesignFontKey | '' {
  if (typeof val === 'string' && val === '') return '';
  if (typeof val === 'string' && DESIGN_FONT_OPTIONS.some((f) => f.key === val)) {
    return val as DesignFontKey;
  }
  return '';
}

function safeEnum<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val)
    ? (val as T)
    : fallback;
}

function mergeSectionConfig(
  raw: unknown,
  base: SectionLayoutDesignConfig
): SectionLayoutDesignConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    visible: safeBool(obj.visible, base.visible),
    layout: safeEnum(obj.layout, ['grid', 'bento', 'list', 'horizontal'] as const, base.layout),
    heroLayout: base.heroLayout
      ? safeEnum(
          obj.heroLayout,
          ['split_right', 'split_left', 'centered', 'banner_overlay'] as const,
          base.heroLayout
        )
      : undefined,
    colsDesktop: Math.round(clampNumber(obj.colsDesktop, 1, 6, base.colsDesktop)),
    colsTablet: Math.round(clampNumber(obj.colsTablet, 1, 4, base.colsTablet)),
    colsMobile: Math.round(clampNumber(obj.colsMobile, 1, 3, base.colsMobile)),
    maxItems: Math.round(clampNumber(obj.maxItems, 0, 50, base.maxItems)),
    gapPx: Math.round(clampNumber(obj.gapPx, 6, 40, base.gapPx)),
    paddingYPx: Math.round(clampNumber(obj.paddingYPx, 0, 96, base.paddingYPx)),
    marginYPx: Math.round(clampNumber(obj.marginYPx, 0, 48, base.marginYPx)),
    minHeightPx: Math.round(clampNumber(obj.minHeightPx, 0, 900, base.minHeightPx)),
    maxWidthPx: Math.round(clampNumber(obj.maxWidthPx, 0, 1600, base.maxWidthPx)),
    textAlign: safeEnum(obj.textAlign, ['left', 'center', 'right'] as const, base.textAlign),
    contentPosition: safeEnum(
      obj.contentPosition,
      ['start', 'center', 'end'] as const,
      base.contentPosition
    ),
    backgroundColor: safeColor(obj.backgroundColor),
    textColor: safeColor(obj.textColor),
    accentColor: safeColor(obj.accentColor),
    borderColor: safeColor(obj.borderColor),
    buttonBg: safeColor(obj.buttonBg),
    buttonText: safeColor(obj.buttonText),
    fontFamily: safeOptionalFontKey(obj.fontFamily),
    headingSizePx: Math.round(clampNumber(obj.headingSizePx, 0, 56, base.headingSizePx)),
    descriptionSizePx: Math.round(clampNumber(obj.descriptionSizePx, 0, 24, base.descriptionSizePx)),
    customTitle: normalizeBrandDisplayText(safeStr(obj.customTitle, base.customTitle || '', 160)),
    customSubtitle: normalizeBrandDisplayText(
      safeStr(obj.customSubtitle, base.customSubtitle || '', 300)
    ),
  };
}

function mergeCardConfig(raw: unknown, base: CardDesignConfig): CardDesignConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const radiusRaw = obj.borderRadiusPx;
  const borderRaw = obj.borderWidthPx;
  return {
    size: safeEnum(obj.size, ['compact', 'normal', 'large'] as const, base.size),
    maxWidthPx: Math.round(clampNumber(obj.maxWidthPx, 0, 900, base.maxWidthPx)),
    minHeightPx: Math.round(clampNumber(obj.minHeightPx, 0, 700, base.minHeightPx)),
    shape: safeEnum(
      obj.shape,
      ['theme', 'sharp', 'square', 'rectangle', 'rounded', 'soft_pill'] as const,
      base.shape
    ),
    borderRadiusPx:
      radiusRaw === null || radiusRaw === undefined || radiusRaw === ''
        ? null
        : Math.round(clampNumber(radiusRaw, 0, 32, base.borderRadiusPx ?? 8)),
    borderWidthPx:
      borderRaw === null || borderRaw === undefined || borderRaw === ''
        ? null
        : Math.round(clampNumber(borderRaw, 0, 4, base.borderWidthPx ?? 2)),
    borderColor: safeColor(obj.borderColor),
    backgroundColor: safeColor(obj.backgroundColor),
    textColor: safeColor(obj.textColor),
    accentColor: safeColor(obj.accentColor),
    buttonBg: safeColor(obj.buttonBg),
    buttonText: safeColor(obj.buttonText),
    shadow: safeEnum(
      obj.shadow,
      ['theme', 'none', 'soft', 'brutal', 'elevated'] as const,
      base.shadow
    ),
    gapPx: Math.round(clampNumber(obj.gapPx, 6, 36, base.gapPx)),
    aspectRatio: safeEnum(
      obj.aspectRatio,
      ['1/1', '4/3', '3/4', '16/9', '16/10'] as const,
      base.aspectRatio
    ),
    imagePosition: safeEnum(
      obj.imagePosition,
      ['top', 'left', 'right', 'background'] as const,
      base.imagePosition
    ),
    textAlign: safeEnum(obj.textAlign, ['left', 'center', 'right'] as const, base.textAlign),
    titleSizePx: Math.round(clampNumber(obj.titleSizePx, 11, 24, base.titleSizePx)),
    titleWeight: clampNumber(obj.titleWeight, 500, 800, base.titleWeight) as 500 | 600 | 700 | 800,
    descriptionSizePx: Math.round(
      clampNumber(obj.descriptionSizePx, 10, 18, base.descriptionSizePx)
    ),
    priceSizePx: Math.round(clampNumber(obj.priceSizePx, 10, 22, base.priceSizePx)),
    pricePosition: safeEnum(
      obj.pricePosition,
      ['bottom', 'top_badge', 'inline'] as const,
      base.pricePosition
    ),
    showCategory: safeBool(obj.showCategory, base.showCategory),
    showDescription: safeBool(obj.showDescription, base.showDescription),
    showPrice: safeBool(obj.showPrice, base.showPrice),
    showActionButton: safeBool(obj.showActionButton, base.showActionButton),
    showMeta: safeBool(obj.showMeta, base.showMeta),
    hoverEffect: safeEnum(
      obj.hoverEffect,
      ['theme', 'lift', 'scale', 'border_accent', 'none'] as const,
      base.hoverEffect
    ),
  };
}

function mergeDeviceOverride(
  raw: unknown,
  base: DeviceResponsiveOverride
): DeviceResponsiveOverride {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    textScale: Number(clampNumber(obj.textScale, 0.85, 1.2, base.textScale).toFixed(2)),
    sectionPaddingScale: Number(
      clampNumber(obj.sectionPaddingScale, 0.6, 1.4, base.sectionPaddingScale).toFixed(2)
    ),
    gapPx: Math.round(clampNumber(obj.gapPx, 6, 36, base.gapPx)),
    cardSize: safeEnum(obj.cardSize, ['compact', 'normal', 'large'] as const, base.cardSize),
    imagePositionOverride: safeEnum(
      obj.imagePositionOverride,
      ['inherit', 'top', 'left', 'right', 'background'] as const,
      base.imagePositionOverride
    ),
    productsCols: Math.round(clampNumber(obj.productsCols, 1, 6, base.productsCols)),
    servicesCols: Math.round(clampNumber(obj.servicesCols, 1, 6, base.servicesCols)),
    portfolioCols: Math.round(clampNumber(obj.portfolioCols, 1, 6, base.portfolioCols)),
    articlesCols: Math.round(clampNumber(obj.articlesCols, 1, 4, base.articlesCols)),
  };
}

function mergeSectionOrder(raw: unknown): HomeSectionId[] {
  const validSet = new Set<HomeSectionId>(DEFAULT_HOME_SECTION_ORDER);
  const result: HomeSectionId[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && validSet.has(item as HomeSectionId) && !result.includes(item as HomeSectionId)) {
        result.push(item as HomeSectionId);
      }
    }
  }
  for (const requiredId of DEFAULT_HOME_SECTION_ORDER) {
    if (!result.includes(requiredId)) {
      result.push(requiredId);
    }
  }
  return result;
}

function mergeArticlesList(raw: unknown): StudioArticleItem[] {
  if (!Array.isArray(raw)) return DEFAULT_ARTICLES.map((a) => ({ ...a }));
  const clean: StudioArticleItem[] = [];
  for (const item of raw.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const title = safeStr(obj.title, '', 160).trim();
    if (!title) continue;
    const id =
      safeStr(obj.id, '', 64).replace(/[^a-zA-Z0-9_-]/g, '') || `art_${clean.length + 1}`;
    const slug =
      safeStr(obj.slug, '', 80)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-') || id;
    clean.push({
      id,
      slug,
      title,
      category: safeStr(obj.category, 'Wawasan', 60) || 'Wawasan',
      summary: safeStr(obj.summary, '', 360),
      content: safeStr(obj.content, '', 4000),
      imageUrl: sanitizeExternalUrl(safeStr(obj.imageUrl, '', 500)) || STUDIO_IMAGES.webApp,
      driveFileId: safeStr(obj.driveFileId, '', 200),
      publishedDate: safeStr(obj.publishedDate, '2026-11-01', 30),
      readTime: safeStr(obj.readTime, '3 menit baca', 40),
      isPublished: safeBool(obj.isPublished, true),
    });
  }
  return clean;
}

export function mergeSiteDesignConfig(
  raw: unknown,
  fallbackStatus: 'published' | 'draft' | 'previous' = 'published'
): SiteDesignConfig {
  const base = createDefaultSiteDesignConfig(fallbackStatus);
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;

  const rawGlobal = (obj.global && typeof obj.global === 'object' ? obj.global : {}) as Record<string, unknown>;
  const rawColors = (rawGlobal.colors && typeof rawGlobal.colors === 'object' ? rawGlobal.colors : {}) as Record<string, unknown>;
  const rawTypo = (rawGlobal.typography && typeof rawGlobal.typography === 'object' ? rawGlobal.typography : {}) as Record<string, unknown>;
  const rawId = (obj.identity && typeof obj.identity === 'object' ? obj.identity : {}) as Record<string, unknown>;
  const rawHeader = (obj.header && typeof obj.header === 'object' ? obj.header : {}) as Record<string, unknown>;
  const rawFooter = (obj.footer && typeof obj.footer === 'object' ? obj.footer : {}) as Record<string, unknown>;
  const rawHome = (obj.home && typeof obj.home === 'object' ? obj.home : {}) as Record<string, unknown>;
  const rawHomeSections = (rawHome.sections && typeof rawHome.sections === 'object' ? rawHome.sections : {}) as Record<string, unknown>;

  const mergeCatalog = (rawCat: unknown, baseCat: CatalogDesignConfig): CatalogDesignConfig => {
    const cObj = rawCat && typeof rawCat === 'object' ? (rawCat as Record<string, unknown>) : {};
    const rawOverrides =
      cObj.itemOverrides && typeof cObj.itemOverrides === 'object'
        ? (cObj.itemOverrides as Record<string, unknown>)
        : {};
    const cleanOverrides: Record<string, Partial<CardDesignConfig>> = {};
    for (const [k, v] of Object.entries(rawOverrides).slice(0, 40)) {
      if (!v || typeof v !== 'object') continue;
      const merged = mergeCardConfig(v, baseCat.card);
      const vObj = v as Record<string, unknown>;
      const partial: Partial<CardDesignConfig> = {};
      if ('shape' in vObj) partial.shape = merged.shape;
      if ('aspectRatio' in vObj) partial.aspectRatio = merged.aspectRatio;
      if ('imagePosition' in vObj) partial.imagePosition = merged.imagePosition;
      if ('borderRadiusPx' in vObj) partial.borderRadiusPx = merged.borderRadiusPx;
      if ('borderColor' in vObj) partial.borderColor = merged.borderColor;
      if ('backgroundColor' in vObj) partial.backgroundColor = merged.backgroundColor;
      if ('shadow' in vObj) partial.shadow = merged.shadow;
      if ('size' in vObj) partial.size = merged.size;
      if (Object.keys(partial).length > 0) {
        cleanOverrides[k.slice(0, 128)] = partial;
      }
    }
    return {
      section: mergeSectionConfig(cObj.section, baseCat.section),
      card: mergeCardConfig(cObj.card, baseCat.card),
      itemOverrides: cleanOverrides,
    };
  };

  const rawArticles = (obj.articles && typeof obj.articles === 'object' ? obj.articles : {}) as Record<string, unknown>;
  const rawOther = (obj.otherPages && typeof obj.otherPages === 'object' ? obj.otherPages : {}) as Record<string, unknown>;
  const rawAbout = (rawOther.about && typeof rawOther.about === 'object' ? rawOther.about : {}) as Record<string, unknown>;
  const rawProc = (rawOther.procedure && typeof rawOther.procedure === 'object' ? rawOther.procedure : {}) as Record<string, unknown>;
  const rawFaq = (rawOther.faq && typeof rawOther.faq === 'object' ? rawOther.faq : {}) as Record<string, unknown>;
  const rawContact = (rawOther.contact && typeof rawOther.contact === 'object' ? rawOther.contact : {}) as Record<string, unknown>;
  const rawDetail = (rawOther.detailPages && typeof rawOther.detailPages === 'object' ? rawOther.detailPages : {}) as Record<string, unknown>;
  const rawResp = (obj.responsive && typeof obj.responsive === 'object' ? obj.responsive : {}) as Record<string, unknown>;

  const rawSchemaVersion =
    typeof obj.schemaVersion === 'number' && Number.isFinite(obj.schemaVersion)
      ? obj.schemaVersion
      : 1;
  const isLegacyV1 = rawSchemaVersion < 2;

  const LEGACY_V1_HOME_PAD: Record<HomeSectionId, number> = {
    hero: 28,
    categories: 20,
    services: 36,
    products: 36,
    articles: 36,
    advantages: 36,
    portfolio: 36,
    procedure: 36,
    about: 36,
    faq: 36,
    cta: 36,
  };

  const mergedHomeSections = {} as Record<HomeSectionId, SectionLayoutDesignConfig>;
  for (const id of DEFAULT_HOME_SECTION_ORDER) {
    const sec = mergeSectionConfig(rawHomeSections[id], base.home.sections[id]);
    if (isLegacyV1 && sec.paddingYPx === LEGACY_V1_HOME_PAD[id]) {
      sec.paddingYPx = 0;
    }
    mergedHomeSections[id] = sec;
  }

  let resolvedContainerMax = Math.round(
    clampNumber(rawGlobal.containerMaxWidthPx, 960, 1536, base.global.containerMaxWidthPx)
  );
  if (isLegacyV1 && resolvedContainerMax === 1088) {
    resolvedContainerMax = 1280;
  }

  let resolvedBaseFont = Math.round(
    clampNumber(rawTypo.baseFontSizePx, 12, 20, base.global.typography.baseFontSizePx)
  );
  if (isLegacyV1 && resolvedBaseFont === 14) {
    resolvedBaseFont = 16;
  }

  let resolvedLineHeight = Number(
    clampNumber(rawTypo.lineHeight, 1.25, 1.95, base.global.typography.lineHeight).toFixed(2)
  );
  if (isLegacyV1 && resolvedLineHeight === 1.55) {
    resolvedLineHeight = 1.5;
  }

  let resolvedHeaderPadX = Math.round(
    clampNumber(rawHeader.paddingXPx, 0, 48, base.header.paddingXPx)
  );
  if (isLegacyV1 && resolvedHeaderPadX === 24) {
    resolvedHeaderPadX = 0;
  }

  const mergedTabletResp = mergeDeviceOverride(rawResp.tablet, base.responsive.tablet);
  const mergedMobileResp = mergeDeviceOverride(rawResp.mobile, base.responsive.mobile);
  if (isLegacyV1) {
    if (mergedTabletResp.textScale === 0.96) mergedTabletResp.textScale = 1;
    if (mergedTabletResp.sectionPaddingScale === 0.9) mergedTabletResp.sectionPaddingScale = 1;
    if (mergedMobileResp.textScale === 0.94) mergedMobileResp.textScale = 1;
    if (mergedMobileResp.sectionPaddingScale === 0.8) mergedMobileResp.sectionPaddingScale = 1;
    if (mergedMobileResp.cardSize === 'compact') mergedMobileResp.cardSize = 'normal';
    if (mergedMobileResp.imagePositionOverride === 'top') {
      mergedMobileResp.imagePositionOverride = 'inherit';
    }
  }

  return {
    schemaVersion: 2,
    status: safeEnum(obj.status, ['published', 'draft', 'previous'] as const, fallbackStatus),
    global: {
      visualTheme: normalizeVisualTheme(rawGlobal.visualTheme),
      containerMaxWidthPx: resolvedContainerMax,
      sectionPaddingYPx: Math.round(
        clampNumber(rawGlobal.sectionPaddingYPx, 12, 84, base.global.sectionPaddingYPx)
      ),
      elementGapPx: Math.round(clampNumber(rawGlobal.elementGapPx, 6, 36, base.global.elementGapPx)),
      colors: {
        primary: safeColor(rawColors.primary),
        secondary: safeColor(rawColors.secondary),
        background: safeColor(rawColors.background),
        surface: safeColor(rawColors.surface),
        border: safeColor(rawColors.border),
        textPrimary: safeColor(rawColors.textPrimary),
        textMuted: safeColor(rawColors.textMuted),
        buttonBg: safeColor(rawColors.buttonBg),
        buttonText: safeColor(rawColors.buttonText),
      },
      typography: {
        displayFont: safeFontKey(rawTypo.displayFont, base.global.typography.displayFont),
        bodyFont: safeFontKey(rawTypo.bodyFont, base.global.typography.bodyFont),
        baseFontSizePx: resolvedBaseFont,
        headingScale: Number(
          clampNumber(rawTypo.headingScale, 0.85, 1.35, base.global.typography.headingScale).toFixed(2)
        ),
        subheadingScale: Number(
          clampNumber(
            rawTypo.subheadingScale,
            0.85,
            1.25,
            base.global.typography.subheadingScale
          ).toFixed(2)
        ),
        descriptionSizePx: Math.round(
          clampNumber(rawTypo.descriptionSizePx, 11, 18, base.global.typography.descriptionSizePx)
        ),
        buttonFontSizePx: Math.round(
          clampNumber(rawTypo.buttonFontSizePx, 10, 16, base.global.typography.buttonFontSizePx)
        ),
        headingWeight: clampNumber(
          rawTypo.headingWeight,
          500,
          800,
          base.global.typography.headingWeight
        ) as 500 | 600 | 700 | 800,
        bodyWeight: clampNumber(
          rawTypo.bodyWeight,
          400,
          600,
          base.global.typography.bodyWeight
        ) as 400 | 500 | 600,
        lineHeight: resolvedLineHeight,
        letterSpacingEm: Number(
          clampNumber(
            rawTypo.letterSpacingEm,
            -0.04,
            0.08,
            base.global.typography.letterSpacingEm
          ).toFixed(3)
        ),
        textAlign: safeEnum(
          rawTypo.textAlign,
          ['left', 'center', 'right'] as const,
          base.global.typography.textAlign
        ),
      },
    },
    identity: {
      logoUrl: sanitizeExternalUrl(safeStr(rawId.logoUrl, '', 500)),
      logoDriveFileId: safeStr(rawId.logoDriveFileId, '', 200),
      logoHeightPx: Math.round(clampNumber(rawId.logoHeightPx, 20, 64, base.identity.logoHeightPx)),
      showLogoText: safeBool(rawId.showLogoText, base.identity.showLogoText),
      faviconUrl: sanitizeExternalUrl(safeStr(rawId.faviconUrl, '', 500)),
      faviconDriveFileId: safeStr(rawId.faviconDriveFileId, '', 200),
      ownerPhotoUrl: sanitizeExternalUrl(safeStr(rawId.ownerPhotoUrl, '', 500)),
      ownerPhotoDriveFileId: safeStr(rawId.ownerPhotoDriveFileId, '', 200),
      ownerName: normalizeBrandDisplayText(safeStr(rawId.ownerName, base.identity.ownerName, 120)),
      ownerRole: safeStr(rawId.ownerRole, base.identity.ownerRole, 120),
      ownerBio: normalizeBrandDisplayText(safeStr(rawId.ownerBio, base.identity.ownerBio, 500)),
      coverImageUrl: sanitizeExternalUrl(safeStr(rawId.coverImageUrl, '', 500)),
      coverDriveFileId: safeStr(rawId.coverDriveFileId, '', 200),
      heroImageOverrideUrl: sanitizeExternalUrl(safeStr(rawId.heroImageOverrideUrl, '', 500)),
      heroImageOverrideDriveFileId: safeStr(rawId.heroImageOverrideDriveFileId, '', 200),
      pageBackgroundImageUrl: sanitizeExternalUrl(safeStr(rawId.pageBackgroundImageUrl, '', 500)),
      pageBackgroundDriveFileId: safeStr(rawId.pageBackgroundDriveFileId, '', 200),
      pageBackgroundOpacity: Number(
        clampNumber(
          rawId.pageBackgroundOpacity,
          0,
          0.4,
          base.identity.pageBackgroundOpacity
        ).toFixed(2)
      ),
    },
    header: {
      visible: safeBool(rawHeader.visible, base.header.visible),
      sticky: safeBool(rawHeader.sticky, base.header.sticky),
      heightPx: Math.round(clampNumber(rawHeader.heightPx, 48, 88, base.header.heightPx)),
      layout: safeEnum(
        rawHeader.layout,
        ['standard', 'centered_nav', 'split_logo_center'] as const,
        base.header.layout
      ),
      navAlign: safeEnum(rawHeader.navAlign, ['left', 'center', 'right'] as const, base.header.navAlign),
      navGapPx: Math.round(clampNumber(rawHeader.navGapPx, 10, 44, base.header.navGapPx)),
      navFontSizePx: Math.round(clampNumber(rawHeader.navFontSizePx, 11, 17, base.header.navFontSizePx)),
      showCta: safeBool(rawHeader.showCta, base.header.showCta),
      ctaLabel: safeStr(rawHeader.ctaLabel, base.header.ctaLabel, 40) || 'Pesan Sekarang',
      backgroundColor: safeColor(rawHeader.backgroundColor),
      textColor: safeColor(rawHeader.textColor),
      borderColor: safeColor(rawHeader.borderColor),
      ctaBg: safeColor(rawHeader.ctaBg),
      ctaText: safeColor(rawHeader.ctaText),
      paddingXPx: resolvedHeaderPadX,
    },
    footer: {
      visible: safeBool(rawFooter.visible, base.footer.visible),
      layout: safeEnum(
        rawFooter.layout,
        ['4_col', '3_col', '2_col', 'centered'] as const,
        base.footer.layout
      ),
      textAlign: safeEnum(rawFooter.textAlign, ['left', 'center', 'right'] as const, base.footer.textAlign),
      showAbout: safeBool(rawFooter.showAbout, base.footer.showAbout),
      showQuickLinks: safeBool(rawFooter.showQuickLinks, base.footer.showQuickLinks),
      showSocials: safeBool(rawFooter.showSocials, base.footer.showSocials),
      showWhatsappButton: safeBool(rawFooter.showWhatsappButton, base.footer.showWhatsappButton),
      copyrightText: normalizeBrandDisplayText(safeStr(rawFooter.copyrightText, '', 160)),
      paddingYPx: Math.round(clampNumber(rawFooter.paddingYPx, 20, 88, base.footer.paddingYPx)),
      backgroundColor: safeColor(rawFooter.backgroundColor),
      textColor: safeColor(rawFooter.textColor),
      accentColor: safeColor(rawFooter.accentColor),
      borderColor: safeColor(rawFooter.borderColor),
    },
    home: {
      sectionOrder: mergeSectionOrder(rawHome.sectionOrder),
      sections: mergedHomeSections,
    },
    products: mergeCatalog(obj.products, base.products),
    services: mergeCatalog(obj.services, base.services),
    portfolio: mergeCatalog(obj.portfolio, base.portfolio),
    articles: {
      showInNavigation: safeBool(rawArticles.showInNavigation, base.articles.showInNavigation),
      pageTitle: normalizeBrandDisplayText(
        safeStr(rawArticles.pageTitle, base.articles.pageTitle, 140)
      ),
      pageSubtitle: normalizeBrandDisplayText(
        safeStr(rawArticles.pageSubtitle, base.articles.pageSubtitle, 320)
      ),
      section: mergeSectionConfig(rawArticles.section, base.articles.section),
      card: mergeCardConfig(rawArticles.card, base.articles.card),
      items: mergeArticlesList(rawArticles.items),
    },
    otherPages: {
      about: {
        showOwnerProfile: safeBool(rawAbout.showOwnerProfile, base.otherPages.about.showOwnerProfile),
        showCoverBanner: safeBool(rawAbout.showCoverBanner, base.otherPages.about.showCoverBanner),
        showValues: safeBool(rawAbout.showValues, base.otherPages.about.showValues),
        showServicesStrip: safeBool(rawAbout.showServicesStrip, base.otherPages.about.showServicesStrip),
        valuesColsDesktop: Math.round(
          clampNumber(rawAbout.valuesColsDesktop, 1, 4, base.otherPages.about.valuesColsDesktop)
        ),
        paddingYPx: Math.round(clampNumber(rawAbout.paddingYPx, 12, 84, base.otherPages.about.paddingYPx)),
        maxWidthPx: Math.round(clampNumber(rawAbout.maxWidthPx, 0, 1600, base.otherPages.about.maxWidthPx)),
        backgroundColor: safeColor(rawAbout.backgroundColor),
        cardBackgroundColor: safeColor(rawAbout.cardBackgroundColor),
        textAlign: safeEnum(
          rawAbout.textAlign,
          ['left', 'center', 'right'] as const,
          base.otherPages.about.textAlign
        ),
      },
      procedure: {
        layout: safeEnum(rawProc.layout, ['grid', 'list'] as const, base.otherPages.procedure.layout),
        colsDesktop: Math.round(
          clampNumber(rawProc.colsDesktop, 1, 4, base.otherPages.procedure.colsDesktop)
        ),
        colsTablet: Math.round(
          clampNumber(rawProc.colsTablet, 1, 3, base.otherPages.procedure.colsTablet)
        ),
        colsMobile: Math.round(
          clampNumber(rawProc.colsMobile, 1, 2, base.otherPages.procedure.colsMobile)
        ),
        showGuarantees: safeBool(rawProc.showGuarantees, base.otherPages.procedure.showGuarantees),
        paddingYPx: Math.round(clampNumber(rawProc.paddingYPx, 12, 84, base.otherPages.procedure.paddingYPx)),
        maxWidthPx: Math.round(clampNumber(rawProc.maxWidthPx, 0, 1600, base.otherPages.procedure.maxWidthPx)),
        backgroundColor: safeColor(rawProc.backgroundColor),
      },
      faq: {
        showSearch: safeBool(rawFaq.showSearch, base.otherPages.faq.showSearch),
        showCategoryTabs: safeBool(rawFaq.showCategoryTabs, base.otherPages.faq.showCategoryTabs),
        showBottomCta: safeBool(rawFaq.showBottomCta, base.otherPages.faq.showBottomCta),
        maxWidthPx: Math.round(clampNumber(rawFaq.maxWidthPx, 560, 1400, base.otherPages.faq.maxWidthPx)),
        paddingYPx: Math.round(clampNumber(rawFaq.paddingYPx, 12, 84, base.otherPages.faq.paddingYPx)),
        backgroundColor: safeColor(rawFaq.backgroundColor),
        cardBackgroundColor: safeColor(rawFaq.cardBackgroundColor),
      },
      contact: {
        layout: safeEnum(
          rawContact.layout,
          ['info_left', 'form_left', 'stacked'] as const,
          base.otherPages.contact.layout
        ),
        showSocials: safeBool(rawContact.showSocials, base.otherPages.contact.showSocials),
        paddingYPx: Math.round(clampNumber(rawContact.paddingYPx, 12, 84, base.otherPages.contact.paddingYPx)),
        maxWidthPx: Math.round(clampNumber(rawContact.maxWidthPx, 0, 1600, base.otherPages.contact.maxWidthPx)),
        backgroundColor: safeColor(rawContact.backgroundColor),
      },
      detailPages: {
        imagePosition: safeEnum(
          rawDetail.imagePosition,
          ['left', 'right', 'top'] as const,
          base.otherPages.detailPages.imagePosition
        ),
        imageAspectRatio: safeEnum(
          rawDetail.imageAspectRatio,
          ['1/1', '4/3', '3/4', '16/9', '16/10'] as const,
          base.otherPages.detailPages.imageAspectRatio
        ),
        showGallery: safeBool(rawDetail.showGallery, base.otherPages.detailPages.showGallery),
        showRelated: safeBool(rawDetail.showRelated, base.otherPages.detailPages.showRelated),
        relatedColsDesktop: Math.round(
          clampNumber(rawDetail.relatedColsDesktop, 2, 6, base.otherPages.detailPages.relatedColsDesktop)
        ),
        maxWidthPx: Math.round(clampNumber(rawDetail.maxWidthPx, 0, 1600, base.otherPages.detailPages.maxWidthPx)),
      },
    },
    responsive: {
      desktop: mergeDeviceOverride(rawResp.desktop, base.responsive.desktop),
      tablet: mergedTabletResp,
      mobile: mergedMobileResp,
    },
    updatedBy: safeStr(obj.updatedBy, 'system', 200) || 'system',
    updatedAt: obj.updatedAt,
  };
}

/** Resets ONLY the targeted category tab while leaving all other sections completely untouched. */
export function resetDesignSection(
  config: SiteDesignConfig,
  category: DesignCategoryTab,
  homeSubSection?: HomeSectionId
): SiteDesignConfig {
  const fresh = createDefaultSiteDesignConfig(config.status);
  const next = structuredClone(config);

  switch (category) {
    case 'global':
      next.global = fresh.global;
      break;
    case 'identity':
      next.identity = fresh.identity;
      break;
    case 'header':
      next.header = fresh.header;
      break;
    case 'footer':
      next.footer = fresh.footer;
      break;
    case 'home':
      if (homeSubSection) {
        next.home.sections[homeSubSection] = fresh.home.sections[homeSubSection];
      } else {
        next.home = fresh.home;
      }
      break;
    case 'products':
      next.products = fresh.products;
      break;
    case 'services':
      next.services = fresh.services;
      break;
    case 'portfolio':
      next.portfolio = fresh.portfolio;
      break;
    case 'articles':
      next.articles = fresh.articles;
      break;
    case 'otherPages':
      next.otherPages = fresh.otherPages;
      break;
    case 'responsive':
      next.responsive = fresh.responsive;
      break;
  }

  return next;
}

/** Strips undefined values deeply so Firestore setDoc never rejects payload keys. */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function sanitizeSiteDesignForFirestore(
  config: SiteDesignConfig,
  status: 'published' | 'draft' | 'previous',
  updatedBy: string
): Omit<SiteDesignConfig, 'updatedAt'> {
  const normalized = mergeSiteDesignConfig({ ...config, status, updatedBy }, status);
  const { updatedAt: _drop, ...rest } = normalized;
  return stripUndefinedDeep({
    ...rest,
    schemaVersion: 2,
    status,
    updatedBy: (updatedBy || 'admin').slice(0, 200),
  });
}

// -----------------------------------------------------------------------------
// Font, CSS & Layout Resolvers
// -----------------------------------------------------------------------------

export function getFontStack(key: DesignFontKey | '' | undefined, fallback: DesignFontKey = 'inter'): string {
  const target = key || fallback;
  const found = DESIGN_FONT_OPTIONS.find((item) => item.key === target);
  return found ? found.stack : DESIGN_FONT_OPTIONS[1].stack;
}

export function getAspectClass(ratio: CardAspectRatio): string {
  switch (ratio) {
    case '1/1':
      return 'aspect-square';
    case '4/3':
      return 'aspect-[4/3]';
    case '3/4':
      return 'aspect-[3/4]';
    case '16/9':
      return 'aspect-video';
    case '16/10':
    default:
      return 'aspect-[16/10]';
  }
}

export function resolveCardRadiusPx(
  shape: CardShapePreset,
  explicitRadius: number | null,
  theme: VisualThemeMode
): number {
  if (explicitRadius !== null && Number.isFinite(explicitRadius)) {
    return explicitRadius;
  }
  switch (shape) {
    case 'sharp':
      return 0;
    case 'square':
      return 2;
    case 'rectangle':
      return 4;
    case 'rounded':
      return 16;
    case 'soft_pill':
      return 24;
    case 'theme':
    default:
      return theme === 'clean_bento' ? 14 : 4;
  }
}

export function resolveCardShadow(
  shadow: CardShadowPreset,
  theme: VisualThemeMode,
  borderColor?: string
): string | undefined {
  switch (shadow) {
    case 'none':
      return 'none';
    case 'soft':
      return '0 2px 10px -3px rgba(15, 61, 58, 0.1), 0 1px 3px rgba(15, 61, 58, 0.05)';
    case 'elevated':
      return '0 14px 32px -12px rgba(15, 61, 58, 0.2), 0 4px 10px -4px rgba(15, 61, 58, 0.08)';
    case 'brutal':
      return `3px 3px 0px ${borderColor || '#171717'}`;
    case 'theme':
    default:
      return theme === 'clean_bento' ? undefined : undefined;
  }
}

export function getCardHoverClass(effect: CardHoverEffect): string {
  switch (effect) {
    case 'none':
      return 'scs-hover-none';
    case 'lift':
      return 'scs-hover-lift';
    case 'scale':
      return 'scs-hover-scale';
    case 'border_accent':
      return 'scs-hover-border';
    case 'theme':
    default:
      return '';
  }
}

export function getCardPaddingClass(size: CardSizePreset): string {
  switch (size) {
    case 'compact':
      return 'p-2';
    case 'large':
      return 'p-3.5 sm:p-4';
    case 'normal':
    default:
      return 'p-2.5 sm:p-3';
  }
}

export function resolveCardAppearance(
  baseCard: CardDesignConfig,
  theme: VisualThemeMode,
  viewport: DesignViewport,
  responsive: ResponsiveDesignConfig,
  itemOverride?: Partial<CardDesignConfig>
): {
  card: CardDesignConfig;
  effectiveImagePosition: CardImagePosition;
  effectiveSize: CardSizePreset;
  articleStyle: React.CSSProperties;
  hoverClass: string;
  paddingClass: string;
  aspectClass: string;
  textAlignClass: string;
} {
  const merged: CardDesignConfig = itemOverride ? { ...baseCard, ...itemOverride } : baseCard;
  const device = responsive[viewport];

  const effectiveImagePosition: CardImagePosition =
    device.imagePositionOverride !== 'inherit'
      ? device.imagePositionOverride
      : merged.imagePosition;

  const effectiveSize: CardSizePreset =
    viewport === 'mobile' && merged.size === 'large' ? 'normal' : merged.size;

  const radius = resolveCardRadiusPx(merged.shape, merged.borderRadiusPx, theme);
  const shadow = resolveCardShadow(merged.shadow, theme, merged.borderColor);

  const articleStyle: React.CSSProperties = {};
  if (merged.shape !== 'theme' || merged.borderRadiusPx !== null) {
    articleStyle.borderRadius = `${radius}px`;
  }
  if (merged.borderWidthPx !== null) {
    articleStyle.borderWidth = `${merged.borderWidthPx}px`;
  }
  if (merged.borderColor) {
    articleStyle.borderColor = merged.borderColor;
  }
  if (merged.backgroundColor) {
    articleStyle.backgroundColor = merged.backgroundColor;
  }
  if (merged.textColor) {
    articleStyle.color = merged.textColor;
  }
  if (shadow !== undefined) {
    articleStyle.boxShadow = shadow;
  }
  if (merged.maxWidthPx > 0) {
    articleStyle.maxWidth = `${merged.maxWidthPx}px`;
    articleStyle.width = '100%';
  }
  if (merged.minHeightPx > 0) {
    articleStyle.minHeight = `${merged.minHeightPx}px`;
  }
  if (merged.shape === 'square') {
    articleStyle.aspectRatio = '1 / 1';
  }

  const textAlignClass =
    merged.textAlign === 'center'
      ? 'text-center items-center'
      : merged.textAlign === 'right'
        ? 'text-right items-end'
        : 'text-left items-start';

  return {
    card: merged,
    effectiveImagePosition,
    effectiveSize,
    articleStyle,
    hoverClass: getCardHoverClass(merged.hoverEffect),
    paddingClass: getCardPaddingClass(effectiveSize),
    aspectClass: getAspectClass(merged.aspectRatio),
    textAlignClass,
  };
}

export function resolveSectionContainerStyle(
  section: SectionLayoutDesignConfig,
  globalConfig: GlobalDesignConfig,
  viewport: DesignViewport,
  responsive: ResponsiveDesignConfig
): {
  sectionStyle: React.CSSProperties;
  containerStyle: React.CSSProperties;
  alignClass: string;
} {
  const scale = responsive[viewport].sectionPaddingScale;
  const sectionStyle: React.CSSProperties = {};
  if (section.paddingYPx > 0) {
    const padY = Math.round(section.paddingYPx * scale);
    sectionStyle.paddingTop = `${padY}px`;
    sectionStyle.paddingBottom = `${padY}px`;
  } else if (scale !== 1) {
    const padY = Math.round(36 * scale);
    sectionStyle.paddingTop = `${padY}px`;
    sectionStyle.paddingBottom = `${padY}px`;
  }
  if (section.marginYPx > 0) {
    sectionStyle.marginTop = `${section.marginYPx}px`;
    sectionStyle.marginBottom = `${section.marginYPx}px`;
  }
  if (section.minHeightPx > 0) {
    sectionStyle.minHeight = `${section.minHeightPx}px`;
  }
  if (section.backgroundColor) {
    sectionStyle.backgroundColor = section.backgroundColor;
  }
  if (section.textColor) {
    sectionStyle.color = section.textColor;
  }
  if (section.borderColor) {
    sectionStyle.borderColor = section.borderColor;
  }
  if (section.fontFamily) {
    sectionStyle.fontFamily = getFontStack(section.fontFamily);
  }

  const containerStyle: React.CSSProperties = {};
  if (section.maxWidthPx > 0) {
    containerStyle.maxWidth = `${section.maxWidthPx}px`;
  } else if (globalConfig.containerMaxWidthPx !== 1280) {
    containerStyle.maxWidth = `${globalConfig.containerMaxWidthPx}px`;
  }

  if (section.contentPosition === 'center') {
    sectionStyle.display = 'flex';
    sectionStyle.flexDirection = 'column';
    sectionStyle.justifyContent = 'center';
  } else if (section.contentPosition === 'end') {
    sectionStyle.display = 'flex';
    sectionStyle.flexDirection = 'column';
    sectionStyle.justifyContent = 'flex-end';
  }

  const alignClass =
    section.textAlign === 'center'
      ? 'text-center'
      : section.textAlign === 'right'
        ? 'text-right'
        : 'text-left';

  return { sectionStyle, containerStyle, alignClass };
}

export function resolveCollectionGridLayout(params: {
  layout: DesignLayoutMode;
  colsDesktop: number;
  colsTablet: number;
  colsMobile: number;
  gapPx: number;
  viewport: DesignViewport;
}): {
  className: string;
  style: React.CSSProperties;
  activeCols: number;
  isHorizontal: boolean;
  isBento: boolean;
  isList: boolean;
} {
  const { layout, colsDesktop, colsTablet, colsMobile, gapPx, viewport } = params;
  const activeCols =
    viewport === 'mobile'
      ? Math.max(1, Math.min(3, colsMobile))
      : viewport === 'tablet'
        ? Math.max(1, Math.min(4, colsTablet))
        : Math.max(1, Math.min(6, colsDesktop));

  if (layout === 'list') {
    return {
      className: 'flex flex-col',
      style: { gap: `${gapPx}px` },
      activeCols: 1,
      isHorizontal: false,
      isBento: false,
      isList: true,
    };
  }

  if (layout === 'horizontal') {
    return {
      className: 'flex flex-nowrap overflow-x-auto pb-2 snap-x snap-mandatory',
      style: { gap: `${gapPx}px` },
      activeCols,
      isHorizontal: true,
      isBento: false,
      isList: false,
    };
  }

  return {
    className: 'grid items-stretch',
    style: {
      gridTemplateColumns: `repeat(${activeCols}, minmax(0, 1fr))`,
      gap: `${gapPx}px`,
    },
    activeCols,
    isHorizontal: false,
    isBento: layout === 'bento',
    isList: false,
  };
}

export function getDesignTextAlignClass(align: DesignAlign): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

/**
 * Generates clean, scoped CSS variables & overrides applied ONLY inside `.scs-public-root`
 * (and preview canvas) so Admin Dashboard UI remains crisp and unaffected.
 */
export function buildPublicDesignCss(
  config: SiteDesignConfig,
  scopeSelector = '.scs-public-root',
  viewport: DesignViewport = 'desktop'
): string {
  const { global: g } = config;
  const displayStack = getFontStack(g.typography.displayFont, 'space_grotesk');
  const bodyStack = getFontStack(g.typography.bodyFont, 'inter');
  const device = config.responsive[viewport];
  const effectiveBaseSize = Math.round(g.typography.baseFontSizePx * device.textScale * 10) / 10;

  const lines: string[] = [];
  const rootDecls: string[] = [];
  if (g.typography.displayFont !== 'space_grotesk') {
    rootDecls.push(`  --font-display: ${displayStack};`);
  }
  if (g.typography.bodyFont !== 'inter') {
    rootDecls.push(`  --font-sans: ${bodyStack};`);
    rootDecls.push(`  font-family: ${bodyStack};`);
  }
  if (g.containerMaxWidthPx !== 1280) {
    rootDecls.push(`  --nb-container-max: ${g.containerMaxWidthPx}px;`);
  }
  if (effectiveBaseSize !== 16) {
    rootDecls.push(`  --scs-base-font-size: ${effectiveBaseSize}px;`);
    rootDecls.push(`  font-size: ${effectiveBaseSize}px;`);
  }
  if (g.typography.bodyWeight !== 400) {
    rootDecls.push(`  font-weight: ${g.typography.bodyWeight};`);
  }
  if (g.typography.lineHeight !== 1.5) {
    rootDecls.push(`  line-height: ${g.typography.lineHeight};`);
  }
  if (g.typography.letterSpacingEm !== 0) {
    rootDecls.push(`  letter-spacing: ${g.typography.letterSpacingEm}em;`);
  }
  if (g.colors.background) {
    rootDecls.push(`  background-color: ${g.colors.background} !important;`);
  }
  if (g.colors.textPrimary) {
    rootDecls.push(`  color: ${g.colors.textPrimary};`);
  }

  if (rootDecls.length > 0) {
    lines.push(`${scopeSelector} {`);
    lines.push(...rootDecls);
    lines.push(`}`);
  }

  const headingDecls: string[] = [];
  if (g.typography.displayFont !== 'space_grotesk') {
    headingDecls.push(`  font-family: ${displayStack};`);
  }
  if (g.typography.headingWeight !== 700) {
    headingDecls.push(`  font-weight: ${g.typography.headingWeight};`);
  }
  if (headingDecls.length > 0) {
    lines.push(`${scopeSelector} h1, ${scopeSelector} h2, ${scopeSelector} h3, ${scopeSelector} h4 {`);
    lines.push(...headingDecls);
    lines.push(`}`);
  }

  if (g.typography.headingScale !== 1) {
    lines.push(`${scopeSelector} h1 { font-size: calc(1.75rem * ${g.typography.headingScale}); }`);
    lines.push(`${scopeSelector} h2 { font-size: calc(1.35rem * ${g.typography.headingScale}); }`);
  }

  if (g.typography.buttonFontSizePx !== 12) {
    lines.push(`${scopeSelector} .nb-btn { font-size: ${g.typography.buttonFontSizePx}px; }`);
  }

  if (g.colors.surface) {
    lines.push(`${scopeSelector} .nb-card, ${scopeSelector} .nb-card-interactive { background-color: ${g.colors.surface}; }`);
  }
  if (g.colors.border) {
    lines.push(`${scopeSelector} .nb-card, ${scopeSelector} .nb-card-interactive, ${scopeSelector} .nb-card-cream, ${scopeSelector} .nb-border { border-color: ${g.colors.border}; }`);
  }
  if (g.colors.textPrimary) {
    lines.push(
      `${scopeSelector} :is(h1, h2, h3, .text-\\[\\#171717\\]):not(footer *):not([data-dark-surface="true"] *):not(.text-white):not(.text-\\[\\#F8F8E1\\]):not(.text-\\[\\#F3C95B\\]) { color: ${g.colors.textPrimary}; }`
    );
  }
  if (g.colors.textMuted) {
    lines.push(`${scopeSelector} .scs-muted-text { color: ${g.colors.textMuted}; }`);
  }
  if (g.colors.primary) {
    lines.push(`${scopeSelector} .nb-kicker { color: ${g.colors.primary}; }`);
    lines.push(`${scopeSelector} .nb-tab[aria-selected="true"], ${scopeSelector} .nb-tab-active { background-color: ${g.colors.primary}; border-color: ${g.colors.primary}; }`);
  }
  if (g.colors.secondary) {
    lines.push(`${scopeSelector} .nb-btn-mustard { background-color: ${g.colors.secondary}; }`);
  }
  if (g.colors.buttonBg || g.colors.buttonText) {
    lines.push(`${scopeSelector} .nb-btn-primary {`);
    if (g.colors.buttonBg) {
      lines.push(`  background-color: ${g.colors.buttonBg};`);
      lines.push(`  border-color: ${g.colors.buttonBg};`);
    }
    if (g.colors.buttonText) {
      lines.push(`  color: ${g.colors.buttonText};`);
    }
    lines.push(`}`);
  }

  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Zero-Flash LocalStorage Cache Helpers
// -----------------------------------------------------------------------------

export function readCachedSiteDesign(): SiteDesignConfig | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SITE_DESIGN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return mergeSiteDesignConfig(parsed, 'published');
  } catch {
    return null;
  }
}

export function writeCachedSiteDesign(config: SiteDesignConfig): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const safe = sanitizeSiteDesignForFirestore(config, 'published', config.updatedBy || 'cache');
    window.localStorage.setItem(SITE_DESIGN_CACHE_KEY, JSON.stringify(safe));
  } catch {
    // Ignore quota / privacy mode storage errors
  }
}

import type { VisualThemeMode } from './studio';

export type DesignFontKey =
  | 'space_grotesk'
  | 'inter'
  | 'plus_jakarta'
  | 'dm_sans'
  | 'outfit'
  | 'sora'
  | 'poppins'
  | 'playfair'
  | 'lora'
  | 'jetbrains_mono';

export type DesignViewport = 'desktop' | 'tablet' | 'mobile';

export type DesignLayoutMode = 'grid' | 'bento' | 'list' | 'horizontal';

export type DesignHeroLayout = 'split_right' | 'split_left' | 'centered' | 'banner_overlay';

export type DesignAlign = 'left' | 'center' | 'right';

export type DesignContentPosition = 'start' | 'center' | 'end';

export type CardSizePreset = 'compact' | 'normal' | 'large';

export type CardShapePreset = 'theme' | 'sharp' | 'square' | 'rectangle' | 'rounded' | 'soft_pill';

export type CardShadowPreset = 'theme' | 'none' | 'soft' | 'brutal' | 'elevated';

export type CardAspectRatio = '1/1' | '4/3' | '3/4' | '16/9' | '16/10';

export type CardImagePosition = 'top' | 'left' | 'right' | 'background';

export type CardHoverEffect = 'theme' | 'lift' | 'scale' | 'border_accent' | 'none';

export type CardPricePosition = 'bottom' | 'top_badge' | 'inline';

export type HomeSectionId =
  | 'hero'
  | 'categories'
  | 'services'
  | 'products'
  | 'articles'
  | 'advantages'
  | 'portfolio'
  | 'procedure'
  | 'about'
  | 'faq'
  | 'cta';

export type DesignCategoryTab =
  | 'global'
  | 'identity'
  | 'home'
  | 'products'
  | 'services'
  | 'portfolio'
  | 'articles'
  | 'otherPages'
  | 'header'
  | 'footer'
  | 'responsive';

export interface DesignColorPalette {
  /** Empty string '' means inherit active theme foundation color */
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  buttonBg: string;
  buttonText: string;
}

export interface DesignTypographyConfig {
  displayFont: DesignFontKey;
  bodyFont: DesignFontKey;
  baseFontSizePx: number; // 13 - 19
  headingScale: number; // 0.85 - 1.35
  subheadingScale: number; // 0.85 - 1.25
  descriptionSizePx: number; // 12 - 17
  buttonFontSizePx: number; // 11 - 16
  headingWeight: 500 | 600 | 700 | 800;
  bodyWeight: 400 | 500 | 600;
  lineHeight: number; // 1.3 - 1.9
  letterSpacingEm: number; // -0.04 - 0.08
  textAlign: DesignAlign;
}

export interface GlobalDesignConfig {
  visualTheme: VisualThemeMode;
  containerMaxWidthPx: number; // 960 - 1536
  sectionPaddingYPx: number; // 16 - 80
  elementGapPx: number; // 8 - 36
  colors: DesignColorPalette;
  typography: DesignTypographyConfig;
}

export interface SiteIdentityDesignConfig {
  logoUrl: string;
  logoDriveFileId: string;
  logoHeightPx: number; // 24 - 64
  showLogoText: boolean;
  faviconUrl: string;
  faviconDriveFileId: string;
  ownerPhotoUrl: string;
  ownerPhotoDriveFileId: string;
  ownerName: string;
  ownerRole: string;
  ownerBio: string;
  coverImageUrl: string;
  coverDriveFileId: string;
  heroImageOverrideUrl: string;
  heroImageOverrideDriveFileId: string;
  pageBackgroundImageUrl: string;
  pageBackgroundDriveFileId: string;
  pageBackgroundOpacity: number; // 0 - 0.4
}

export interface CardDesignConfig {
  size: CardSizePreset;
  maxWidthPx: number; // 0 = auto 100%
  minHeightPx: number; // 0 = auto
  shape: CardShapePreset;
  borderRadiusPx: number | null; // null = theme/shape default
  borderWidthPx: number | null; // null = theme default
  borderColor: string; // '' = theme default
  backgroundColor: string; // '' = theme default
  textColor: string; // '' = theme default
  accentColor: string; // '' = theme default
  buttonBg: string; // '' = theme default
  buttonText: string; // '' = theme default
  shadow: CardShadowPreset;
  gapPx: number; // 8 - 32
  aspectRatio: CardAspectRatio;
  imagePosition: CardImagePosition;
  textAlign: DesignAlign;
  titleSizePx: number; // 12 - 22
  titleWeight: 500 | 600 | 700 | 800;
  descriptionSizePx: number; // 11 - 16
  priceSizePx: number; // 11 - 18
  pricePosition: CardPricePosition;
  showCategory: boolean;
  showDescription: boolean;
  showPrice: boolean;
  showActionButton: boolean;
  showMeta: boolean;
  hoverEffect: CardHoverEffect;
}

export interface SectionLayoutDesignConfig {
  visible: boolean;
  layout: DesignLayoutMode;
  heroLayout?: DesignHeroLayout;
  colsDesktop: number; // 1 - 6
  colsTablet: number; // 1 - 4
  colsMobile: number; // 1 - 3
  maxItems: number; // 0 = all
  gapPx: number; // 8 - 36
  paddingYPx: number; // 12 - 96
  marginYPx: number; // 0 - 48
  minHeightPx: number; // 0 = auto
  maxWidthPx: number; // 0 = inherit global container
  textAlign: DesignAlign;
  contentPosition: DesignContentPosition;
  backgroundColor: string; // '' = theme default
  textColor: string; // '' = theme default
  accentColor: string; // '' = theme default
  borderColor: string; // '' = theme default
  buttonBg: string; // '' = theme default
  buttonText: string; // '' = theme default
  fontFamily: DesignFontKey | ''; // '' = inherit global
  headingSizePx: number; // 0 = inherit global
  descriptionSizePx: number; // 0 = inherit global
  customTitle?: string;
  customSubtitle?: string;
}

export interface HomeDesignConfig {
  sectionOrder: HomeSectionId[];
  sections: Record<HomeSectionId, SectionLayoutDesignConfig>;
}

export interface CatalogDesignConfig {
  section: SectionLayoutDesignConfig;
  card: CardDesignConfig;
  /** Optional individual per-item card overrides keyed by item ID */
  itemOverrides: Record<string, Partial<CardDesignConfig>>;
}

export interface StudioArticleItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  imageUrl: string;
  driveFileId?: string;
  publishedDate: string;
  readTime: string;
  isPublished: boolean;
}

export interface ArticlesDesignConfig {
  showInNavigation: boolean;
  pageTitle: string;
  pageSubtitle: string;
  section: SectionLayoutDesignConfig;
  card: CardDesignConfig;
  items: StudioArticleItem[];
}

export interface OtherPagesDesignConfig {
  about: {
    showOwnerProfile: boolean;
    showCoverBanner: boolean;
    showValues: boolean;
    showServicesStrip: boolean;
    valuesColsDesktop: number;
    paddingYPx: number;
    maxWidthPx: number;
    backgroundColor: string;
    cardBackgroundColor: string;
    textAlign: DesignAlign;
  };
  procedure: {
    layout: 'grid' | 'list';
    colsDesktop: number;
    colsTablet: number;
    colsMobile: number;
    showGuarantees: boolean;
    paddingYPx: number;
    maxWidthPx: number;
    backgroundColor: string;
  };
  faq: {
    showSearch: boolean;
    showCategoryTabs: boolean;
    showBottomCta: boolean;
    maxWidthPx: number;
    paddingYPx: number;
    backgroundColor: string;
    cardBackgroundColor: string;
  };
  contact: {
    layout: 'info_left' | 'form_left' | 'stacked';
    showSocials: boolean;
    paddingYPx: number;
    maxWidthPx: number;
    backgroundColor: string;
  };
  detailPages: {
    imagePosition: 'left' | 'right' | 'top';
    imageAspectRatio: CardAspectRatio;
    showGallery: boolean;
    showRelated: boolean;
    relatedColsDesktop: number;
    maxWidthPx: number;
  };
}

export interface HeaderDesignConfig {
  visible: boolean;
  sticky: boolean;
  heightPx: number; // 52 - 88
  layout: 'standard' | 'centered_nav' | 'split_logo_center';
  navAlign: DesignAlign;
  navGapPx: number; // 12 - 40
  navFontSizePx: number; // 12 - 16
  showCta: boolean;
  ctaLabel: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  ctaBg: string;
  ctaText: string;
  paddingXPx: number; // 12 - 48
}

export interface FooterDesignConfig {
  visible: boolean;
  layout: '4_col' | '3_col' | '2_col' | 'centered';
  textAlign: DesignAlign;
  showAbout: boolean;
  showQuickLinks: boolean;
  showSocials: boolean;
  showWhatsappButton: boolean;
  copyrightText: string;
  paddingYPx: number; // 24 - 80
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

export interface DeviceResponsiveOverride {
  textScale: number; // 0.85 - 1.2
  sectionPaddingScale: number; // 0.65 - 1.35
  gapPx: number; // 8 - 32
  cardSize: CardSizePreset;
  imagePositionOverride: 'inherit' | CardImagePosition;
  productsCols: number; // 1 - 6
  servicesCols: number; // 1 - 6
  portfolioCols: number; // 1 - 6
  articlesCols: number; // 1 - 4
}

export interface ResponsiveDesignConfig {
  desktop: DeviceResponsiveOverride;
  tablet: DeviceResponsiveOverride;
  mobile: DeviceResponsiveOverride;
}

export interface SiteDesignConfig {
  schemaVersion: number;
  status: 'published' | 'draft' | 'previous';
  global: GlobalDesignConfig;
  identity: SiteIdentityDesignConfig;
  header: HeaderDesignConfig;
  footer: FooterDesignConfig;
  home: HomeDesignConfig;
  products: CatalogDesignConfig;
  services: CatalogDesignConfig;
  portfolio: CatalogDesignConfig;
  articles: ArticlesDesignConfig;
  otherPages: OtherPagesDesignConfig;
  responsive: ResponsiveDesignConfig;
  updatedBy: string;
  updatedAt?: unknown;
}

export type ServiceCategory = 'web_app' | 'video' | 'desain' | 'presentasi' | 'naskah';

export type OrderStatus =
  | 'menunggu_konfirmasi'
  | 'harga_dikonfirmasi'
  | 'dalam_pengerjaan'
  | 'revisi'
  | 'selesai'
  | 'dibatalkan';

export type FaqCategory = 'pemesanan' | 'harga' | 'revisi' | 'teknis';

export type MediaVisibility = 'public' | 'private';

export type MediaUsage = 'service' | 'product' | 'portfolio' | 'hero' | 'order_attachment' | 'other';

export type MediaEntityType = 'product' | 'service' | 'portfolio' | 'hero' | 'none';

export interface MediaGalleryItem {
  fileId: string;
  fileName: string;
  mimeType: string;
  caption?: string;
  imageUrl?: string;
}

export interface DriveFolderRecord {
  id: string;
  folderKey: string;
  folderId: string;
  folderName: string;
  parentFolderId?: string;
  category: MediaUsage | 'root';
  entityId?: string;
  folderPath: string;
  updatedAt?: unknown;
}

export type AccentColor = '#0F3D3A' | '#6C151E' | '#8ACCD5' | '#F3C95B';

export interface AdminRecord {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin';
  createdAt?: unknown;
}

export interface CustomerProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  whatsapp: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  category: ServiceCategory;
  shortDescription: string;
  fullDescription: string;
  priceMin: number;
  priceMax: number;
  priceUnit: string;
  priceLabel: string;
  estimatedTurnaround: string;
  deliverables: string[];
  accentColor: AccentColor;
  imageUrl: string;
  driveFileId?: string;
  gallery?: MediaGalleryItem[];
  sortOrder: number;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderItem {
  id: string;
  orderCode: string;
  customerUid: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  serviceId: string;
  serviceTitle: string;
  estimatedPriceLabel: string;
  quantityEstimate: number;
  projectTitle: string;
  projectBrief: string;
  deadline: string;
  attachmentName?: string;
  attachmentDriveFileId?: string;
  attachmentUrl?: string;
  status: OrderStatus;
  finalPrice: number | null;
  adminNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PortfolioItem {
  id: string;
  title: string;
  clientName: string;
  category: ServiceCategory;
  year: string;
  summary: string;
  challenge?: string;
  outcome: string;
  metrics: string;
  imageUrl: string;
  driveFileId?: string;
  gallery?: MediaGalleryItem[];
  projectUrl?: string;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MediaAsset {
  id: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: MediaVisibility;
  usage: MediaUsage;
  altText?: string;
  folderId?: string;
  folderPath?: string;
  entityType?: MediaEntityType;
  entityId?: string;
  entityName?: string;
  isPublished?: boolean;
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type VisualThemeMode = 'neo_brutalist' | 'clean_bento';

export interface SiteSettings {
  id?: string;
  studioName: string;
  slogan: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl?: string;
  heroDriveFileId?: string;
  aboutSummary: string;
  aboutMission?: string;
  whatsappNumber: string;
  email: string;
  address: string;
  operatingHours: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  servicesMigrated?: boolean;
  productsMigrated?: boolean;
  portfolioMigrated?: boolean;
  faqsMigrated?: boolean;
  visualTheme?: VisualThemeMode;
  updatedAt?: unknown;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  sortOrder: number;
  isPublished: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  entityType: 'order' | 'service' | 'product' | 'portfolio' | 'media' | 'faq' | 'site_settings' | 'admin' | 'contact';
  entityId: string;
  summary: string;
  createdAt?: unknown;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  subject: string;
  message: string;
  status: 'baru' | 'dibalas' | 'arsip';
  createdAt?: unknown;
}

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export type DigitalProductCategory =
  | 'template_ppt'
  | 'template_poster'
  | 'ui_web_kit'
  | 'aset_video'
  | 'naskah_siap_pakai';

export interface DigitalProductItem {
  id: string;
  slug: string;
  title: string;
  category: DigitalProductCategory;
  price: number;
  showPrice: boolean;
  format: string;
  fileSize: string;
  compatibility: string;
  summary: string;
  description: string;
  includes: string[];
  imageUrl: string;
  driveFileId?: string;
  gallery?: MediaGalleryItem[];
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

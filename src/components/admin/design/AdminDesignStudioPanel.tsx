import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  Globe,
  History,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  MonitorSmartphone,
  Package,
  Palette,
  PanelBottom,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTop,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useDesign } from '../../../contexts/DesignContext';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  fetchAdminSiteDesignDocs,
  publishSiteDesignByAdmin,
  saveDigitalProductByAdmin,
  savePortfolioByAdmin,
  saveServiceByAdmin,
  saveSiteDesignDraftByAdmin,
} from '../../../services/firestoreService';
import { formatUserFriendlyError } from '../../../lib/firestoreErrors';
import { VISUAL_THEME_OPTIONS } from '../../../utils/studioLogic';
import {
  createDefaultSiteDesignConfig,
  HOME_SECTION_LABELS,
  mergeSiteDesignConfig,
  resetDesignSection,
  sanitizeSiteDesignForFirestore,
} from '../../../utils/designSystem';
import { STUDIO_IMAGES } from '../../../data/initialCatalog';
import { ConfirmDialog } from '../../ConfirmDialog';
import { AdminImagePicker } from '../AdminImagePicker';
import {
  CardDesignEditor,
  ColorPickerControl,
  ControlGroup,
  FontSelectControl,
  RangeSliderControl,
  SectionDesignEditor,
  SegmentedControl,
  ToggleControl,
} from './DesignControls';
import { DesignCatalogTabEditor } from './DesignCatalogTabEditor';
import { DesignLivePreview, type PreviewPageKey } from './DesignLivePreview';
import type {
  CardAspectRatio,
  CardDesignConfig,
  CardImagePosition,
  CardSizePreset,
  DesignAlign,
  DesignCategoryTab,
  DesignViewport,
  DeviceResponsiveOverride,
  FooterDesignConfig,
  HeaderDesignConfig,
  HomeSectionId,
  SiteDesignConfig,
  StudioArticleItem,
} from '../../../types/design';
import type {
  DigitalProductItem,
  DriveFolderRecord,
  MediaAsset,
  PortfolioItem,
  ServiceItem,
  VisualThemeMode,
} from '../../../types/studio';

interface AdminDesignStudioPanelProps {
  products: DigitalProductItem[];
  services: ServiceItem[];
  portfolio: PortfolioItem[];
  media: MediaAsset[];
  driveFolders: DriveFolderRecord[];
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

interface DesignNavDef {
  id: DesignCategoryTab;
  label: string;
  shortLabel: string;
  icon: typeof Globe;
  defaultPreviewPage: PreviewPageKey;
}

const DESIGN_CATEGORY_NAV: DesignNavDef[] = [
  { id: 'global', label: '1. Pengaturan Global', shortLabel: 'Global', icon: Globe, defaultPreviewPage: 'home' },
  { id: 'identity', label: '2. Identitas Website', shortLabel: 'Identitas', icon: ImageIcon, defaultPreviewPage: 'home' },
  { id: 'home', label: '3. Pengaturan Beranda', shortLabel: 'Beranda', icon: Home, defaultPreviewPage: 'home' },
  { id: 'products', label: '4. Pengaturan Produk Digital', shortLabel: 'Produk', icon: Package, defaultPreviewPage: 'products' },
  { id: 'services', label: '5. Pengaturan Layanan', shortLabel: 'Layanan', icon: Briefcase, defaultPreviewPage: 'services' },
  { id: 'portfolio', label: '6. Pengaturan Portofolio', shortLabel: 'Portofolio', icon: FolderKanban, defaultPreviewPage: 'portfolio' },
  { id: 'articles', label: '7. Pengaturan Artikel & Konten', shortLabel: 'Artikel', icon: FileText, defaultPreviewPage: 'articles' },
  { id: 'otherPages', label: '8. Pengaturan Halaman Lainnya', shortLabel: 'Hal. Lain', icon: LayoutGrid, defaultPreviewPage: 'about' },
  { id: 'header', label: '9. Pengaturan Header & Navigasi', shortLabel: 'Header', icon: PanelTop, defaultPreviewPage: 'home' },
  { id: 'footer', label: '10. Pengaturan Footer', shortLabel: 'Footer', icon: PanelBottom, defaultPreviewPage: 'home' },
  { id: 'responsive', label: '11. Pengaturan Responsif', shortLabel: 'Responsif', icon: MonitorSmartphone, defaultPreviewPage: 'home' },
];

function serializeComparable(cfg: SiteDesignConfig): string {
  return JSON.stringify(sanitizeSiteDesignForFirestore(cfg, 'draft', 'cmp'));
}

export function AdminDesignStudioPanel({
  products,
  services,
  portfolio,
  media,
  driveFolders,
  actor,
  onRefresh,
  onToast,
}: AdminDesignStudioPanelProps) {
  const navigate = useNavigate();
  const {
    publishedConfig,
    startFullSiteDraftPreview,
    stopFullSiteDraftPreview,
    syncPublishedDesignCache,
  } = useDesign();
  const { persistedTheme, startPreview, stopPreview, syncCachedTheme } = useTheme();

  const [loadingDocs, setLoadingDocs] = useState(true);
  const [serverPublished, setServerPublished] = useState<SiteDesignConfig>(() => {
    const base = mergeSiteDesignConfig(publishedConfig, 'published');
    base.global.visualTheme = persistedTheme;
    return base;
  });
  const [serverDraft, setServerDraft] = useState<SiteDesignConfig | null>(null);
  const [serverPrevious, setServerPrevious] = useState<SiteDesignConfig | null>(null);

  const [draft, setDraft] = useState<SiteDesignConfig>(() => {
    const base = mergeSiteDesignConfig(publishedConfig, 'draft');
    base.global.visualTheme = persistedTheme;
    return base;
  });

  const [activeTab, setActiveTab] = useState<DesignCategoryTab>('global');
  const [activeHomeSection, setActiveHomeSection] = useState<HomeSectionId>('hero');
  const [activeResponsiveDevice, setActiveResponsiveDevice] = useState<DesignViewport>('desktop');
  const [activeOtherSubTab, setActiveOtherSubTab] = useState<
    'about' | 'procedure' | 'faq' | 'contact' | 'detailPages'
  >('about');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');

  const [previewViewport, setPreviewViewport] = useState<DesignViewport>('desktop');
  const [previewPage, setPreviewPage] = useState<PreviewPageKey>('home');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [categorySidebarOpen, setCategorySidebarOpen] = useState(true);
  const [mobileCategoryDrawerOpen, setMobileCategoryDrawerOpen] = useState(false);

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmResetAllOpen, setConfirmResetAllOpen] = useState(false);
  const [confirmRestorePrevOpen, setConfirmRestorePrevOpen] = useState(false);
  const [confirmResetSectionOpen, setConfirmResetSectionOpen] = useState(false);

  useEffect(() => {
    if (!mobileCategoryDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileCategoryDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileCategoryDrawerOpen]);

  // Load published, draft, and previous from Firestore
  useEffect(() => {
    let cancelled = false;
    setLoadingDocs(true);
    void (async () => {
      try {
        const docs = await fetchAdminSiteDesignDocs();
        if (cancelled) return;
        const pub =
          docs.published ??
          (() => {
            const def = createDefaultSiteDesignConfig('published');
            def.global.visualTheme = persistedTheme;
            return def;
          })();
        setServerPublished(pub);
        setServerDraft(docs.draft);
        setServerPrevious(docs.previous);

        const initialEditorState = docs.draft ? mergeSiteDesignConfig(docs.draft, 'draft') : mergeSiteDesignConfig(pub, 'draft');
        setDraft(initialEditorState);
        if (initialEditorState.articles.items[0]) {
          setSelectedArticleId(initialEditorState.articles.items[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          onToast({
            type: 'error',
            title: 'Gagal Memuat Konfigurasi Desain',
            description: formatUserFriendlyError(err, 'Menggunakan konfigurasi bawaan sementara.'),
          });
        }
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const baselineConfig = serverDraft ?? serverPublished;

  const hasUnsavedChanges = useMemo(
    () => serializeComparable(draft) !== serializeComparable(baselineConfig),
    [draft, baselineConfig]
  );

  const hasUnpublishedChanges = useMemo(
    () => serializeComparable(draft) !== serializeComparable(serverPublished),
    [draft, serverPublished]
  );

  function handleSelectCategory(tab: DesignCategoryTab) {
    setActiveTab(tab);
    setMobileCategoryDrawerOpen(false);
    const meta = DESIGN_CATEGORY_NAV.find((n) => n.id === tab);
    if (meta) {
      setPreviewPage(meta.defaultPreviewPage);
    }
  }

  function updateDraft(updater: (prev: SiteDesignConfig) => SiteDesignConfig) {
    setDraft((prev) => updater(structuredClone(prev)));
  }

  // --- Workflow Actions ---
  function handleDiscardUnsaved() {
    setDraft(mergeSiteDesignConfig(baselineConfig, 'draft'));
    onToast({
      type: 'info',
      title: 'Perubahan Dibatalkan',
      description: 'Editor dikembalikan ke versi draft/terbit terakhir yang tersimpan.',
    });
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      const saved = await saveSiteDesignDraftByAdmin(draft, actor);
      setServerDraft(saved);
      setDraft(mergeSiteDesignConfig(saved, 'draft'));
      onToast({
        type: 'success',
        title: 'Disimpan sebagai Draft',
        description:
          'Rancangan tersimpan aman di Firestore (site_design/draft). Pengunjung publik belum terpengaruh sebelum Anda menekan Publikasikan.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan Draft',
        description: formatUserFriendlyError(err, 'Periksa izin administrator Anda.'),
      });
    } finally {
      setSavingDraft(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const result = await publishSiteDesignByAdmin(draft, actor);
      const nextPub = result.published;
      setServerPrevious(serverPublished);
      setServerPublished(nextPub);
      setServerDraft(mergeSiteDesignConfig(nextPub, 'draft'));
      setDraft(mergeSiteDesignConfig(nextPub, 'draft'));

      // Immediately update runtime cache & active visual theme
      syncPublishedDesignCache(nextPub);
      syncCachedTheme(nextPub.global.visualTheme);
      stopFullSiteDraftPreview();
      stopPreview();
      await onRefresh();

      onToast({
        type: 'success',
        title: 'Desain Website Berhasil Dipublikasikan',
        description:
          'Seluruh perubahan desain, tema, tata letak, dan tipografi kini langsung aktif untuk semua pengunjung.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Mempublikasikan Desain',
        description: formatUserFriendlyError(err, 'Periksa koneksi dan izin admin lalu coba kembali.'),
      });
    } finally {
      setPublishing(false);
    }
  }

  function handleConfirmRestorePrevious() {
    if (!serverPrevious) return;
    setDraft(mergeSiteDesignConfig(serverPrevious, 'draft'));
    setConfirmRestorePrevOpen(false);
    onToast({
      type: 'info',
      title: 'Pengaturan Sebelumnya Dimuat ke Editor',
      description:
        'Tinjau hasilnya di Live Preview, lalu klik "Publikasikan" untuk menerapkan kembali ke publik.',
    });
  }

  function handleConfirmResetSection() {
    setDraft((prev) =>
      resetDesignSection(prev, activeTab, activeTab === 'home' ? activeHomeSection : undefined)
    );
    setConfirmResetSectionOpen(false);
    const activeMeta = DESIGN_CATEGORY_NAV.find((n) => n.id === activeTab);
    onToast({
      type: 'info',
      title: `Pengaturan ${activeMeta?.shortLabel || 'Bagian'} Direset`,
      description:
        'Hanya bagian aktif ini yang dikembalikan ke bawaan. Bagian lainnya tetap aman. Klik Publikasikan untuk menyimpan.',
    });
  }

  function handleConfirmResetAll() {
    const fresh = createDefaultSiteDesignConfig('draft');
    setDraft(fresh);
    setConfirmResetAllOpen(false);
    onToast({
      type: 'info',
      title: 'Seluruh Pengaturan Desain Direset ke Bawaan',
      description:
        'Semua 11 kategori telah dikembalikan ke pengaturan default. Klik Simpan Draft atau Publikasikan untuk menerapkan.',
    });
  }

  function handleOpenFullSitePreview() {
    startFullSiteDraftPreview(draft);
    startPreview(draft.global.visualTheme);
    navigate(previewPage === 'home' ? '/' : `/${previewPage === 'products' ? 'produk' : previewPage === 'services' ? 'layanan' : previewPage === 'portfolio' ? 'portofolio' : previewPage === 'articles' ? 'artikel' : previewPage === 'about' ? 'tentang' : previewPage === 'procedure' ? 'prosedur' : previewPage === 'faq' ? 'faq' : 'kontak'}`);
  }

  // --- Home Section Ordering ---
  function moveHomeSection(id: HomeSectionId, direction: -1 | 1) {
    updateDraft((next) => {
      const order = [...next.home.sectionOrder];
      const idx = order.indexOf(id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= order.length) return next;
      const [moved] = order.splice(idx, 1);
      order.splice(target, 0, moved);
      next.home.sectionOrder = order;
      return next;
    });
  }

  // --- Individual Thumbnail Persistence Helpers ---
  async function handleSaveProductThumb(
    itemId: string,
    next: { imageUrl: string; driveFileId: string }
  ) {
    const existing = products.find((p) => p.id === itemId);
    if (!existing) return;
    try {
      await saveDigitalProductByAdmin(
        { ...existing, imageUrl: next.imageUrl, driveFileId: next.driveFileId },
        actor
      );
      await onRefresh();
      onToast({
        type: 'success',
        title: 'Thumbnail Produk Diperbarui',
        description: `Gambar utama "${existing.title}" telah disimpan ke database.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan Thumbnail',
        description: formatUserFriendlyError(err, 'Coba kembali.'),
      });
    }
  }

  async function handleSaveServiceThumb(
    itemId: string,
    next: { imageUrl: string; driveFileId: string }
  ) {
    const existing = services.find((s) => s.id === itemId);
    if (!existing) return;
    try {
      await saveServiceByAdmin(
        { ...existing, imageUrl: next.imageUrl, driveFileId: next.driveFileId },
        actor
      );
      await onRefresh();
      onToast({
        type: 'success',
        title: 'Thumbnail Layanan Diperbarui',
        description: `Gambar utama "${existing.title}" telah disimpan ke database.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan Thumbnail',
        description: formatUserFriendlyError(err, 'Coba kembali.'),
      });
    }
  }

  async function handleSavePortfolioThumb(
    itemId: string,
    next: { imageUrl: string; driveFileId: string }
  ) {
    const existing = portfolio.find((p) => p.id === itemId);
    if (!existing) return;
    try {
      await savePortfolioByAdmin(
        { ...existing, imageUrl: next.imageUrl, driveFileId: next.driveFileId },
        actor
      );
      await onRefresh();
      onToast({
        type: 'success',
        title: 'Thumbnail Portofolio Diperbarui',
        description: `Gambar utama "${existing.title}" telah disimpan ke database.`,
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan Thumbnail',
        description: formatUserFriendlyError(err, 'Coba kembali.'),
      });
    }
  }

  // --- Articles CRUD inside Design Config ---
  function handleAddArticle() {
    const newId = `art_${Date.now().toString(36)}`;
    const newItem: StudioArticleItem = {
      id: newId,
      slug: `artikel-baru-${Date.now().toString(36)}`,
      title: 'Judul Artikel Baru Studio',
      category: 'Wawasan',
      summary: 'Ringkasan singkat isi artikel yang muncul pada kartu artikel.',
      content: 'Tulis isi artikel lengkap di sini...',
      imageUrl: STUDIO_IMAGES.webApp,
      driveFileId: '',
      publishedDate: new Date().toISOString().slice(0, 10),
      readTime: '3 menit baca',
      isPublished: true,
    };
    updateDraft((next) => {
      next.articles.items = [newItem, ...next.articles.items].slice(0, 12);
      return next;
    });
    setSelectedArticleId(newId);
  }

  function handleUpdateArticle(id: string, patch: Partial<StudioArticleItem>) {
    updateDraft((next) => {
      next.articles.items = next.articles.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      );
      return next;
    });
  }

  function handleDeleteArticle(id: string) {
    updateDraft((next) => {
      next.articles.items = next.articles.items.filter((item) => item.id !== id);
      return next;
    });
  }

  // --- Responsive Device Override Sync ---
  function updateResponsiveDevice(
    device: DesignViewport,
    patch: Partial<DeviceResponsiveOverride>
  ) {
    updateDraft((next) => {
      next.responsive[device] = { ...next.responsive[device], ...patch };
      // Synchronize catalog section column counts cleanly so both panels stay consistent
      if (patch.productsCols !== undefined) {
        if (device === 'desktop') next.products.section.colsDesktop = patch.productsCols;
        if (device === 'tablet') next.products.section.colsTablet = patch.productsCols;
        if (device === 'mobile') next.products.section.colsMobile = patch.productsCols;
      }
      if (patch.servicesCols !== undefined) {
        if (device === 'desktop') next.services.section.colsDesktop = patch.servicesCols;
        if (device === 'tablet') next.services.section.colsTablet = patch.servicesCols;
        if (device === 'mobile') next.services.section.colsMobile = patch.servicesCols;
      }
      if (patch.portfolioCols !== undefined) {
        if (device === 'desktop') next.portfolio.section.colsDesktop = patch.portfolioCols;
        if (device === 'tablet') next.portfolio.section.colsTablet = patch.portfolioCols;
        if (device === 'mobile') next.portfolio.section.colsMobile = patch.portfolioCols;
      }
      if (patch.articlesCols !== undefined) {
        if (device === 'desktop') next.articles.section.colsDesktop = patch.articlesCols;
        if (device === 'tablet') next.articles.section.colsTablet = patch.articlesCols;
        if (device === 'mobile') next.articles.section.colsMobile = patch.articlesCols;
      }
      return next;
    });
  }

  const activeCategoryMeta = DESIGN_CATEGORY_NAV.find((n) => n.id === activeTab);
  const activeArticleItem =
    draft.articles.items.find((a) => a.id === selectedArticleId) ||
    draft.articles.items[0] ||
    null;

  if (loadingDocs) {
    return (
      <div className="nb-card p-8 text-center space-y-2">
        <p className="font-display font-bold text-base text-[#171717]">
          Memuat Website Design Studio...
        </p>
        <p className="text-xs text-[#525252]">
          Mengambil konfigurasi desain terpublikasi, draft, dan riwayat sebelumnya dari Firestore.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action & Workflow Bar */}
      <div className="nb-card p-3.5 sm:p-4 bg-white space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Palette className="w-4 h-4 text-[#0F3D3A] shrink-0" />
              <h1 className="font-display font-bold text-base sm:text-lg text-[#171717]">
                Website Design Studio
              </h1>
              <span
                className={`px-2 py-0.5 border border-[#171717] rounded-[3px] font-mono text-[10px] font-bold ${
                  hasUnsavedChanges
                    ? 'bg-[#F3C95B] text-[#171717]'
                    : hasUnpublishedChanges
                      ? 'bg-[#8ACCD5] text-[#171717]'
                      : 'bg-[#0F3D3A] text-[#F8F8E1]'
                }`}
              >
                {hasUnsavedChanges
                  ? 'Perubahan Belum Disimpan'
                  : hasUnpublishedChanges
                    ? 'Draft Tersimpan (Belum Publik)'
                    : 'Sinkron & Terpublikasi'}
              </span>
            </div>
            <p className="text-xs text-[#525252]">
              Atur tema, tipografi, warna, tata letak, card, media, header, footer, dan responsif
              secara visual untuk seluruh halaman tanpa menyentuh kode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowLivePreview((v) => !v)}
              className="nb-btn nb-btn-surface nb-btn-xs"
            >
              {showLivePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showLivePreview ? 'Sembunyikan Preview' : 'Tampilkan Preview'}
            </button>

            <button
              type="button"
              onClick={handleOpenFullSitePreview}
              className="nb-btn nb-btn-sky nb-btn-xs"
              title="Buka website publik dalam mode pratinjau draft (hanya terlihat oleh Anda)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Pratinjau Penuh
            </button>

            <button
              type="button"
              disabled={!hasUnsavedChanges}
              onClick={handleDiscardUnsaved}
              className="nb-btn nb-btn-surface nb-btn-xs disabled:opacity-45"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Batalkan Perubahan
            </button>

            <button
              type="button"
              disabled={savingDraft || publishing}
              onClick={() => void handleSaveDraft()}
              className="nb-btn nb-btn-mustard nb-btn-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {savingDraft ? 'Menyimpan...' : 'Simpan sebagai Draft'}
            </button>

            <button
              type="button"
              disabled={publishing || savingDraft}
              onClick={() => void handlePublish()}
              className="nb-btn nb-btn-primary nb-btn-xs"
            >
              <Check className="w-3.5 h-3.5" />
              {publishing ? 'Mempublikasikan...' : 'Publikasikan'}
            </button>
          </div>
        </div>

        {/* Secondary Safety & Reset Controls */}
        <div className="pt-2.5 border-t border-[#171717]/15 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!serverPrevious}
              onClick={() => setConfirmRestorePrevOpen(true)}
              className="nb-btn nb-btn-surface nb-btn-xs disabled:opacity-45"
              title="Kembalikan konfigurasi terpublikasi sebelum publikasi terakhir"
            >
              <History className="w-3 h-3" />
              Kembalikan ke Pengaturan Sebelumnya
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetSectionOpen(true)}
              className="nb-btn nb-btn-surface nb-btn-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Pengaturan {activeCategoryMeta?.shortLabel || 'Bagian'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setConfirmResetAllOpen(true)}
            className="nb-btn nb-btn-surface nb-btn-xs text-[#6C151E]"
          >
            <Trash2 className="w-3 h-3" />
            Reset Seluruh Desain
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Category Drawer */}
      {mobileCategoryDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Kategori kustomisasi desain website"
        >
          <div
            className="fixed inset-0 bg-[#171717]/60 backdrop-blur-[2px]"
            onClick={() => setMobileCategoryDrawerOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-white border-r-2 border-[#171717] overflow-y-auto shadow-2xl flex flex-col">
            <div className="px-3.5 py-3 border-b-2 border-[#171717] bg-[#F8F8E1] flex items-center justify-between gap-2">
              <span className="font-display font-bold text-xs text-[#171717]">
                11 Kategori Desain
              </span>
              <button
                type="button"
                onClick={() => setMobileCategoryDrawerOpen(false)}
                aria-label="Tutup menu kategori desain"
                className="nb-btn nb-btn-surface p-1.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <nav aria-label="Kategori kustomisasi desain website" className="p-2.5 space-y-1">
              {DESIGN_CATEGORY_NAV.map((cat) => {
                const Icon = cat.icon;
                const active = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-[4px] border-2 text-left text-xs font-display font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0F3D3A] text-[#F3C95B] border-[#171717] nb-shadow-sm'
                        : 'border-transparent text-[#262626] hover:bg-[#F8F8E1]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* BAGIAN ATAS: Collapsible 11-Category Sidebar (Left) + Wide Settings Panel (Right) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start min-w-0">
        {/* Desktop Collapsible Category Sidebar */}
        <aside
          aria-label="Sidebar kategori desain website"
          aria-hidden={!categorySidebarOpen}
          className={`hidden lg:block sticky top-16 shrink-0 transition-[width,opacity,margin] duration-200 ease-out ${
            categorySidebarOpen
              ? 'lg:w-64 opacity-100'
              : 'lg:w-0 opacity-0 overflow-hidden pointer-events-none -mr-4'
          }`}
        >
          <div className="w-64">
            <nav
              aria-label="Kategori kustomisasi desain website"
              className="nb-card p-2 bg-white space-y-1"
            >
              <div className="px-2 pt-1 pb-1.5 flex items-center justify-between gap-2 border-b border-[#171717]/15">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#525252]">
                  11 Kategori Desain
                </p>
                <button
                  type="button"
                  onClick={() => setCategorySidebarOpen(false)}
                  aria-label="Tutup sidebar kategori desain"
                  title="Tutup sidebar kategori desain"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-[4px] border border-[#171717]/20 text-[#262626] hover:bg-[#F8F8E1] transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
              {DESIGN_CATEGORY_NAV.map((cat) => {
                const Icon = cat.icon;
                const active = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-[4px] border-2 text-left text-xs font-display font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0F3D3A] text-[#F3C95B] border-[#171717] nb-shadow-sm'
                        : 'border-transparent text-[#262626] hover:bg-[#F8F8E1]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right Settings Workspace (expands to 100% when category sidebar is collapsed) */}
        <section className="flex-1 min-w-0 w-full space-y-3.5">
          {/* Active Category Bar + Sidebar Toggle + Jump to Live Preview */}
          <div className="nb-card px-3.5 py-2.5 bg-white flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setCategorySidebarOpen((v) => !v)}
                aria-expanded={categorySidebarOpen}
                aria-label={
                  categorySidebarOpen
                    ? 'Tutup sidebar kategori desain'
                    : 'Buka sidebar kategori desain'
                }
                className="hidden lg:inline-flex nb-btn nb-btn-surface nb-btn-xs shrink-0"
              >
                {categorySidebarOpen ? (
                  <>
                    <PanelLeftClose className="w-3.5 h-3.5" />
                    <span>Tutup Kategori</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                    <span>Buka Kategori</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMobileCategoryDrawerOpen(true)}
                aria-expanded={mobileCategoryDrawerOpen}
                aria-label="Buka daftar 11 kategori desain"
                className="lg:hidden inline-flex nb-btn nb-btn-surface nb-btn-xs shrink-0"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
                <span>Kategori (11)</span>
              </button>

              <div className="min-w-0">
                <p className="font-display font-bold text-xs sm:text-sm text-[#171717] truncate">
                  {activeCategoryMeta?.label || 'Pengaturan Desain'}
                </p>
              </div>
            </div>

            {showLivePreview && (
              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById('scs-live-preview-section')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="nb-btn nb-btn-sky nb-btn-xs shrink-0"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Lihat Live Preview</span>
              </button>
            )}
          </div>

          {/* 1. PENGATURAN GLOBAL */}
          {activeTab === 'global' && (
            <div className="space-y-3.5">
              <ControlGroup
                title="Fondasi Tema Visual"
                subtitle="Pilih tema dasar yang menjadi fondasi seluruh halaman. Kedua tema kompatibel penuh dengan seluruh pengaturan desain."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VISUAL_THEME_OPTIONS.map((opt) => {
                    const active = draft.global.visualTheme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          updateDraft((n) => {
                            n.global.visualTheme = opt.id as VisualThemeMode;
                            return n;
                          })
                        }
                        className={`p-3 rounded-[4px] border-2 text-left transition-all cursor-pointer space-y-1 ${
                          active
                            ? 'border-[#0F3D3A] bg-[#F8F8E1] ring-2 ring-[#F3C95B]'
                            : 'border-[#171717]/30 bg-white hover:border-[#171717]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display font-bold text-xs sm:text-sm text-[#171717]">
                            {opt.name}
                          </span>
                          {active && (
                            <span className="px-1.5 py-0.5 bg-[#0F3D3A] text-[#F3C95B] rounded-[2px] text-[9px] font-bold">
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#525252] leading-snug">{opt.tagline}</p>
                      </button>
                    );
                  })}
                </div>
              </ControlGroup>

              <ControlGroup
                title="Tata Letak & Ruang Global"
                subtitle="Lebar kontainer utama, jarak antar section, dan jarak elemen default."
              >
                <RangeSliderControl
                  label="Lebar Maksimal Kontainer Situs"
                  value={draft.global.containerMaxWidthPx}
                  min={960}
                  max={1536}
                  step={32}
                  onChange={(v) =>
                    updateDraft((n) => {
                      n.global.containerMaxWidthPx = v ?? 1280;
                      return n;
                    })
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RangeSliderControl
                    label="Padding Vertikal Section Default"
                    value={draft.global.sectionPaddingYPx}
                    min={16}
                    max={80}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.sectionPaddingYPx = v ?? 36;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Jarak Elemen Default (Gap)"
                    value={draft.global.elementGapPx}
                    min={8}
                    max={36}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.elementGapPx = v ?? 12;
                        return n;
                      })
                    }
                  />
                </div>
              </ControlGroup>

              <ControlGroup
                title="Tipografi Global"
                subtitle="Ganti jenis huruf judul & isi, ukuran, ketebalan, jarak baris, dan spasi huruf."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FontSelectControl
                    label="Font Judul (Display)"
                    value={draft.global.typography.displayFont}
                    onChange={(v) => {
                      if (!v) return;
                      updateDraft((n) => {
                        n.global.typography.displayFont = v;
                        return n;
                      });
                    }}
                  />
                  <FontSelectControl
                    label="Font Isi (Body)"
                    value={draft.global.typography.bodyFont}
                    onChange={(v) => {
                      if (!v) return;
                      updateDraft((n) => {
                        n.global.typography.bodyFont = v;
                        return n;
                      });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RangeSliderControl
                    label="Ukuran Teks Dasar"
                    value={draft.global.typography.baseFontSizePx}
                    min={12}
                    max={19}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.typography.baseFontSizePx = v ?? 14;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Skala Ukuran Heading"
                    value={draft.global.typography.headingScale}
                    min={0.85}
                    max={1.35}
                    step={0.05}
                    unit="x"
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.typography.headingScale = v ?? 1;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Ukuran Teks Tombol"
                    value={draft.global.typography.buttonFontSizePx}
                    min={11}
                    max={16}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.typography.buttonFontSizePx = v ?? 12;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Jarak Antar Baris (Line Height)"
                    value={draft.global.typography.lineHeight}
                    min={1.3}
                    max={1.9}
                    step={0.05}
                    unit=""
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.typography.lineHeight = v ?? 1.55;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Spasi Huruf (Letter Spacing)"
                    value={draft.global.typography.letterSpacingEm}
                    min={-0.03}
                    max={0.06}
                    step={0.005}
                    unit="em"
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.typography.letterSpacingEm = v ?? 0;
                        return n;
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SegmentedControl<string>
                    label="Ketebalan Judul"
                    value={String(draft.global.typography.headingWeight)}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.typography.headingWeight = Number(v) as 500 | 600 | 700 | 800;
                        return n;
                      })
                    }
                    options={[
                      { value: '500', label: 'Medium' },
                      { value: '600', label: 'SemiBold' },
                      { value: '700', label: 'Bold' },
                      { value: '800', label: 'ExtraBold' },
                    ]}
                  />
                  <SegmentedControl<string>
                    label="Ketebalan Isi"
                    value={String(draft.global.typography.bodyWeight)}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.typography.bodyWeight = Number(v) as 400 | 500 | 600;
                        return n;
                      })
                    }
                    options={[
                      { value: '400', label: 'Normal' },
                      { value: '500', label: 'Medium' },
                      { value: '600', label: 'SemiBold' },
                    ]}
                  />
                </div>
              </ControlGroup>

              <ControlGroup
                title="Palet Warna Global"
                subtitle="Kosongkan warna apa pun untuk mengikuti fondasi tema aktif."
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ColorPickerControl
                    label="Warna Utama (Primary)"
                    value={draft.global.colors.primary}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.primary = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Sekunder / Aksen"
                    value={draft.global.colors.secondary}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.secondary = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Background Halaman"
                    value={draft.global.colors.background}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.background = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Background Kartu (Surface)"
                    value={draft.global.colors.surface}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.surface = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Garis / Border"
                    value={draft.global.colors.border}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.border = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Teks Utama"
                    value={draft.global.colors.textPrimary}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.textPrimary = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Teks Sekunder"
                    value={draft.global.colors.textMuted}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.textMuted = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Background Tombol Utama"
                    value={draft.global.colors.buttonBg}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.buttonBg = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Teks Tombol Utama"
                    value={draft.global.colors.buttonText}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.global.colors.buttonText = v;
                        return n;
                      })
                    }
                  />
                </div>
              </ControlGroup>
            </div>
          )}

          {/* 2. IDENTITAS WEBSITE */}
          {activeTab === 'identity' && (
            <div className="space-y-3.5">
              <ControlGroup
                title="Logo Website & Favicon"
                subtitle="Pilih dari Google Drive Media Library atau unggah langsung. Melepas gambar tidak menghapus file asli di Google Drive."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-[#171717]/15">
                  <RangeSliderControl
                    label="Tinggi Logo di Navbar"
                    value={draft.identity.logoHeightPx}
                    min={22}
                    max={60}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.identity.logoHeightPx = v ?? 32;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Nama Studio di Samping Logo"
                    checked={draft.identity.showLogoText}
                    onChange={(showLogoText) =>
                      updateDraft((n) => {
                        n.identity.showLogoText = showLogoText;
                        return n;
                      })
                    }
                  />
                </div>

                <AdminImagePicker
                  label="Logo Website"
                  usage="hero"
                  entityKey="design-logo"
                  allowEmpty
                  emptyHint="Kosongkan untuk menampilkan teks OSAMA CREATIVE STUDIO hingga logo baru diunggah."
                  imageUrl={draft.identity.logoUrl}
                  driveFileId={draft.identity.logoDriveFileId}
                  media={media}
                  driveFolders={driveFolders}
                  actor={actor}
                  onChange={({ imageUrl, driveFileId }) =>
                    updateDraft((n) => {
                      n.identity.logoUrl = imageUrl;
                      n.identity.logoDriveFileId = driveFileId;
                      return n;
                    })
                  }
                  onMediaUploaded={onRefresh}
                  onToast={onToast}
                />

                <AdminImagePicker
                  label="Favicon Tab Browser"
                  usage="hero"
                  entityKey="design-favicon"
                  allowEmpty
                  emptyHint="Kosongkan untuk memakai ikon tab bawaan."
                  imageUrl={draft.identity.faviconUrl}
                  driveFileId={draft.identity.faviconDriveFileId}
                  media={media}
                  driveFolders={driveFolders}
                  actor={actor}
                  onChange={({ imageUrl, driveFileId }) =>
                    updateDraft((n) => {
                      n.identity.faviconUrl = imageUrl;
                      n.identity.faviconDriveFileId = driveFileId;
                      return n;
                    })
                  }
                  onMediaUploaded={onRefresh}
                  onToast={onToast}
                />
              </ControlGroup>

              <ControlGroup
                title="Profil Pemilik / Creative Director"
                subtitle="Tampil pada cuplikan profil Beranda (jika foto diisi) dan blok Profil Pemilik di halaman Tentang Kami."
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[#171717]">
                      Nama Pemilik / Pengarah Kreatif
                    </label>
                    <input
                      type="text"
                      value={draft.identity.ownerName}
                      onChange={(e) =>
                        updateDraft((n) => {
                          n.identity.ownerName = e.target.value;
                          return n;
                        })
                      }
                      className="nb-input py-1.5 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[#171717]">
                      Peran / Jabatan
                    </label>
                    <input
                      type="text"
                      value={draft.identity.ownerRole}
                      onChange={(e) =>
                        updateDraft((n) => {
                          n.identity.ownerRole = e.target.value;
                          return n;
                        })
                      }
                      className="nb-input py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#171717]">
                    Bio Singkat
                  </label>
                  <textarea
                    rows={2}
                    value={draft.identity.ownerBio}
                    onChange={(e) =>
                      updateDraft((n) => {
                        n.identity.ownerBio = e.target.value;
                        return n;
                      })
                    }
                    className="nb-input py-1.5 text-xs"
                  />
                </div>

                <AdminImagePicker
                  label="Foto Profil Pemilik"
                  usage="hero"
                  entityKey="design-owner-photo"
                  allowEmpty
                  emptyHint="Unggah atau pilih foto profil pemilik dari Media Library."
                  imageUrl={draft.identity.ownerPhotoUrl}
                  driveFileId={draft.identity.ownerPhotoDriveFileId}
                  media={media}
                  driveFolders={driveFolders}
                  actor={actor}
                  onChange={({ imageUrl, driveFileId }) =>
                    updateDraft((n) => {
                      n.identity.ownerPhotoUrl = imageUrl;
                      n.identity.ownerPhotoDriveFileId = driveFileId;
                      return n;
                    })
                  }
                  onMediaUploaded={onRefresh}
                  onToast={onToast}
                />
              </ControlGroup>

              <ControlGroup
                title="Banner Utama, Foto Sampul & Latar Halaman"
                subtitle="Atur visual banner hero, sampul halaman Tentang Kami, dan tekstur gambar latar halaman."
                defaultOpen={false}
              >
                <AdminImagePicker
                  label="Banner Utama Beranda (Override)"
                  usage="hero"
                  entityKey="design-hero-override"
                  allowEmpty
                  emptyHint="Kosongkan untuk memakai gambar hero dari Pengaturan Website."
                  imageUrl={draft.identity.heroImageOverrideUrl}
                  driveFileId={draft.identity.heroImageOverrideDriveFileId}
                  media={media}
                  driveFolders={driveFolders}
                  actor={actor}
                  onChange={({ imageUrl, driveFileId }) =>
                    updateDraft((n) => {
                      n.identity.heroImageOverrideUrl = imageUrl;
                      n.identity.heroImageOverrideDriveFileId = driveFileId;
                      return n;
                    })
                  }
                  onMediaUploaded={onRefresh}
                  onToast={onToast}
                />

                <AdminImagePicker
                  label="Foto Sampul / Cover (Halaman Tentang Kami)"
                  usage="hero"
                  entityKey="design-cover"
                  allowEmpty
                  emptyHint="Kosongkan untuk memakai banner utama studio."
                  imageUrl={draft.identity.coverImageUrl}
                  driveFileId={draft.identity.coverDriveFileId}
                  media={media}
                  driveFolders={driveFolders}
                  actor={actor}
                  onChange={({ imageUrl, driveFileId }) =>
                    updateDraft((n) => {
                      n.identity.coverImageUrl = imageUrl;
                      n.identity.coverDriveFileId = driveFileId;
                      return n;
                    })
                  }
                  onMediaUploaded={onRefresh}
                  onToast={onToast}
                />

                <RangeSliderControl
                  label="Opasitas Gambar Latar Halaman"
                  value={Math.round(draft.identity.pageBackgroundOpacity * 100)}
                  min={0}
                  max={40}
                  unit="%"
                  onChange={(v) =>
                    updateDraft((n) => {
                      n.identity.pageBackgroundOpacity = (v ?? 8) / 100;
                      return n;
                    })
                  }
                />

                <AdminImagePicker
                  label="Gambar Latar Halaman (Opsional)"
                  usage="hero"
                  entityKey="design-page-bg"
                  allowEmpty
                  emptyHint="Kosongkan untuk latar bersih sesuai tema."
                  imageUrl={draft.identity.pageBackgroundImageUrl}
                  driveFileId={draft.identity.pageBackgroundDriveFileId}
                  media={media}
                  driveFolders={driveFolders}
                  actor={actor}
                  onChange={({ imageUrl, driveFileId }) =>
                    updateDraft((n) => {
                      n.identity.pageBackgroundImageUrl = imageUrl;
                      n.identity.pageBackgroundDriveFileId = driveFileId;
                      return n;
                    })
                  }
                  onMediaUploaded={onRefresh}
                  onToast={onToast}
                />
              </ControlGroup>
            </div>
          )}

          {/* 3. PENGATURAN BERANDA */}
          {activeTab === 'home' && (
            <div className="space-y-3.5">
              <ControlGroup
                title="Urutan & Visibilitas Section Beranda"
                subtitle="Susun ulang urutan tampil section di Beranda, tampilkan/sembunyikan, atau klik satu section untuk mengedit detailnya."
              >
                <div className="space-y-1.5">
                  {draft.home.sectionOrder.map((secId, idx) => {
                    const secCfg = draft.home.sections[secId];
                    const meta = HOME_SECTION_LABELS[secId];
                    const selected = activeHomeSection === secId;
                    return (
                      <div
                        key={secId}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-[4px] border-2 transition-colors ${
                          selected
                            ? 'border-[#0F3D3A] bg-[#F8F8E1] ring-2 ring-[#F3C95B]'
                            : 'border-[#171717]/25 bg-white hover:border-[#171717]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveHomeSection(secId)}
                          className="flex-1 text-left min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-[#6C151E]">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="font-display font-bold text-xs text-[#171717] truncate">
                              {meta.label}
                            </span>
                            {!secCfg.visible && (
                              <span className="px-1.5 py-0.5 bg-[#E5E5C7] text-[#525252] rounded-[2px] text-[9px] font-mono">
                                Disembunyikan
                              </span>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title={secCfg.visible ? 'Sembunyikan' : 'Tampilkan'}
                            onClick={() =>
                              updateDraft((n) => {
                                n.home.sections[secId].visible = !n.home.sections[secId].visible;
                                return n;
                              })
                            }
                            className={`p-1 rounded-[3px] border cursor-pointer ${
                              secCfg.visible
                                ? 'bg-[#0F3D3A] text-[#F3C95B] border-[#171717]'
                                : 'bg-white text-[#737373] border-[#171717]/30'
                            }`}
                          >
                            {secCfg.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveHomeSection(secId, -1)}
                            title="Pindah ke atas"
                            className="p-1 rounded-[3px] border border-[#171717]/30 bg-white disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft.home.sectionOrder.length - 1}
                            onClick={() => moveHomeSection(secId, 1)}
                            title="Pindah ke bawah"
                            className="p-1 rounded-[3px] border border-[#171717]/30 bg-white disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ControlGroup>

              <ControlGroup
                title={`Edit Section: ${HOME_SECTION_LABELS[activeHomeSection].label}`}
                subtitle={HOME_SECTION_LABELS[activeHomeSection].description}
                badge="Independen"
              >
                <SectionDesignEditor
                  section={draft.home.sections[activeHomeSection]}
                  showHeroLayout={activeHomeSection === 'hero'}
                  showCollectionGridControls={
                    activeHomeSection !== 'hero' &&
                    activeHomeSection !== 'about' &&
                    activeHomeSection !== 'faq' &&
                    activeHomeSection !== 'cta'
                  }
                  onChange={(patch) =>
                    updateDraft((n) => {
                      n.home.sections[activeHomeSection] = {
                        ...n.home.sections[activeHomeSection],
                        ...patch,
                      };
                      return n;
                    })
                  }
                />
              </ControlGroup>
            </div>
          )}

          {/* 4. PENGATURAN PRODUK DIGITAL */}
          {activeTab === 'products' && (
            <DesignCatalogTabEditor
              categoryLabel="Produk Digital"
              usage="product"
              config={draft.products}
              showPriceControls
              items={products.map((p) => ({
                id: p.id,
                title: p.title,
                subtitle: p.format,
                imageUrl: p.imageUrl,
                driveFileId: p.driveFileId || '',
                isPublished: p.isPublished,
              }))}
              media={media}
              driveFolders={driveFolders}
              actor={actor}
              onSectionChange={(patch) =>
                updateDraft((n) => {
                  n.products.section = { ...n.products.section, ...patch };
                  if (patch.colsDesktop !== undefined) n.responsive.desktop.productsCols = patch.colsDesktop;
                  if (patch.colsTablet !== undefined) n.responsive.tablet.productsCols = patch.colsTablet;
                  if (patch.colsMobile !== undefined) n.responsive.mobile.productsCols = patch.colsMobile;
                  return n;
                })
              }
              onCardChange={(patch) =>
                updateDraft((n) => {
                  n.products.card = { ...n.products.card, ...patch };
                  return n;
                })
              }
              onItemOverrideChange={(itemId, override) =>
                updateDraft((n) => {
                  if (!override) {
                    delete n.products.itemOverrides[itemId];
                  } else {
                    n.products.itemOverrides[itemId] = override;
                  }
                  return n;
                })
              }
              onSaveItemThumbnail={handleSaveProductThumb}
              onMediaUploaded={onRefresh}
              onToast={onToast}
            />
          )}

          {/* 5. PENGATURAN LAYANAN */}
          {activeTab === 'services' && (
            <DesignCatalogTabEditor
              categoryLabel="Layanan"
              usage="service"
              config={draft.services}
              showPriceControls
              items={services.map((s) => ({
                id: s.id,
                title: s.title,
                subtitle: s.priceLabel,
                imageUrl: s.imageUrl,
                driveFileId: s.driveFileId || '',
                isPublished: s.isPublished,
              }))}
              media={media}
              driveFolders={driveFolders}
              actor={actor}
              onSectionChange={(patch) =>
                updateDraft((n) => {
                  n.services.section = { ...n.services.section, ...patch };
                  if (patch.colsDesktop !== undefined) n.responsive.desktop.servicesCols = patch.colsDesktop;
                  if (patch.colsTablet !== undefined) n.responsive.tablet.servicesCols = patch.colsTablet;
                  if (patch.colsMobile !== undefined) n.responsive.mobile.servicesCols = patch.colsMobile;
                  return n;
                })
              }
              onCardChange={(patch) =>
                updateDraft((n) => {
                  n.services.card = { ...n.services.card, ...patch };
                  return n;
                })
              }
              onItemOverrideChange={(itemId, override) =>
                updateDraft((n) => {
                  if (!override) {
                    delete n.services.itemOverrides[itemId];
                  } else {
                    n.services.itemOverrides[itemId] = override;
                  }
                  return n;
                })
              }
              onSaveItemThumbnail={handleSaveServiceThumb}
              onMediaUploaded={onRefresh}
              onToast={onToast}
            />
          )}

          {/* 6. PENGATURAN PORTOFOLIO */}
          {activeTab === 'portfolio' && (
            <DesignCatalogTabEditor
              categoryLabel="Portofolio"
              usage="portfolio"
              config={draft.portfolio}
              showPriceControls={false}
              showMetaToggle
              items={portfolio.map((p) => ({
                id: p.id,
                title: p.title,
                subtitle: `${p.clientName} · ${p.year}`,
                imageUrl: p.imageUrl,
                driveFileId: p.driveFileId || '',
                isPublished: p.isPublished,
              }))}
              media={media}
              driveFolders={driveFolders}
              actor={actor}
              onSectionChange={(patch) =>
                updateDraft((n) => {
                  n.portfolio.section = { ...n.portfolio.section, ...patch };
                  if (patch.colsDesktop !== undefined) n.responsive.desktop.portfolioCols = patch.colsDesktop;
                  if (patch.colsTablet !== undefined) n.responsive.tablet.portfolioCols = patch.colsTablet;
                  if (patch.colsMobile !== undefined) n.responsive.mobile.portfolioCols = patch.colsMobile;
                  return n;
                })
              }
              onCardChange={(patch) =>
                updateDraft((n) => {
                  n.portfolio.card = { ...n.portfolio.card, ...patch };
                  return n;
                })
              }
              onItemOverrideChange={(itemId, override) =>
                updateDraft((n) => {
                  if (!override) {
                    delete n.portfolio.itemOverrides[itemId];
                  } else {
                    n.portfolio.itemOverrides[itemId] = override;
                  }
                  return n;
                })
              }
              onSaveItemThumbnail={handleSavePortfolioThumb}
              onMediaUploaded={onRefresh}
              onToast={onToast}
            />
          )}

          {/* 7. PENGATURAN ARTIKEL DAN KONTEN */}
          {activeTab === 'articles' && (
            <div className="space-y-3.5">
              <ControlGroup
                title="Visibilitas & Identitas Halaman Artikel (/artikel)"
                subtitle="Aktifkan tautan Artikel di navigasi utama dan atur judul halaman."
              >
                <ToggleControl
                  label="Tampilkan Menu 'Artikel' di Header Navigasi"
                  description="Memunculkan tautan /artikel di navbar dan footer secara langsung."
                  checked={draft.articles.showInNavigation}
                  onChange={(showInNavigation) =>
                    updateDraft((n) => {
                      n.articles.showInNavigation = showInNavigation;
                      return n;
                    })
                  }
                />
                <ToggleControl
                  label="Tampilkan Blok Artikel di Halaman Beranda"
                  description="Mengaktifkan section Artikel pada urutan section Beranda."
                  checked={draft.home.sections.articles.visible}
                  onChange={(visible) =>
                    updateDraft((n) => {
                      n.home.sections.articles.visible = visible;
                      return n;
                    })
                  }
                />
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#171717]">
                    Judul Halaman Artikel
                  </label>
                  <input
                    type="text"
                    value={draft.articles.pageTitle}
                    onChange={(e) =>
                      updateDraft((n) => {
                        n.articles.pageTitle = e.target.value;
                        return n;
                      })
                    }
                    className="nb-input py-1.5 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#171717]">
                    Subjudul Halaman Artikel
                  </label>
                  <textarea
                    rows={2}
                    value={draft.articles.pageSubtitle}
                    onChange={(e) =>
                      updateDraft((n) => {
                        n.articles.pageSubtitle = e.target.value;
                        return n;
                      })
                    }
                    className="nb-input py-1.5 text-xs"
                  />
                </div>
              </ControlGroup>

              <ControlGroup
                title="Tata Letak & Warna Bagian Artikel"
                defaultOpen={false}
              >
                <SectionDesignEditor
                  section={draft.articles.section}
                  showVisibilityToggle={false}
                  onChange={(patch) =>
                    updateDraft((n) => {
                      n.articles.section = { ...n.articles.section, ...patch };
                      if (patch.colsDesktop !== undefined) n.responsive.desktop.articlesCols = Math.min(4, patch.colsDesktop);
                      if (patch.colsTablet !== undefined) n.responsive.tablet.articlesCols = Math.min(4, patch.colsTablet);
                      if (patch.colsMobile !== undefined) n.responsive.mobile.articlesCols = Math.min(4, patch.colsMobile);
                      return n;
                    })
                  }
                />
              </ControlGroup>

              <ControlGroup title="Desain Card Artikel" defaultOpen={false}>
                <CardDesignEditor
                  card={draft.articles.card}
                  showPriceControls={false}
                  showMetaToggle
                  onChange={(patch) =>
                    updateDraft((n) => {
                      n.articles.card = { ...n.articles.card, ...patch };
                      return n;
                    })
                  }
                />
              </ControlGroup>

              <ControlGroup
                title={`Kelola Daftar Artikel (${draft.articles.items.length}/12)`}
                subtitle="Tambah, sunting, atau ganti gambar sampul artikel studio."
                defaultOpen
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#525252]">
                    Pilih artikel untuk menyunting konten dan gambarnya:
                  </span>
                  <button
                    type="button"
                    disabled={draft.articles.items.length >= 12}
                    onClick={handleAddArticle}
                    className="nb-btn nb-btn-primary nb-btn-xs disabled:opacity-45"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah Artikel
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {draft.articles.items.map((art) => {
                    const selected = activeArticleItem?.id === art.id;
                    return (
                      <div
                        key={art.id}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[4px] border-2 ${
                          selected
                            ? 'border-[#0F3D3A] bg-[#F8F8E1]'
                            : 'border-[#171717]/20 bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedArticleId(art.id)}
                          className="flex-1 text-left min-w-0 cursor-pointer"
                        >
                          <p className="text-xs font-display font-bold text-[#171717] truncate">
                            {art.title}
                          </p>
                          <p className="text-[10px] text-[#525252]">
                            {art.category} · {art.publishedDate} ·{' '}
                            {art.isPublished ? 'Terbit' : 'Draft'}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(art.id)}
                          title="Hapus artikel"
                          className="p-1 text-[#6C151E] hover:bg-[#6C151E]/10 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {activeArticleItem && (
                  <div className="pt-3 border-t border-[#171717]/15 space-y-3">
                    <ToggleControl
                      label="Publikasikan Artikel Ini"
                      checked={activeArticleItem.isPublished}
                      onChange={(isPublished) =>
                        handleUpdateArticle(activeArticleItem.id, { isPublished })
                      }
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold">Judul Artikel</label>
                        <input
                          type="text"
                          value={activeArticleItem.title}
                          onChange={(e) =>
                            handleUpdateArticle(activeArticleItem.id, { title: e.target.value })
                          }
                          className="nb-input py-1.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold">Kategori</label>
                        <input
                          type="text"
                          value={activeArticleItem.category}
                          onChange={(e) =>
                            handleUpdateArticle(activeArticleItem.id, { category: e.target.value })
                          }
                          className="nb-input py-1.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold">Tanggal Terbit</label>
                        <input
                          type="date"
                          value={activeArticleItem.publishedDate}
                          onChange={(e) =>
                            handleUpdateArticle(activeArticleItem.id, {
                              publishedDate: e.target.value,
                            })
                          }
                          className="nb-input py-1.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold">Estimasi Baca</label>
                        <input
                          type="text"
                          value={activeArticleItem.readTime}
                          onChange={(e) =>
                            handleUpdateArticle(activeArticleItem.id, { readTime: e.target.value })
                          }
                          className="nb-input py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold">Ringkasan</label>
                      <textarea
                        rows={2}
                        value={activeArticleItem.summary}
                        onChange={(e) =>
                          handleUpdateArticle(activeArticleItem.id, { summary: e.target.value })
                        }
                        className="nb-input py-1.5 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold">Konten Artikel</label>
                      <textarea
                        rows={4}
                        value={activeArticleItem.content}
                        onChange={(e) =>
                          handleUpdateArticle(activeArticleItem.id, { content: e.target.value })
                        }
                        className="nb-input py-1.5 text-xs"
                      />
                    </div>
                    <AdminImagePicker
                      label={`Gambar Sampul: ${activeArticleItem.title}`}
                      usage="portfolio"
                      entityKey={`article-${activeArticleItem.id}`}
                      imageUrl={activeArticleItem.imageUrl}
                      driveFileId={activeArticleItem.driveFileId || ''}
                      media={media}
                      driveFolders={driveFolders}
                      actor={actor}
                      onChange={({ imageUrl, driveFileId }) =>
                        handleUpdateArticle(activeArticleItem.id, { imageUrl, driveFileId })
                      }
                      onMediaUploaded={onRefresh}
                      onToast={onToast}
                    />
                  </div>
                )}
              </ControlGroup>
            </div>
          )}

          {/* 8. PENGATURAN HALAMAN LAINNYA */}
          {activeTab === 'otherPages' && (
            <div className="space-y-3.5">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'about', label: 'Tentang Kami', preview: 'about' },
                    { id: 'procedure', label: 'Prosedur', preview: 'procedure' },
                    { id: 'faq', label: 'FAQ', preview: 'faq' },
                    { id: 'contact', label: 'Kontak', preview: 'contact' },
                    { id: 'detailPages', label: 'Halaman Detail', preview: 'products' },
                  ] as const
                ).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setActiveOtherSubTab(sub.id);
                      setPreviewPage(sub.preview);
                    }}
                    className={`px-2.5 py-1.5 rounded-[4px] border-2 text-xs font-display font-semibold cursor-pointer ${
                      activeOtherSubTab === sub.id
                        ? 'bg-[#0F3D3A] text-[#F3C95B] border-[#171717]'
                        : 'bg-white text-[#171717] border-[#171717]/30'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {activeOtherSubTab === 'about' && (
                <ControlGroup title="Halaman Tentang Kami (/tentang)">
                  <ToggleControl
                    label="Tampilkan Foto Sampul / Banner Studio"
                    checked={draft.otherPages.about.showCoverBanner}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.about.showCoverBanner = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Blok Profil Pemilik"
                    description="Menampilkan foto, nama, peran, dan bio pemilik dari tab Identitas Website."
                    checked={draft.otherPages.about.showOwnerProfile}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.about.showOwnerProfile = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Grid Prinsip Kerja (Values)"
                    checked={draft.otherPages.about.showValues}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.about.showValues = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Strip Layanan Utama"
                    checked={draft.otherPages.about.showServicesStrip}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.about.showServicesStrip = v;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Kolom Grid Prinsip Kerja (Desktop)"
                    value={draft.otherPages.about.valuesColsDesktop}
                    min={1}
                    max={4}
                    unit=" kol"
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.about.valuesColsDesktop = v ?? 3;
                        return n;
                      })
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RangeSliderControl
                      label="Padding Vertikal"
                      value={draft.otherPages.about.paddingYPx}
                      min={12}
                      max={80}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.about.paddingYPx = v ?? 36;
                          return n;
                        })
                      }
                    />
                    <RangeSliderControl
                      label="Lebar Kontainer"
                      value={draft.otherPages.about.maxWidthPx}
                      min={0}
                      max={1536}
                      step={32}
                      displayZeroAs="Ikuti Global"
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.about.maxWidthPx = v ?? 0;
                          return n;
                        })
                      }
                    />
                  </div>
                  <SegmentedControl<DesignAlign>
                    label="Perataan Teks"
                    value={draft.otherPages.about.textAlign}
                    onChange={(textAlign) =>
                      updateDraft((n) => {
                        n.otherPages.about.textAlign = textAlign;
                        return n;
                      })
                    }
                    options={[
                      { value: 'left', label: 'Kiri' },
                      { value: 'center', label: 'Tengah' },
                      { value: 'right', label: 'Kanan' },
                    ]}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ColorPickerControl
                      label="Background Halaman"
                      value={draft.otherPages.about.backgroundColor}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.about.backgroundColor = v;
                          return n;
                        })
                      }
                    />
                    <ColorPickerControl
                      label="Background Kartu"
                      value={draft.otherPages.about.cardBackgroundColor}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.about.cardBackgroundColor = v;
                          return n;
                        })
                      }
                    />
                  </div>
                </ControlGroup>
              )}

              {activeOtherSubTab === 'procedure' && (
                <ControlGroup title="Halaman Prosedur Pemesanan (/prosedur)">
                  <SegmentedControl<'grid' | 'list'>
                    label="Mode Tata Letak Langkah"
                    value={draft.otherPages.procedure.layout}
                    onChange={(layout) =>
                      updateDraft((n) => {
                        n.otherPages.procedure.layout = layout;
                        return n;
                      })
                    }
                    options={[
                      { value: 'grid', label: 'Grid Kartu' },
                      { value: 'list', label: 'List Vertikal' },
                    ]}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <RangeSliderControl
                      label="Kolom Desktop"
                      value={draft.otherPages.procedure.colsDesktop}
                      min={1}
                      max={4}
                      unit=" kol"
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.procedure.colsDesktop = v ?? 3;
                          return n;
                        })
                      }
                    />
                    <RangeSliderControl
                      label="Kolom Tablet"
                      value={draft.otherPages.procedure.colsTablet}
                      min={1}
                      max={3}
                      unit=" kol"
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.procedure.colsTablet = v ?? 2;
                          return n;
                        })
                      }
                    />
                    <RangeSliderControl
                      label="Kolom Mobile"
                      value={draft.otherPages.procedure.colsMobile}
                      min={1}
                      max={2}
                      unit=" kol"
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.procedure.colsMobile = v ?? 1;
                          return n;
                        })
                      }
                    />
                  </div>
                  <ToggleControl
                    label="Tampilkan Kartu Jaminan Privasi & Konfirmasi"
                    checked={draft.otherPages.procedure.showGuarantees}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.procedure.showGuarantees = v;
                        return n;
                      })
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RangeSliderControl
                      label="Padding Vertikal"
                      value={draft.otherPages.procedure.paddingYPx}
                      min={12}
                      max={80}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.procedure.paddingYPx = v ?? 36;
                          return n;
                        })
                      }
                    />
                    <ColorPickerControl
                      label="Background Halaman"
                      value={draft.otherPages.procedure.backgroundColor}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.procedure.backgroundColor = v;
                          return n;
                        })
                      }
                    />
                  </div>
                </ControlGroup>
              )}

              {activeOtherSubTab === 'faq' && (
                <ControlGroup title="Halaman FAQ (/faq)">
                  <ToggleControl
                    label="Tampilkan Kotak Pencarian FAQ"
                    checked={draft.otherPages.faq.showSearch}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.faq.showSearch = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Tab Kategori FAQ"
                    checked={draft.otherPages.faq.showCategoryTabs}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.faq.showCategoryTabs = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Kartu CTA Hubungi Kami"
                    checked={draft.otherPages.faq.showBottomCta}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.faq.showBottomCta = v;
                        return n;
                      })
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RangeSliderControl
                      label="Lebar Kontainer FAQ"
                      value={draft.otherPages.faq.maxWidthPx}
                      min={640}
                      max={1360}
                      step={32}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.faq.maxWidthPx = v ?? 896;
                          return n;
                        })
                      }
                    />
                    <RangeSliderControl
                      label="Padding Vertikal"
                      value={draft.otherPages.faq.paddingYPx}
                      min={12}
                      max={80}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.faq.paddingYPx = v ?? 36;
                          return n;
                        })
                      }
                    />
                    <ColorPickerControl
                      label="Background Halaman"
                      value={draft.otherPages.faq.backgroundColor}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.faq.backgroundColor = v;
                          return n;
                        })
                      }
                    />
                    <ColorPickerControl
                      label="Background Kartu"
                      value={draft.otherPages.faq.cardBackgroundColor}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.faq.cardBackgroundColor = v;
                          return n;
                        })
                      }
                    />
                  </div>
                </ControlGroup>
              )}

              {activeOtherSubTab === 'contact' && (
                <ControlGroup title="Halaman Kontak (/kontak)">
                  <SegmentedControl<'info_left' | 'form_left' | 'stacked'>
                    label="Tata Letak Info & Formulir"
                    value={draft.otherPages.contact.layout}
                    onChange={(layout) =>
                      updateDraft((n) => {
                        n.otherPages.contact.layout = layout;
                        return n;
                      })
                    }
                    options={[
                      { value: 'info_left', label: 'Info Kiri · Form Kanan' },
                      { value: 'form_left', label: 'Form Kiri · Info Kanan' },
                      { value: 'stacked', label: 'Bertumpuk (1 Kolom)' },
                    ]}
                  />
                  <ToggleControl
                    label="Tampilkan Tautan Media Sosial"
                    checked={draft.otherPages.contact.showSocials}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.contact.showSocials = v;
                        return n;
                      })
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RangeSliderControl
                      label="Padding Vertikal"
                      value={draft.otherPages.contact.paddingYPx}
                      min={12}
                      max={80}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.contact.paddingYPx = v ?? 36;
                          return n;
                        })
                      }
                    />
                    <ColorPickerControl
                      label="Background Halaman"
                      value={draft.otherPages.contact.backgroundColor}
                      onChange={(v) =>
                        updateDraft((n) => {
                          n.otherPages.contact.backgroundColor = v;
                          return n;
                        })
                      }
                    />
                  </div>
                </ControlGroup>
              )}

              {activeOtherSubTab === 'detailPages' && (
                <ControlGroup
                  title="Halaman Detail Produk & Layanan"
                  subtitle="Berlaku untuk /produk/:slug dan /layanan/:slug."
                >
                  <SegmentedControl<'left' | 'right' | 'top'>
                    label="Posisi Gambar Utama"
                    value={draft.otherPages.detailPages.imagePosition}
                    onChange={(imagePosition) =>
                      updateDraft((n) => {
                        n.otherPages.detailPages.imagePosition = imagePosition;
                        return n;
                      })
                    }
                    options={[
                      { value: 'left', label: 'Kiri' },
                      { value: 'right', label: 'Kanan' },
                      { value: 'top', label: 'Atas Penuh' },
                    ]}
                  />
                  <SegmentedControl<CardAspectRatio>
                    label="Rasio Gambar Detail"
                    value={draft.otherPages.detailPages.imageAspectRatio}
                    onChange={(imageAspectRatio) =>
                      updateDraft((n) => {
                        n.otherPages.detailPages.imageAspectRatio = imageAspectRatio;
                        return n;
                      })
                    }
                    options={[
                      { value: '1/1', label: '1:1' },
                      { value: '4/3', label: '4:3' },
                      { value: '16/10', label: '16:10' },
                      { value: '16/9', label: '16:9' },
                    ]}
                  />
                  <ToggleControl
                    label="Tampilkan Galeri Dokumentasi"
                    checked={draft.otherPages.detailPages.showGallery}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.detailPages.showGallery = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Produk / Layanan Terkait"
                    checked={draft.otherPages.detailPages.showRelated}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.detailPages.showRelated = v;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Kolom Item Terkait (Desktop)"
                    value={draft.otherPages.detailPages.relatedColsDesktop}
                    min={2}
                    max={6}
                    unit=" kol"
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.otherPages.detailPages.relatedColsDesktop = v ?? 5;
                        return n;
                      })
                    }
                  />
                </ControlGroup>
              )}
            </div>
          )}

          {/* 9. PENGATURAN HEADER DAN NAVIGASI */}
          {activeTab === 'header' && (
            <div className="space-y-3.5">
              <ControlGroup title="Tata Letak & Perilaku Header">
                <ToggleControl
                  label="Tampilkan Header / Navbar"
                  checked={draft.header.visible}
                  onChange={(visible) =>
                    updateDraft((n) => {
                      n.header.visible = visible;
                      return n;
                    })
                  }
                />
                <ToggleControl
                  label="Sticky Header (Menempel Saat Scroll)"
                  checked={draft.header.sticky}
                  onChange={(sticky) =>
                    updateDraft((n) => {
                      n.header.sticky = sticky;
                      return n;
                    })
                  }
                />
                <SegmentedControl<HeaderDesignConfig['layout']>
                  label="Model Tata Letak Header"
                  value={draft.header.layout}
                  onChange={(layout) =>
                    updateDraft((n) => {
                      n.header.layout = layout;
                      return n;
                    })
                  }
                  options={[
                    { value: 'standard', label: 'Standar' },
                    { value: 'centered_nav', label: 'Navigasi Tengah' },
                    { value: 'split_logo_center', label: 'Logo di Tengah' },
                  ]}
                />
                <SegmentedControl<DesignAlign>
                  label="Perataan Menu Navigasi"
                  value={draft.header.navAlign}
                  onChange={(navAlign) =>
                    updateDraft((n) => {
                      n.header.navAlign = navAlign;
                      return n;
                    })
                  }
                  options={[
                    { value: 'left', label: 'Kiri' },
                    { value: 'center', label: 'Tengah' },
                    { value: 'right', label: 'Kanan' },
                  ]}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RangeSliderControl
                    label="Tinggi Header"
                    value={draft.header.heightPx}
                    min={48}
                    max={88}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.heightPx = v ?? 56;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Jarak Antar Menu"
                    value={draft.header.navGapPx}
                    min={10}
                    max={40}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.navGapPx = v ?? 24;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Ukuran Font Menu"
                    value={draft.header.navFontSizePx}
                    min={11}
                    max={16}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.navFontSizePx = v ?? 13;
                        return n;
                      })
                    }
                  />
                  <RangeSliderControl
                    label="Padding Kiri-Kanan Header"
                    value={draft.header.paddingXPx}
                    min={0}
                    max={48}
                    displayZeroAs="Bawaan"
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.paddingXPx = v ?? 0;
                        return n;
                      })
                    }
                  />
                </div>
              </ControlGroup>

              <ControlGroup title="Tombol CTA & Warna Header">
                <ToggleControl
                  label="Tampilkan Tombol CTA Utama di Header"
                  checked={draft.header.showCta}
                  onChange={(showCta) =>
                    updateDraft((n) => {
                      n.header.showCta = showCta;
                      return n;
                    })
                  }
                />
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold">Teks Tombol CTA</label>
                  <input
                    type="text"
                    value={draft.header.ctaLabel}
                    onChange={(e) =>
                      updateDraft((n) => {
                        n.header.ctaLabel = e.target.value;
                        return n;
                      })
                    }
                    className="nb-input py-1.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ColorPickerControl
                    label="Background Header"
                    value={draft.header.backgroundColor}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.backgroundColor = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Teks Menu"
                    value={draft.header.textColor}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.textColor = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Garis Bawah"
                    value={draft.header.borderColor}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.borderColor = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Background Tombol CTA"
                    value={draft.header.ctaBg}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.ctaBg = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Teks Tombol CTA"
                    value={draft.header.ctaText}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.header.ctaText = v;
                        return n;
                      })
                    }
                  />
                </div>
              </ControlGroup>
            </div>
          )}

          {/* 10. PENGATURAN FOOTER */}
          {activeTab === 'footer' && (
            <div className="space-y-3.5">
              <ControlGroup title="Tata Letak & Elemen Footer">
                <ToggleControl
                  label="Tampilkan Footer Website"
                  checked={draft.footer.visible}
                  onChange={(visible) =>
                    updateDraft((n) => {
                      n.footer.visible = visible;
                      return n;
                    })
                  }
                />
                <SegmentedControl<FooterDesignConfig['layout']>
                  label="Jumlah Kolom / Struktur Footer"
                  value={draft.footer.layout}
                  onChange={(layout) =>
                    updateDraft((n) => {
                      n.footer.layout = layout;
                      return n;
                    })
                  }
                  options={[
                    { value: '4_col', label: '4 Kolom' },
                    { value: '3_col', label: '3 Kolom' },
                    { value: '2_col', label: '2 Kolom' },
                    { value: 'centered', label: 'Tengah Minimalis' },
                  ]}
                />
                <SegmentedControl<DesignAlign>
                  label="Perataan Teks Footer"
                  value={draft.footer.textAlign}
                  onChange={(textAlign) =>
                    updateDraft((n) => {
                      n.footer.textAlign = textAlign;
                      return n;
                    })
                  }
                  options={[
                    { value: 'left', label: 'Kiri' },
                    { value: 'center', label: 'Tengah' },
                    { value: 'right', label: 'Kanan' },
                  ]}
                />
                <RangeSliderControl
                  label="Padding Vertikal Footer"
                  value={draft.footer.paddingYPx}
                  min={20}
                  max={84}
                  onChange={(v) =>
                    updateDraft((n) => {
                      n.footer.paddingYPx = v ?? 36;
                      return n;
                    })
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#171717]/15">
                  <ToggleControl
                    label="Tampilkan Deskripsi Studio"
                    checked={draft.footer.showAbout}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.footer.showAbout = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Menu & Tautan Cepat"
                    checked={draft.footer.showQuickLinks}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.footer.showQuickLinks = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Media Sosial"
                    checked={draft.footer.showSocials}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.footer.showSocials = v;
                        return n;
                      })
                    }
                  />
                  <ToggleControl
                    label="Tampilkan Tombol WhatsApp"
                    checked={draft.footer.showWhatsappButton}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.footer.showWhatsappButton = v;
                        return n;
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold">
                    Teks Hak Cipta / Copyright Kustom (Opsional)
                  </label>
                  <input
                    type="text"
                    value={draft.footer.copyrightText}
                    onChange={(e) =>
                      updateDraft((n) => {
                        n.footer.copyrightText = e.target.value;
                        return n;
                      })
                    }
                    placeholder="Kosongkan untuk teks hak cipta otomatis"
                    className="nb-input py-1.5 text-xs"
                  />
                </div>
              </ControlGroup>

              <ControlGroup title="Warna Footer">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorPickerControl
                    label="Background Footer"
                    value={draft.footer.backgroundColor}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.footer.backgroundColor = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Teks Footer"
                    value={draft.footer.textColor}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.footer.textColor = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Aksen / Judul Kolom"
                    value={draft.footer.accentColor}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.footer.accentColor = v;
                        return n;
                      })
                    }
                  />
                  <ColorPickerControl
                    label="Warna Garis Atas Footer"
                    value={draft.footer.borderColor}
                    onChange={(v) =>
                      updateDraft((n) => {
                        n.footer.borderColor = v;
                        return n;
                      })
                    }
                  />
                </div>
              </ControlGroup>
            </div>
          )}

          {/* 11. PENGATURAN RESPONSIF */}
          {activeTab === 'responsive' && (
            <div className="space-y-3.5">
              <ControlGroup
                title="Kustomisasi Per Perangkat (Desktop · Tablet · Mobile)"
                subtitle="Pilih perangkat di bawah; Live Preview akan otomatis menyesuaikan lebar layar untuk mempermudah pengecekan."
              >
                <SegmentedControl<DesignViewport>
                  label="Target Perangkat"
                  value={activeResponsiveDevice}
                  onChange={(dev) => {
                    setActiveResponsiveDevice(dev);
                    setPreviewViewport(dev);
                  }}
                  options={[
                    { value: 'desktop', label: 'Desktop (>= 1024px)' },
                    { value: 'tablet', label: 'Tablet (640–1023px)' },
                    { value: 'mobile', label: 'Mobile (< 640px)' },
                  ]}
                />

                {(() => {
                  const devCfg = draft.responsive[activeResponsiveDevice];
                  return (
                    <div className="space-y-3 pt-2 border-t border-[#171717]/15">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <RangeSliderControl
                          label="Skala Ukuran Teks"
                          value={devCfg.textScale}
                          min={0.85}
                          max={1.2}
                          step={0.02}
                          unit="x"
                          onChange={(v) =>
                            updateResponsiveDevice(activeResponsiveDevice, { textScale: v ?? 1 })
                          }
                        />
                        <RangeSliderControl
                          label="Skala Padding Section"
                          value={devCfg.sectionPaddingScale}
                          min={0.65}
                          max={1.35}
                          step={0.05}
                          unit="x"
                          onChange={(v) =>
                            updateResponsiveDevice(activeResponsiveDevice, {
                              sectionPaddingScale: v ?? 1,
                            })
                          }
                        />
                        <RangeSliderControl
                          label="Jarak Elemen (Gap)"
                          value={devCfg.gapPx}
                          min={6}
                          max={32}
                          onChange={(v) =>
                            updateResponsiveDevice(activeResponsiveDevice, { gapPx: v ?? 12 })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <SegmentedControl<CardSizePreset>
                          label="Ukuran Card Default"
                          value={devCfg.cardSize}
                          onChange={(cardSize) =>
                            updateResponsiveDevice(activeResponsiveDevice, { cardSize })
                          }
                          options={[
                            { value: 'compact', label: 'Kompak' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'large', label: 'Besar' },
                          ]}
                        />
                        <SegmentedControl<'inherit' | CardImagePosition>
                          label="Override Posisi Gambar Card"
                          value={devCfg.imagePositionOverride}
                          onChange={(imagePositionOverride) =>
                            updateResponsiveDevice(activeResponsiveDevice, {
                              imagePositionOverride,
                            })
                          }
                          options={[
                            { value: 'inherit', label: 'Ikuti Card' },
                            { value: 'top', label: 'Atas' },
                            { value: 'left', label: 'Kiri' },
                            { value: 'right', label: 'Kanan' },
                          ]}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#171717]/15">
                        <RangeSliderControl
                          label="Kolom Produk Digital"
                          value={devCfg.productsCols}
                          min={1}
                          max={activeResponsiveDevice === 'mobile' ? 3 : activeResponsiveDevice === 'tablet' ? 4 : 6}
                          unit=" kol"
                          onChange={(v) =>
                            updateResponsiveDevice(activeResponsiveDevice, {
                              productsCols: v ?? 2,
                            })
                          }
                        />
                        <RangeSliderControl
                          label="Kolom Layanan"
                          value={devCfg.servicesCols}
                          min={1}
                          max={activeResponsiveDevice === 'mobile' ? 3 : activeResponsiveDevice === 'tablet' ? 4 : 6}
                          unit=" kol"
                          onChange={(v) =>
                            updateResponsiveDevice(activeResponsiveDevice, {
                              servicesCols: v ?? 2,
                            })
                          }
                        />
                        <RangeSliderControl
                          label="Kolom Portofolio"
                          value={devCfg.portfolioCols}
                          min={1}
                          max={activeResponsiveDevice === 'mobile' ? 3 : activeResponsiveDevice === 'tablet' ? 4 : 6}
                          unit=" kol"
                          onChange={(v) =>
                            updateResponsiveDevice(activeResponsiveDevice, {
                              portfolioCols: v ?? 2,
                            })
                          }
                        />
                        <RangeSliderControl
                          label="Kolom Artikel"
                          value={devCfg.articlesCols}
                          min={1}
                          max={activeResponsiveDevice === 'mobile' ? 2 : 4}
                          unit=" kol"
                          onChange={(v) =>
                            updateResponsiveDevice(activeResponsiveDevice, {
                              articlesCols: v ?? 1,
                            })
                          }
                        />
                      </div>
                    </div>
                  );
                })()}
              </ControlGroup>
            </div>
          )}
        </section>
      </div>

      {/* BAGIAN BAWAH: Full-Width Proportional Live Preview Below All Settings */}
      {showLivePreview && (
        <section
          id="scs-live-preview-section"
          aria-label="Live Preview Website"
          className="w-full min-w-0 pt-1"
        >
          <DesignLivePreview
            config={draft}
            viewport={previewViewport}
            onViewportChange={setPreviewViewport}
            page={previewPage}
            onPageChange={setPreviewPage}
          />
        </section>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmRestorePrevOpen}
        title="Kembalikan ke Pengaturan Sebelumnya?"
        description="Editor akan memuat konfigurasi terpublikasi sebelum publikasi terakhir. Data katalog, pesanan, dan media Anda tidak akan berubah."
        confirmLabel="Ya, Muat Pengaturan Sebelumnya"
        destructive={false}
        onConfirm={handleConfirmRestorePrevious}
        onCancel={() => setConfirmRestorePrevOpen(false)}
      />

      <ConfirmDialog
        open={confirmResetSectionOpen}
        title={`Reset Pengaturan ${activeCategoryMeta?.shortLabel || 'Bagian Ini'}?`}
        description="Hanya pengaturan pada kategori yang sedang dibuka ini yang akan dikembalikan ke nilai bawaan. Pengaturan bagian lainnya tidak akan berubah."
        confirmLabel="Ya, Reset Bagian Ini"
        destructive={false}
        onConfirm={handleConfirmResetSection}
        onCancel={() => setConfirmResetSectionOpen(false)}
      />

      <ConfirmDialog
        open={confirmResetAllOpen}
        title="Reset Seluruh Pengaturan Desain Website?"
        description="Tindakan ini akan mengembalikan seluruh 11 kategori desain (warna, tipografi, tata letak, card, header, footer, dan responsif) ke pengaturan default awal. Data produk, layanan, portofolio, pesanan, dan file Google Drive tetap aman."
        confirmLabel="Ya, Reset Seluruh Desain"
        destructive
        onConfirm={handleConfirmResetAll}
        onCancel={() => setConfirmResetAllOpen(false)}
      />
    </div>
  );
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { subscribePublishedSiteDesign } from '../services/firestoreService';
import {
  buildPublicDesignCss,
  createDefaultSiteDesignConfig,
  mergeSiteDesignConfig,
  readCachedSiteDesign,
  writeCachedSiteDesign,
} from '../utils/designSystem';
import { buildMediaImageCandidates } from '../utils/studioLogic';
import type { DesignViewport, SiteDesignConfig } from '../types/design';
import type { VisualThemeMode } from '../types/studio';

interface DesignContextValue {
  /** Active published configuration (from Firestore or zero-flash cache / defaults). */
  publishedConfig: SiteDesignConfig;
  /** Temporary in-memory full-site draft preview config (Admin only; never visible to public). */
  fullSiteDraftPreview: SiteDesignConfig | null;
  /** Effective config currently rendered by public components. */
  design: SiteDesignConfig;
  /** Active viewport bucket (real browser window width OR simulated Live Preview viewport). */
  viewport: DesignViewport;
  /** True when rendered inside the Admin Live Preview panel. */
  isEmbeddedPreview: boolean;
  /** Optional theme override when rendered inside embedded Live Preview. */
  previewThemeOverride: VisualThemeMode | null;
  loadingDesign: boolean;
  startFullSiteDraftPreview: (draft: SiteDesignConfig) => void;
  stopFullSiteDraftPreview: () => void;
  syncPublishedDesignCache: (published: SiteDesignConfig) => void;
}

const DesignContext = createContext<DesignContextValue | null>(null);

function detectWindowViewport(): DesignViewport {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [publishedConfig, setPublishedConfig] = useState<SiteDesignConfig>(() => {
    return readCachedSiteDesign() || createDefaultSiteDesignConfig('published');
  });
  const [fullSiteDraftPreview, setFullSiteDraftPreview] = useState<SiteDesignConfig | null>(null);
  const [loadingDesign, setLoadingDesign] = useState(true);
  const [viewport, setViewport] = useState<DesignViewport>(() => detectWindowViewport());

  useEffect(() => {
    const onResize = () => setViewport(detectWindowViewport());
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const unsub = subscribePublishedSiteDesign(
      (live) => {
        if (live) {
          setPublishedConfig(live);
          writeCachedSiteDesign(live);
        }
        setLoadingDesign(false);
      },
      () => {
        setLoadingDesign(false);
      }
    );
    return () => unsub();
  }, []);

  const design = fullSiteDraftPreview ?? publishedConfig;

  // Dynamically apply custom Favicon when configured
  useEffect(() => {
    const favUrl = design.identity.faviconUrl;
    const favDriveId = design.identity.faviconDriveFileId;
    if (!favUrl && !favDriveId) return;

    const candidates = buildMediaImageCandidates({
      src: favUrl,
      driveFileId: favDriveId || undefined,
      visibility: 'public',
    });
    const resolved = candidates[0]?.url;
    if (!resolved) return;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-scs-dynamic="true"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.setAttribute('data-scs-dynamic', 'true');
      document.head.appendChild(link);
    }
    link.href = resolved;
  }, [design.identity.faviconUrl, design.identity.faviconDriveFileId]);

  const startFullSiteDraftPreview = useCallback((draft: SiteDesignConfig) => {
    setFullSiteDraftPreview(mergeSiteDesignConfig(draft, 'draft'));
  }, []);

  const stopFullSiteDraftPreview = useCallback(() => {
    setFullSiteDraftPreview(null);
  }, []);

  const syncPublishedDesignCache = useCallback((published: SiteDesignConfig) => {
    const clean = mergeSiteDesignConfig(published, 'published');
    setPublishedConfig(clean);
    writeCachedSiteDesign(clean);
  }, []);

  const value = useMemo<DesignContextValue>(
    () => ({
      publishedConfig,
      fullSiteDraftPreview,
      design,
      viewport,
      isEmbeddedPreview: false,
      previewThemeOverride: null,
      loadingDesign,
      startFullSiteDraftPreview,
      stopFullSiteDraftPreview,
      syncPublishedDesignCache,
    }),
    [
      publishedConfig,
      fullSiteDraftPreview,
      design,
      viewport,
      loadingDesign,
      startFullSiteDraftPreview,
      stopFullSiteDraftPreview,
      syncPublishedDesignCache,
    ]
  );

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

/**
 * Scoped override provider used inside the Admin Live Preview panel so real public
 * components render the live unsaved draft config at Desktop/Tablet/Mobile viewport
 * without affecting the rest of the Admin UI or public visitors.
 */
export function DesignPreviewOverrideProvider({
  config,
  viewport,
  children,
}: {
  config: SiteDesignConfig;
  viewport: DesignViewport;
  children: React.ReactNode;
}) {
  const parent = useContext(DesignContext);
  const value = useMemo<DesignContextValue>(
    () => ({
      publishedConfig: parent?.publishedConfig ?? config,
      fullSiteDraftPreview: config,
      design: config,
      viewport,
      isEmbeddedPreview: true,
      previewThemeOverride: config.global.visualTheme,
      loadingDesign: false,
      startFullSiteDraftPreview: parent?.startFullSiteDraftPreview ?? (() => {}),
      stopFullSiteDraftPreview: parent?.stopFullSiteDraftPreview ?? (() => {}),
      syncPublishedDesignCache: parent?.syncPublishedDesignCache ?? (() => {}),
    }),
    [parent, config, viewport]
  );

  const previewCss = useMemo(
    () => buildPublicDesignCss(config, '.scs-preview-canvas', viewport),
    [config, viewport]
  );

  return (
    <DesignContext.Provider value={value}>
      <style>{previewCss}</style>
      <div
        className="scs-preview-canvas"
        data-preview-theme={config.global.visualTheme}
      >
        {children}
      </div>
    </DesignContext.Provider>
  );
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error('useDesign must be used inside DesignProvider');
  }
  return ctx;
}

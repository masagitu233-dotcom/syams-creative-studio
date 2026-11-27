import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { useStudioData } from './StudioDataContext';
import {
  normalizeVisualTheme,
  readCachedVisualTheme,
  resolveInitialThemeState,
  writeCachedVisualTheme,
} from '../utils/studioLogic';
import type { VisualThemeMode } from '../types/studio';

interface ThemeContextValue {
  /** Global theme persisted in Firestore site_settings/general (defaults to neo_brutalist). */
  persistedTheme: VisualThemeMode;
  /** Temporary admin preview override (in-memory only; never persisted to Firestore or cache). */
  previewTheme: VisualThemeMode | null;
  /** Currently rendered theme applied to documentElement[data-theme]. */
  activeTheme: VisualThemeMode;
  /** True while admin live preview mode is active. */
  isPreviewActive: boolean;
  /** True once a cached theme or authoritative Firestore theme is ready to paint. */
  themeReady: boolean;
  startPreview: (theme: VisualThemeMode) => void;
  stopPreview: () => void;
  /** Immediately syncs the browser theme cache after Admin saves a new global theme. */
  syncCachedTheme: (theme: VisualThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function ThemeLoadingShell() {
  return (
    <div
      data-testid="theme-loading-shell"
      role="status"
      aria-live="polite"
      aria-label="Memuat tampilan OSAMA CREATIVE STUDIO"
      className="min-h-screen w-full flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#F6F6F2', color: '#171717' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm tracking-tight"
          style={{ backgroundColor: '#0F3D3A', color: '#F6F6F2' }}
        >
          OC
        </div>
        <div className="text-center space-y-1">
          <p className="font-display font-bold text-sm tracking-tight text-[#171717]">
            OSAMA CREATIVE STUDIO
          </p>
          <p className="text-xs text-[#525252]">Menyiapkan tampilan studio...</p>
        </div>
        <span
          aria-hidden="true"
          className="w-5 h-5 rounded-full border-2 border-[#0F3D3A]/20 border-t-[#0F3D3A] animate-spin mt-1"
        />
      </div>
    </div>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { siteSettings, loadingSettings } = useStudioData();
  const [cachedTheme, setCachedTheme] = useState<VisualThemeMode | null>(() =>
    readCachedVisualTheme()
  );
  const [previewTheme, setPreviewTheme] = useState<VisualThemeMode | null>(null);

  const { persistedTheme, activeTheme, themeReady } = resolveInitialThemeState({
    cachedTheme,
    firestoreTheme: siteSettings.visualTheme,
    loadingSettings,
    previewTheme,
  });

  const isPreviewActive = previewTheme !== null;

  // Keep localStorage theme cache synchronized with authoritative Firestore value
  useEffect(() => {
    if (loadingSettings) return;
    const authoritative = normalizeVisualTheme(siteSettings.visualTheme);
    writeCachedVisualTheme(authoritative);
    setCachedTheme((prev) => (prev === authoritative ? prev : authoritative));
  }, [loadingSettings, siteSettings.visualTheme]);

  // Apply data-theme synchronously before paint once ready
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (themeReady) {
      root.setAttribute('data-theme', activeTheme);
      root.removeAttribute('data-theme-pending');
    } else {
      root.setAttribute('data-theme-pending', 'true');
    }
  }, [activeTheme, themeReady]);

  const startPreview = useCallback((theme: VisualThemeMode) => {
    setPreviewTheme(normalizeVisualTheme(theme));
  }, []);

  const stopPreview = useCallback(() => {
    setPreviewTheme(null);
  }, []);

  const syncCachedTheme = useCallback((theme: VisualThemeMode) => {
    const normalized = normalizeVisualTheme(theme);
    writeCachedVisualTheme(normalized);
    setCachedTheme(normalized);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      persistedTheme,
      previewTheme,
      activeTheme,
      isPreviewActive,
      themeReady,
      startPreview,
      stopPreview,
      syncCachedTheme,
    }),
    [
      persistedTheme,
      previewTheme,
      activeTheme,
      isPreviewActive,
      themeReady,
      startPreview,
      stopPreview,
      syncCachedTheme,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {themeReady ? children : <ThemeLoadingShell />}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

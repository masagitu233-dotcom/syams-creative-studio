import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { useStudioData } from './StudioDataContext';
import { normalizeVisualTheme, resolveEffectiveVisualTheme } from '../utils/studioLogic';
import type { VisualThemeMode } from '../types/studio';

interface ThemeContextValue {
  /** Global theme persisted in Firestore site_settings/general (defaults to neo_brutalist). */
  persistedTheme: VisualThemeMode;
  /** Temporary admin preview override (in-memory only; never persisted to Firestore). */
  previewTheme: VisualThemeMode | null;
  /** Currently rendered theme applied to documentElement[data-theme]. */
  activeTheme: VisualThemeMode;
  /** True while admin live preview mode is active. */
  isPreviewActive: boolean;
  startPreview: (theme: VisualThemeMode) => void;
  stopPreview: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { siteSettings } = useStudioData();
  const [previewTheme, setPreviewTheme] = useState<VisualThemeMode | null>(null);

  const persistedTheme = normalizeVisualTheme(siteSettings.visualTheme);
  const activeTheme = resolveEffectiveVisualTheme(persistedTheme, previewTheme);
  const isPreviewActive = previewTheme !== null;

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  const startPreview = useCallback((theme: VisualThemeMode) => {
    setPreviewTheme(normalizeVisualTheme(theme));
  }, []);

  const stopPreview = useCallback(() => {
    setPreviewTheme(null);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      persistedTheme,
      previewTheme,
      activeTheme,
      isPreviewActive,
      startPreview,
      stopPreview,
    }),
    [persistedTheme, previewTheme, activeTheme, isPreviewActive, startPreview, stopPreview]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

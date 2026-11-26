import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  INITIAL_FAQS,
  INITIAL_PORTFOLIO,
  INITIAL_SERVICES,
  INITIAL_SITE_SETTINGS,
} from '../data/initialCatalog';
import {
  subscribePublicFaqs,
  subscribePublicPortfolio,
  subscribePublicServices,
  subscribeSiteSettings,
} from '../services/firestoreService';
import type {
  FaqItem,
  PortfolioItem,
  ServiceItem,
  SiteSettings,
  ToastNotice,
} from '../types/studio';

interface StudioDataContextValue {
  services: ServiceItem[];
  portfolio: PortfolioItem[];
  faqs: FaqItem[];
  siteSettings: SiteSettings;
  loadingServices: boolean;
  loadingPortfolio: boolean;
  loadingFaqs: boolean;
  isCatalogSyncedToFirestore: boolean;
  dataError: string | null;
  toasts: ToastNotice[];
  pushToast: (toast: Omit<ToastNotice, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const StudioDataContext = createContext<StudioDataContextValue | null>(null);

export function StudioDataProvider({ children }: { children: React.ReactNode }) {
  const [liveServices, setLiveServices] = useState<ServiceItem[] | null>(null);
  const [livePortfolio, setLivePortfolio] = useState<PortfolioItem[] | null>(null);
  const [liveFaqs, setLiveFaqs] = useState<FaqItem[] | null>(null);
  const [liveSettings, setLiveSettings] = useState<SiteSettings | null>(null);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  useEffect(() => {
    const unsubServices = subscribePublicServices(
      (items) => {
        setLiveServices(items);
        setLoadingServices(false);
      },
      () => {
        setLoadingServices(false);
        setDataError('Sebagian data katalog sedang menggunakan mode pratinjau katalog awal.');
      }
    );

    const unsubPortfolio = subscribePublicPortfolio(
      (items) => {
        setLivePortfolio(items);
        setLoadingPortfolio(false);
      },
      () => {
        setLoadingPortfolio(false);
      }
    );

    const unsubFaqs = subscribePublicFaqs(
      (items) => {
        setLiveFaqs(items);
        setLoadingFaqs(false);
      },
      () => {
        setLoadingFaqs(false);
      }
    );

    const unsubSettings = subscribeSiteSettings(
      (settings) => {
        setLiveSettings(settings);
      },
      () => {
        // Fallback to initial settings silently
      }
    );

    return () => {
      unsubServices();
      unsubPortfolio();
      unsubFaqs();
      unsubSettings();
    };
  }, []);

  const pushToast = useCallback((toast: Omit<ToastNotice, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4800);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const hasLiveServices = Boolean(liveServices && liveServices.length > 0);
  const services = hasLiveServices ? liveServices! : INITIAL_SERVICES;
  const portfolio = livePortfolio && livePortfolio.length > 0 ? livePortfolio : INITIAL_PORTFOLIO;
  const faqs = liveFaqs && liveFaqs.length > 0 ? liveFaqs : INITIAL_FAQS;
  const siteSettings = liveSettings ?? INITIAL_SITE_SETTINGS;

  return (
    <StudioDataContext.Provider
      value={{
        services,
        portfolio,
        faqs,
        siteSettings,
        loadingServices,
        loadingPortfolio,
        loadingFaqs,
        isCatalogSyncedToFirestore: hasLiveServices,
        dataError,
        toasts,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </StudioDataContext.Provider>
  );
}

export function useStudioData(): StudioDataContextValue {
  const ctx = useContext(StudioDataContext);
  if (!ctx) {
    throw new Error('useStudioData must be used inside StudioDataProvider');
  }
  return ctx;
}

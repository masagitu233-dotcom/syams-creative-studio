import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  INITIAL_FAQS,
  INITIAL_PORTFOLIO,
  INITIAL_SERVICES,
  INITIAL_SITE_SETTINGS,
} from '../data/initialCatalog';
import { INITIAL_DIGITAL_PRODUCTS } from '../data/digitalProducts';
import {
  subscribePublicDigitalProducts,
  subscribePublicFaqs,
  subscribePublicPortfolio,
  subscribePublicServices,
  subscribeSiteSettings,
} from '../services/firestoreService';
import type {
  DigitalProductItem,
  FaqItem,
  PortfolioItem,
  ServiceItem,
  SiteSettings,
  ToastNotice,
} from '../types/studio';

interface StudioDataContextValue {
  services: ServiceItem[];
  products: DigitalProductItem[];
  portfolio: PortfolioItem[];
  faqs: FaqItem[];
  siteSettings: SiteSettings;
  loadingServices: boolean;
  loadingProducts: boolean;
  loadingPortfolio: boolean;
  loadingFaqs: boolean;
  isCatalogSyncedToFirestore: boolean;
  isProductsSyncedToFirestore: boolean;
  dataError: string | null;
  toasts: ToastNotice[];
  pushToast: (toast: Omit<ToastNotice, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const StudioDataContext = createContext<StudioDataContextValue | null>(null);

export function StudioDataProvider({ children }: { children: React.ReactNode }) {
  const [liveServices, setLiveServices] = useState<ServiceItem[] | null>(null);
  const [liveProducts, setLiveProducts] = useState<DigitalProductItem[] | null>(null);
  const [livePortfolio, setLivePortfolio] = useState<PortfolioItem[] | null>(null);
  const [liveFaqs, setLiveFaqs] = useState<FaqItem[] | null>(null);
  const [liveSettings, setLiveSettings] = useState<SiteSettings | null>(null);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
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

    const unsubProducts = subscribePublicDigitalProducts(
      (items) => {
        setLiveProducts(items);
        setLoadingProducts(false);
      },
      () => {
        setLoadingProducts(false);
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
      unsubProducts();
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

  // Once migrated to Firestore (or once Firestore documents exist), read strictly from Firestore
  // so drafting or deleting items in Admin is reflected immediately without static fallback.
  const isServicesLive =
    Boolean(liveSettings?.servicesMigrated) || (liveServices !== null && liveServices.length > 0);
  const isProductsLive =
    Boolean(liveSettings?.productsMigrated) || (liveProducts !== null && liveProducts.length > 0);
  const isPortfolioLive =
    Boolean(liveSettings?.portfolioMigrated) || (livePortfolio !== null && livePortfolio.length > 0);
  const isFaqsLive =
    Boolean(liveSettings?.faqsMigrated) || (liveFaqs !== null && liveFaqs.length > 0);

  const services = isServicesLive ? liveServices ?? [] : INITIAL_SERVICES;
  const products = isProductsLive ? liveProducts ?? [] : INITIAL_DIGITAL_PRODUCTS;
  const portfolio = isPortfolioLive ? livePortfolio ?? [] : INITIAL_PORTFOLIO;
  const faqs = isFaqsLive ? liveFaqs ?? [] : INITIAL_FAQS;
  const siteSettings = liveSettings ?? INITIAL_SITE_SETTINGS;

  return (
    <StudioDataContext.Provider
      value={{
        services,
        products,
        portfolio,
        faqs,
        siteSettings,
        loadingServices,
        loadingProducts,
        loadingPortfolio,
        loadingFaqs,
        isCatalogSyncedToFirestore: isServicesLive,
        isProductsSyncedToFirestore: isProductsLive,
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

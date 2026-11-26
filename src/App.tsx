import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { StudioDataProvider } from './contexts/StudioDataContext';
import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { OrderProcedurePage } from './pages/OrderProcedurePage';
import { AboutPage } from './pages/AboutPage';
import { FaqPage } from './pages/FaqPage';
import { ContactPage } from './pages/ContactPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CustomerOrdersPage } from './pages/CustomerOrdersPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <StudioDataProvider>
            <BrowserRouter>
              <Routes>
                <Route
                  path="/"
                  element={
                    <PublicLayout>
                      <HomePage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/layanan"
                  element={
                    <PublicLayout>
                      <ServicesPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/layanan/:slug"
                  element={
                    <PublicLayout>
                      <ServiceDetailPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/produk"
                  element={
                    <PublicLayout>
                      <ProductsPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/produk/:slug"
                  element={
                    <PublicLayout>
                      <ProductDetailPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/portofolio"
                  element={
                    <PublicLayout>
                      <PortfolioPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/prosedur"
                  element={
                    <PublicLayout>
                      <OrderProcedurePage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/tentang"
                  element={
                    <PublicLayout>
                      <AboutPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/faq"
                  element={
                    <PublicLayout>
                      <FaqPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/kontak"
                  element={
                    <PublicLayout>
                      <ContactPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <PublicLayout>
                      <CheckoutPage />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/pesanan-saya"
                  element={
                    <PublicLayout>
                      <CustomerOrdersPage />
                    </PublicLayout>
                  }
                />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </StudioDataProvider>
        </AuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}

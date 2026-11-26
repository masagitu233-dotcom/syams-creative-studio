import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DESKTOP_NAV = [
  { to: '/layanan', label: 'Layanan' },
  { to: '/produk', label: 'Produk' },
  { to: '/portofolio', label: 'Portofolio' },
  { to: '/prosedur', label: 'Prosedur' },
  { to: '/kontak', label: 'Kontak' },
];

const MOBILE_EXTRA_NAV = [
  { to: '/tentang', label: 'Tentang Kami' },
  { to: '/faq', label: 'FAQ' },
  { to: '/pesanan-saya', label: 'Riwayat Pesanan' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-[#F8F8E1] border-b-2 border-[#171717]">
      <div className="nb-container h-14 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Compact brand wordmark */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="font-display font-bold text-sm sm:text-base tracking-tight text-[#171717] hover:text-[#0F3D3A] transition-colors whitespace-nowrap shrink-0"
        >
          SYAMS CREATIVE STUDIO
        </Link>

        {/* Zone 2: 5 concise single-line links */}
        <nav
          aria-label="Navigasi utama"
          className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#171717]"
        >
          {DESKTOP_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#0F3D3A] text-[#0F3D3A] font-semibold'
                    : 'border-transparent hover:border-[#171717] text-[#262626]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Single primary CTA + mobile hamburger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/checkout"
            onClick={() => setMobileOpen(false)}
            className="hidden sm:inline-flex nb-btn nb-btn-primary px-3.5 py-1.5 text-xs"
          >
            Pesan Sekarang
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="lg:hidden nb-btn nb-btn-surface p-2 min-w-[40px] min-h-[40px]"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            aria-label="Navigasi seluler"
            className="lg:hidden overflow-hidden bg-[#F8F8E1] border-t-2 border-[#171717]"
          >
            <div className="nb-container py-3 flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 text-sm font-medium rounded-[4px] border-2 ${
                  location.pathname === '/'
                    ? 'bg-[#F3C95B] border-[#171717] font-semibold'
                    : 'border-transparent hover:bg-white'
                }`}
              >
                Beranda
              </Link>
              {[...DESKTOP_NAV, ...MOBILE_EXTRA_NAV].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 text-sm font-medium rounded-[4px] border-2 ${
                    location.pathname.startsWith(item.to)
                      ? 'bg-[#F3C95B] border-[#171717] font-semibold'
                      : 'border-transparent hover:bg-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm font-semibold rounded-[4px] border-2 border-[#171717] bg-[#8ACCD5] text-[#171717]"
                >
                  Dashboard Admin
                </Link>
              )}
              <div className="pt-2.5 mt-1 border-t-2 border-[#171717]/15">
                <Link
                  to="/checkout"
                  onClick={() => setMobileOpen(false)}
                  className="nb-btn nb-btn-primary px-4 py-2 text-sm w-full"
                >
                  Pesan Sekarang
                </Link>
              </div>
              {user && (
                <p className="text-xs text-[#525252] px-1 pt-1 truncate">
                  Masuk sebagai {user.displayName || user.email}
                </p>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

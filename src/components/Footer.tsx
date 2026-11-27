import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { useAuth } from '../contexts/AuthContext';
import { buildWhatsappLink, sanitizeHttpUrl } from '../utils/studioLogic';

export function Footer() {
  const { siteSettings } = useStudioData();
  const { user, isAdmin } = useAuth();

  const socialLinks = [
    { label: 'Instagram', url: sanitizeHttpUrl(siteSettings.instagramUrl) },
    { label: 'TikTok', url: sanitizeHttpUrl(siteSettings.tiktokUrl) },
    { label: 'YouTube', url: sanitizeHttpUrl(siteSettings.youtubeUrl) },
    { label: 'LinkedIn', url: sanitizeHttpUrl(siteSettings.linkedinUrl) },
  ].filter((item) => Boolean(item.url));

  const waHref = buildWhatsappLink(
    siteSettings.whatsappNumber,
    'Halo SYAMS CREATIVE STUDIO, saya ingin berkonsultasi mengenai layanan dan produk digital.'
  );

  return (
    <footer className="relative z-[25] bg-[#0F3D3A] text-[#F8F8E1] border-t-2 border-[#171717]">
      <div className="nb-container py-9">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-7">
          <div className="lg:col-span-5 space-y-2.5">
            <Link
              to="/"
              className="font-display font-bold text-lg tracking-tight text-[#F8F8E1] inline-block"
            >
              {siteSettings.studioName}
            </Link>
            <p className="font-display font-semibold text-sm text-[#F3C95B]">
              {siteSettings.slogan}
            </p>
            <p className="text-xs text-[#F8F8E1]/80 leading-relaxed max-w-sm">
              {siteSettings.aboutSummary}
            </p>
            <div className="pt-1.5 flex flex-wrap gap-2.5">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="nb-btn nb-btn-mustard px-3.5 py-1.5 text-xs"
              >
                WhatsApp Studio
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <Link
                to="/pesanan-saya"
                className="nb-btn nb-btn-surface px-3.5 py-1.5 text-xs"
              >
                {user ? 'Pesanan Saya' : 'Cek Pesanan'}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <h2 className="font-display font-bold text-xs text-[#F3C95B]">Katalog</h2>
            <ul className="space-y-1.5 text-xs text-[#F8F8E1]/90">
              <li>
                <Link to="/" className="hover:text-[#F3C95B] transition-colors">
                  Beranda
                </Link>
              </li>
              <li>
                <Link to="/layanan" className="hover:text-[#F3C95B] transition-colors">
                  Layanan Jasa
                </Link>
              </li>
              <li>
                <Link to="/produk" className="hover:text-[#F3C95B] transition-colors">
                  Produk Digital
                </Link>
              </li>
              <li>
                <Link to="/portofolio" className="hover:text-[#F3C95B] transition-colors">
                  Portofolio
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <h2 className="font-display font-bold text-xs text-[#F3C95B]">Informasi</h2>
            <ul className="space-y-1.5 text-xs text-[#F8F8E1]/90">
              <li>
                <Link to="/prosedur" className="hover:text-[#F3C95B] transition-colors">
                  Prosedur Pemesanan
                </Link>
              </li>
              <li>
                <Link to="/tentang" className="hover:text-[#F3C95B] transition-colors">
                  Tentang Studio
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#F3C95B] transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/kontak" className="hover:text-[#F3C95B] transition-colors">
                  Kontak
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-2">
            <h2 className="font-display font-bold text-xs text-[#F3C95B]">Kontak Studio</h2>
            <div className="space-y-1 text-xs text-[#F8F8E1]/90">
              <p>{siteSettings.email}</p>
              <p>{siteSettings.operatingHours}</p>
              <p className="text-[#F8F8E1]/75">{siteSettings.address}</p>
            </div>
            {socialLinks.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[#8ACCD5]">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#F3C95B] underline underline-offset-4 transition-colors"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 pt-4 border-t border-[#F8F8E1]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#F8F8E1]/75">
          <p>© {new Date().getFullYear()} {siteSettings.studioName}. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-4">
            <Link to="/pesanan-saya" className="hover:text-[#F3C95B] transition-colors">
              Riwayat Pesanan
            </Link>
            <Link to="/admin" className="hover:text-[#F3C95B] transition-colors">
              {isAdmin ? 'Dashboard Admin' : 'Portal Admin'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

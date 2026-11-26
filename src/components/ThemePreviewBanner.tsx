import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Eye, Settings, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudioData } from '../contexts/StudioDataContext';
import { saveVisualThemeByAdmin } from '../services/firestoreService';
import { formatUserFriendlyError } from '../lib/firestoreErrors';
import { VISUAL_THEME_OPTIONS } from '../utils/studioLogic';

export function ThemePreviewBanner() {
  const { isPreviewActive, previewTheme, persistedTheme, stopPreview, syncCachedTheme } =
    useTheme();
  const { user, isAdmin } = useAuth();
  const { pushToast } = useStudioData();
  const location = useLocation();
  const [applying, setApplying] = useState(false);

  if (!isPreviewActive || !previewTheme) return null;

  const previewMeta = VISUAL_THEME_OPTIONS.find((opt) => opt.id === previewTheme);
  const isOnAdminSettings = location.pathname.startsWith('/admin/pengaturan');
  const differsFromPersisted = previewTheme !== persistedTheme;

  async function handleQuickApply() {
    if (!user || !isAdmin || !previewTheme) return;
    setApplying(true);
    try {
      const saved = await saveVisualThemeByAdmin(previewTheme, {
        uid: user.uid,
        email: user.email || '',
      });
      syncCachedTheme(saved);
      stopPreview();
      pushToast({
        type: 'success',
        title: `Tema "${previewMeta?.name || previewTheme}" Diterapkan`,
        description: 'Seluruh pengunjung website kini melihat tema visual baru secara real-time.',
      });
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Gagal Menerapkan Tema',
        description: formatUserFriendlyError(err, 'Periksa izin admin dan coba lagi.'),
      });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-2xl"
    >
      <div className="bg-[#0F3D3A] text-[#F8F8E1] border-2 border-[#171717] nb-shadow rounded-[8px] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 bg-[#F3C95B] text-[#171717] rounded-[6px] flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-xs sm:text-[13px] leading-tight truncate">
              Mode Pratinjau Tema: {previewMeta?.name || previewTheme}
            </p>
            <p className="text-[11px] text-[#F8F8E1]/80 truncate">
              Hanya terlihat di sesi Anda. Klik Terapkan Tema untuk mengubah tampilan semua pengunjung.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isOnAdminSettings && isAdmin && (
            <Link
              to="/admin/pengaturan"
              className="nb-btn nb-btn-surface nb-btn-xs"
            >
              <Settings className="w-3 h-3" />
              Pengaturan
            </Link>
          )}
          {isAdmin && user && differsFromPersisted && (
            <button
              type="button"
              disabled={applying}
              onClick={() => void handleQuickApply()}
              className="nb-btn nb-btn-mustard nb-btn-xs"
            >
              <Check className="w-3 h-3" />
              {applying ? 'Menerapkan...' : 'Terapkan Tema'}
            </button>
          )}
          <button
            type="button"
            onClick={stopPreview}
            className="nb-btn nb-btn-surface nb-btn-xs"
            aria-label="Tutup mode pratinjau tema"
          >
            <X className="w-3 h-3" />
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

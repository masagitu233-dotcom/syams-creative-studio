import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, Eye, EyeOff, Palette } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { saveVisualThemeByAdmin } from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import { normalizeVisualTheme, VISUAL_THEME_OPTIONS } from '../../utils/studioLogic';
import type { SiteSettings, VisualThemeMode } from '../../types/studio';

interface AdminAppearanceSectionProps {
  settings: SiteSettings;
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

function ThemeMiniPreview({ mode }: { mode: VisualThemeMode }) {
  if (mode === 'neo_brutalist') {
    return (
      <div
        aria-hidden="true"
        className="theme-preview-isolated p-3"
        style={{
          backgroundColor: '#F8F8E1',
          border: '2px solid #171717',
          borderRadius: '4px',
        }}
      >
        {/* Mini Navbar */}
        <div
          className="flex items-center justify-between px-2 py-1.5 mb-2.5"
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #171717',
            borderRadius: '3px',
            boxShadow: '2px 2px 0px #171717',
          }}
        >
          <span
            className="font-display font-bold text-[9px] tracking-tight"
            style={{ color: '#171717' }}
          >
            SYAMS STUDIO
          </span>
          <div className="flex items-center gap-1">
            <span className="w-5 h-1.5" style={{ backgroundColor: '#171717' }} />
            <span className="w-5 h-1.5" style={{ backgroundColor: '#737373' }} />
            <span
              className="w-7 h-3"
              style={{
                backgroundColor: '#0F3D3A',
                border: '1.5px solid #171717',
                borderRadius: '2px',
              }}
            />
          </div>
        </div>

        {/* Mini Hero + 3 Bento-identical Grid Cards */}
        <div
          className="p-2 mb-2"
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #171717',
            borderRadius: '4px',
            boxShadow: '3px 3px 0px #171717',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1 flex-1">
              <div className="w-12 h-1.5" style={{ backgroundColor: '#6C151E' }} />
              <div className="w-24 h-2.5" style={{ backgroundColor: '#171717' }} />
              <div className="flex gap-1 pt-0.5">
                <span
                  className="w-10 h-3"
                  style={{
                    backgroundColor: '#0F3D3A',
                    border: '1.5px solid #171717',
                    borderRadius: '2px',
                  }}
                />
                <span
                  className="w-10 h-3"
                  style={{
                    backgroundColor: '#F3C95B',
                    border: '1.5px solid #171717',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>
            <div
              className="w-14 h-10 shrink-0"
              style={{
                backgroundColor: '#8ACCD5',
                border: '2px solid #171717',
                borderRadius: '2px',
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {['#F3C95B', '#8ACCD5', '#FFFFFF'].map((tint, idx) => (
            <div
              key={idx}
              className="p-1.5 space-y-1"
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #171717',
                borderRadius: '4px',
                boxShadow: '2px 2px 0px #171717',
              }}
            >
              <div
                className="h-5 w-full"
                style={{
                  backgroundColor: tint,
                  borderBottom: '1.5px solid #171717',
                }}
              />
              <div className="w-3/4 h-1.5" style={{ backgroundColor: '#171717' }} />
              <div className="w-1/2 h-1.5" style={{ backgroundColor: '#0F3D3A' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="theme-preview-isolated p-3"
      style={{
        backgroundColor: '#F4F5F1',
        border: '1px solid rgba(15, 61, 58, 0.12)',
        borderRadius: '14px',
      }}
    >
      {/* Mini Clean Navbar */}
      <div
        className="flex items-center justify-between px-2.5 py-1.5 mb-2.5"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          border: '1px solid rgba(15, 61, 58, 0.09)',
          borderRadius: '10px',
          boxShadow: '0 2px 8px -2px rgba(15, 61, 58, 0.07)',
        }}
      >
        <span
          className="font-display font-bold text-[9px] tracking-tight"
          style={{ color: '#0F3D3A' }}
        >
          SYAMS STUDIO
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-5 h-1.5"
            style={{ backgroundColor: 'rgba(23, 23, 23, 0.55)', borderRadius: '4px' }}
          />
          <span
            className="w-5 h-1.5"
            style={{ backgroundColor: 'rgba(23, 23, 23, 0.25)', borderRadius: '4px' }}
          />
          <span
            className="w-7 h-3"
            style={{ backgroundColor: '#0F3D3A', borderRadius: '6px' }}
          />
        </div>
      </div>

      {/* Mini Clean Bento Hero */}
      <div
        className="p-2 mb-2"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(15, 61, 58, 0.09)',
          borderRadius: '12px',
          boxShadow: '0 4px 14px -4px rgba(15, 61, 58, 0.09)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1 flex-1">
            <div
              className="w-12 h-1.5"
              style={{ backgroundColor: 'rgba(108, 21, 30, 0.72)', borderRadius: '4px' }}
            />
            <div
              className="w-24 h-2.5"
              style={{ backgroundColor: '#171717', borderRadius: '4px' }}
            />
            <div className="flex gap-1 pt-0.5">
              <span
                className="w-10 h-3"
                style={{ backgroundColor: '#0F3D3A', borderRadius: '6px' }}
              />
              <span
                className="w-10 h-3"
                style={{
                  backgroundColor: '#F5E4B3',
                  border: '1px solid rgba(15, 61, 58, 0.1)',
                  borderRadius: '6px',
                }}
              />
            </div>
          </div>
          <div
            className="w-14 h-10 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #D7ECEE 0%, #E7EFEA 100%)',
              border: '1px solid rgba(15, 61, 58, 0.08)',
              borderRadius: '9px',
            }}
          />
        </div>
      </div>

      {/* Mini Clean Bento Cards */}
      <div className="grid grid-cols-3 gap-1.5">
        {['#F4E8C4', '#DCEEEF', '#EDF1EC'].map((tint, idx) => (
          <div
            key={idx}
            className="p-1.5 space-y-1"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(15, 61, 58, 0.09)',
              borderRadius: '10px',
              boxShadow: '0 3px 10px -4px rgba(15, 61, 58, 0.08)',
            }}
          >
            <div
              className="h-5 w-full"
              style={{ backgroundColor: tint, borderRadius: '6px' }}
            />
            <div
              className="w-3/4 h-1.5"
              style={{ backgroundColor: 'rgba(23, 23, 23, 0.75)', borderRadius: '3px' }}
            />
            <div
              className="w-1/2 h-1.5"
              style={{ backgroundColor: '#0F3D3A', borderRadius: '3px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAppearanceSection({
  settings,
  actor,
  onRefresh,
  onToast,
}: AdminAppearanceSectionProps) {
  const { persistedTheme, previewTheme, isPreviewActive, startPreview, stopPreview } = useTheme();
  const currentSavedTheme = normalizeVisualTheme(settings.visualTheme ?? persistedTheme);
  const [selectedTheme, setSelectedTheme] = useState<VisualThemeMode>(
    previewTheme ?? currentSavedTheme
  );
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isPreviewActive) {
      setSelectedTheme(currentSavedTheme);
    }
  }, [currentSavedTheme, isPreviewActive]);

  const selectedMeta = VISUAL_THEME_OPTIONS.find((opt) => opt.id === selectedTheme);
  const activeSavedMeta = VISUAL_THEME_OPTIONS.find((opt) => opt.id === currentSavedTheme);

  function handlePreview() {
    startPreview(selectedTheme);
    onToast({
      type: 'info',
      title: `Pratinjau "${selectedMeta?.name || selectedTheme}" Aktif`,
      description:
        'Anda dapat meninjau tampilan di seluruh halaman tanpa mengubah tema pengunjung sebelum menekan Terapkan Tema.',
    });
  }

  async function handleApplyTheme() {
    setApplying(true);
    try {
      const saved = await saveVisualThemeByAdmin(selectedTheme, actor);
      stopPreview();
      await onRefresh();
      const label = saved === 'clean_bento' ? 'Clean Bento Grid' : 'Neo Brutalist';
      onToast({
        type: 'success',
        title: `Tema "${label}" Diterapkan`,
        description:
          'Tema visual global telah disimpan ke site_settings/general dan langsung berlaku bagi seluruh pengunjung.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menerapkan Tema',
        description: formatUserFriendlyError(
          err,
          'Pastikan akun admin terautentikasi dan coba kembali.'
        ),
      });
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="nb-card p-5 space-y-4" aria-labelledby="admin-appearance-heading">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#0F3D3A]" />
            <h2
              id="admin-appearance-heading"
              className="font-display font-bold text-base sm:text-lg text-[#171717]"
            >
              Pengaturan Tampilan
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#525252]">
            Pilih mode tema visual website untuk seluruh pengunjung. Perubahan hanya memengaruhi
            lapisan visual tanpa mengubah tata letak, urutan elemen, maupun data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="px-2.5 py-1 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] text-[11px] font-display font-semibold text-[#0F3D3A]">
            Tema Publik: {activeSavedMeta?.name}
          </span>
          {isPreviewActive && previewTheme && (
            <span className="px-2.5 py-1 bg-[#F3C95B] border-2 border-[#171717] rounded-[4px] text-[11px] font-display font-bold text-[#171717]">
              Pratinjau: {VISUAL_THEME_OPTIONS.find((o) => o.id === previewTheme)?.name}
            </span>
          )}
        </div>
      </div>

      {/* Two Visual Theme Cards */}
      <div
        role="radiogroup"
        aria-label="Pilihan mode tema visual"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {VISUAL_THEME_OPTIONS.map((option) => {
          const isSelected = selectedTheme === option.id;
          const isLiveSaved = currentSavedTheme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedTheme(option.id)}
              className={`text-left p-3.5 rounded-[4px] border-2 transition-all flex flex-col gap-3 cursor-pointer ${
                isSelected
                  ? 'border-[#0F3D3A] bg-[#F8F8E1]/65 ring-2 ring-[#0F3D3A]/20'
                  : 'border-[#171717]/30 bg-white hover:border-[#171717]'
              }`}
            >
              <ThemeMiniPreview mode={option.id} />

              <div className="space-y-1.5 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-sm sm:text-base text-[#171717] leading-tight">
                      {option.name}
                    </p>
                    <p className="text-[11px] font-semibold text-[#6C151E]">{option.tagline}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLiveSaved && (
                      <span className="px-2 py-0.5 bg-[#0F3D3A] text-[#F8F8E1] rounded-[2px] text-[10px] font-display font-semibold">
                        Aktif
                      </span>
                    )}
                    <span
                      className={`w-5 h-5 rounded-[3px] border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#0F3D3A] border-[#0F3D3A] text-[#F8F8E1]'
                          : 'bg-white border-[#171717]/40 text-transparent'
                      }`}
                      aria-hidden="true"
                    >
                      <Check className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#404040] leading-relaxed">{option.description}</p>

                <div className="pt-1 flex flex-wrap gap-1.5">
                  {option.traits.map((trait) => (
                    <span
                      key={trait}
                      className="px-2 py-0.5 bg-white border border-[#171717]/20 rounded-[3px] text-[10px] font-medium text-[#333333]"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview & Apply Controls */}
      <div className="pt-3 border-t border-[#171717]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-[#525252]">
          {isPreviewActive ? (
            <span>
              Mode pratinjau aktif untuk{' '}
              <strong className="text-[#171717]">
                {VISUAL_THEME_OPTIONS.find((o) => o.id === previewTheme)?.name}
              </strong>
              . Anda dapat membuka halaman publik untuk mengecek tampilan sebelum menerapkannya.
            </span>
          ) : selectedTheme !== currentSavedTheme ? (
            <span>
              Pilihan <strong className="text-[#171717]">{selectedMeta?.name}</strong> siap
              dipratinjau atau diterapkan ke seluruh pengunjung.
            </span>
          ) : (
            <span>
              Tema <strong className="text-[#171717]">{activeSavedMeta?.name}</strong> saat ini
              aktif untuk seluruh pengunjung website.
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePreview}
            className="nb-btn nb-btn-surface nb-btn-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            Pratinjau
          </button>

          {isPreviewActive && (
            <>
              <Link to="/" className="nb-btn nb-btn-sky nb-btn-sm">
                <ExternalLink className="w-3.5 h-3.5" />
                Lihat Beranda
              </Link>
              <button
                type="button"
                onClick={stopPreview}
                className="nb-btn nb-btn-surface nb-btn-sm"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Tutup Pratinjau
              </button>
            </>
          )}

          <button
            type="button"
            disabled={applying}
            onClick={() => void handleApplyTheme()}
            className="nb-btn nb-btn-primary nb-btn-sm"
          >
            <Check className="w-3.5 h-3.5" />
            {applying ? 'Menerapkan...' : 'Terapkan Tema'}
          </button>
        </div>
      </div>
    </section>
  );
}

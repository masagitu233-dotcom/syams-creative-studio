import React, { useEffect, useRef, useState } from 'react';
import { Check, Mail } from 'lucide-react';
import {
  saveSiteSettingsByAdmin,
  updateContactMessageStatus,
} from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import { formatDateTimeId, validateOptionalSocialUrls } from '../../utils/studioLogic';
import { STUDIO_IMAGES } from '../../data/initialCatalog';
import { AdminImagePicker } from './AdminImagePicker';
import { AdminAppearanceSection } from './AdminAppearanceSection';
import type {
  ContactMessage,
  DriveFolderRecord,
  MediaAsset,
  SiteSettings,
} from '../../types/studio';

interface AdminSettingsPanelProps {
  settings: SiteSettings;
  messages: ContactMessage[];
  media: MediaAsset[];
  driveFolders?: DriveFolderRecord[];
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

export function AdminSettingsPanel({
  settings,
  messages,
  media,
  driveFolders = [],
  actor,
  onRefresh,
  onToast,
}: AdminSettingsPanelProps) {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const hasPendingEditsRef = useRef(false);

  const updateForm = (updater: (prev: SiteSettings) => SiteSettings) => {
    hasPendingEditsRef.current = true;
    setForm(updater);
  };

  useEffect(() => {
    if (!hasPendingEditsRef.current) {
      setForm(settings);
      setSocialErrors({});
    } else {
      // Preserve unsaved form edits (like a freshly uploaded hero banner), while syncing theme updates
      setForm((prev) => ({
        ...prev,
        visualTheme: settings.visualTheme,
      }));
    }
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const socialCheck = validateOptionalSocialUrls({
      instagramUrl: form.instagramUrl,
      tiktokUrl: form.tiktokUrl,
      youtubeUrl: form.youtubeUrl,
      linkedinUrl: form.linkedinUrl,
    });
    setSocialErrors(socialCheck.errors);
    if (!socialCheck.valid) {
      onToast({
        type: 'error',
        title: 'Format Tautan Media Sosial Tidak Valid',
        description:
          'Gunakan tautan diawali https:// atau http:// yang valid, atau kosongkan kolom yang tidak digunakan.',
      });
      return;
    }

    setSaving(true);
    try {
      await saveSiteSettingsByAdmin(form, actor);
      hasPendingEditsRef.current = false;
      await onRefresh();
      onToast({
        type: 'success',
        title: 'Pengaturan Studio Disimpan',
        description: 'Konten hero, kontak, dan tautan media sosial telah diperbarui.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan Pengaturan',
        description: formatUserFriendlyError(err, 'Periksa isian pengaturan dan coba lagi.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleMessageStatus(id: string, status: ContactMessage['status']) {
    try {
      await updateContactMessageStatus(id, status, actor);
      await onRefresh();
      onToast({ type: 'info', title: 'Status Pesan Diperbarui' });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Memperbarui Status Pesan',
        description: formatUserFriendlyError(err, 'Gagal memperbarui status.'),
      });
    }
  }

  return (
    <div className="space-y-6">
      <AdminAppearanceSection
        settings={settings}
        actor={actor}
        onRefresh={onRefresh}
        onToast={onToast}
      />

      <div className="space-y-4">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
            Konten Website, Kontak & Media Sosial
          </h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            Perubahan pada dokumen <code className="font-mono text-xs">site_settings/general</code>{' '}
            langsung tercermin pada Beranda, Tentang Kami, Kontak, dan Footer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="nb-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="set-name" className="block text-xs font-bold">
              Nama Studio
            </label>
            <input
              id="set-name"
              type="text"
              value={form.studioName}
              onChange={(e) => updateForm((f) => ({ ...f, studioName: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="set-slogan" className="block text-xs font-bold">
              Slogan
            </label>
            <input
              id="set-slogan"
              type="text"
              value={form.slogan}
              onChange={(e) => updateForm((f) => ({ ...f, slogan: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="set-headline" className="block text-xs font-bold">
            Judul Hero Beranda
          </label>
          <input
            id="set-headline"
            type="text"
            value={form.heroHeadline}
            onChange={(e) => updateForm((f) => ({ ...f, heroHeadline: e.target.value }))}
            className="nb-input text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="set-sub" className="block text-xs font-bold">
            Subjudul Hero Beranda
          </label>
          <textarea
            id="set-sub"
            rows={2}
            value={form.heroSubheadline}
            onChange={(e) => updateForm((f) => ({ ...f, heroSubheadline: e.target.value }))}
            className="nb-input text-sm"
            required
          />
        </div>

        <AdminImagePicker
          label="Banner Utama Beranda & Halaman Studio (Folder: Banner Website)"
          imageUrl={form.heroImageUrl || ''}
          driveFileId={form.heroDriveFileId || ''}
          savedImageUrl={settings.heroImageUrl || ''}
          savedDriveFileId={settings.heroDriveFileId || ''}
          entityKey="site-settings-hero"
          allowEmpty
          emptyHint="Jika dikosongkan, halaman Beranda dan Tentang Kami otomatis menampilkan banner bawaan studio."
          onRestoreDefault={() =>
            updateForm((f) => ({
              ...f,
              heroImageUrl: STUDIO_IMAGES.hero,
              heroDriveFileId: '',
            }))
          }
          restoreDefaultLabel="Pakai Banner Bawaan"
          usage="hero"
          media={media}
          driveFolders={driveFolders}
          actor={actor}
          onChange={({ imageUrl, driveFileId }) =>
            updateForm((f) => ({ ...f, heroImageUrl: imageUrl, heroDriveFileId: driveFileId }))
          }
          onMediaUploaded={onRefresh}
          onToast={onToast}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="set-about" className="block text-xs font-bold">
              Ringkasan Tentang Kami
            </label>
            <textarea
              id="set-about"
              rows={3}
              value={form.aboutSummary}
              onChange={(e) => updateForm((f) => ({ ...f, aboutSummary: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="set-mission" className="block text-xs font-bold">
              Misi Studio
            </label>
            <textarea
              id="set-mission"
              rows={3}
              value={form.aboutMission || ''}
              onChange={(e) => updateForm((f) => ({ ...f, aboutMission: e.target.value }))}
              className="nb-input text-sm"
            />
          </div>
        </div>

        <div className="pt-3.5 border-t-2 border-[#171717]/15 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="set-wa" className="block text-xs font-bold">
              Nomor WhatsApp Admin
            </label>
            <input
              id="set-wa"
              type="text"
              value={form.whatsappNumber}
              onChange={(e) => updateForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
              className="nb-input font-mono text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="set-email" className="block text-xs font-bold">
              Email Resmi
            </label>
            <input
              id="set-email"
              type="email"
              value={form.email}
              onChange={(e) => updateForm((f) => ({ ...f, email: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="set-hours" className="block text-xs font-bold">
              Jam Operasional
            </label>
            <input
              id="set-hours"
              type="text"
              value={form.operatingHours}
              onChange={(e) => updateForm((f) => ({ ...f, operatingHours: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="set-addr" className="block text-xs font-bold">
              Domisili / Alamat
            </label>
            <input
              id="set-addr"
              type="text"
              value={form.address}
              onChange={(e) => updateForm((f) => ({ ...f, address: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>
        </div>

        <div className="pt-3.5 border-t-2 border-[#171717]/15 space-y-2.5">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#171717]">Tautan Media Sosial (Opsional)</p>
            <p className="text-[11px] text-[#525252]">
              Seluruh tautan media sosial bersifat opsional. Kosongkan kolom yang tidak digunakan;
              tautan kosong tidak akan ditampilkan pada Footer maupun halaman Kontak.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="set-ig" className="block text-xs font-bold">
                URL Instagram <span className="font-normal text-[#525252]">(Opsional)</span>
              </label>
              <input
                id="set-ig"
                type="text"
                inputMode="url"
                value={form.instagramUrl || ''}
                onChange={(e) => {
                  updateForm((f) => ({ ...f, instagramUrl: e.target.value }));
                  if (socialErrors.instagramUrl) {
                    setSocialErrors((prev) => ({ ...prev, instagramUrl: '' }));
                  }
                }}
                placeholder="https://instagram.com/syamscreativestudio"
                className="nb-input text-sm"
              />
              {socialErrors.instagramUrl && (
                <p className="text-xs font-medium text-[#6C151E]">{socialErrors.instagramUrl}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="set-tt" className="block text-xs font-bold">
                URL TikTok <span className="font-normal text-[#525252]">(Opsional)</span>
              </label>
              <input
                id="set-tt"
                type="text"
                inputMode="url"
                value={form.tiktokUrl || ''}
                onChange={(e) => {
                  updateForm((f) => ({ ...f, tiktokUrl: e.target.value }));
                  if (socialErrors.tiktokUrl) {
                    setSocialErrors((prev) => ({ ...prev, tiktokUrl: '' }));
                  }
                }}
                placeholder="https://tiktok.com/@syamscreativestudio"
                className="nb-input text-sm"
              />
              {socialErrors.tiktokUrl && (
                <p className="text-xs font-medium text-[#6C151E]">{socialErrors.tiktokUrl}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="set-yt" className="block text-xs font-bold">
                URL YouTube <span className="font-normal text-[#525252]">(Opsional)</span>
              </label>
              <input
                id="set-yt"
                type="text"
                inputMode="url"
                value={form.youtubeUrl || ''}
                onChange={(e) => {
                  updateForm((f) => ({ ...f, youtubeUrl: e.target.value }));
                  if (socialErrors.youtubeUrl) {
                    setSocialErrors((prev) => ({ ...prev, youtubeUrl: '' }));
                  }
                }}
                placeholder="https://youtube.com/@syamscreativestudio"
                className="nb-input text-sm"
              />
              {socialErrors.youtubeUrl && (
                <p className="text-xs font-medium text-[#6C151E]">{socialErrors.youtubeUrl}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="set-li" className="block text-xs font-bold">
                URL LinkedIn <span className="font-normal text-[#525252]">(Opsional)</span>
              </label>
              <input
                id="set-li"
                type="text"
                inputMode="url"
                value={form.linkedinUrl || ''}
                onChange={(e) => {
                  updateForm((f) => ({ ...f, linkedinUrl: e.target.value }));
                  if (socialErrors.linkedinUrl) {
                    setSocialErrors((prev) => ({ ...prev, linkedinUrl: '' }));
                  }
                }}
                placeholder="https://linkedin.com/company/syams-creative-studio"
                className="nb-input text-sm"
              />
              {socialErrors.linkedinUrl && (
                <p className="text-xs font-medium text-[#6C151E]">{socialErrors.linkedinUrl}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="nb-btn nb-btn-primary px-5 py-2 text-xs sm:text-sm">
            <Check className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Website'}
          </button>
        </div>
      </form>
      </div>

      {/* Contact Inbox */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#0F3D3A]" />
          <h3 className="font-display font-bold text-base sm:text-lg text-[#171717]">
            Pesan Masuk Halaman Kontak ({messages.length})
          </h3>
        </div>

        {messages.length === 0 ? (
          <div className="nb-card p-5 text-xs sm:text-sm text-[#525252]">
            Belum ada pesan masuk dari pengunjung melalui halaman Kontak.
          </div>
        ) : (
          <div className="space-y-2.5">
            {messages.map((msg) => (
              <div key={msg.id} className="nb-card p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div>
                    <p className="font-display font-bold text-sm sm:text-base text-[#171717]">
                      {msg.subject}
                    </p>
                    <p className="text-[11px] text-[#525252]">
                      {msg.name} · {msg.email}
                      {msg.whatsapp ? ` · +${msg.whatsapp}` : ''} · {formatDateTimeId(msg.createdAt)}
                    </p>
                  </div>
                  <select
                    aria-label={`Status pesan dari ${msg.name}`}
                    value={msg.status}
                    onChange={(e) =>
                      void handleMessageStatus(msg.id, e.target.value as ContactMessage['status'])
                    }
                    className="nb-input w-auto text-xs py-1 px-2.5"
                  >
                    <option value="baru">Baru</option>
                    <option value="dibalas">Sudah Dibalas</option>
                    <option value="arsip">Arsip</option>
                  </select>
                </div>
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">{msg.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

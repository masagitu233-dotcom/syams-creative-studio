import React, { useEffect, useState } from 'react';
import { Check, Mail } from 'lucide-react';
import {
  saveSiteSettingsByAdmin,
  updateContactMessageStatus,
} from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import { formatDateTimeId } from '../../utils/studioLogic';
import type { ContactMessage, SiteSettings } from '../../types/studio';

interface AdminSettingsPanelProps {
  settings: SiteSettings;
  messages: ContactMessage[];
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

export function AdminSettingsPanel({
  settings,
  messages,
  actor,
  onRefresh,
  onToast,
}: AdminSettingsPanelProps) {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSiteSettingsByAdmin(form, actor);
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
    <div className="space-y-5">
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
              onChange={(e) => setForm((f) => ({ ...f, studioName: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))}
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
            onChange={(e) => setForm((f) => ({ ...f, heroHeadline: e.target.value }))}
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
            onChange={(e) => setForm((f) => ({ ...f, heroSubheadline: e.target.value }))}
            className="nb-input text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="set-about" className="block text-xs font-bold">
              Ringkasan Tentang Kami
            </label>
            <textarea
              id="set-about"
              rows={3}
              value={form.aboutSummary}
              onChange={(e) => setForm((f) => ({ ...f, aboutSummary: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, aboutMission: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="set-ig" className="block text-xs font-bold">
              URL Instagram
            </label>
            <input
              id="set-ig"
              type="url"
              value={form.instagramUrl || ''}
              onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
              className="nb-input text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="set-tt" className="block text-xs font-bold">
              URL TikTok
            </label>
            <input
              id="set-tt"
              type="url"
              value={form.tiktokUrl || ''}
              onChange={(e) => setForm((f) => ({ ...f, tiktokUrl: e.target.value }))}
              className="nb-input text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="set-yt" className="block text-xs font-bold">
              URL YouTube
            </label>
            <input
              id="set-yt"
              type="url"
              value={form.youtubeUrl || ''}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              className="nb-input text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="set-li" className="block text-xs font-bold">
              URL LinkedIn
            </label>
            <input
              id="set-li"
              type="url"
              value={form.linkedinUrl || ''}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
              className="nb-input text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="nb-btn nb-btn-primary px-5 py-2 text-xs sm:text-sm">
            <Check className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Website'}
          </button>
        </div>
      </form>

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

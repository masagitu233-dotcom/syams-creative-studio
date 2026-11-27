import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { useDesign } from '../contexts/DesignContext';
import { submitContactMessage } from '../services/firestoreService';
import { formatUserFriendlyError } from '../lib/firestoreErrors';
import {
  buildWhatsappLink,
  sanitizeHttpUrl,
  validateContactInput,
} from '../utils/studioLogic';
import { FadeScroll } from '../components/FadeScroll';
import { SectionHeader } from '../components/SectionHeader';

export function ContactPage() {
  const { siteSettings, pushToast } = useStudioData();
  const { design, viewport } = useDesign();
  const cfg = design.otherPages.contact;
  const padY = Math.round(cfg.paddingYPx * design.responsive[viewport].sectionPaddingScale);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const waHref = buildWhatsappLink(
    siteSettings.whatsappNumber,
    'Halo SYAMS CREATIVE STUDIO, saya ingin menanyakan detail layanan.'
  );

  const socials = [
    { label: 'Instagram', url: sanitizeHttpUrl(siteSettings.instagramUrl) },
    { label: 'TikTok', url: sanitizeHttpUrl(siteSettings.tiktokUrl) },
    { label: 'YouTube', url: sanitizeHttpUrl(siteSettings.youtubeUrl) },
    { label: 'LinkedIn', url: sanitizeHttpUrl(siteSettings.linkedinUrl) },
  ].filter((item) => Boolean(item.url));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateContactInput({ name, email, whatsapp, subject, message });
    setErrors(validation.errors);
    if (!validation.valid) return;

    setSubmitting(true);
    try {
      await submitContactMessage({ name, email, whatsapp, subject, message });
      setSubmitted(true);
      setName('');
      setEmail('');
      setWhatsapp('');
      setSubject('');
      setMessage('');
      pushToast({
        type: 'success',
        title: 'Pesan Terkirim',
        description: 'Terima kasih, pesan Anda sudah diterima oleh tim SYAMS CREATIVE STUDIO.',
      });
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Gagal Mengirim Pesan',
        description: formatUserFriendlyError(error, 'Terjadi gangguan saat menyimpan pesan.'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isSplit = cfg.layout !== 'stacked' && viewport === 'desktop';
  const formFirst = cfg.layout === 'form_left';

  return (
    <div
      className="nb-section"
      style={{
        paddingTop: `${padY}px`,
        paddingBottom: `${padY}px`,
        ...(cfg.backgroundColor ? { backgroundColor: cfg.backgroundColor } : {}),
      }}
    >
      <div
        className="nb-container space-y-6"
        style={{
          maxWidth: `${cfg.maxWidthPx > 0 ? cfg.maxWidthPx : design.global.containerMaxWidthPx}px`,
        }}
      >
        <FadeScroll index={0}>
          <SectionHeader
            asPageTitle
            kicker="Hubungi Studio"
            title="Diskusikan Ide dan Kebutuhan Proyek Anda"
            subtitle="Kirimkan pertanyaan melalui formulir di bawah atau hubungi admin secara langsung melalui WhatsApp resmi studio."
          />
        </FadeScroll>

        <div
          className={`grid gap-4 sm:gap-5 items-stretch ${
            isSplit ? 'grid-cols-12' : 'grid-cols-1'
          }`}
        >
          {/* Contact Info Panel */}
          <FadeScroll
            index={0}
            columnsPerRow={2}
            className={`${isSplit ? 'col-span-5' : ''} ${
              formFirst && isSplit ? 'order-2' : 'order-1'
            } flex`}
          >
            <div className="nb-card p-4 sm:p-5 space-y-4 w-full flex flex-col justify-between">
              <div className="space-y-4">
                <h2 className="font-display font-bold text-lg text-[#171717]">
                  Saluran Resmi Studio
                </h2>

                <div className="space-y-3 text-sm text-[#262626]">
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-[#0F3D3A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#525252]">WhatsApp Admin</p>
                      <p className="font-mono font-semibold text-sm text-[#171717]">
                        +{siteSettings.whatsappNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-[#0F3D3A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#525252]">Email Resmi</p>
                      <p className="font-medium text-sm text-[#171717]">{siteSettings.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[#0F3D3A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#525252]">Jam Operasional</p>
                      <p className="font-medium text-sm text-[#171717]">
                        {siteSettings.operatingHours}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#0F3D3A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#525252]">Domisili Studio</p>
                      <p className="font-medium text-sm text-[#171717]">{siteSettings.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nb-btn nb-btn-mustard w-full py-2.5 px-4 text-xs sm:text-sm"
                >
                  Chat Langsung via WhatsApp
                  <ArrowUpRight className="w-4 h-4" />
                </a>

                {cfg.showSocials && socials.length > 0 && (
                  <div className="pt-3 border-t border-[#171717]/15 space-y-1.5">
                    <p className="text-[11px] font-semibold text-[#525252]">Media Sosial</p>
                    <div className="flex flex-wrap gap-3">
                      {socials.map((soc) => (
                        <a
                          key={soc.label}
                          href={soc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-display font-semibold text-[#0F3D3A] underline underline-offset-4 hover:text-[#6C151E]"
                        >
                          {soc.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FadeScroll>

          {/* Contact Form */}
          <FadeScroll
            index={1}
            columnsPerRow={2}
            className={`${isSplit ? 'col-span-7' : ''} ${
              formFirst && isSplit ? 'order-1' : 'order-2'
            } flex`}
          >
            <div className="nb-card p-4 sm:p-5 w-full">
              {submitted ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto bg-[#0F3D3A] text-[#F3C95B] border-2 border-[#171717] flex items-center justify-center nb-shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-bold text-xl text-[#171717]">
                    Pesan Anda Berhasil Dikirim
                  </h2>
                  <p className="text-xs sm:text-sm text-[#404040] max-w-md mx-auto leading-relaxed">
                    Tim kami akan meninjau pesan Anda dan membalas melalui email atau WhatsApp
                    pada jam operasional studio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="nb-btn nb-btn-surface px-4 py-2 text-xs sm:text-sm"
                  >
                    Kirim Pesan Lain
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                  <h2 className="font-display font-bold text-lg text-[#171717]">
                    Kirim Pesan Cepat
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label htmlFor="contact-name" className="block text-xs font-semibold">
                        Nama Lengkap <span className="text-[#6C151E]">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama Anda"
                        className="nb-input"
                        required
                      />
                      {errors.name && <p className="text-xs font-medium text-[#6C151E]">{errors.name}</p>}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="contact-email" className="block text-xs font-semibold">
                        Email <span className="text-[#6C151E]">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="nb-input"
                        required
                      />
                      {errors.email && (
                        <p className="text-xs font-medium text-[#6C151E]">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label htmlFor="contact-wa" className="block text-xs font-semibold">
                        Nomor WhatsApp (Opsional)
                      </label>
                      <input
                        id="contact-wa"
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="081234567890"
                        className="nb-input"
                      />
                      {errors.whatsapp && (
                        <p className="text-xs font-medium text-[#6C151E]">{errors.whatsapp}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="contact-subject" className="block text-xs font-semibold">
                        Subjek <span className="text-[#6C151E]">*</span>
                      </label>
                      <input
                        id="contact-subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Contoh: Konsultasi Website Sekolah"
                        className="nb-input"
                        required
                      />
                      {errors.subject && (
                        <p className="text-xs font-medium text-[#6C151E]">{errors.subject}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="contact-message" className="block text-xs font-semibold">
                      Pesan <span className="text-[#6C151E]">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tuliskan pertanyaan atau gambaran proyek yang ingin Anda diskusikan..."
                      className="nb-input resize-y"
                      required
                    />
                    {errors.message && (
                      <p className="text-xs font-medium text-[#6C151E]">{errors.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="nb-btn nb-btn-primary nb-btn-md w-full sm:w-auto"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Mengirim Pesan...' : 'Kirim Pesan'}
                  </button>
                </form>
              )}
            </div>
          </FadeScroll>
        </div>
      </div>
    </div>
  );
}

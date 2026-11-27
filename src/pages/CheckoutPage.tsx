import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FileUp,
  LogIn,
  Paperclip,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStudioData } from '../contexts/StudioDataContext';
import {
  createOrderInFirestore,
  saveMediaMetadata,
  upsertCustomerProfile,
} from '../services/firestoreService';
import {
  fetchDriveIntegrationStatus,
  requestValidatedOrderCode,
  uploadFileToDriveBackend,
  type DriveStatusResponse,
} from '../services/apiService';
import { formatUserFriendlyError } from '../lib/firestoreErrors';
import {
  buildWhatsappLink,
  formatFileSize,
  sanitizeExternalUrl,
  validateOrderInput,
} from '../utils/studioLogic';
import { SectionHeader } from '../components/SectionHeader';

export function CheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, authReady, customerProfile, authError, signInWithGoogle, refreshCustomerProfile } =
    useAuth();
  const { services, siteSettings, pushToast } = useStudioData();

  const initialServiceSlug = searchParams.get('service') || '';

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState('');
  const [quantityEstimate, setQuantityEstimate] = useState(1);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectBrief, setProjectBrief] = useState('');
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [referenceUrl, setReferenceUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatusResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{
    orderCode: string;
    serviceTitle: string;
    estimatedPriceLabel: string;
    projectTitle: string;
  } | null>(null);

  // Resolve service selection from URL param (?service=slug)
  useEffect(() => {
    if (services.length === 0) return;
    const match = services.find(
      (s) => s.slug === initialServiceSlug || s.id === initialServiceSlug
    );
    if (match) {
      setSelectedServiceId(match.id);
    } else if (!selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, initialServiceSlug, selectedServiceId]);

  const hasPrefilledWhatsappRef = useRef(false);

  useEffect(() => {
    if (!hasPrefilledWhatsappRef.current && customerProfile?.whatsapp) {
      setWhatsapp(customerProfile.whatsapp);
      hasPrefilledWhatsappRef.current = true;
    }
  }, [customerProfile]);

  useEffect(() => {
    void fetchDriveIntegrationStatus().then(setDriveStatus);
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || services[0] || null,
    [services, selectedServiceId]
  );

  function handleServiceChange(newId: string) {
    setSelectedServiceId(newId);
    const found = services.find((s) => s.id === newId);
    if (found) {
      setSearchParams({ service: found.slug }, { replace: true });
    }
  }

  async function handleGoogleLogin() {
    setSigningIn(true);
    try {
      const signedUser = await signInWithGoogle();
      if (signedUser) {
        pushToast({
          type: 'success',
          title: 'Login Google Berhasil',
          description: `Selamat datang, ${signedUser.displayName || signedUser.email}. Lanjutkan pengisian checkout.`,
        });
      }
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedService) return;

    const validation = validateOrderInput({
      customerName: user.displayName || 'Pelanggan',
      customerEmail: user.email || '',
      customerWhatsapp: whatsapp,
      serviceId: selectedService.id,
      quantityEstimate,
      projectTitle,
      projectBrief,
      deadline,
    });

    if (referenceUrl.trim() && !sanitizeExternalUrl(referenceUrl)) {
      validation.valid = false;
      validation.errors.referenceUrl = 'Gunakan tautan referensi http:// atau https:// yang valid.';
    }

    setErrors(validation.errors);
    if (!validation.valid) return;

    setSubmitting(true);
    try {
      let attachmentName: string | undefined;
      let attachmentDriveFileId: string | undefined;
      let attachmentUrl: string | undefined = referenceUrl.trim()
        ? sanitizeExternalUrl(referenceUrl)
        : undefined;

      // Optional private attachment upload via Google Drive API
      if (selectedFile) {
        if (driveStatus?.configured) {
          const uploaded = await uploadFileToDriveBackend({
            file: selectedFile,
            visibility: 'private',
            usage: 'order_attachment',
          });
          attachmentName = uploaded.fileName;
          attachmentDriveFileId = uploaded.fileId;
          attachmentUrl = uploaded.proxyUrl;

          await saveMediaMetadata({
            fileId: uploaded.fileId,
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
            visibility: 'private',
            usage: 'order_attachment',
            altText: `Lampiran pesanan ${projectTitle.slice(0, 80)}`,
            ownerUid: user.uid,
          });
        } else {
          attachmentName = `${selectedFile.name} (kirim ulang via WhatsApp setelah konfirmasi)`;
        }
      }

      // 1. Validate & obtain unique order code from backend API
      const prepared = await requestValidatedOrderCode({
        serviceId: selectedService.id,
        customerWhatsapp: whatsapp,
        projectTitle,
        projectBrief,
        deadline,
        quantityEstimate,
      });

      // 2. Save/update customer profile in Firestore
      await upsertCustomerProfile({
        uid: user.uid,
        displayName: user.displayName || 'Pelanggan',
        email: user.email || '',
        photoURL: user.photoURL || '',
        whatsapp,
      });
      await refreshCustomerProfile();

      // 3. Create order document in Firestore (status locked to menunggu_konfirmasi, finalPrice null)
      await createOrderInFirestore({
        orderCode: prepared.orderCode,
        customerUid: user.uid,
        customerName: user.displayName || 'Pelanggan',
        customerEmail: user.email || '',
        customerWhatsapp: whatsapp,
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        estimatedPriceLabel: selectedService.priceLabel,
        quantityEstimate,
        projectTitle,
        projectBrief,
        deadline,
        attachmentName,
        attachmentDriveFileId,
        attachmentUrl,
      });

      setCreatedOrder({
        orderCode: prepared.orderCode,
        serviceTitle: selectedService.title,
        estimatedPriceLabel: selectedService.priceLabel,
        projectTitle,
      });

      pushToast({
        type: 'success',
        title: `Pesanan ${prepared.orderCode} Tersimpan`,
        description: 'Admin akan segera meninjau brief Anda dan mengonfirmasi biaya final.',
      });
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Gagal Menyimpan Pesanan',
        description: formatUserFriendlyError(error, 'Terjadi kesalahan saat memproses checkout.'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nb-section">
      <div className="nb-container space-y-6">
        <SectionHeader
          asPageTitle
          kicker="Formulir Pemesanan"
          title="Checkout Layanan Digital"
          subtitle="Lengkapi detail kebutuhan pekerjaan Anda. Harga final tidak ditagihkan otomatis dan akan dikonfirmasi terlebih dahulu oleh admin OSAMA CREATIVE STUDIO."
        />

        {/* Success Confirmation View */}
        {createdOrder ? (
          <div className="nb-card p-6 sm:p-7 space-y-5 max-w-xl">
            <div className="w-11 h-11 bg-[#0F3D3A] text-[#F3C95B] border-2 border-[#171717] nb-shadow-sm flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#0F3D3A]">Pesanan Berhasil Dicatat</p>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#171717]">
                Kode Pesanan:{' '}
                <span className="font-mono text-[#6C151E]">{createdOrder.orderCode}</span>
              </h2>
              <p className="text-sm text-[#404040] leading-relaxed">
                Pesanan Anda untuk layanan <strong>{createdOrder.serviceTitle}</strong> (
                {createdOrder.projectTitle}) sudah masuk ke dashboard admin dengan status{' '}
                <strong>Menunggu Konfirmasi</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] space-y-1 text-sm">
              <p className="text-[11px] text-[#525252]">Estimasi awal katalog</p>
              <p className="font-mono font-bold text-[#0F3D3A] tabular-nums">
                {createdOrder.estimatedPriceLabel}
              </p>
              <p className="text-xs text-[#404040]">
                Biaya final akan ditetapkan setelah admin meninjau brief Anda.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link to="/pesanan-saya" className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm">
                Pantau di Riwayat Pesanan
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={buildWhatsappLink(
                  siteSettings.whatsappNumber,
                  `Halo Admin OSAMA CREATIVE STUDIO, saya baru saja mengirim pesanan dengan kode ${createdOrder.orderCode} (${createdOrder.serviceTitle} - ${createdOrder.projectTitle}). Mohon konfirmasi estimasi biaya finalnya.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="nb-btn nb-btn-mustard px-4 py-2 text-xs sm:text-sm"
              >
                Konfirmasi Cepat via WhatsApp
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Main Column: Auth Gate or Checkout Form */}
            <div className="lg:col-span-8">
              {!authReady ? (
                <div className="nb-card p-6 animate-pulse space-y-3.5">
                  <div className="h-5 w-48 bg-[#E5E5C7]" />
                  <div className="h-28 w-full bg-[#E5E5C7]" />
                </div>
              ) : !user ? (
                <div className="nb-card p-5 sm:p-6 space-y-4">
                  <div className="w-10 h-10 bg-[#F3C95B] border-2 border-[#171717] nb-shadow-sm flex items-center justify-center">
                    <LogIn className="w-5 h-5 text-[#171717]" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
                      Masuk dengan Google untuk Melanjutkan Checkout
                    </h2>
                    <p className="text-sm text-[#404040] leading-relaxed">
                      Login Google diperlukan hanya pada tahap pemesanan agar nama dan email Anda
                      terisi otomatis serta riwayat pesanan terlindungi khusus untuk akun Anda.
                      Setelah berhasil masuk, layanan yang Anda pilih tetap tersimpan.
                    </p>
                  </div>

                  {selectedService && (
                    <div className="p-3.5 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-[#525252]">Layanan terpilih</p>
                        <p className="font-display font-bold text-sm sm:text-base text-[#171717]">
                          {selectedService.title}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-xs sm:text-sm text-[#0F3D3A] tabular-nums">
                        {selectedService.priceLabel}
                      </p>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3 bg-[#6C151E] text-[#F8F8E1] border-2 border-[#171717] rounded-[4px] text-xs sm:text-sm">
                      {authError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={signingIn}
                      onClick={handleGoogleLogin}
                      className="nb-btn nb-btn-primary nb-btn-md w-full sm:w-auto"
                    >
                      <LogIn className="w-4 h-4" />
                      {signingIn ? 'Membuka Google Sign-In...' : 'Masuk dengan Akun Google'}
                    </button>
                    <Link to="/layanan" className="nb-btn nb-btn-surface nb-btn-md w-full sm:w-auto">
                      Ganti Layanan
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitOrder} noValidate className="nb-card p-5 sm:p-6 space-y-5">
                  <div className="pb-4 border-b-2 border-[#171717]/15 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-display font-bold text-base sm:text-lg text-[#171717]">
                        1. Identitas Pelanggan (dari Google)
                      </h2>
                      <span className="text-xs font-medium text-[#0F3D3A]">
                        Terverifikasi via Google Sign-In
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label htmlFor="checkout-name" className="block text-xs font-semibold">
                          Nama Lengkap
                        </label>
                        <input
                          id="checkout-name"
                          type="text"
                          value={user.displayName || 'Pelanggan Google'}
                          readOnly
                          className="nb-input bg-[#F8F8E1] text-[#404040]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="checkout-email" className="block text-xs font-semibold">
                          Email Google
                        </label>
                        <input
                          id="checkout-email"
                          type="email"
                          value={user.email || ''}
                          readOnly
                          className="nb-input bg-[#F8F8E1] text-[#404040]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="checkout-whatsapp" className="block text-xs font-semibold">
                        Nomor WhatsApp Aktif{' '}
                        <span className="font-normal text-[#525252]">(Opsional)</span>
                      </label>
                      <input
                        id="checkout-whatsapp"
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Contoh: 081234567890 (boleh dikosongkan)"
                        className="nb-input"
                      />
                      <p className="text-[11px] text-[#525252]">
                        Opsional — jika diisi, admin dapat menghubungi Anda lebih cepat via
                        WhatsApp untuk konfirmasi brief dan biaya final.
                      </p>
                      {errors.customerWhatsapp && (
                        <p className="text-xs font-medium text-[#6C151E]">
                          {errors.customerWhatsapp}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <h2 className="font-display font-bold text-base sm:text-lg text-[#171717]">
                      2. Detail Kebutuhan Proyek
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2 space-y-1">
                        <label htmlFor="checkout-service" className="block text-xs font-semibold">
                          Layanan yang Dipilih <span className="text-[#6C151E]">*</span>
                        </label>
                        <select
                          id="checkout-service"
                          value={selectedServiceId}
                          onChange={(e) => handleServiceChange(e.target.value)}
                          className="nb-input"
                        >
                          {services.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              {srv.title} ({srv.priceLabel})
                            </option>
                          ))}
                        </select>
                        {errors.serviceId && (
                          <p className="text-xs font-medium text-[#6C151E]">{errors.serviceId}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="checkout-qty" className="block text-xs font-semibold">
                          Estimasi Jumlah ({selectedService?.priceUnit || 'unit'})
                        </label>
                        <input
                          id="checkout-qty"
                          type="number"
                          min={1}
                          max={1000}
                          value={quantityEstimate}
                          onChange={(e) => setQuantityEstimate(Number(e.target.value))}
                          className="nb-input font-mono tabular-nums"
                          required
                        />
                        {errors.quantityEstimate && (
                          <p className="text-xs font-medium text-[#6C151E]">
                            {errors.quantityEstimate}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2 space-y-1">
                        <label htmlFor="checkout-title" className="block text-xs font-semibold">
                          Judul Proyek <span className="text-[#6C151E]">*</span>
                        </label>
                        <input
                          id="checkout-title"
                          type="text"
                          value={projectTitle}
                          onChange={(e) => setProjectTitle(e.target.value)}
                          placeholder="Contoh: Poster Kajian Akbar Ramadhan 1448H"
                          className="nb-input"
                          required
                        />
                        {errors.projectTitle && (
                          <p className="text-xs font-medium text-[#6C151E]">
                            {errors.projectTitle}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="checkout-deadline" className="block text-xs font-semibold">
                          Target Tenggat <span className="text-[#6C151E]">*</span>
                        </label>
                        <input
                          id="checkout-deadline"
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="nb-input font-mono"
                          required
                        />
                        {errors.deadline && (
                          <p className="text-xs font-medium text-[#6C151E]">{errors.deadline}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="checkout-brief" className="block text-xs font-semibold">
                        Deskripsi Pekerjaan & Brief <span className="text-[#6C151E]">*</span>
                      </label>
                      <textarea
                        id="checkout-brief"
                        rows={4}
                        value={projectBrief}
                        onChange={(e) => setProjectBrief(e.target.value)}
                        placeholder="Jelaskan konsep, ukuran/durasi/jumlah halaman, referensi warna, audiens target, dan informasi wajib yang harus dimuat..."
                        className="nb-input resize-y"
                        required
                      />
                      {errors.projectBrief && (
                        <p className="text-xs font-medium text-[#6C151E]">{errors.projectBrief}</p>
                      )}
                    </div>

                    {/* Optional Private Attachment */}
                    <div className="p-3.5 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-semibold text-xs sm:text-sm text-[#171717] flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-[#0F3D3A]" />
                          Lampiran Brief (Opsional)
                        </p>
                        <span className="text-[11px] text-[#525252]">Disimpan Privat</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor="checkout-file"
                            className="inline-flex items-center gap-2 nb-btn nb-btn-surface nb-btn-sm cursor-pointer"
                          >
                            <FileUp className="w-3.5 h-3.5" />
                            Pilih Berkas Lampiran
                          </label>
                          <span className="text-[11px] text-[#525252]">
                            PDF, DOCX, PNG, JPG · maks 8 MB
                          </span>
                        </div>
                        <input
                          id="checkout-file"
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="sr-only"
                        />

                        {selectedFile && (
                          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border-2 border-[#171717] rounded-[4px] text-xs">
                            <span className="truncate font-medium">
                              {selectedFile.name} ({formatFileSize(selectedFile.size)})
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedFile(null)}
                              aria-label="Hapus lampiran"
                              className="p-1 hover:text-[#6C151E]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {!driveStatus?.configured && selectedFile && (
                          <p className="text-xs text-[#6C151E]">
                            Penyimpanan unggahan otomatis Google Drive belum aktif di server ini;
                            nama berkas akan dicatat pada pesanan dan dapat Anda kirimkan juga
                            melalui WhatsApp admin.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1 pt-2 border-t border-[#171717]/15">
                        <label htmlFor="checkout-ref-url" className="block text-xs font-semibold">
                          Atau Tautan Materi Referensi (Opsional)
                        </label>
                        <input
                          id="checkout-ref-url"
                          type="url"
                          value={referenceUrl}
                          onChange={(e) => setReferenceUrl(e.target.value)}
                          placeholder="https://drive.google.com/... atau tautan referensi lainnya"
                          className="nb-input"
                        />
                        {errors.referenceUrl && (
                          <p className="text-xs font-medium text-[#6C151E]">
                            {errors.referenceUrl}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#171717]/15">
                    <p className="text-xs text-[#525252] max-w-md">
                      Dengan mengirim pesanan ini, Anda menyetujui bahwa harga katalog adalah
                      estimasi awal dan biaya final akan dikonfirmasi oleh admin.
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="nb-btn nb-btn-primary nb-btn-md w-full sm:w-auto"
                    >
                      {submitting ? 'Memproses Pesanan...' : 'Kirim Pesanan Sekarang'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right Sidebar Summary */}
            <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
              {selectedService && (
                <div className="nb-card p-4 sm:p-5 space-y-3">
                  <p className="nb-kicker">Ringkasan Layanan</p>
                  <h2 className="font-display font-bold text-lg text-[#171717]">
                    {selectedService.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
                    {selectedService.shortDescription}
                  </p>
                  <div className="p-3.5 bg-[#F8F8E1] border-2 border-[#171717] rounded-[4px] space-y-0.5">
                    <p className="text-[11px] text-[#525252]">Estimasi awal</p>
                    <p className="font-mono font-bold text-base sm:text-lg text-[#0F3D3A] tabular-nums">
                      {selectedService.priceLabel}
                    </p>
                    <p className="text-xs text-[#525252] pt-0.5">
                      Estimasi pengerjaan: {selectedService.estimatedTurnaround}
                    </p>
                  </div>
                </div>
              )}

              <div className="nb-card-cream p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-[#0F3D3A]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <h3 className="font-display font-bold text-sm text-[#171717]">
                    Jaminan Transparansi
                  </h3>
                </div>
                <p className="text-xs text-[#404040] leading-relaxed">
                  Belum ada pembayaran otomatis pada tahap ini. Setelah kode pesanan diterbitkan,
                  admin akan meninjau kebutuhan Anda dan mengonfirmasi biaya final secara resmi.
                </p>
                {user && (
                  <Link
                    to="/pesanan-saya"
                    className="inline-flex items-center gap-1.5 font-display font-semibold text-xs text-[#0F3D3A] underline underline-offset-4"
                  >
                    Lihat Riwayat Pesanan Saya
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

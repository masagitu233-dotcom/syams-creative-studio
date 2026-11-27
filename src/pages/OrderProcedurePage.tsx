import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Lock, MessageSquare } from 'lucide-react';
import { SectionHeader } from '../components/SectionHeader';
import { Reveal } from '../components/Reveal';
import { VelocityLayer } from '../components/ScrollMotionPrimitives';

const DETAILED_STEPS = [
  {
    number: '01',
    title: 'Pilih Layanan di Katalog',
    summary:
      'Pelajari detail lima layanan utama atau katalog produk digital kami beserta estimasi biayanya.',
    notes: [
      'Bebas dijelajahi tanpa login untuk melihat katalog dan portofolio.',
      'Estimasi durasi serta hasil akhir tercantum jelas di halaman detail.',
    ],
  },
  {
    number: '02',
    title: 'Masuk Google Saat Checkout',
    summary:
      'Login akun Google hanya diminta saat checkout agar pesanan tersimpan aman pada riwayat akun Anda.',
    notes: [
      'Nama dan email terisi otomatis dari akun Google.',
      'Layanan terpilih tetap tersimpan setelah Anda masuk.',
    ],
  },
  {
    number: '03',
    title: 'Lengkapi Brief & Tenggat',
    summary:
      'Isi nomor WhatsApp aktif, judul proyek, uraian kebutuhan, target tenggat, dan lampiran opsional.',
    notes: [
      'Lampiran brief disimpan privat untuk Anda dan admin studio.',
      'Kode pesanan unik (SCS-YYYYMMDD-XXXXXX) diterbitkan otomatis.',
    ],
  },
  {
    number: '04',
    title: 'Konfirmasi Harga Final',
    summary:
      'Admin meninjau brief, menghubungi via WhatsApp, dan menetapkan biaya final sebelum proses berjalan.',
    notes: [
      'Tidak ada potongan otomatis sebelum Anda menyetujui biaya final.',
      'Pesanan dapat dibatalkan selama status masih Menunggu Konfirmasi.',
    ],
  },
  {
    number: '05',
    title: 'Pengerjaan & Serah Terima',
    summary:
      'Pantau status pengerjaan secara real-time di Riwayat Pesanan hingga file final diserahkan.',
    notes: [
      'Termasuk 2 kali revisi minor agar hasil tepat sesuai kebutuhan.',
      'File final dikirim dalam format siap pakai dan siap sunting.',
    ],
  },
];

export function OrderProcedurePage() {
  return (
    <div className="nb-section">
      <div className="nb-container space-y-6">
        <Reveal>
          <SectionHeader
            asPageTitle
            kicker="Prosedur Pemesanan"
            title="Alur Pemesanan yang Jelas, Aman, dan Transparan"
            subtitle="Setiap tahap tercatat rapi mulai dari pengisian brief, konfirmasi harga oleh admin, hingga serah terima hasil akhir."
          />
        </Reveal>

        {/* Symmetrical 2-col / 3-col Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {DETAILED_STEPS.map((step, idx) => (
            <VelocityLayer
              key={step.number}
              speed={[-0.08, 0.06, -0.08][idx % 3]}
              velocityFactor={0.55 + (idx % 3) * 0.28}
              maxOffsetPx={16}
              maxVelocityShiftPx={22}
              maxSkewDeg={1.0}
              className="h-full"
            >
              <div className="nb-card p-4 sm:p-5 flex flex-col gap-3 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 shrink-0 bg-[#0F3D3A] text-[#F3C95B] border-2 border-[#171717] rounded-[2px] flex items-center justify-center font-mono font-bold text-xs">
                    {step.number}
                  </div>
                  <h2 className="font-display font-bold text-base text-[#171717] leading-snug">
                    {step.title}
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">{step.summary}</p>

                <ul className="space-y-1.5 pt-2.5 mt-auto border-t border-[#171717]/15">
                  {step.notes.map((note, nIdx) => (
                    <li key={nIdx} className="flex items-start gap-2 text-xs text-[#404040]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0F3D3A] shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </VelocityLayer>
          ))}

          {/* 6th Balanced CTA Slot in 3x2 Grid */}
          <div className="bg-[#0F3D3A] text-[#F8F8E1] border-2 border-[#171717] nb-shadow rounded-[4px] p-4 sm:p-5 flex flex-col justify-between gap-4 h-full">
            <div className="space-y-1.5">
              <p className="font-mono text-xs text-[#F3C95B]">Siap Memulai?</p>
              <h2 className="font-display font-bold text-lg leading-snug">
                Kirim Brief & Dapatkan Kode Pesanan Anda
              </h2>
              <p className="text-xs text-[#F8F8E1]/85 leading-relaxed">
                Admin akan segera meninjau kebutuhan proyek dan mengonfirmasi estimasi biaya
                finalnya.
              </p>
            </div>
            <Link to="/checkout" className="nb-btn nb-btn-mustard nb-btn-md w-full">
              Mulai Checkout
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Compact Symmetrical Trust Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <div className="nb-card-cream p-4 sm:p-5 flex items-start gap-3 h-full">
            <div className="w-8 h-8 shrink-0 bg-[#8ACCD5] border-2 border-[#171717] rounded-[2px] flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#171717]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-sm sm:text-base text-[#171717]">
                Privasi Data & Berkas Terjamin
              </h3>
              <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
                Nomor WhatsApp, detail brief, dan lampiran hanya dapat diakses oleh akun pelanggan
                pemilik pesanan dan administrator resmi studio.
              </p>
            </div>
          </div>

          <div className="nb-card-cream p-4 sm:p-5 flex items-start gap-3 h-full">
            <div className="w-8 h-8 shrink-0 bg-[#F3C95B] border-2 border-[#171717] rounded-[2px] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#171717]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-sm sm:text-base text-[#171717]">
                Konfirmasi Manual Tanpa Biaya Tersembunyi
              </h3>
              <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
                Tidak ada tagihan otomatis sebelum Anda menyetujui rincian biaya final yang
                disampaikan admin studio.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

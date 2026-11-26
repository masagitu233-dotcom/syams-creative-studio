import type { FaqItem, PortfolioItem, ServiceItem, SiteSettings } from '../types/studio';

export const STUDIO_IMAGES = {
  hero: '/src/assets/images/hero_syams_studio_1795683063310.jpg',
  webApp: '/src/assets/images/service_web_app_1795683063620.jpg',
  video: '/src/assets/images/service_video_editing_1795683063673.jpg',
  poster: '/src/assets/images/service_poster_design_1795683063144.jpg',
  ppt: '/src/assets/images/service_ppt_learning_1795683062822.jpg',
  speech: '/src/assets/images/service_speech_script_1795683062509.jpg',
} as const;

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  id: 'general',
  studioName: 'SYAMS CREATIVE STUDIO',
  slogan: 'Ide Kreatif, Solusi Digital.',
  heroHeadline: 'Ide Kreatif, Solusi Digital untuk Karya yang Tegas dan Berdampak.',
  heroSubheadline:
    'Dari pembuatan website, editing video, desain poster, materi presentasi edukatif, hingga penyusunan naskah pidato dan khutbah—semua dikerjakan dengan standar editorial modern dan alur pemesanan transparan.',
  aboutSummary:
    'SYAMS CREATIVE STUDIO adalah studio jasa digital independen yang membantu pelajar, pendidik, organisasi, lembaga dakwah, dan pelaku usaha membangun kehadiran digital yang rapi, komunikatif, dan mudah diakses.',
  aboutMission:
    'Menghadirkan layanan kreatif berkualitas studio dengan estimasi harga terjangkau, komunikasi terbuka, serta standar pengerjaan yang tepat waktu tanpa proses berbelit.',
  whatsappNumber: '6285156002480',
  email: 'halo@syamscreativestudio.id',
  address: 'Yogyakarta, Daerah Istimewa Yogyakarta, Indonesia',
  operatingHours: 'Senin–Sabtu, 08.30–20.30 WIB',
  instagramUrl: 'https://instagram.com/syamscreativestudio',
  tiktokUrl: 'https://tiktok.com/@syamscreativestudio',
  youtubeUrl: 'https://youtube.com/@syamscreativestudio',
  linkedinUrl: 'https://linkedin.com/company/syams-creative-studio',
};

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'website-aplikasi',
    slug: 'website-aplikasi',
    title: 'Pembuatan Website & Aplikasi',
    category: 'web_app',
    shortDescription:
      'Landing page, situs profil lembaga, portofolio personal, hingga aplikasi web interaktif yang responsif dan cepat diakses di semua perangkat.',
    fullDescription:
      'Kami merancang dan membangun website serta aplikasi berbasis web dengan struktur kode bersih, tampilan responsif mobile-first, dan navigasi intuitif. Cocok untuk profil organisasi, katalog UMKM, acara kampus, tugas proyek web, maupun sistem informasi ringan. Harga final dikonfirmasi admin sesuai jumlah halaman dan fitur yang disepakati.',
    priceMin: 50000,
    priceMax: 300000,
    priceUnit: 'proyek',
    priceLabel: 'Rp50.000–Rp300.000',
    estimatedTurnaround: '3–7 hari kerja',
    deliverables: [
      'Desain antarmuka responsif desktop & mobile',
      'Kode sumber rapi & siap publikasi',
      'Integrasi formulir kontak atau tautan WhatsApp',
      'Optimasi kecepatan muat halaman & SEO dasar',
      'Panduan penggunaan serta 2 kali revisi minor',
    ],
    accentColor: '#0F3D3A',
    imageUrl: STUDIO_IMAGES.webApp,
    sortOrder: 1,
    isFeatured: true,
    isPublished: true,
  },
  {
    id: 'editing-video-konten',
    slug: 'editing-video-konten',
    title: 'Editing Video & Konten Digital',
    category: 'video',
    shortDescription:
      'Penyuntingan video profil, reels, dokumentasi acara, konten edukasi, dan video YouTube dengan ritme dinamis, subtitle rapi, serta audio jernih.',
    fullDescription:
      'Ubah rekaman mentah menjadi tayangan profesional yang menarik perhatian audiens. Layanan meliputi pemotongan presisi, koreksi warna dasar, animasi teks dan lower-third, penyelarasan musik latar bebas hak cipta, hingga subtitle bersih dalam format rasio 16:9 maupun vertikal 9:16.',
    priceMin: 25000,
    priceMax: 35000,
    priceUnit: 'per menit',
    priceLabel: 'Rp25.000–Rp35.000 per menit',
    estimatedTurnaround: '1–3 hari kerja',
    deliverables: [
      'Cutting, transisi halus, dan ritme storytelling',
      'Color grading dasar & penyeimbangan audio',
      'Motion text, title card, dan subtitle rapi',
      'Ekspor Full HD 1080p sesuai format platform',
      '2 kali revisi minor sebelum file final dikirim',
    ],
    accentColor: '#6C151E',
    imageUrl: STUDIO_IMAGES.video,
    sortOrder: 2,
    isFeatured: true,
    isPublished: true,
  },
  {
    id: 'poster-desain-grafis',
    slug: 'poster-desain-grafis',
    title: 'Pembuatan Poster & Desain Grafis',
    category: 'desain',
    shortDescription:
      'Desain poster acara, pamflet kajian, konten feed media sosial, banner promosi, dan infografis dengan hierarki tipografi yang kuat.',
    fullDescription:
      'Setiap desain grafis kami susun dari riset pesan utama agar langsung terbaca dalam hitungan detik. Baik untuk kebutuhan cetak beresolusi tinggi (A3/A4/X-banner) maupun publikasi digital Instagram dan WhatsApp, visual dibuat orisinal dengan komposisi tegas dan konsisten dengan identitas acara Anda.',
    priceMin: 15000,
    priceMax: 30000,
    priceUnit: 'per desain',
    priceLabel: 'Rp15.000–Rp30.000 per desain',
    estimatedTurnaround: '1–2 hari kerja',
    deliverables: [
      'File siap unggah (PNG/JPG resolusi tinggi)',
      'File siap cetak CMYK/PDF (sesuai permintaan)',
      'Komposisi tipografi dan warna terstruktur',
      'Penyesuaian rasio ukuran jika dibutuhkan',
      '2 kali revisi minor tata letak atau teks',
    ],
    accentColor: '#F3C95B',
    imageUrl: STUDIO_IMAGES.poster,
    sortOrder: 3,
    isFeatured: true,
    isPublished: true,
  },
  {
    id: 'materi-pembelajaran-ppt',
    slug: 'materi-pembelajaran-ppt',
    title: 'Pembuatan Materi Pembelajaran (PowerPoint/PPT)',
    category: 'presentasi',
    shortDescription:
      'Slide presentasi edukatif, materi ajar guru dan dosen, sidang skripsi, serta deck pelatihan yang visual, terstruktur, dan mudah dipahami.',
    fullDescription:
      'Kami mengubah draf materi padat menjadi slide presentasi yang bersih, informatif, dan nyaman disimak. Dilengkapi bagan visual, ikonografi konsisten, transisi proporsional, serta format PPTX yang tetap mudah Anda sunting kembali kapan saja.',
    priceMin: 15000,
    priceMax: 15000,
    priceUnit: 'per slide',
    priceLabel: 'Rp15.000 per slide',
    estimatedTurnaround: '1–3 hari kerja',
    deliverables: [
      'File presentasi editable (.pptx) & salinan PDF',
      'Visualisasi poin menjadi diagram dan infografis',
      'Tata letak bersih tanpa teks bertumpuk',
      'Skema warna selaras dengan topik materi',
      '2 kali revisi minor isi dan penempatan elemen',
    ],
    accentColor: '#8ACCD5',
    imageUrl: STUDIO_IMAGES.ppt,
    sortOrder: 4,
    isFeatured: true,
    isPublished: true,
  },
  {
    id: 'naskah-pidato-khutbah-ceramah',
    slug: 'naskah-pidato-khutbah-ceramah',
    title: 'Penyusunan Naskah Pidato, Khutbah & Ceramah',
    category: 'naskah',
    shortDescription:
      'Penulisan naskah pidato resmi, khutbah Jumat/hari raya, sambutan acara, dan materi ceramah yang runtut, santun, serta menyentuh audiens.',
    fullDescription:
      'Disusun dengan bahasa Indonesia yang mengalir, beretika, dan tepat sasaran sesuai profil audiens serta durasi penyampaian. Untuk naskah khutbah dan ceramah, rujukan ayat maupun hikmah dicantumkan secara rapi lengkap dengan tanda jeda intonasi agar nyaman dibawakan di atas mimbar.',
    priceMin: 10000,
    priceMax: 10000,
    priceUnit: 'per halaman',
    priceLabel: 'Rp10.000 per halaman',
    estimatedTurnaround: '1–2 hari kerja',
    deliverables: [
      'Naskah lengkap dalam format DOCX dan PDF siap cetak',
      'Struktur pembukaan, isi sistematis, dan penutup kuat',
      'Penyesuaian gaya bahasa (formal, akademis, atau populer)',
      'Estimasi durasi baca & penanda penekanan intonasi',
      '2 kali revisi minor redaksi',
    ],
    accentColor: '#0F3D3A',
    imageUrl: STUDIO_IMAGES.speech,
    sortOrder: 5,
    isFeatured: true,
    isPublished: true,
  },
];

export const INITIAL_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'portal-madrasah-al-hikmah',
    title: 'Portal Informasi & PPDB Madrasah Al-Hikmah',
    clientName: 'Yayasan Pendidikan Al-Hikmah',
    category: 'web_app',
    year: '2026',
    summary:
      'Website profil lembaga pendidikan lengkap dengan alur informasi pendaftaran siswa baru dan jadwal kegiatan.',
    challenge:
      'Orang tua calon siswa kesulitan menemukan informasi syarat pendaftaran dan biaya yang tersebar di pesan grup.',
    outcome:
      'Website satu pintu yang cepat diakses melalui ponsel dengan formulir pertanyaan terstruktur langsung ke panitia.',
    metrics: 'Waktu respons panitia 3x lebih cepat selama periode PPDB 2026',
    imageUrl: STUDIO_IMAGES.webApp,
    isFeatured: true,
    isPublished: true,
    sortOrder: 1,
  },
  {
    id: 'video-profil-festival-literasi',
    title: 'Video Dokumentasi & Highlight Festival Literasi Pemuda',
    clientName: 'Komunitas Literasi Nusantara',
    category: 'video',
    year: '2026',
    summary:
      'Video highlight berdurasi 4 menit dan 3 potongan reels vertikal untuk publikasi pasca-acara.',
    challenge:
      'Materi rekaman berasal dari 3 kamera berbeda dengan pencahayaan tidak seragam dan tenggat publikasi 48 jam.',
    outcome:
      'Penyelarasan warna konsisten, motion title tegas, dan paket konten siap unggah untuk YouTube serta Instagram.',
    metrics: '42.000+ penayangan organik dalam 14 hari pertama',
    imageUrl: STUDIO_IMAGES.video,
    isFeatured: true,
    isPublished: true,
    sortOrder: 2,
  },
  {
    id: 'seri-poster-ramadhan-produktif',
    title: 'Seri Poster Kajian & Kalender Ramadhan Produktif',
    clientName: 'Masjid Kampus Cendekia',
    category: 'desain',
    year: '2026',
    summary:
      'Paket 12 poster tematik jadwal kajian, infografis zakat, dan spanduk cetak berkonsep neo-editorial.',
    challenge:
      'Publikasi sebelumnya kurang seragam sehingga jadwal kajian sulit dibedakan oleh jamaah mahasiswa.',
    outcome:
      'Sistem grid tipografi konsisten dengan kontras tinggi yang tetap terbaca jelas pada layar kecil maupun cetak A2.',
    metrics: 'Kenaikan partisipasi kajian 38% dibanding tahun sebelumnya',
    imageUrl: STUDIO_IMAGES.poster,
    isFeatured: true,
    isPublished: true,
    sortOrder: 3,
  },
  {
    id: 'deck-kurikulum-ekonomi-syariah',
    title: 'Modul Presentasi Interaktif Ekonomi Digital',
    clientName: 'Fakultas Ekonomi & Bisnis',
    category: 'presentasi',
    year: '2026',
    summary:
      '45 slide materi perkuliahan yang merangkum konsep pasar digital, studi kasus lokal, dan infografis data.',
    challenge:
      'Slide materi lama terlalu padat teks sehingga mahasiswa cepat kehilangan fokus saat kuliah daring maupun luring.',
    outcome:
      'Struktur 1 ide utama per slide dengan grafik perbandingan visual dan catatan pembicara di setiap bab.',
    metrics: 'Dipakai di 6 kelas paralel oleh 240+ mahasiswa',
    imageUrl: STUDIO_IMAGES.ppt,
    isFeatured: true,
    isPublished: true,
    sortOrder: 4,
  },
  {
    id: 'antologi-khutbah-pemuda',
    title: 'Naskah Khutbah Jumat & Ceramah Tematik Kepemudaan',
    clientName: 'Forum Dai Muda Yogyakarta',
    category: 'naskah',
    year: '2026',
    summary:
      'Penyusunan 10 naskah khutbah dan ceramah berdurasi 12–15 menit bertema etika digital, amanah, dan ilmu.',
    challenge:
      'Dibutuhkan bahasa yang membumi bagi generasi muda namun tetap menjaga kaidah rukun khutbah yang benar.',
    outcome:
      'Naskah siap baca dengan tata letak halaman lega, penanda jeda, dan sumber referensi yang jelas.',
    metrics: '10 naskah lengkap selesai dalam 5 hari kerja',
    imageUrl: STUDIO_IMAGES.speech,
    isFeatured: false,
    isPublished: true,
    sortOrder: 5,
  },
  {
    id: 'katalog-umkm-kopi-surya',
    title: 'Web Katalog & Pemesanan WhatsApp Kopi Surya',
    clientName: 'Surya Roastery',
    category: 'web_app',
    year: '2025',
    summary:
      'Situs katalog produk biji kopi pilihan lengkap dengan filter profil sangrai dan tombol pesan langsung.',
    challenge:
      'Pelanggan grosir kesulitan membandingkan varian produk melalui daftar PDF statis.',
    outcome:
      'Katalog web ringan dengan navigasi cepat yang mempermudah pelanggan memilih varian sebelum menghubungi admin.',
    metrics: 'Peningkatan pesan masuk pelanggan baru sebesar 55% dalam 2 bulan',
    imageUrl: STUDIO_IMAGES.webApp,
    isFeatured: false,
    isPublished: true,
    sortOrder: 6,
  },
];

export const INITIAL_FAQS: FaqItem[] = [
  {
    id: 'faq-estimasi-harga',
    question: 'Apakah harga yang tampil di katalog sudah merupakan harga final?',
    answer:
      'Harga yang tampil pada katalog merupakan estimasi awal sebagai panduan transparan. Harga final akan dikonfirmasi oleh admin SYAMS CREATIVE STUDIO melalui WhatsApp dan dashboard pesanan setelah kami meninjau detail brief, tingkat kerumitan, jumlah halaman/durasi, serta tenggat waktu yang Anda ajukan.',
    category: 'harga',
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: 'faq-cara-pesan',
    question: 'Apakah saya harus membuat akun untuk melihat layanan dan portofolio?',
    answer:
      'Tidak perlu. Seluruh halaman publik—katalog layanan, detail paket, portofolio, prosedur pemesanan, dan FAQ—dapat dijelajahi secara bebas. Login Google hanya diminta saat Anda hendak mengirim formulir checkout atau memantau riwayat pesanan pribadi Anda.',
    category: 'pemesanan',
    sortOrder: 2,
    isPublished: true,
  },
  {
    id: 'faq-revisi',
    question: 'Berapa kali revisi yang termasuk dalam setiap pesanan?',
    answer:
      'Setiap layanan menyertakan 2 kali revisi minor (seperti perbaikan teks, penyesuaian warna, tata letak ringan, atau pemotongan durasi singkat) agar hasil akhir sesuai ekspektasi Anda. Perubahan konsep besar di luar brief awal akan didiskusikan terlebih dahulu bersama admin.',
    category: 'revisi',
    sortOrder: 3,
    isPublished: true,
  },
  {
    id: 'faq-pembayaran',
    question: 'Bagaimana mekanisme pembayaran dilakukan?',
    answer:
      'Saat ini pembayaran belum menggunakan payment gateway otomatis. Setelah Anda mengirim pesanan dan admin mengonfirmasi harga final, instruksi pembayaran (transfer bank atau e-wallet resmi studio) akan disampaikan secara langsung melalui WhatsApp resmi kami.',
    category: 'harga',
    sortOrder: 4,
    isPublished: true,
  },
  {
    id: 'faq-lampiran-file',
    question: 'Bagaimana keamanan berkas materi atau lampiran yang saya kirimkan?',
    answer:
      'Lampiran brief pelanggan disimpan sebagai berkas privat yang terpisah dari media publik studio. Hanya Anda selaku pemilik pesanan dan administrator resmi SYAMS CREATIVE STUDIO yang memiliki akses untuk meninjau berkas tersebut.',
    category: 'teknis',
    sortOrder: 5,
    isPublished: true,
  },
  {
    id: 'faq-tenggat-cepat',
    question: 'Bisakah saya mengajukan pengerjaan dengan tenggat waktu mendesak (ekspres)?',
    answer:
      'Bisa, selama kapasitas jadwal tim pada hari tersebut tersedia. Cantumkan tanggal tenggat pada formulir checkout serta catatan kebutuhan mendesak pada kolom deskripsi agar admin dapat segera mengonfirmasi kesanggupan dan estimasi biayanya.',
    category: 'pemesanan',
    sortOrder: 6,
    isPublished: true,
  },
];

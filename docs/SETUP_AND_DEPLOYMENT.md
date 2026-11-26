# Dokumentasi Konfigurasi & Deployment — SYAMS CREATIVE STUDIO

Dokumen ini menjelaskan konfigurasi **Firebase Authentication & Cloud Firestore**, **Google Drive API melalui Netlify Functions**, **Environment Variables**, dan **Deployment ke Netlify**.

---

## 1. Konfigurasi Firebase & Pendaftaran Administrator Utama

1. Buka [Firebase Console](https://console.firebase.google.com/) dan pilih proyek Firebase aplikasi Anda.
2. Pastikan **Authentication → Sign-in method → Google** aktif dan domain produksi Netlify Anda telah ditambahkan ke daftar **Authorized domains**.
3. Pastikan **Cloud Firestore** aktif. Deploy aturan keamanan dan indeks komposit:
   - Aturan keamanan: `firestore.rules`
   - Indeks komposit: `firestore.indexes.json`
   - Skema koleksi: `firebase-blueprint.json`
4. **Mendaftarkan Administrator Utama Secara Manual (Wajib):**
   - Tidak ada pendaftaran administrator publik di aplikasi.
   - Masuk pertama kali menggunakan akun Google admin pada halaman `/admin` untuk melihat UID Firebase Anda (atau salin UID dari Firebase Console → Authentication → Users).
   - Buat dokumen pada koleksi `admins` dengan Document ID = `<ADMIN_UID>`:
     ```json
     {
       "uid": "<ADMIN_UID>",
       "email": "admin@domainanda.id",
       "displayName": "Admin Utama SYAMS",
       "role": "super_admin",
       "createdAt": "<Server Timestamp>"
     }
     ```
5. Setelah masuk ke `/admin`, tekan tombol **Inisialisasi Data Awal ke Firestore** untuk mengisi 5 layanan awal, portofolio, FAQ, dan pengaturan studio ke Firestore.

---

## 2. Konfigurasi Google Drive API (OAuth2 + Refresh Token)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan aktifkan **Google Drive API**.
2. Pada **APIs & Services → Credentials**, buat **OAuth 2.0 Client ID** bertipe *Web application*.
3. Tambahkan redirect URI: `https://developers.google.com/oauthplayground`.
4. Buka [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/), klik ikon pengaturan (gear), centang **Use your own OAuth credentials**, lalu masukkan `Client ID` dan `Client Secret`.
5. Pilih scope `https://www.googleapis.com/auth/drive.file`, lakukan otorisasi akun Google Drive studio, lalu tukarkan authorization code menjadi **Refresh Token**.
6. Buat dua folder terpisah di Google Drive studio:
   - Folder Media Publik (untuk gambar layanan, portofolio, ilustrasi) → salin ID folder ke `GOOGLE_DRIVE_PUBLIC_FOLDER_ID`.
   - Folder Berkas Privat (untuk lampiran brief pesanan pelanggan) → salin ID folder ke `GOOGLE_DRIVE_PRIVATE_FOLDER_ID`.
7. **Penting:** Jangan pernah menyimpan kredensial OAuth di frontend atau memberi awalan `VITE_`. Gambar publik diakses aman melalui `/api/media/:fileId` (Netlify Function `netlify/functions/media.ts`) dengan cache header aman, sedangkan berkas privat membutuhkan `Authorization: Bearer <Firebase ID Token>`.

---

## 3. Environment Variables di Netlify

Buka **Site Configuration → Environment Variables** di Netlify dan tambahkan variabel berikut (tanpa menaruh nilai rahasia di Git):

| Variabel | Scope | Keterangan |
| :--- | :--- | :--- |
| `GOOGLE_DRIVE_CLIENT_ID` | Functions | OAuth Client ID Google Drive API |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Functions | OAuth Client Secret Google Drive API |
| `GOOGLE_DRIVE_REDIRECT_URI` | Functions | Redirect URI OAuth2 |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Functions | Refresh token akun Google Drive studio |
| `GOOGLE_DRIVE_PUBLIC_FOLDER_ID` | Functions | ID folder Google Drive untuk aset publik |
| `GOOGLE_DRIVE_PRIVATE_FOLDER_ID` | Functions | ID folder Google Drive untuk lampiran privat |
| `ALLOWED_ORIGIN` | Functions | URL produksi situs (mis. `https://syamscreativestudio.netlify.app`) |

---

## 4. Deployment ke Netlify

1. Hubungkan repositori Git ke Netlify.
2. Pengaturan build dibaca otomatis dari `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
3. Verifikasi endpoint setelah deploy:
   - `GET /api/drive/status` → memastikan status konfigurasi Google Drive API.
   - `GET /api/media/<fileId>` → melayani media publik dengan `Cache-Control: public, max-age=86400`.
   - `POST /api/orders/prepare` → validasi server-side & pembuatan kode pesanan `SCS-YYYYMMDD-XXXXXX`.
4. Tambahkan domain Netlify ke **Firebase Console → Authentication → Settings → Authorized domains** agar popup Google Sign-In berjalan mulus.

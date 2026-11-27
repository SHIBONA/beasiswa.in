# beasiswa.in — agen pencari beasiswa (prototipe)

Prototipe **Cari Beasiswa** untuk satu pengguna di komputer lokal. Aplikasi menyimpan profil, riwayat, dan bookmark di SQLite tanpa server database terpisah.

## Jalankan

Gunakan Node.js 24.8+ pada lini 24 LTS (atau 22.22.3+ pada lini 22).

```bash
npm ci
npm start                # mode DEMO jika tidak ada API key
# buka http://localhost:3000 (server mendengarkan di 127.0.0.1)
```

Mode LIVE (agen Claude sungguhan, cari di web):

```bash
ANTHROPIC_API_KEY=sk-ant-... node server.mjs      # PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."; node server.mjs
```

Untuk mode **Firecrawl**, salin `.env.example` ke `.env` (`Copy-Item .env.example .env` di PowerShell), isi `FIRECRAWL_API_KEY` dengan key akun Anda, lalu jalankan ulang aplikasi. Mode Firecrawl aktif otomatis. Aplikasi menjalankan 5 kueri, memeriksa maksimal 10 halaman, mencocokkan kutipan dengan teks sumber, menghitung skor, lalu mencari artikel awardee untuk maksimal 5 program. Data hasil ekstraksi dapat dipakai ulang jika sumber diperiksa dalam 24 jam terakhir. Kartu menampilkan tanggal pemeriksaan saat tersedia. Kueri pencarian tetap memakai Firecrawl.

| Mode | Sumber hasil | Biaya |
|---|---|---|
| FIRECRAWL (prioritas) | Halaman web, kutipan yang ditemukan dalam teks sumber, dan artikel awardee | Kredit Firecrawl |
| DEMO (default) | 24 beasiswa contoh di `catalog.mjs`. **Deadline dan syarat merupakan data contoh.** | Gratis |
| LIVE | Claude + penelusuran web. URL hasil harus cocok dengan URL yang dikembalikan alat pencarian atau pembacaan halaman. | Token dan penggunaan alat Anthropic |

## Cakupan PRD

| ID | Status |
|---|---|
| S1 Profil beasiswa | ✅ form, validasi server, disimpan terpisah |
| + Upload CV | ✅ PDF → kolom profil terisi otomatis. PDF dibaca di browser dengan PDF.js dari dependensi lokal. Teks diproses di server lokal tanpa dikirim ke AI. |
| S2 Mulai pencarian + catatan | ✅ API balas `202` + `search_id`, jalan di background |
| S3 Status live | ✅ polling 1,2 dtk, langkah agen tampil satu per satu |
| S4 Hasil berskor | ✅ hingga 30 program dengan alasan kecocokan dan tautan sumber. Firecrawl menampilkan beasiswa dengan bukti jenjang dan negara tujuan, bukti mulai pendaftaran atau status sedang buka, serta batas pendaftaran yang belum lewat. Jika belum ada yang memenuhi, hasil kosong. |
| S5 Simpan | ✅ satu bookmark per program lintas pencarian. Sesuaikan CV tetap tersedia setelah riwayat asal dihapus. |
| S6 Riwayat | ✅ urut terbaru + hapus riwayat (privasi) |
| S7 Kuota | ✅ 5 pencarian berhasil/hari, 1 berjalan, maksimal 10 percobaan berbayar/hari → `429` + `Retry-After` |
| S8 Gagal | ✅ status `failed`, pesan jelas, kuota tidak terpakai |
| + Sesuaikan CV | ✅ per beasiswa: opsi kalimat CV yang dihitung ulang (sebelum → sesudah), syarat yang tidak bisa diatasi lewat CV beserta alasannya, rencana pengembangan dengan link kursus/sertifikasi |

## Batas akses dan data

- Jalankan untuk penggunaan lokal. API membatasi host dan origin browser. Aplikasi ini berbagi satu profil lokal tanpa akun, sehingga akses publik melalui proxy atau tunnel memerlukan autentikasi dan penyimpanan terisolasi per pengguna.
- Aset JavaScript dan worker PDF dilayani dari origin aplikasi. Kebijakan CSP membatasi skrip dan koneksi ke origin sendiri, serta melarang pemuatan aplikasi dalam frame. CV dibatasi 5 MB, 15 halaman, 30.000 karakter, dan 15 detik pembacaan dokumen.
- Penyedia web menerima jenjang, kategori negara/bidang yang dikenali, dan preferensi umum pendanaan. IPK, skor bahasa, teks CV, prestasi, dan catatan bebas dipakai di aplikasi lokal. Jika negara belum dikenali, pencarian web memakai kueri umum.
- URL penyedia diperiksa format dan domainnya. Label sumber didasarkan pada domain institusi atau penyelenggara yang dikenal. Kutipan yang ditemukan di halaman tetap perlu dibaca dalam konteks program dan periode.
- Simpan API key di `.env` lokal. Git mengecualikan file ini, database lokal, dan hasil tes browser.

Saat pertama dijalankan, aplikasi membuat `data.sqlite` dan mengimpor `data.json` lama jika tersedia. Berkas JSON asli tetap ada sebagai cadangan. Program diidentifikasi dari nama, penyelenggara, dan negara. Periode dengan deadline berbeda dicatat terpisah, dan riwayat tetap menyimpan skor dari saat pencarian dilakukan.

## Naskah demo (±3 menit)

1. **Profil Beasiswa** → **Upload CV (PDF)** → pilih `contoh-cv.pdf` (CV fiktif). 7 kolom terisi hijau. Isi negara tujuan "Jepang" → Simpan.
2. **Cari Beasiswa** → catatan `fully funded, Jepang, S2 2027` → klik Cari. Tunjukkan langkah agen berjalan live.
3. Hasil: tunjukkan **Rincian skor** (IPK 25 · Bahasa 15 · Negara 20 · Prestasi 20 · Bidang 10 · Pendanaan 10, minus penalti) dan **Prestasi yang cocok** (poin per prestasi). Bandingkan "Kenapa cocok" vs "Belum terpenuhi" (mis. Chevening butuh pengalaman kerja). Klik **Simpan** → buka tab **Tersimpan**.
4. Di kartu beasiswa klik **🛠 Sesuaikan CV** → pilih opsi kalimat → **Hitung ulang skor** (sebelum → sesudah) → centang "sesuai fakta" → **Simpan ke profil**. Tunjukkan bagian "Tidak bisa diatasi dengan edit CV" (mis. IELTS) dan rencana pengembangan.
5. Klik Cari lagi saat masih berjalan → muncul pesan `1 pencarian berjalan`.
6. Catatan `simulasi gagal` → status Gagal, kuota tidak berkurang.
7. **Riwayat** → tunjukkan daftar, hapus satu.

Untuk mencadangkan data, hentikan server lalu salin `data.sqlite` dan berkas pendamping `data.sqlite-*` jika ada. Untuk membuat penyimpanan baru, jalankan dengan `DATABASE_FILE` yang menunjuk ke berkas baru dan `DATA_FILE` yang menunjuk ke nama JSON yang belum ada.

## Tes

```bash
npm test
npx e2e-web install chromium
npm run test:browser
npm audit
```

Suite browser membutuhkan Node.js 22.22.3+ pada lini 22, atau 24.8+. Tes browser memakai profil fiktif dan server demo dengan penyimpanan terpisah di `.e2e/`. Jalankan dengan `BEASISWA_TEST_MOBILE=1` untuk viewport 375 × 812. Tes API memakai proses server dan penyimpanan sementara sendiri.

Workflow **Verification** menjalankan audit dependensi, tes unit dan HTTP, serta tes Chromium desktop dan seluler saat ada pull request atau push ke `main`. Pengujian di GitHub Actions memakai mode demo tanpa API key.

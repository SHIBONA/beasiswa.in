# beasiswa.in — agen pencari beasiswa (prototipe)

Prototype fitur **Cari Beasiswa** untuk video demo. Hanya fitur beasiswa: tanpa login, allowlist, halaman publik, atau admin (satu "Member Demo").

## Jalankan

```bash
node server.mjs          # mode DEMO, tanpa install apa pun
# buka http://localhost:3000
```

Mode LIVE (agen Claude sungguhan, cari di web):

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... node server.mjs      # PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."; node server.mjs
```

Mode FIRECRAWL (dipakai otomatis bila `.env` berisi `FIRECRAWL_API_KEY=...`): Firecrawl Search (5 kueri, tanpa data pribadi) → Firecrawl Scrape + ekstraksi JSON 10 halaman → tiap kutipan dicek kata per kata ke teks halaman → skor → cari artikel pengalaman awardee. ±40–60 detik, ±70 kredit Firecrawl per pencarian.

| Mode | Sumber hasil | Biaya |
|---|---|---|
| FIRECRAWL (prioritas) | Halaman web nyata + kutipan syarat terverifikasi + referensi awardee | ±70 kredit / pencarian |
| DEMO (default) | 15 beasiswa contoh di `catalog.mjs` + skor rule-based. **Deadline & syarat = data contoh**, bukan data resmi. | Gratis |
| LIVE | Claude Opus 5.5 + `web_search` (maks 8) + `web_fetch` (maks 10), effort `medium`. URL hasil divalidasi: harus benar-benar dibuka agen. | ±US$0,20–0,50 per pencarian |

## Cakupan PRD

| ID | Status |
|---|---|
| S1 Profil beasiswa | ✅ form, validasi server, disimpan terpisah |
| + Upload CV | ✅ PDF → kolom profil terisi otomatis (di luar PRD, tambahan). Teks dibaca di browser, file CV tidak disimpan, email/HP/NIM disamarkan. LIVE: Claude, DEMO: pembacaan pola |
| S2 Mulai pencarian + catatan | ✅ API balas `202` + `search_id`, jalan di background |
| S3 Status live | ✅ polling 1,2 dtk, langkah agen tampil satu per satu |
| S4 5–15 hasil berskor | ✅ alasan cocok, syarat belum terpenuhi, link resmi, deadline lewat dibuang, disclaimer |
| S5 Simpan | ✅ toggle idempoten (`PUT`/`DELETE /api/saved/:id`) |
| S6 Riwayat | ✅ urut terbaru + hapus riwayat (privasi) |
| S7 Kuota | ✅ 5/hari, 1 berjalan → `429` + `retry_after` |
| S8 Gagal | ✅ status `failed`, pesan jelas, kuota tidak terpakai |
| + Sesuaikan CV | ✅ per beasiswa: opsi kalimat CV yang dihitung ulang (sebelum → sesudah), syarat yang tidak bisa diatasi lewat CV beserta alasannya, rencana pengembangan dengan link kursus/sertifikasi |

Belum: auth/RLS Supabase, realtime, paginasi cursor, multi-user (pakai `data.json`).

## Naskah demo (±3 menit)

1. **Profil Beasiswa** → **Upload CV (PDF)** → pilih `contoh-cv.pdf` (CV fiktif). 7 kolom terisi hijau. Isi negara tujuan "Jepang" → Simpan.
2. **Cari Beasiswa** → catatan `fully funded, Jepang, S2 2027` → klik Cari. Tunjukkan langkah agen berjalan live.
3. Hasil: tunjukkan **Rincian skor** (IPK 25 · Bahasa 15 · Negara 20 · Prestasi 20 · Bidang 10 · Pendanaan 10, minus penalti) dan **Prestasi yang cocok** (poin per prestasi). Bandingkan "Kenapa cocok" vs "Belum terpenuhi" (mis. Chevening butuh pengalaman kerja). Klik **Simpan** → buka tab **Tersimpan**.
4. Di kartu beasiswa klik **🛠 Sesuaikan CV** → pilih opsi kalimat → **Hitung ulang skor** (sebelum → sesudah) → centang "sesuai fakta" → **Simpan ke profil**. Tunjukkan bagian "Tidak bisa diatasi dengan edit CV" (mis. IELTS) dan rencana pengembangan.
5. Klik Cari lagi saat masih berjalan → muncul pesan `1 pencarian berjalan`.
6. Catatan `simulasi gagal` → status Gagal, kuota tidak berkurang.
7. **Riwayat** → tunjukkan daftar, hapus satu.

Reset data demo: hentikan server, hapus `data.json`.

## Tes

```bash
node --test   # unit (mvp.test.mjs) + end-to-end server sungguhan mode demo (e2e.test.mjs), ±2 detik
```

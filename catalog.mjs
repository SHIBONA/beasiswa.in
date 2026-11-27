// Demo-mode catalog: real programs and official sites, but deadlines and thresholds are
// EXAMPLE values for the demo video. Live mode (ANTHROPIC_API_KEY set) searches the web instead.
// values = what the program rewards in achievements: riset, kompetisi, kepemimpinan, akademik, sosial.
export const CATALOG = [
  { name: "Beasiswa LPDP Reguler", provider: "LPDP, Kementerian Keuangan RI", country: "Indonesia & luar negeri", countries: ["indonesia", "jepang", "inggris", "australia", "jerman", "amerika serikat", "belanda", "korea selatan", "hong kong", "singapura", "tiongkok", "taiwan", "prancis", "swedia", "kanada", "selandia baru"], levels: ["S2", "S3"], funding: "Penuh", deadline: "2027-03-31", url: "https://lpdp.kemenkeu.go.id/", min_gpa: 3.0, ielts: 6.5, fields: ["semua"], values: ["kepemimpinan", "sosial", "riset"], requirements: "IPK min 3,00 (S2); IELTS 6.5 untuk luar negeri; kampus tujuan ada di daftar PT LPDP; komitmen kembali ke Indonesia." },
  { name: "MEXT Research Student Scholarship", provider: "Kedutaan Besar Jepang di Indonesia", country: "Jepang", countries: ["jepang"], levels: ["S2", "S3"], funding: "Penuh", deadline: "2027-04-15", url: "https://www.id.emb-japan.go.jp/sch.html", min_gpa: 3.0, ielts: 6.0, fields: ["semua"], values: ["riset", "akademik"], requirements: "Usia < 35 tahun; IPK min 3,00; rencana riset; ujian tulis Bahasa Inggris/Jepang." },
  { name: "Chevening Scholarship", provider: "Pemerintah Inggris (FCDO)", country: "Inggris", countries: ["inggris"], levels: ["S2"], funding: "Penuh", deadline: "2027-11-04", url: "https://www.chevening.org/scholarships/", min_gpa: 3.0, ielts: 6.5, work_years: 2, fields: ["semua"], values: ["kepemimpinan", "sosial"], requirements: "Pengalaman kerja min 2 tahun; daftar 3 program studi di Inggris; potensi kepemimpinan." },
  { name: "Australia Awards Scholarships", provider: "Pemerintah Australia (DFAT)", country: "Australia", countries: ["australia"], levels: ["S2", "S3"], funding: "Penuh", deadline: "2027-04-30", url: "https://www.australiaawardsindo.or.id/", min_gpa: 2.9, ielts: 5.5, fields: ["semua"], values: ["kepemimpinan", "sosial"], requirements: "IPK min 2,90; IELTS 5.5 (atau setara); bidang prioritas pembangunan Indonesia." },
  { name: "DAAD Development-Related Postgraduate Courses", provider: "DAAD", country: "Jerman", countries: ["jerman"], levels: ["S2"], funding: "Penuh", deadline: "2027-08-31", url: "https://www.daad.id/", min_gpa: 3.0, ielts: 6.5, work_years: 2, fields: ["teknik", "ekonomi", "lingkungan", "kesehatan", "pendidikan", "energi"], values: ["riset", "sosial"], requirements: "Pengalaman kerja min 2 tahun; gelar S1 maks 6 tahun lalu; IELTS 6.5." },
  { name: "Fulbright Master's Degree Program", provider: "AMINEF", country: "Amerika Serikat", countries: ["amerika serikat"], levels: ["S2"], funding: "Penuh", deadline: "2027-02-15", url: "https://www.aminef.or.id/", min_gpa: 3.0, ielts: 6.5, fields: ["semua"], values: ["kepemimpinan", "akademik", "riset"], requirements: "IPK min 3,00; TOEFL ITP 550 / IELTS 6.5; esai studi dan tujuan pribadi." },
  { name: "Global Korea Scholarship (GKS)", provider: "NIIED, Pemerintah Korea Selatan", country: "Korea Selatan", countries: ["korea selatan"], levels: ["S1", "S2", "S3"], funding: "Penuh", deadline: "2027-03-10", url: "https://www.studyinkorea.go.kr/", min_gpa: 3.2, fields: ["semua"], values: ["akademik", "riset"], requirements: "IPK min 80% skala nilai (~3,20); usia < 40 tahun; TOPIK jadi nilai tambah." },
  { name: "Erasmus Mundus Joint Masters", provider: "Uni Eropa", country: "Eropa (multi-negara)", countries: ["belanda", "jerman", "prancis", "spanyol", "italia", "swedia", "eropa"], levels: ["S2"], funding: "Penuh", deadline: "2027-01-15", url: "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en", min_gpa: 3.0, ielts: 6.5, fields: ["semua"], values: ["akademik", "riset"], requirements: "Daftar langsung ke konsorsium program; IELTS 6.5 umumnya; tenggat berbeda tiap program." },
  { name: "IISMA (Indonesian International Student Mobility Awards)", provider: "Kemendikbudristek", country: "Luar negeri (exchange)", countries: ["inggris", "amerika serikat", "jepang", "korea selatan", "australia", "jerman", "belanda", "hong kong", "singapura"], levels: ["Exchange S1"], funding: "Penuh", deadline: "2027-02-28", url: "https://iisma.kemdikbud.go.id/", min_gpa: 3.0, ielts: 6.0, min_sem: 4, max_sem: 6, fields: ["semua"], values: ["akademik", "kepemimpinan"], requirements: "Mahasiswa S1 semester 4–6; IPK min 3,00; IELTS 6.0 / TOEFL iBT 80." },
  { name: "Beasiswa Unggulan", provider: "Kemendikbudristek", country: "Indonesia", countries: ["indonesia"], levels: ["S1", "S2"], funding: "Penuh", deadline: "2027-06-30", url: "https://beasiswaunggulan.kemdikbud.go.id/", min_gpa: 3.25, fields: ["semua"], values: ["kompetisi", "akademik", "riset"], requirements: "IPK min 3,25 (S1 on-going); prestasi nasional/internasional; esai kontribusi." },
  { name: "Beasiswa Pendidikan Indonesia (BPI)", provider: "Puslapdik Kemendikbudristek", country: "Indonesia & luar negeri", countries: ["indonesia", "inggris", "australia", "amerika serikat", "belanda", "jepang", "hong kong"], levels: ["S2", "S3"], funding: "Penuh", deadline: "2027-05-15", url: "https://beasiswa.kemdikbud.go.id/", min_gpa: 3.25, ielts: 6.5, fields: ["semua"], values: ["akademik", "riset", "kompetisi"], requirements: "IPK min 3,25; IELTS 6.5 untuk luar negeri; LoA atau sedang mendaftar kampus tujuan." },
  { name: "KIP Kuliah Merdeka", provider: "Kemendikbudristek", country: "Indonesia", countries: ["indonesia"], levels: ["S1"], funding: "Penuh", need_based: true, deadline: "2027-07-31", url: "https://kip-kuliah.kemdikbud.go.id/", fields: ["semua"], values: ["akademik"], requirements: "Dari keluarga kurang mampu (DTKS/KIP/SKTM); lulusan SMA sederajat maks 3 tahun." },
  { name: "Djarum Beasiswa Plus", provider: "Djarum Foundation", country: "Indonesia", countries: ["indonesia"], levels: ["S1"], funding: "Sebagian", deadline: "2027-05-31", url: "https://djarumbeasiswaplus.org/", min_gpa: 3.0, min_sem: 4, max_sem: 4, fields: ["semua"], values: ["kepemimpinan", "kompetisi"], requirements: "Mahasiswa S1 semester 4; IPK min 3,00; aktif organisasi; pelatihan soft skill." },
  { name: "Tanoto Foundation TELADAN", provider: "Tanoto Foundation", country: "Indonesia", countries: ["indonesia"], levels: ["S1"], funding: "Penuh", min_sem: 1, max_sem: 2, deadline: "2027-04-30", url: "https://www.tanotofoundation.org/", min_gpa: 3.0, fields: ["semua"], values: ["kepemimpinan", "sosial"], requirements: "Mahasiswa S1 tahun pertama di kampus mitra; IPK min 3,00; program pengembangan kepemimpinan." },
  { name: "Stipendium Hungaricum", provider: "Tempus Public Foundation, Hungaria", country: "Hungaria", countries: ["hungaria", "eropa"], levels: ["S1", "S2", "S3"], funding: "Penuh", deadline: "2027-01-15", url: "https://stipendiumhungaricum.hu/", min_gpa: 3.0, ielts: 5.5, fields: ["semua"], values: ["akademik"], requirements: "Nominasi oleh Kemendikbudristek; IELTS 5.5–6.0 tergantung kampus." },
  { name: "Türkiye Burslari", provider: "Pemerintah Turki", country: "Turki", countries: ["turki"], levels: ["S1", "S2", "S3"], funding: "Penuh", deadline: "2027-02-20", url: "https://www.turkiyeburslari.gov.tr/", min_gpa: 3.0, fields: ["semua"], values: ["akademik", "sosial"], requirements: "Nilai akademik min 75% (S2); usia < 30 tahun untuk S2; wawancara." },
  { name: "Taiwan ICDF International Higher Education Scholarship", provider: "Taiwan ICDF", country: "Taiwan", countries: ["taiwan"], levels: ["S1", "S2", "S3"], funding: "Penuh", deadline: "2027-03-31", url: "https://www.icdf.org.tw/", min_gpa: 3.0, ielts: 6.0, fields: ["teknik", "informatika", "pertanian", "kesehatan", "bisnis"], values: ["akademik", "riset"], requirements: "IELTS 6.0 / TOEFL iBT 79; program berbahasa Inggris di kampus mitra." },
  { name: "Chinese Government Scholarship (CSC)", provider: "China Scholarship Council", country: "Tiongkok", countries: ["tiongkok"], levels: ["S1", "S2", "S3"], funding: "Penuh", deadline: "2027-03-15", url: "https://www.campuschina.org/", min_gpa: 3.0, ielts: 6.0, fields: ["semua"], values: ["akademik", "riset"], requirements: "IPK min 3,00; program berbahasa Inggris butuh IELTS 6.0; usia < 35 tahun (S2)." },
  { name: "Hong Kong PhD Fellowship Scheme (HKPFS)", provider: "Research Grants Council Hong Kong", country: "Hong Kong", countries: ["hong kong"], levels: ["S3"], funding: "Penuh", deadline: "2026-12-01", url: "https://cerg1.ugc.edu.hk/hkpfs/index.html", min_gpa: 3.5, ielts: 6.5, fields: ["semua"], values: ["riset", "akademik", "kompetisi"], requirements: "Calon PhD di universitas Hong Kong; rekam jejak riset kuat; IELTS 6.5." },
  { name: "Singapore International Graduate Award (SINGA)", provider: "A*STAR, NUS, NTU, SUTD", country: "Singapura", countries: ["singapura"], levels: ["S3"], funding: "Penuh", deadline: "2027-06-01", url: "https://www.a-star.edu.sg/Scholarships/for-graduate-studies/singapore-international-graduate-award-singa", min_gpa: 3.3, ielts: 6.0, fields: ["teknik", "informatika", "sains", "elektro"], values: ["riset", "akademik"], requirements: "PhD bidang sains & teknik; IPK sangat baik; surat rekomendasi riset." },
  { name: "Manaaki New Zealand Scholarships", provider: "Pemerintah Selandia Baru (MFAT)", country: "Selandia Baru", countries: ["selandia baru"], levels: ["S2", "S3"], funding: "Penuh", deadline: "2027-03-01", url: "https://www.nzscholarships.govt.nz/", min_gpa: 3.0, ielts: 6.5, fields: ["energi", "pertanian", "lingkungan", "kesehatan", "teknik"], values: ["kepemimpinan", "sosial"], requirements: "Bidang prioritas (energi terbarukan, pertanian, dll.); IELTS 6.5; komitmen kembali 2 tahun." },
  { name: "Orange Tulip Scholarship", provider: "Nuffic Neso Indonesia", country: "Belanda", countries: ["belanda"], levels: ["S1", "S2"], funding: "Sebagian", deadline: "2027-04-01", url: "https://www.nesoindonesia.or.id/", min_gpa: 3.0, ielts: 6.5, fields: ["semua"], values: ["akademik"], requirements: "Diterima di kampus mitra Belanda; IELTS 6.5; potongan biaya kuliah (sebagian/penuh)." },
  { name: "Swedish Institute Scholarships for Global Professionals", provider: "Swedish Institute", country: "Swedia", countries: ["swedia"], levels: ["S2"], funding: "Penuh", deadline: "2027-02-10", url: "https://si.se/en/apply/scholarships/", min_gpa: 3.0, ielts: 6.5, work_years: 1, fields: ["semua"], values: ["kepemimpinan", "sosial"], requirements: "Pengalaman kerja/kepemimpinan min 3.000 jam; IELTS 6.5." },
  // Deadline already passed: shows the "deadline lewat dibuang" rule (PRD S4) during the demo.
  { name: "Beasiswa BCA Finance (periode lalu)", provider: "BCA Finance", country: "Indonesia", countries: ["indonesia"], levels: ["S1"], funding: "Sebagian", deadline: "2026-09-30", url: "https://www.bcafinance.co.id/", min_gpa: 3.0, fields: ["semua"], values: ["akademik"], requirements: "Mahasiswa aktif S1; IPK min 3,00." },
];

export const WEIGHTS = { ipk: 25, bahasa: 15, negara: 20, prestasi: 20, bidang: 10, pendanaan: 10 };

const ALIASES = new Map(Object.entries({ hongkong: "hong kong", hk: "hong kong", usa: "amerika serikat", us: "amerika serikat", amerika: "amerika serikat", uk: "inggris", "united kingdom": "inggris", korea: "korea selatan", china: "tiongkok", cina: "tiongkok", singapore: "singapura", japan: "jepang", "new zealand": "selandia baru", nz: "selandia baru", netherlands: "belanda", germany: "jerman", taiwan: "taiwan" }));
const norm = (s) => String(s ?? "").toLowerCase().trim();
const country = (c) => ALIASES.get(norm(c)) ?? norm(c);
const list = (s) => (Array.isArray(s) ? s : String(s ?? "").split(",")).map(norm).filter(Boolean);
const fmt = (n, d = 2) => Number(n).toFixed(d).replace(".", ",");
const KNOWN_COUNTRIES = [...new Set(CATALOG.flatMap((s) => s.countries))];

function countriesInNotes(notes) {
  const text = norm(notes);
  return [...KNOWN_COUNTRIES, ...ALIASES.keys()].filter((c) => c.length > 3 && new RegExp(`\\b${c}\\b`).test(text)).map(country);
}

// Return only catalog labels before using free-form profile fields in a provider query.
export function discoveryCountries(destination, notes) {
  const requested = new Set([...list(destination).map(country), ...countriesInNotes(notes)]);
  return [...requested].filter((c) => KNOWN_COUNTRIES.includes(c)).slice(0, 3);
}

export function isExpired(deadline, today) {
  return Boolean(deadline) && deadline < today;
}

// ---------- Achievements: level + category, so each program can weigh them ----------
const LEVELS = [
  { name: "Internasional", pts: 8, re: /internasional|international|world|global|asia|asean|ieeextreme/i },
  { name: "Nasional", pts: 6, re: /nasional|national/i },
  { name: "Regional", pts: 4, re: /provinsi|regional|jawa|wilayah|kota|kabupaten/i },
  { name: "Kampus", pts: 3, re: /fakultas|universitas|kampus|prodi|jurusan|student branch|himpunan|bem/i },
];
const CATEGORIES = {
  riset: /karya tulis|ilmiah|penelitian|riset|research|paper|jurnal|publikasi|lkti|pkm|konferensi|conference/i,
  kompetisi: /lomba|kompetisi|competition|olimpiade|hackathon|programming|robot|contest|ieeextreme|stack/i,
  kepemimpinan: /ketua|kepala|koordinator|memimpin|pimpin|presiden|president|head|lead|divisi|organisasi|kapten/i,
  akademik: /beasiswa|scholarship|mahasiswa berprestasi|cum laude|dean|ipk|akademik|asisten/i,
  sosial: /relawan|volunteer|pengabdian|komunitas|community|sosial|mengajar|kkn/i,
};
const RANK = /\b(juara 1|juara i\b|winner|gold|first place|champion|medali emas)/i;
const PODIUM = /\b(juara [23]|juara (ii|iii)\b|runner[- ]up|silver|bronze|medali perak|medali perunggu|harapan)/i;

export function classifyAchievement(text) {
  const level = LEVELS.find((l) => l.re.test(text)) ?? { name: "Lainnya", pts: 2 };
  const tags = Object.keys(CATEGORIES).filter((k) => CATEGORIES[k].test(text));
  const rank = RANK.test(text) ? 2 : PODIUM.test(text) ? 1 : 0;
  return { text, level: level.name, levelPts: level.pts, tags, rank };
}

export const splitAchievements = (s) => String(s ?? "").split(/;|\n/).map((x) => x.trim()).filter((x) => x.length > 3);

function scoreAchievements(items, values) {
  const scored = items.map((a) => {
    const relevant = a.tags.filter((t) => values.includes(t));
    const points = relevant.length ? a.levelPts + 3 + a.rank : Math.round(a.levelPts / 2);
    return { text: a.text, level: a.level, relevant, points };
  }).sort((a, b) => b.points - a.points);
  return { scored, total: Math.min(WEIGHTS.prestasi, scored.reduce((s, a) => s + a.points, 0)) };
}

// ---------- Score: 6 weighted components + penalties, all shown to the member ----------
export function opensLevel(levels, targetLevel) {
  const target = norm(targetLevel);
  return levels.some((level) => target === "exchange" ? norm(level).startsWith("exchange") : norm(level) === target);
}

export function scoreScholarship(profile, notes, s) {
  const levelOk = opensLevel(s.levels, profile.jenjang_tujuan);

  const notesText = norm(notes);
  const gpa = Number(profile.ipk) || 0;
  const ielts = Number(profile.skor_bahasa) || 0;
  const semester = Number(profile.semester) || 0;
  const wanted = new Set([...list(profile.negara_tujuan).map(country), ...countriesInNotes(notes)]);
  const needFunding = Boolean(profile.butuh_pendanaan) || /fully funded|penuh/.test(notesText);
  const fields = list(profile.bidang_minat).concat(list(profile.prodi));
  const values = s.values ?? [];
  const ev = s.evidence ?? {};
  const breakdown = [];
  const reasons = levelOk ? [`Membuka jenjang ${s.levels.join("/")}, sesuai tujuanmu ${profile.jenjang_tujuan}`] : [];
  const gaps = [];
  // rule = how the points are computed; quote = sentence verified on the official page (Firecrawl mode).
  const add = (key, label, points, detail, good, rule, quote = "") => {
    breakdown.push({ key, label, points, max: WEIGHTS[key] ?? 0, detail, rule, quote });
    (good ? reasons : gaps).push(detail);
  };

  const gpaRule = (min) => `Syarat administrasi IPK minimal ${fmt(min)}. Memenuhi = 15 poin + 0–10 sesuai selisih (penuh pada +0,50). Di bawah syarat = 0, karena berkas gugur di seleksi administrasi.`;
  if (s.min_gpa) {
    if (gpa >= s.min_gpa) {
      const margin = gpa - s.min_gpa;
      add("ipk", "IPK", 15 + Math.round(10 * Math.min(1, margin / 0.5)), `IPK ${fmt(gpa)} di atas minimal ${fmt(s.min_gpa)} (selisih +${fmt(margin)})`, true, gpaRule(s.min_gpa), ev.ipk);
    } else add("ipk", "IPK", 0, `IPK kurang ${fmt(s.min_gpa - gpa)} (punya ${fmt(gpa)}, minimal ${fmt(s.min_gpa)})`, false, gpaRule(s.min_gpa), ev.ipk);
  } else add("ipk", "IPK", 18, "Tidak ada syarat IPK minimal tertulis", true, "Penyelenggara tidak menulis IPK minimal, jadi diberi nilai netral 18 dari 25.");

  const langRule = (req) => `Syarat bahasa IELTS ${req} (atau setara). Memenuhi = 10 poin + 0–5 jika melebihi (penuh pada +1,0). Di bawah syarat = 0, karena sertifikat bahasa adalah dokumen wajib.`;
  if (s.ielts) {
    if (ielts >= s.ielts) {
      const extra = ielts - s.ielts;
      add("bahasa", "Bahasa", 10 + Math.round(5 * Math.min(1, extra)), extra > 0 ? `IELTS ${ielts} melebihi syarat ${s.ielts} (+${extra})` : `IELTS ${ielts} tepat memenuhi syarat ${s.ielts}`, true, langRule(s.ielts), ev.bahasa);
    } else add("bahasa", "Bahasa", 0, ielts ? `IELTS kurang ${fmt(s.ielts - ielts, 1)} (punya ${ielts}, syarat ${s.ielts})` : `Butuh IELTS ${s.ielts}, kamu belum punya skor`, false, langRule(s.ielts), ev.bahasa);
  } else add("bahasa", "Bahasa", 12, "Tidak mensyaratkan skor IELTS", true, "Halaman tidak menulis skor bahasa minimal, jadi diberi nilai netral 12 dari 15.");

  const countryRule = "20 = program khusus negara tujuanmu; 15 = program multi-negara yang mencakup negaramu; 10 = kamu belum memilih negara; 0 = negaramu tidak tercakup.";
  const hits = s.countries.filter((c) => wanted.has(country(c)));
  if (wanted.size === 0) add("negara", "Negara", 10, `Kamu belum memilih negara; program ini di ${s.country}`, true, countryRule);
  else if (hits.length) {
    const single = s.countries.length <= 2;
    add("negara", "Negara", single ? 20 : 15, single ? `Negara tujuanmu (${s.country}) adalah lokasi program ini` : `Mendanai studi di ${hits.map((h) => country(h).replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")} (1 dari ${s.countries.length} negara tujuan program)`, true, countryRule);
  } else add("negara", "Negara", 0, `Program di ${s.country}, bukan negara tujuanmu (${[...wanted].join(", ")})`, false, countryRule);

  const items = splitAchievements(profile.prestasi).map(classifyAchievement);
  const { scored, total } = scoreAchievements(items, values);
  const relevant = scored.filter((a) => a.relevant.length);
  const achRule = `Jumlah poin prestasi, maks 20. Tiap prestasi: tingkat (internasional 8, nasional 6, regional 4, kampus 3, lainnya 2) + 3 jika kategorinya dinilai program (${values.map((v) => VALUE_LABELS[v]).join(", ") || "-"}) + 1–2 untuk juara. Di luar kriteria program = setengah poin tingkat.`;
  const criteriaQuote = ev.kriteria?.[0]?.quote ?? "";
  if (!items.length) add("prestasi", "Prestasi", 0, `Belum ada prestasi tercatat; program ini menilai ${values.join(", ")}`, false, achRule, criteriaQuote);
  else add("prestasi", "Prestasi", total, `${relevant.length} dari ${items.length} prestasimu relevan dengan kriteria program (${values.join(", ")})`, relevant.length > 0, achRule, criteriaQuote);

  const fieldRule = "10 jika bidangmu prioritas, 7 jika terbuka untuk semua bidang, 5 jika data bidang belum tersedia, dan 2 jika bidangmu bukan prioritas.";
  if (s.fields.includes("semua")) add("bidang", "Bidang", 7, "Terbuka untuk semua bidang studi", true, fieldRule);
  else if (!s.fields.length) add("bidang", "Bidang", 5, "Data bidang studi belum tersedia", false, fieldRule);
  else {
    const match = s.fields.filter((sf) => fields.some((f) => f.includes(sf) || sf.includes(f)));
    if (match.length) add("bidang", "Bidang", 10, `Bidangmu (${match.join(", ")}) termasuk prioritas program`, true, fieldRule);
    else add("bidang", "Bidang", 2, `Bidang prioritas: ${s.fields.join(", ")}`, false, fieldRule);
  }

  const fundRule = "10 = dana penuh dan kamu butuh dana penuh; 8 = kamu tidak mensyaratkan dana penuh; 5 = cakupan dana tidak tertulis; 4 = hanya sebagian padahal kamu butuh penuh.";
  if (!needFunding) add("pendanaan", "Pendanaan", 8, `Pendanaan ${s.funding.toLowerCase()}`, true, fundRule, ev.pendanaan);
  else if (s.funding === "Penuh") add("pendanaan", "Pendanaan", 10, "Pendanaan penuh, sesuai kebutuhan finansialmu", true, fundRule, ev.pendanaan);
  else if (s.funding === "Sebagian") add("pendanaan", "Pendanaan", 4, "Hanya pendanaan sebagian, kamu butuh penuh", false, fundRule, ev.pendanaan);
  else add("pendanaan", "Pendanaan", 5, "Cakupan dana tidak tertulis di halaman, cek langsung", false, fundRule);

  const penalties = [];
  if (!levelOk) penalties.push([30, s.levels.length ? `Tidak membuka jenjang ${profile.jenjang_tujuan} (hanya ${s.levels.join("/")})` : "Jenjang program tidak tertulis di halaman", "Jenjang adalah syarat mutlak; program untuk jenjang lain tetap ditampilkan sebagai referensi.", ""]);
  if (s.min_sem && (semester < s.min_sem || semester > s.max_sem)) penalties.push([15, `Khusus semester ${s.min_sem === s.max_sem ? s.min_sem : `${s.min_sem}–${s.max_sem}`} (kamu semester ${semester || "?"})`, "Batas semester adalah syarat mutlak; di luar rentang berkas tidak diproses.", ""]);
  if (s.work_years) penalties.push([10, `Butuh pengalaman kerja min ${s.work_years} tahun`, "Pengalaman kerja tidak tercatat di profil mahasiswa, jadi dianggap belum terpenuhi.", ev.kerja ?? ""]);
  if (s.need_based && !profile.butuh_pendanaan) penalties.push([10, "Khusus mahasiswa dari keluarga kurang mampu", "Program berbasis kebutuhan ekonomi; profilmu tidak menandai butuh pendanaan.", ""]);
  for (const [p, text, rule, quote] of penalties) {
    breakdown.push({ key: "penalti", label: "Penalti", points: -p, max: 0, detail: text, rule, quote });
    gaps.push(text);
  }

  const score = Math.max(0, Math.min(100, breakdown.reduce((sum, b) => sum + b.points, 0)));
  return { score, reasons, gaps, breakdown, achievements: scored, insight: buildInsight(s, breakdown, relevant, values, ev) };
}

export const VALUE_LABELS = { riset: "riset & karya ilmiah", kompetisi: "prestasi kompetisi", kepemimpinan: "kepemimpinan", akademik: "prestasi akademik", sosial: "kontribusi sosial" };

// Program-specific explanation by selection stage: administration (hard gates) -> substance -> fit.
function buildInsight(s, breakdown, relevant, values, ev) {
  const row = (key) => breakdown.find((b) => b.key === key);
  const gates = [row("ipk"), row("bahasa")].filter((b) => b && b.max && !/Tidak ada|Tidak mensyaratkan/.test(b.detail));
  const failed = [...gates.filter((b) => b.points === 0), ...breakdown.filter((b) => b.key === "penalti")];
  const admin = failed.length
    ? { ok: false, text: `Belum lolos syarat administrasi: ${failed.map((b) => b.detail).join("; ")}. Ini syarat gugur, jadi penuhi dulu sebelum mendaftar.` }
    : { ok: true, text: gates.length ? `Profil memenuhi batas angka yang tersedia: ${gates.map((b) => b.detail).join("; ")}. Cek syarat lengkap sebelum mendaftar.` : "Data syarat angka belum tersedia. Cek dokumen wajib di situs resmi." };

  const valuesText = values.map((v) => VALUE_LABELS[v]).join(", ") || "kriteria umum";
  const strongest = relevant.slice(0, 2).map((a) => `“${a.text}” (${a.level.toLowerCase()}, ${a.relevant.map((t) => VALUE_LABELS[t]).join("/")}, +${a.points} poin)`);
  const substance = strongest.length
    ? { ok: true, text: `${s.name} menilai ${valuesText}. Bukti terkuatmu: ${strongest.join(" dan ")}. Jadikan ini cerita utama di esai dan wawancara.` }
    : { ok: false, text: `${s.name} menilai ${valuesText}. Belum ada prestasimu yang masuk kategori itu; siapkan contoh nyata untuk esai.` };

  const fit = [row("negara"), row("pendanaan"), row("bidang")].filter(Boolean);
  return [
    { label: "Seleksi administrasi", ...admin },
    { label: "Seleksi substansi", ...substance, quotes: (ev.kriteria ?? []).slice(0, 2) },
    { label: "Kesesuaian tujuan", ok: fit.every((b) => b.points / b.max >= 0.5), text: fit.map((b) => b.detail).join(". ") + "." },
  ];
}

export const MAX_RESULTS = 30;
const LOCAL_ONLY = /local students only|for local students|permanent (citizens?|residents?)|hksar permanent|khusus warga (negara )?(lokal|setempat)/i;

// Hard limits do not hide a program; they label it and push it below the eligible ones.
export function limitsOf(s, profile, today) {
  const limits = [];
  if (!s.levels.length) limits.push("Jenjang tidak tertulis");
  else if (!opensLevel(s.levels, profile.jenjang_tujuan)) limits.push(`Bukan untuk ${profile.jenjang_tujuan}`);
  if (isExpired(s.deadline, today)) limits.push("Deadline periode ini lewat, pantau periode berikutnya");
  if (s.official === false) limits.push("Sumber belum terverifikasi sebagai penyelenggara, cek ke situs resmi");
  if (LOCAL_ONLY.test(`${s.name} ${s.requirements ?? ""}`)) limits.push("Tampaknya khusus warga lokal, cek kelayakan WNI");
  return limits;
}

// Shared by all modes: every program is scored; eligible ones first, then limited ones, best first.
export function programIdentity({ name, provider, country }) {
  return [name, provider, country].map((value) => String(value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " "));
}

export function rankScholarships(profile, notes, scholarships, today) {
  const results = scholarships.map((s) => ({
    name: s.name, provider: s.provider, country: s.country, level: s.levels.join("/") || "Tidak tertulis", funding: s.funding,
    deadline: s.deadline, requirements: s.requirements, url: s.url, source: s.source ?? "demo",
    limits: limitsOf(s, profile, today), ...scoreScholarship(profile, notes, s),
    program: s, // raw facts, so the CV coach can re-score "what if" profiles later
  }));
  const expired = scholarships.filter((s) => isExpired(s.deadline, today)).length;
  results.sort((a, b) => (a.limits.length > 0) - (b.limits.length > 0) || b.score - a.score);
  return { results: results.slice(0, MAX_RESULTS), expired, eligible: results.filter((r) => !r.limits.length).length };
}

export const matchCatalog = (profile, notes, today) => rankScholarships(profile, notes, CATALOG, today);

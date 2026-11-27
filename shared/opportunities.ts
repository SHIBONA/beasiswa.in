// Ways to build the experience scholarships ask for: courses, certificates, language tests, competitions,
// research, organisations, volunteering and internships. Used by the CV coach (src/coach.ts) and the
// /development page. Links were checked to respond (HTTP 200) on 2026-11-26 and 2026-11-28; an empty url
// means advice without a link (usually the programme is announced through the campus).
import type { Profile } from "./index";

export type OpportunityArea = "bahasa" | "riset" | "kompetisi" | "kepemimpinan" | "akademik" | "sosial" | "kerja";
export type OpportunityKind = "kursus" | "sertifikasi" | "tes bahasa" | "lomba" | "riset" | "organisasi" | "relawan" | "magang";
export type OpportunityCost = "gratis" | "gratis sebagian" | "berbayar";
export type Opportunity = {
  title: string; url: string; note: string;
  area: OpportunityArea; kind: OpportunityKind; cost: OpportunityCost;
  language?: string; // destination country whose language this teaches or tests
};
export type FieldCourse = Opportunity & { match: RegExp; field: string };

export const AREA_LABELS: Record<OpportunityArea, string> = {
  bahasa: "Bahasa", riset: "Riset", kompetisi: "Kompetisi", kepemimpinan: "Kepemimpinan",
  akademik: "Akademik dan sertifikat", sosial: "Kontribusi sosial", kerja: "Pengalaman kerja",
};

export const OPPORTUNITIES: Opportunity[] = [
  // Bahasa
  { area: "bahasa", kind: "tes bahasa", cost: "berbayar", title: "Tes & persiapan IELTS (IDP Indonesia)", url: "https://ielts.idp.com/indonesia", note: "Jadwal tes dan materi latihan resmi." },
  { area: "bahasa", kind: "tes bahasa", cost: "berbayar", title: "TOEFL iBT (ETS)", url: "https://www.ets.org/toefl.html", note: "Alternatif IELTS; cek apakah program menerima TOEFL." },
  { area: "bahasa", kind: "tes bahasa", cost: "gratis", title: "EF SET", url: "https://www.efset.org/", note: "Tes bahasa Inggris online gratis untuk mengukur level sebelum ikut tes resmi." },
  { area: "bahasa", kind: "kursus", cost: "gratis sebagian", title: "Improve Your English (Coursera)", url: "https://www.coursera.org/specializations/improve-english", note: "Kursus online, materi bisa diakses gratis (audit)." },
  { area: "bahasa", kind: "kursus", cost: "gratis", title: "Duolingo", url: "https://www.duolingo.com/", note: "Latihan harian kosakata dan listening." },
  { area: "bahasa", kind: "kursus", cost: "gratis", language: "jepang", title: "Marugoto (Japan Foundation)", url: "https://www.marugoto.org/", note: "Belajar bahasa Jepang dasar dari Japan Foundation, berguna untuk MEXT dan kampus Jepang." },
  { area: "bahasa", kind: "tes bahasa", cost: "berbayar", language: "jepang", title: "JLPT", url: "https://www.jlpt.jp/e/", note: "Tes kemampuan bahasa Jepang; sebagian program dan kampus menilai sertifikatnya." },
  { area: "bahasa", kind: "kursus", cost: "gratis", language: "jerman", title: "Learn German (DW)", url: "https://learngerman.dw.com/en/learn-german/s-9528", note: "Kursus bahasa Jerman gratis dari Deutsche Welle, dari tingkat A1." },
  { area: "bahasa", kind: "tes bahasa", cost: "berbayar", language: "korea selatan", title: "TOPIK", url: "https://www.topik.go.kr/", note: "Tes bahasa Korea; skor TOPIK menjadi nilai tambah di GKS." },
  { area: "bahasa", kind: "tes bahasa", cost: "berbayar", language: "tiongkok", title: "HSK (Chinese Testing International)", url: "https://www.chinesetest.cn/", note: "Tes bahasa Mandarin untuk program berbahasa Mandarin di Tiongkok." },

  // Riset
  { area: "riset", kind: "riset", cost: "gratis", title: "Google Scholar", url: "https://scholar.google.com/", note: "Baca paper di bidangmu; mulai dari review literatur atau replikasi riset bersama dosen." },
  { area: "riset", kind: "kursus", cost: "gratis", title: "Kaggle Learn", url: "https://www.kaggle.com/learn", note: "Proyek data atau ML kecil yang bisa jadi portofolio riset." },
  { area: "riset", kind: "riset", cost: "gratis", title: "Zotero", url: "https://www.zotero.org/", note: "Kelola referensi untuk esai, proposal riset, dan karya tulis." },
  { area: "riset", kind: "riset", cost: "gratis", title: "PKM (Program Kreativitas Mahasiswa)", url: "", note: "Daftar lewat bagian kemahasiswaan kampus; karya ilmiah tingkat nasional." },
  { area: "riset", kind: "riset", cost: "gratis", title: "Asisten riset dosen", url: "", note: "Tawarkan diri membantu penelitian dosen; hasilnya bisa jadi bukti riset sekaligus surat rekomendasi." },

  // Kompetisi
  { area: "kompetisi", kind: "lomba", cost: "gratis", title: "Kaggle Competitions", url: "https://www.kaggle.com/competitions", note: "Kompetisi data science tingkat internasional." },
  { area: "kompetisi", kind: "lomba", cost: "gratis", title: "Devpost", url: "https://devpost.com/hackathons", note: "Daftar hackathon online dan offline; banyak yang terbuka untuk pemula." },
  { area: "kompetisi", kind: "lomba", cost: "gratis", title: "Lomba Puspresnas", url: "", note: "Tanyakan jadwal ke kemahasiswaan kampus; kompetisi tingkat nasional yang diakui." },
  { area: "kompetisi", kind: "lomba", cost: "gratis", title: "Gemastik", url: "", note: "Lomba TIK nasional untuk mahasiswa; jadwalnya diumumkan lewat kampus." },

  // Kepemimpinan
  { area: "kepemimpinan", kind: "organisasi", cost: "gratis", title: "Pengurus organisasi atau himpunan", url: "", note: "Ambil peran yang memimpin orang atau program, lalu catat hasilnya dengan angka (jumlah anggota, peserta, dana)." },
  { area: "kepemimpinan", kind: "organisasi", cost: "gratis", title: "Kepanitiaan acara kampus", url: "", note: "Pegang satu peran yang jelas, misalnya koordinator acara, dan catat jumlah peserta serta hasilnya." },
  { area: "kepemimpinan", kind: "relawan", cost: "gratis", title: "Indorelawan", url: "https://www.indorelawan.org/", note: "Koordinasi kegiatan relawan menjadi bukti kepemimpinan dan kontribusi." },

  // Akademik dan sertifikat
  { area: "akademik", kind: "kursus", cost: "gratis sebagian", title: "Dicoding", url: "https://www.dicoding.com/", note: "Kelas dan sertifikat teknologi berbahasa Indonesia." },
  { area: "akademik", kind: "sertifikasi", cost: "berbayar", title: "Google Career Certificates", url: "https://grow.google/certificates/", note: "Sertifikat profesional (data, IT support, UX)." },
  { area: "akademik", kind: "kursus", cost: "gratis sebagian", title: "Coursera", url: "https://www.coursera.org/", note: "Kursus universitas; sertifikat bisa dicantumkan di CV." },
  { area: "akademik", kind: "kursus", cost: "gratis sebagian", title: "edX", url: "https://www.edx.org/", note: "Kursus dari universitas internasional." },
  { area: "akademik", kind: "kursus", cost: "gratis", title: "MIT OpenCourseWare", url: "https://ocw.mit.edu/", note: "Materi kuliah MIT lengkap dan gratis, tanpa sertifikat." },
  { area: "akademik", kind: "kursus", cost: "gratis", title: "Khan Academy", url: "https://www.khanacademy.org/", note: "Pelajaran matematika, sains, dan ekonomi dari dasar." },
  { area: "akademik", kind: "sertifikasi", cost: "gratis sebagian", title: "Microsoft Learn", url: "https://learn.microsoft.com/en-us/training/", note: "Jalur belajar gratis; ujian sertifikasi Microsoft berbayar." },
  { area: "akademik", kind: "sertifikasi", cost: "gratis sebagian", title: "Google Skills", url: "https://www.skills.google/", note: "Lab cloud dan AI dari Google, dengan badge yang bisa dibagikan." },
  { area: "akademik", kind: "sertifikasi", cost: "gratis", title: "freeCodeCamp", url: "https://www.freecodecamp.org/", note: "Kurikulum pemrograman gratis dengan sertifikat per jalur." },
  { area: "akademik", kind: "kursus", cost: "gratis sebagian", title: "Alison", url: "https://alison.com/", note: "Kursus singkat gratis di banyak bidang; sertifikatnya berbayar." },

  // Kontribusi sosial
  { area: "sosial", kind: "relawan", cost: "gratis", title: "Indorelawan", url: "https://www.indorelawan.org/", note: "Cari kegiatan relawan sesuai minatmu." },
  { area: "sosial", kind: "relawan", cost: "gratis", title: "Indonesia Mengajar", url: "https://indonesiamengajar.org/", note: "Kegiatan dan program pendidikan." },
  { area: "sosial", kind: "relawan", cost: "gratis", title: "UN Volunteers (online)", url: "https://app.unv.org/", note: "Relawan daring untuk lembaga PBB dan mitranya; bisa dikerjakan dari rumah." },
  { area: "sosial", kind: "relawan", cost: "gratis", title: "KKN atau pengabdian masyarakat", url: "", note: "Pilih program yang hasilnya terukur, lalu tulis dampaknya dengan angka." },

  // Pengalaman kerja
  { area: "kerja", kind: "magang", cost: "gratis", title: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", note: "Cari magang atau kerja di bidangmu." },
  { area: "kerja", kind: "magang", cost: "gratis", title: "Kalibrr", url: "https://www.kalibrr.id/", note: "Lowongan magang dan kerja di Indonesia." },
  { area: "kerja", kind: "magang", cost: "gratis", title: "Magang bersertifikat Kampus Merdeka (MSIB)", url: "", note: "Program magang dari Kemendikbudristek; pantau pengumumannya lewat kampus." },
];

// Courses for a field of study; `match` is tested against the member's study programme and interests.
export const FIELD_COURSES: FieldCourse[] = [
  { match: /\bai\b|machine learning|data/i, field: "Data dan AI", area: "akademik", kind: "kursus", cost: "gratis", title: "Machine Learning Crash Course (Google)", url: "https://developers.google.com/machine-learning/crash-course", note: "Gratis; dasar ML untuk portofolio." },
  { match: /iot|jaringan|network|embedded|telekomunikasi|elektro/i, field: "Jaringan dan IoT", area: "akademik", kind: "sertifikasi", cost: "gratis sebagian", title: "Cisco Networking Academy", url: "https://www.netacad.com/", note: "Kursus dan sertifikat IoT serta jaringan." },
  { match: /cloud|informatika|software|web|komputer/i, field: "Cloud dan perangkat lunak", area: "akademik", kind: "sertifikasi", cost: "gratis sebagian", title: "AWS Skill Builder", url: "https://skillbuilder.aws/", note: "Kursus cloud dan jalur sertifikasi AWS." },
  { match: /informatika|software|web|komputer|sistem informasi/i, field: "Cloud dan perangkat lunak", area: "akademik", kind: "sertifikasi", cost: "gratis", title: "freeCodeCamp", url: "https://www.freecodecamp.org/", note: "Sertifikat gratis untuk web, data, dan algoritma." },
  { match: /keamanan|cyber|siber|security/i, field: "Keamanan siber", area: "akademik", kind: "kursus", cost: "gratis sebagian", title: "TryHackMe", url: "https://tryhackme.com/", note: "Latihan keamanan siber berbasis lab, dari tingkat pemula." },
  { match: /kesehatan|kedokteran|farmasi|keperawatan|gizi|kesmas|bidan/i, field: "Kesehatan", area: "akademik", kind: "kursus", cost: "gratis", title: "OpenWHO", url: "https://openwho.org/", note: "Kursus kesehatan masyarakat gratis dari WHO, bersertifikat." },
  { match: /pertanian|pangan|agribisnis|kehutanan|perikanan|lingkungan|agro/i, field: "Pertanian, pangan, lingkungan", area: "akademik", kind: "kursus", cost: "gratis", title: "FAO eLearning Academy", url: "https://elearning.fao.org/", note: "Kursus pangan, pertanian, dan lingkungan dari FAO, bersertifikat." },
  { match: /bisnis|manajemen|pemasaran|marketing|kewirausahaan/i, field: "Bisnis dan manajemen", area: "akademik", kind: "sertifikasi", cost: "gratis", title: "HubSpot Academy", url: "https://academy.hubspot.com/", note: "Sertifikat pemasaran dan penjualan gratis." },
  { match: /ekonomi|akuntansi|keuangan|matematika|statistika|fisika|kimia|biologi|sains/i, field: "Sains, ekonomi, matematika", area: "akademik", kind: "kursus", cost: "gratis", title: "Khan Academy", url: "https://www.khanacademy.org/", note: "Perkuat dasar teori sebelum kuliah lanjut atau tes masuk." },
  { match: /teknik|sipil|mesin|industri|kimia|fisika/i, field: "Teknik", area: "akademik", kind: "kursus", cost: "gratis", title: "MIT OpenCourseWare", url: "https://ocw.mit.edu/", note: "Materi kuliah teknik MIT untuk mendalami bidangmu." },
  { match: /desain|design|ux|ui|komunikasi visual/i, field: "Desain", area: "akademik", kind: "sertifikasi", cost: "berbayar", title: "Google UX Design Certificate", url: "https://grow.google/certificates/", note: "Sertifikat profesional desain UX, dengan proyek portofolio." },
];

// Everything for browsing on /development: general opportunities plus field courses, each link once.
export const ALL_OPPORTUNITIES: Opportunity[] = [...OPPORTUNITIES, ...FIELD_COURSES.map(({ match: _match, field: _field, ...o }) => o)]
  .filter((o, i, list) => list.findIndex((x) => x.title === o.title && x.url === o.url) === i);

// Grouped by area for the CV coach, which links the areas a programme rewards.
export const GROWTH = OPPORTUNITIES.reduce<Record<string, Opportunity[]>>((by, o) => {
  (by[o.area] ??= []).push(o);
  return by;
}, {});

export type DevelopmentStep = { area: string; why: string; items: Opportunity[] };

const LANGUAGE_COUNTRIES = ["jepang", "jerman", "korea selatan", "tiongkok"];

// A starting plan for a member with little or no experience: what to build first, and why.
export function developmentPlan(profile: Profile): DevelopmentStep[] {
  const achievements = String(profile.prestasi ?? "").split(/;|\n/).filter((x) => x.trim().length > 3).length;
  const destinations = String(profile.negara_tujuan ?? "").toLowerCase();
  const field = `${profile.prodi ?? ""} ${profile.bidang_minat ?? ""}`;
  const graduate = profile.jenjang_tujuan === "S2" || profile.jenjang_tujuan === "S3";
  const pick = (area: OpportunityArea, kinds?: OpportunityKind[]) => OPPORTUNITIES.filter((o) => o.area === area && !o.language && (!kinds || kinds.includes(o.kind)));
  const plan: DevelopmentStep[] = [];

  if (achievements === 0) {
    plan.push({
      area: "Pengalaman pertama",
      why: "Profilmu belum mencatat prestasi. Seleksi beasiswa menilai bukti nyata, jadi mulai dari satu lomba, satu peran organisasi, atau satu kegiatan relawan semester ini.",
      items: [...pick("kompetisi"), ...pick("kepemimpinan"), ...pick("sosial", ["relawan"]).slice(0, 2)],
    });
  } else if (achievements < 3) {
    plan.push({
      area: "Tambah bukti prestasi",
      why: `Profilmu mencatat ${achievements} prestasi. Dua atau tiga bukti dari kategori berbeda (lomba, riset, organisasi) membuat esai lebih kuat.`,
      items: [...pick("kompetisi"), ...pick("riset")],
    });
  }

  const language = Number(profile.skor_bahasa) || 0;
  if (language < 6.5) {
    plan.push({
      area: "Skor bahasa",
      why: language
        ? `Skor bahasamu ${language}, sedangkan banyak beasiswa luar negeri meminta IELTS 6.5. Ukur dulu levelmu, lalu jadwalkan tes resmi.`
        : "Profilmu belum mencatat skor bahasa. Hampir semua beasiswa luar negeri meminta sertifikat seperti IELTS atau TOEFL.",
      items: pick("bahasa"),
    });
  }
  const local = OPPORTUNITIES.filter((o) => o.language && LANGUAGE_COUNTRIES.includes(o.language) && destinations.includes(o.language));
  if (local.length) {
    plan.push({ area: "Bahasa negara tujuan", why: "Bahasa lokal negara tujuanmu menjadi nilai tambah di seleksi dan memudahkan hidup di sana.", items: local });
  }

  const courses = FIELD_COURSES.filter((c) => c.match.test(field));
  if (courses.length) {
    plan.push({
      area: "Sertifikat sesuai bidangmu",
      why: `Sertifikat yang relevan dengan ${profile.prodi || "bidangmu"} memperkuat rencana studi dan bisa masuk CV sebagai prestasi akademik.`,
      items: courses.filter((c, i) => courses.findIndex((x) => x.url === c.url) === i),
    });
  }

  if (graduate) {
    plan.push({
      area: "Riset dan pengalaman kerja",
      why: `Program ${profile.jenjang_tujuan} sering menilai pengalaman riset, dan sebagian mensyaratkan pengalaman kerja 1 sampai 3 tahun.`,
      items: [...pick("riset"), ...pick("kerja")],
    });
  }
  return plan;
}

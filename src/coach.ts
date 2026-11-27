// CV coach for one target scholarship:
// 1) what rewording the CV can change (every option is re-scored: before -> after),
// 2) what rewording cannot change (official numeric gates) and why,
// 3) what to build next (courses, certifications, experience) with links.
// Options never add facts: each carries a condition the member must confirm is true.
import { VALUE_LABELS, classifyAchievement, scoreScholarship, splitAchievements, type BreakdownRow, type Profile, type Scholarship } from "./catalog.ts";

import type { CoachReport, CvEdit, GrowthStep, HardGap, Link, PreviewReport, ProfileEdit } from "@beasiswa/shared";
type Fit = ReturnType<typeof scoreScholarship>;

const MAX_OPTIONS = 3;
const PRESTASI_WEAK = 12;
const FRAMES: Record<string, (t: string) => string> = {
  kepemimpinan: (t) => `Memimpin: ${t}`,
  riset: (t) => `Penelitian/karya ilmiah: ${t}`,
  kompetisi: (t) => `Kompetisi: ${t}`,
  akademik: (t) => `Prestasi akademik: ${t}`,
  sosial: (t) => `Kontribusi komunitas: ${t}`,
};
const SCOPES = ["tingkat internasional", "tingkat nasional", "tingkat provinsi", "tingkat kampus"];

// Links checked to respond (HTTP 200) on 2026-11-26; entries without url are advice only.
const GROWTH: Record<string, Link[]> = {
  bahasa: [
    { title: "Tes & persiapan IELTS (IDP Indonesia)", url: "https://ielts.idp.com/indonesia", note: "Jadwal tes dan materi latihan resmi." },
    { title: "TOEFL iBT (ETS)", url: "https://www.ets.org/toefl.html", note: "Alternatif IELTS; cek apakah program menerima TOEFL." },
    { title: "Improve Your English (Coursera)", url: "https://www.coursera.org/specializations/improve-english", note: "Kursus online, materi bisa diakses gratis (audit)." },
    { title: "Duolingo", url: "https://www.duolingo.com/", note: "Latihan harian kosakata dan listening." },
  ],
  riset: [
    { title: "Google Scholar", url: "https://scholar.google.com/", note: "Baca paper di bidangmu; mulai dari review literatur atau replikasi riset bersama dosen." },
    { title: "Kaggle Learn", url: "https://www.kaggle.com/learn", note: "Proyek data/ML kecil yang bisa jadi portofolio riset." },
    { title: "PKM (Program Kreativitas Mahasiswa)", url: "", note: "Daftar lewat bagian kemahasiswaan kampus; karya ilmiah tingkat nasional." },
  ],
  kompetisi: [
    { title: "Kaggle Competitions", url: "https://www.kaggle.com/competitions", note: "Kompetisi data science tingkat internasional." },
    { title: "Lomba Puspresnas", url: "", note: "Tanyakan jadwal ke kemahasiswaan kampus; kompetisi tingkat nasional yang diakui." },
  ],
  kepemimpinan: [
    { title: "Pengurus organisasi atau himpunan", url: "", note: "Ambil peran yang memimpin orang atau program, lalu catat hasilnya dengan angka (jumlah anggota, peserta, dana)." },
    { title: "Indorelawan", url: "https://www.indorelawan.org/", note: "Koordinasi kegiatan relawan = bukti kepemimpinan dan kontribusi." },
  ],
  akademik: [
    { title: "Dicoding", url: "https://www.dicoding.com/", note: "Kelas dan sertifikat teknologi berbahasa Indonesia." },
    { title: "Google Career Certificates", url: "https://grow.google/certificates/", note: "Sertifikat profesional (data, IT support, UX)." },
    { title: "Coursera", url: "https://www.coursera.org/", note: "Kursus universitas; sertifikat bisa dicantumkan di CV." },
    { title: "edX", url: "https://www.edx.org/", note: "Kursus dari universitas internasional." },
  ],
  sosial: [
    { title: "Indorelawan", url: "https://www.indorelawan.org/", note: "Cari kegiatan relawan sesuai minatmu." },
    { title: "Indonesia Mengajar", url: "https://indonesiamengajar.org/", note: "Kegiatan dan program pendidikan." },
  ],
  kerja: [
    { title: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", note: "Cari magang atau kerja di bidangmu." },
    { title: "Kalibrr", url: "https://www.kalibrr.id/", note: "Lowongan magang dan kerja di Indonesia." },
  ],
};
const FIELD_COURSES = [
  { match: /\bai\b|machine learning|data/i, title: "Machine Learning Crash Course (Google)", url: "https://developers.google.com/machine-learning/crash-course", note: "Gratis; dasar ML untuk portofolio." },
  { match: /iot|jaringan|network|embedded|telekomunikasi|elektro/i, title: "Cisco Networking Academy", url: "https://www.netacad.com/", note: "Kursus dan sertifikat IoT serta jaringan." },
  { match: /cloud|informatika|software|web|komputer/i, title: "AWS Skill Builder", url: "https://skillbuilder.aws/", note: "Kursus cloud dan jalur sertifikasi AWS." },
];

const fmt = (n: number) => Number(n).toFixed(2).replace(".", ",");
const row = (fit: Fit, key: string) => fit.breakdown.find((b) => b.key === key);
const joinItems = (items: string[]) => items.join("; ");

function cvEditsFor(profile: Profile, notes: string, program: Scholarship, base: Fit) {
  const items = splitAchievements(profile.prestasi);
  const values = program.values ?? [];
  const rescore = (prestasi: string) => scoreScholarship({ ...profile, prestasi }, notes, program).score;
  const edits: CvEdit[] = [];
  items.forEach((text, i) => {
    const a = classifyAchievement(text);
    const candidates = [
      ...values.filter((v) => !a.tags.includes(v)).map((v) => ({
        text: FRAMES[v](text),
        why: `${program.name} menilai ${VALUE_LABELS[v]}, tetapi kalimat ini belum menunjukkannya secara eksplisit.`,
        condition: `Pakai hanya jika kegiatan ini memang menunjukkan ${VALUE_LABELS[v]}.`,
      })),
      ...(a.level === "Lainnya" ? SCOPES.map((scope) => ({
        text: `${text} (${scope})`,
        why: "Tingkat prestasi belum tertulis, padahal skala (kampus/nasional/internasional) ikut dinilai.",
        condition: `Pakai hanya jika memang ${scope}.`,
      })) : []),
    ];
    const options = candidates
      .map((o) => {
        const after = rescore(joinItems(items.map((x, j) => (j === i ? o.text : x))));
        return { ...o, after, delta: after - base.score };
      })
      .filter((o) => o.delta > 0)
      .sort((x, y) => y.delta - x.delta)
      .slice(0, MAX_OPTIONS);
    if (options.length) edits.push({ index: i, original: text, level: a.level, tags: a.tags, options });
  });
  return { items, edits };
}

function profileEditsFor(profile: Profile, notes: string, program: Scholarship, base: Fit) {
  const rescore = (patch: Partial<Profile>) => scoreScholarship({ ...profile, ...patch }, notes, program).score;
  const edits: ProfileEdit[] = [];
  const bidang = row(base, "bidang");
  if (bidang && bidang.points < bidang.max && !program.fields.includes("semua")) {
    for (const f of program.fields.slice(0, 3)) {
      const value = [profile.bidang_minat, f].filter(Boolean).join(", ");
      const after = rescore({ bidang_minat: value });
      if (after > base.score) edits.push({ field: "bidang_minat", value, label: `Tambah "${f}" ke bidang minat`, condition: "Pakai hanya jika memang minat dan rencana studimu.", after, delta: after - base.score });
    }
  }
  const negara = row(base, "negara");
  if (negara && negara.points === 0 && program.countries?.length) {
    const c = program.countries[0];
    const value = [profile.negara_tujuan, c].filter(Boolean).join(", ");
    const after = rescore({ negara_tujuan: value });
    if (after > base.score) edits.push({ field: "negara_tujuan", value, label: `Tambah "${c}" ke negara tujuan`, condition: "Pakai hanya jika kamu bersedia kuliah di sana.", after, delta: after - base.score });
  }
  return edits;
}

function hardGapsFor(profile: Profile, notes: string, program: Scholarship, base: Fit) {
  const gaps: HardGap[] = [];
  const potential = (patchProfile: Partial<Profile>, patchProgram: Partial<Scholarship> = {}) => scoreScholarship({ ...profile, ...patchProfile }, notes, { ...program, ...patchProgram }).score - base.score;
  const ipk = row(base, "ipk");
  if (program.min_gpa && ipk?.points === 0) {
    gaps.push({
      title: `IPK di bawah syarat ${fmt(program.min_gpa)}`, detail: ipk.detail, quote: ipk.quote, potential: potential({ ipk: program.min_gpa }),
      why: "IPK dinilai dari transkrip resmi yang dilampirkan. Mengubah kalimat CV tidak mengubah nilai, dan menulis IPK berbeda dari transkrip bisa membuat berkas didiskualifikasi.",
      actions: [
        { title: "Naikkan IPK di semester berikutnya", url: "", note: "Prioritaskan mata kuliah ber-SKS besar; cek aturan perbaikan nilai di kampusmu." },
        { title: "Bidik program dengan syarat IPK lebih rendah", url: "", note: "Lihat hasil lain yang lolos syarat administrasi." },
      ],
    });
  }
  const bahasa = row(base, "bahasa");
  if (program.ielts && bahasa?.points === 0) {
    gaps.push({
      title: `Skor bahasa di bawah IELTS ${program.ielts}`, detail: bahasa.detail, quote: bahasa.quote, potential: potential({ skor_bahasa: program.ielts }),
      why: "Skor bahasa dibuktikan dengan sertifikat tes resmi. Mengubah CV tidak mengubah skor; satu-satunya jalan adalah tes ulang.",
      actions: GROWTH.bahasa,
    });
  }
  for (const b of base.breakdown.filter((x) => x.key === "penalti")) {
    if (/jenjang/i.test(b.detail)) {
      gaps.push({ title: b.detail, detail: b.detail, quote: "", potential: 0, why: "Jenjang ditentukan penyelenggara dan tidak bisa diubah lewat CV.", actions: [{ title: "Simpan untuk jenjang berikutnya", url: "", note: "Tandai beasiswa ini dan cek lagi saat kamu siap di jenjang yang dibuka." }] });
    } else if (/pengalaman kerja/i.test(b.detail)) {
      gaps.push({ title: b.detail, detail: b.detail, quote: b.quote, potential: potential({}, { work_years: undefined }), why: "Pengalaman kerja dibuktikan dengan surat keterangan kerja, bukan klaim di CV.", actions: GROWTH.kerja });
    } else if (/semester/i.test(b.detail)) {
      gaps.push({ title: b.detail, detail: b.detail, quote: "", potential: 0, why: "Batas semester mutlak; berkas di luar rentang tidak diproses.", actions: [{ title: "Daftar saat semestermu masuk rentang", url: "", note: "Pasang pengingat untuk periode pendaftaran berikutnya." }] });
    } else {
      gaps.push({ title: b.detail, detail: b.detail, quote: b.quote, potential: 0, why: "Syarat ini butuh dokumen resmi, bukan perubahan CV.", actions: [] });
    }
  }
  return gaps;
}

function growthFor(profile: Profile, program: Scholarship, base: Fit) {
  const prestasi = row(base, "prestasi");
  const values = program.values ?? [];
  const criteria = program.evidence?.kriteria ?? [];
  const plan: GrowthStep[] = [];
  if (prestasi && prestasi.points < PRESTASI_WEAK) {
    for (const v of values) {
      const quote = criteria.find((c) => new RegExp(v.slice(0, 5), "i").test(`${c.text} ${c.quote}`))?.quote ?? "";
      plan.push({ area: VALUE_LABELS[v], why: `${program.name} menilai ${VALUE_LABELS[v]}; poin prestasimu ${prestasi.points}/${prestasi.max}.`, quote, links: GROWTH[v] ?? [] });
    }
  }
  const field = `${profile.bidang_minat ?? ""} ${profile.prodi ?? ""}`;
  const courses = FIELD_COURSES.filter((c) => c.match.test(field)).map(({ title, url, note }) => ({ title, url, note }));
  if (courses.length) plan.push({ area: "sertifikasi sesuai bidangmu", why: `Sertifikat yang relevan dengan ${profile.prodi || "bidangmu"} memperkuat rencana studi dan bisa masuk CV sebagai prestasi akademik.`, quote: "", links: courses });
  return plan;
}

export function coachFor(profile: Profile, notes: string, program: Scholarship): CoachReport {
  const base = scoreScholarship(profile, notes, program);
  const { items, edits } = cvEditsFor(profile, notes, program, base);
  const profileEdits = profileEditsFor(profile, notes, program, base);
  const prestasi = row(base, "prestasi");
  const cvNote = !items.length
    ? "Belum ada prestasi di profil. Tambahkan prestasi nyata dulu (lihat rencana pengembangan)."
    : prestasi && prestasi.points >= prestasi.max
      ? `Prestasi sudah ${prestasi.points}/${prestasi.max} untuk program ini; mengubah kata tidak menaikkan skor.`
      : edits.length ? "" : "Kalimat prestasimu sudah menyebut tingkat dan kategori yang terbaca. Skor hanya naik dengan prestasi baru.";
  // Best case if every top option is applied together (the cap of 20 for prestasi still holds).
  const bestItems = items.map((t, i) => edits.find((e) => e.index === i)?.options[0].text ?? t);
  const bestPatch = Object.fromEntries(profileEdits.map((e) => [e.field, e.value]));
  const best = scoreScholarship({ ...profile, ...bestPatch, prestasi: joinItems(bestItems) }, notes, program).score;
  return {
    program: { name: program.name, url: program.url, country: program.country, levels: program.levels, values: program.values ?? [] },
    before: base.score, best, breakdown: base.breakdown,
    cv_edits: edits, cv_note: cvNote, profile_edits: profileEdits,
    hard_gaps: hardGapsFor(profile, notes, program, base), growth: growthFor(profile, program, base),
  };
}

// Re-score a member-edited profile against the same program: per-component before/after.
export function previewFor(profile: Profile, notes: string, program: Scholarship, patch: Partial<Profile>): PreviewReport {
  const before = scoreScholarship(profile, notes, program);
  const after = scoreScholarship({ ...profile, ...patch }, notes, program);
  // One reference row per component, in first-seen order; the "after" row wins when both have it.
  const refs = new Map<string, BreakdownRow>();
  for (const b of [...before.breakdown, ...after.breakdown]) {
    if (!refs.has(b.key)) refs.set(b.key, after.breakdown.find((x) => x.key === b.key) ?? b);
  }
  const sum = (fit: Fit, key: string) => fit.breakdown.filter((b) => b.key === key).reduce((s, b) => s + b.points, 0);
  const rows = [...refs].map(([key, ref]) => (
    { key, label: ref.label, max: ref.max, before: sum(before, key), after: sum(after, key), detail: after.breakdown.find((b) => b.key === key)?.detail ?? "" }
  ));
  return { before: before.score, after: after.score, rows };
}

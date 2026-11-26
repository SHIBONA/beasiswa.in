// CV -> scholarship profile fields. The browser extracts PDF text; the CV file is never stored.
// Extract academic fields locally in every search mode.
export const MAX_CV_CHARS = 30_000;

const PRODI_WORDS = "Teknik|Pendidikan|Ilmu|Sistem|Manajemen|Akuntansi|Informatika|Matematika|Fisika|Kimia|Biologi|Statistika|Psikologi|Hukum|Kedokteran|Farmasi|Arsitektur|Desain|Sastra|Bahasa|Ekonomi|Agribisnis|Keperawatan|Rekayasa";
const ACHIEVEMENT = /\b(juara|winner|champion|finalis|finalist|medali|medal|semifinal|best|terbaik|awardee|penerima beasiswa|lolos|runner[- ]up|honorable|ketua|kepala divisi|koordinator|presiden|president|head of|asisten|assistant|magang|intern|relawan|volunteer)\b/i;
const INTERESTS = ["AI", "machine learning", "IoT", "robotik", "robotics", "energi", "energy", "embedded", "data science", "jaringan", "telekomunikasi", "elektronika", "power system", "kendali", "control", "web", "cyber security", "keamanan siber", "computer vision"];

// Avoid copying common contact details and identifiers into suggested fields.
export function redact(text) {
  return text
    .replace(/(?<![\w.+-])[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/(\+62|\b0)8[\d\s-]{7,13}\d/g, "[telepon]")
    .replace(/\b\d{7,}\b/g, "[nomor]");
}

const toNumber = (s) => Number(String(s).replace(",", "."));

export function extractCvHeuristic(text, today) {
  const fields = {};
  const flat = text.replace(/\s+/g, " ");

  const gpa = flat.match(/\b(?:IPK|GPA|Indeks Prestasi Kumulatif)\b\s*[:=]?\s*([0-4][.,]\d{1,2})/i);
  if (gpa) fields.ipk = toNumber(gpa[1]);

  const ielts = flat.match(/\bIELTS\b[^0-9]{0,25}([4-9](?:[.,]5)?)\b/i);
  if (ielts) fields.skor_bahasa = toNumber(ielts[1]);

  // Lookbehind skips campus names such as "Universitas Pendidikan Indonesia".
  const prodi = flat.match(new RegExp(`(?<!(?:Universitas|Institut|Sekolah Tinggi|Politeknik)\\s)\\b((?:${PRODI_WORDS})(?:\\s+(?!(?:Universitas|Institut|Politeknik|Sekolah|UPI|ITB|UI)\\b)(?:dan\\s+)?[A-Z][a-zA-Z]+){1,3})`));
  if (prodi) fields.prodi = prodi[1].trim();

  if (/\b(S1|Sarjana|Bachelor|Undergraduate)\b/i.test(flat)) fields.jenjang_saat_ini = "S1";
  else if (/\b(D3|Diploma)\b/i.test(flat)) fields.jenjang_saat_ini = "D3";

  const semester = flat.match(/\bsemester\s*[:]?\s*(\d{1,2})\b/i);
  const intake = flat.match(/\b(?:angkatan|class of|intake)\s*[:]?\s*(20\d{2})\b/i) ?? flat.match(/\b(20\d{2})\s*[-–]\s*(?:sekarang|present|now|20\d{2})/i);
  if (semester) fields.semester = Number(semester[1]);
  else if (intake) {
    const [year, month] = today.split("-").map(Number);
    fields.semester = Math.min(14, Math.max(1, (year - Number(intake[1])) * 2 + (month >= 8 ? 1 : 0)));
  }

  const achievements = text.split(/\r?\n|•|·/).map((l) => l.trim()).filter((l) => l.length > 8 && l.length < 160 && ACHIEVEMENT.test(l));
  if (achievements.length) fields.prestasi = [...new Set(achievements)].slice(0, 4).join("; ").slice(0, 500);

  const interests = INTERESTS.filter((k) => new RegExp(`\\b${k}\\b`, "i").test(flat));
  if (interests.length) fields.bidang_minat = interests.slice(0, 4).join(", ");

  return fields;
}

export function parseCv(text, today) {
  const clean = redact(text).slice(0, MAX_CV_CHARS);
  return { fields: extractCvHeuristic(clean, today), source: "heuristik" };
}

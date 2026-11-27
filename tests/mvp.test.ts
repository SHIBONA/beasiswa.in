import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyAchievement, discoveryCountries, matchCatalog, rankScholarships } from "../src/catalog.ts";
import { collectSeenUrls, discoveryPreferences, firecrawlQueries, parseFinalJson, runSearch, searchProfile, validateResults } from "../src/agent.ts";
import { checkQuota, validateProfile } from "../src/server.ts";
import { extractCvHeuristic, redact } from "../src/cv.ts";
import { missingEvidence, pickPages, toEntries } from "../src/agent.ts";
import { isOfficial, publicWebUrl, verifyQuote } from "../src/firecrawl.ts";
import { coachFor, previewFor } from "../src/coach.ts";
import { CATALOG } from "../src/catalog.ts";
import { openStore } from "../src/storage.ts";

const PAGE = `# Beasiswa Reguler
| Persyaratan | Pendaftar jenjang **Magister** wajib memiliki IPK sekurang-kurangnya 3,00 pada skala 4,00 |
Skor minimal IELTS™ 6,5 untuk luar negeri.
Seleksi substansi menilai komitmen kontribusi dan kepemimpinan pendaftar.`;

test("verifyQuote accepts only sentences that are on the page", () => {
  assert.ok(verifyQuote("Pendaftar jenjang Magister wajib memiliki IPK sekurang-kurangnya 3,00", PAGE));
  assert.equal(verifyQuote("IPK minimal 3,50 untuk semua jenjang", PAGE), "");
  assert.equal(verifyQuote("IPK", PAGE), "");
});

test("evidence checks read quotes with markdown emphasis like plain text", () => {
  const page = `# Beasiswa Contoh Jepang
Program ini membiayai studi di jenjang _master_ untuk mahasiswa Indonesia.
Studi berlangsung *di Jepang* selama dua tahun.
Pendaftaran dibuka 1 November 2026.
Batas pendaftaran 31 Januari 2027.`;
  const [entry] = toEntries({ page_type: "program", scholarships: [{
    name: "Beasiswa Contoh Jepang", levels: ["S2"], countries: ["jepang"], funding: "Penuh", application_status: "open",
    level_quote: "Program ini membiayai studi di jenjang _master_ untuk mahasiswa Indonesia.",
    location_quote: "Studi berlangsung *di Jepang* selama dua tahun.",
    opens_at: "2026-11-01", opens_at_quote: "Pendaftaran dibuka 1 November 2026.",
    deadline: "2027-01-31", deadline_quote: "Batas pendaftaran 31 Januari 2027.",
  }] }, page, "https://www.example.ac.jp/beasiswa");
  assert.equal(missingEvidence(entry, "program", "S2", ["jepang"]), "");
  assert.equal(missingEvidence({ ...entry, evidence: { ...entry.evidence, deadline: "" } }, "program", "S2", ["jepang"]), "tanggal tutup tidak terkutip lengkap");
});

test("verifyQuote ignores quote marks and ellipses the extractor puts around a quote", () => {
  const sentence = "Pendaftar jenjang Magister wajib memiliki IPK sekurang-kurangnya 3,00";
  assert.equal(verifyQuote(`"${sentence}"`, PAGE), sentence);
  assert.equal(verifyQuote(`“${sentence}”`, PAGE), sentence);
  assert.equal(verifyQuote(`... ${sentence} …`, PAGE), sentence);
  assert.equal(verifyQuote(`"Pendaftar jenjang Magister ... sekurang-kurangnya 3,00"`, PAGE), "");
});

test("toEntries keeps verified quotes, splits list pages, rejects non-scholarship pages", () => {
  const item = {
    name: "Beasiswa Reguler", levels: ["S2", "S9"], countries: ["Hong Kong"], funding: "Penuh", deadline: "31 Juli 2027",
    min_gpa: 3, min_gpa_quote: "Pendaftar jenjang Magister wajib memiliki IPK sekurang-kurangnya 3,00", ielts: 6.5, ielts_quote: "IELTS 7.0 wajib",
    selection_criteria: [{ criterion: "kepemimpinan", quote: "Seleksi substansi menilai komitmen kontribusi dan kepemimpinan pendaftar." }],
    values: ["kepemimpinan", "x"],
  };
  const [e] = toEntries({ page_type: "program", scholarships: [item] }, PAGE, "https://lpdp.kemenkeu.go.id/x");
  assert.equal(e.official, true);
  assert.deepEqual(e.levels, ["S2"]);
  assert.equal(e.deadline, "");
  assert.ok(e.evidence.ipk.includes("3,00"));
  assert.equal(e.evidence.bahasa, "");
  assert.equal(e.evidence.kriteria.length, 1);
  assert.deepEqual(e.values, ["kepemimpinan"]);
  assert.deepEqual(toEntries({ page_type: "bukan_beasiswa", scholarships: [item] }, PAGE, "https://a.b"), []);
  const list = toEntries({ page_type: "daftar", scholarships: [item, { ...item, name: "Beasiswa Lain", levels: [] }, { provider: "tanpa nama" }] }, PAGE, "https://blog.example.com/x");
  assert.deepEqual(list.map((x) => [x.name, x.official]), [["Beasiswa Reguler", false], ["Beasiswa Lain", false]]);
});

test("pickPages drops duplicates and social media, official sites first", () => {
  const { pages, duplicates, blocked } = pickPages([
    { url: "https://blog.example.com/beasiswa" }, { url: "https://lpdp.kemenkeu.go.id/a/" }, { url: "https://lpdp.kemenkeu.go.id/a" },
    { url: "https://www.facebook.com/post" }, { url: "https://www.chevening.org/scholarships" },
  ], 3);
  assert.equal(duplicates, 1);
  assert.equal(blocked, 1);
  assert.deepEqual(pages.map((p) => p.url), ["https://lpdp.kemenkeu.go.id/a/", "https://www.chevening.org/scholarships", "https://blog.example.com/beasiswa"]);
});

test("discovery sends only recognised scholarship categories to providers", () => {
  const privateDetails = { ...profile, prodi: "Teknik Elektro NAMA_FIKTIF", bidang_minat: "IoT rahasia@example.test",
    negara_tujuan: "Hongkong, Alamat Privat", prestasi: "Prestasi pribadi", ipk: 3.57, skor_bahasa: 8.5 };
  const notes = "Jepang, telepon 081234567890 dan alamat pribadi";
  assert.deepEqual(discoveryPreferences(privateDetails, notes), {
    level: "S2", countries: ["hong kong", "jepang"], fields: ["teknik", "elektro", "iot"], fullFunding: true,
  });
  const queries = firecrawlQueries(privateDetails, notes, "2027-08-01");
  assert.equal(queries.length, 5);
  assert.match(queries[0], /hong kong/);
  assert.ok(queries.every((query) => query.includes("hong kong")));
  assert.match(firecrawlQueries({ ...privateDetails, negara_tujuan: "" }, notes, "2027-08-01")[1], /Japan/);
  assert.doesNotMatch(queries.join(" "), /NAMA_FIKTIF|rahasia|privat|pribadi|081234567890|3\.57|8\.5/i);
});

test("provider URLs use public host names and official labels match domain boundaries", () => {
  for (const url of ["file:///document.pdf", "http://127.0.0.1", "https://portal.local", "https://[::1]",
    "https://user:secret@example.com", "https://example.com:8443"]) assert.equal(publicWebUrl(url), null);
  assert.equal(isOfficial("https://scholarships.manchester.ac.uk/application"), true);
  assert.equal(isOfficial("https://lpdp.kemenkeu.go.id.example.com/application"), false);
  assert.equal(isOfficial("https://chevening-information.example.com/application"), false);
  assert.equal(publicWebUrl("https://example.com/Scholarships?id=1#details")?.href, "https://example.com/Scholarships?id=1");
  assert.equal(publicWebUrl("https://example.com/Scholarships?id=1#details", { keepFragment: true })?.href, "https://example.com/Scholarships?id=1#details");
});

test("malformed provider items are skipped or reduced to bounded facts", () => {
  const [result] = toEntries({ page_type: "daftar", scholarships: [null, { name: {} }, {
    name: "Program Contoh", levels: "S2", countries: [null, "Jepang"], funding: {},
    min_gpa: 5, ielts: "Infinity", deadline: "2027-02-31", requirements: "a".repeat(1000),
    selection_criteria: [null, { criterion: {}, quote: true }],
  }] }, PAGE, "https://example.com/program");
  assert.equal(result.requirements.length, 300);
  assert.deepEqual(result.levels, []);
  assert.deepEqual(result.countries, ["jepang"]);
  assert.deepEqual(result.evidence.kriteria, []);
  assert.equal(result.min_gpa, undefined);
  assert.equal(result.ielts, undefined);
  assert.equal(result.deadline, "");
  assert.equal(result.funding, "Tidak tertulis");
});

test("Firecrawl shows evidenced scholarships for the target degree and country, open ones first and the rest labelled", { timeout: 20_000 }, async (t) => {
  const providerKey = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = "test-fixture-never-used";
  t.after(() => {
    if (providerKey === undefined) delete process.env.FIRECRAWL_API_KEY;
    else process.env.FIRECRAWL_API_KEY = providerKey;
  });
  const requests: { path: string; body: any }[] = [];
  const programUrl = "https://lpdp.kemenkeu.go.id/program";
  const quote = "Pendaftar jenjang Magister wajib memiliki IPK sekurang-kurangnya 3,00";
  t.mock.method(globalThis, "fetch", async (input: string, options: RequestInit) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.firecrawl.dev");
    assert.equal(options.redirect, "error");
    const body = JSON.parse(String(options.body));
    requests.push({ path: url.pathname, body });
    if (url.pathname === "/v2/search") {
      return Response.json({ success: true, data: { web: [{ url: programUrl }, { url: "https://localhost" }] } });
    }
    assert.equal(body.url, programUrl);
    const degreeQuote = "Program LPDP membiayai studi sarjana dan magister.";
    const undergraduate = "Beasiswa Sarjana membiayai studi undergraduate di Jepang.";
    const prerequisite = "Beasiswa Doktor untuk lulusan S2.";
    const admission = "Pendaftaran Magister Teknik Elektro telah dibuka.";
    const location = "Perkuliahan Program LPDP berlangsung di universitas di Jepang.";
    const window = "Pendaftaran Program LPDP berlangsung dari 2 November 2026 hingga 26 November 2026.";
    const base = {
      levels: ["S1", "S2"], countries: ["Japan"], study_location: "Jepang", location_quote: location,
      opens_at: "2026-11-02", opens_at_quote: window, deadline: "2026-11-26", deadline_quote: window,
    };
    const otherAwards = [
      { name: "Beasiswa Indonesia", countries: ["indonesia"], study_location: "Indonesia", location_quote: "Studi Beasiswa Indonesia berlangsung di Jakarta, Indonesia." },
      { name: "Beasiswa Lokasi Salah", location_quote: "Pendanaan oleh perusahaan Jepang untuk studi di Indonesia." },
      { name: "Beasiswa Expired", deadline: "2026-11-25", deadline_quote: "Pendaftaran ditutup 25 November 2026." },
      { name: "Beasiswa Upcoming", opens_at: "2026-11-29", opens_at_quote: "Pendaftaran dibuka mulai 29 November 2026.", deadline: "2026-12-02", deadline_quote: "Pendaftaran ditutup 2 Desember 2026." },
      { name: "Beasiswa Tanpa Periode", opens_at: "", opens_at_quote: "" },
      { name: "Beasiswa Tanggal Salah", deadline: "2027-11-26" },
      { name: "Beasiswa Tutup Dini", application_status: "closed" },
    ].map((award) => ({ ...base, ...award, level_quote: award.name + " membiayai studi magister." }));
    const evidenceText = otherAwards.flatMap((award) => [award.level_quote, award.location_quote, award.opens_at_quote, award.deadline_quote]);
    const outsideJapan = "Pendanaan oleh perusahaan Jepang untuk studi di Indonesia.";
    return Response.json({ success: true, data: { markdown: [PAGE, degreeQuote, undergraduate, prerequisite, admission, location, window, outsideJapan, ...evidenceText].join("\n"), metadata: { url: programUrl }, json: {
      page_type: "daftar", scholarships: [
        ...otherAwards,
        { ...base, name: "Program LPDP", level_quote: degreeQuote,
          min_gpa: 3, min_gpa_quote: quote, ielts: 6.5, ielts_quote: "IELTS 7.0 wajib" },
        { ...base, name: "Beasiswa Sarjana", levels: ["S1"], level_quote: undergraduate },
        { ...base, name: "Pelatihan", levels: ["S2"], level_quote: degreeQuote },
        { ...base, name: "Beasiswa Doktor", levels: ["S2"], level_quote: prerequisite },
        { ...base, name: "Magister Teknik Elektro", levels: ["S2"], level_quote: admission }],
    } } });
  });

  const notes = "Jepang, catatan-pribadi@example.com";
  const targetProfile = { ...profile, negara_tujuan: "Japan" };
  const dir = mkdtempSync(join(tmpdir(), "beasiswa-cache-"));
  const path = join(dir, "data.sqlite");
  const legacy = join(dir, "data.json");
  let cache = openStore(path, legacy);
  t.after(() => {
    cache.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const steps: string[] = [];
  const output = await runSearch(targetProfile, notes, (step) => steps.push(step), "2026-11-26", cache);
  assert.deepEqual(output.usage, { firecrawl_searches: 9, firecrawl_pages: 1 });
  assert.equal(output.results[0].name, "Program LPDP");
  assert.deepEqual(Object.fromEntries(output.results.map((r) => [r.name, r.limits])), {
    "Program LPDP": [],
    "Beasiswa Expired": ["Deadline periode ini lewat, pantau periode berikutnya"],
    "Beasiswa Upcoming": ["Pendaftaran baru dibuka 29 November 2026"],
    "Beasiswa Tutup Dini": ["Pendaftaran periode ini sudah ditutup, pantau periode berikutnya"],
  });
  assert.deepEqual(output.results[0].program.levels, ["S1", "S2"]);
  const discovery = requests.filter((r) => r.path === "/v2/search" && !r.body.query.includes("awardee"));
  assert.ok(discovery.every((r) => /S2|master/i.test(r.body.query)));
  assert.ok(discovery.every((r) => /jepang|japan/i.test(r.body.query)));
  assert.equal(output.results[0].program.evidence?.ipk, quote);
  assert.equal(output.results[0].program.evidence?.bahasa, "");
  assert.ok(Number.isFinite(Date.parse(output.results[0].program.source_checked_at ?? "")));
  cache.close();
  cache = openStore(path, legacy);
  const repeated = await runSearch(targetProfile, notes, () => {}, "2026-11-26", cache);
  assert.equal(repeated.usage?.firecrawl_pages, 0);
  assert.deepEqual(repeated.results.map((r) => r.level), ["S1/S2", "S1/S2", "S1/S2", "S1/S2"]);
  assert.equal(repeated.results[0].program.source_checked_at, output.results[0].program.source_checked_at);
  assert.equal(requests.filter((request) => request.path === "/v2/scrape").length, 1);
  const laterSteps: string[] = [];
  const later = await runSearch(targetProfile, notes, (step) => laterSteps.push(step), "2026-11-27", cache);
  assert.ok(later.results.every((r) => r.limits.length === 1));
  assert.deepEqual(later.results.find((r) => r.name === "Program LPDP")?.limits, ["Deadline periode ini lewat, pantau periode berikutnya"]);
  const pageStep = steps.find((step) => step.startsWith("Membaca lpdp.kemenkeu.go.id"));
  assert.match(pageStep ?? "", /8 lainnya kurang bukti: 2 lokasi studi tidak terbukti, .*1 tanpa bukti beasiswa atau bantuan biaya$/);
  assert.ok(steps.includes("3 kandidat berbukti belum buka atau sudah tutup per 2026-11-26; tetap ditampilkan dengan label jadwal pendaftaran"));
  assert.ok(laterSteps.includes("4 kandidat berbukti belum buka atau sudah tutup per 2026-11-27; tetap ditampilkan dengan label jadwal pendaftaran"));
  assert.equal(later.usage?.firecrawl_pages, 0);
  assert.equal(later.usage?.firecrawl_searches, 9);
  assert.doesNotMatch(JSON.stringify(requests), /catatan-pribadi|localhost/);
});

test("insight explains each selection stage with the member's strongest achievement", () => {
  const { results } = matchCatalog({ ...profile, prestasi: "Kepala Divisi Teknis, Himpunan Mahasiswa Elektro" }, "", "2026-11-26");
  const lpdp = results.find((r) => r.name.includes("LPDP"));
  assert.ok(lpdp);
  assert.deepEqual(lpdp.insight.map((i) => i.label), ["Seleksi administrasi", "Seleksi substansi", "Kesesuaian tujuan"]);
  assert.ok(lpdp.insight[0].ok);
  assert.match(lpdp.insight[1].text, /Kepala Divisi Teknis.*kepemimpinan/);
  assert.ok(lpdp.breakdown.every((b) => b.rule));
});

const CV_TEXT = `Raka Aditya Pratama
Bandung · raka.contoh@example.com · 0812-3456-7890
Universitas Pendidikan Indonesia 2023 – sekarang
S1 Teknik Elektro · Semester 7 · IPK 3.62 / 4.00
NIM 2301234
Juara 2 Lomba Karya Tulis Ilmiah Nasional Energi Terbarukan 2025
Finalis IEEEXtreme 19.0 Programming Competition 2025
Kepala Divisi Teknis, Himpunan Mahasiswa Elektro
Bahasa Inggris: IELTS Academic 6.5 (2026)
Teknis: IoT, embedded system, power system, machine learning dasar`;

test("CV heuristic fills academic fields", () => {
  const f = extractCvHeuristic(CV_TEXT, "2026-11-26");
  assert.equal(f.ipk, 3.62);
  assert.equal(f.skor_bahasa, 6.5);
  assert.equal(f.prodi, "Teknik Elektro");
  assert.equal(f.semester, 7);
  assert.equal(f.jenjang_saat_ini, "S1");
  assert.match(f.prestasi ?? "", /Juara 2.*; Finalis IEEEXtreme/);
  assert.match(f.bidang_minat ?? "", /IoT/);
});

test("CV semester falls back to intake year", () => {
  assert.equal(extractCvHeuristic("S1 Teknik Elektro, angkatan 2024", "2026-11-26").semester, 5);
});

test("redact removes email, phone and NIM from CV suggestions", () => {
  const out = redact(CV_TEXT);
  assert.ok(!out.includes("raka.contoh@example.com"));
  assert.ok(!out.includes("0812-3456-7890"));
  assert.ok(!out.includes("2301234"));
  assert.ok(out.includes("IPK 3.62"));
});

const profile = { jenjang_saat_ini: "S1", jenjang_tujuan: "S2", prodi: "Teknik Elektro", ipk: 3.6, semester: 7, negara_tujuan: "Jepang", bidang_minat: "teknik", skor_bahasa: 6.5, prestasi: "", butuh_pendanaan: true };

test("demo matcher shows eligible programs first, limited ones after with labels", () => {
  const { results, eligible } = matchCatalog(profile, "fully funded Jepang", "2026-11-26");
  assert.equal(results.length, 24);
  const ok = results.slice(0, eligible);
  const limited = results.slice(eligible);
  assert.ok(ok.every((r) => r.limits.length === 0 && r.level.split("/").includes("S2") && r.deadline >= "2026-11-26"));
  assert.ok(limited.length > 0 && limited.every((r) => r.limits.length > 0));
  assert.deepEqual(ok.map((r) => r.score), [...ok.map((r) => r.score)].sort((a, b) => b - a));
  assert.equal(results[0].name, "MEXT Research Student Scholarship");
  const kip = results.find((r) => r.name.startsWith("KIP"));
  assert.ok(kip);
  assert.deepEqual(kip.limits, ["Bukan untuk S2"]);
  assert.ok(kip.breakdown.some((b) => b.key === "penalti" && b.points === -30));
});

test("past deadline is kept but labelled", () => {
  const { results, expired } = matchCatalog({ ...profile, jenjang_tujuan: "S1" }, "", "2026-11-26");
  assert.equal(expired, 1);
  const bca = results.find((r) => r.name.includes("BCA"));
  assert.ok(bca?.limits.some((l) => l.startsWith("Deadline")));
});

test("unmet requirements show up as gaps", () => {
  const { results } = matchCatalog({ ...profile, ipk: 2.5, skor_bahasa: 0 }, "", "2026-11-26");
  const lpdp = results.find((r) => r.name.includes("LPDP"));
  assert.ok(lpdp);
  assert.ok(lpdp.gaps.some((g) => g.includes("IPK kurang 0,50 (punya 2,50, minimal 3,00)")));
  assert.ok(lpdp.gaps.some((g) => g.includes("IELTS")));
});

test("search profile never carries identity fields", () => {
  const withIdentity = { ...profile, nama: "X", email: "x@y.z", nim: "123" };
  const sent = searchProfile(withIdentity);
  assert.equal("nama" in sent || "email" in sent || "nim" in sent, false);
});

test("live results keep only URLs the agent saw; past deadline is labelled", () => {
  const content = [
    { type: "web_search_tool_result", content: [{ url: "https://lpdp.kemenkeu.go.id/" }] },
    { type: "web_fetch_tool_result", content: { url: "https://www.chevening.org/scholarships" } },
    { type: "web_search_tool_result", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } },
  ];
  const raw = parseFinalJson(`Berikut hasilnya: {"results":[
    {"name":"LPDP","url":"https://lpdp.kemenkeu.go.id","levels":["S2"],"countries":["jepang"],"funding":"Penuh","deadline":"2027-03-31","min_gpa":3.0,"ielts":6.5,"values":["riset","bukan-enum"]},
    {"name":"Chevening","url":"https://www.chevening.org/scholarships","levels":["S2"],"countries":["inggris"],"funding":"Penuh","deadline":"2026-01-01"},
    {"name":"Jalur berbeda","url":"https://www.chevening.org/Scholarships","levels":["S2"]},
    {"name":"Karangan","url":"https://beasiswa-palsu.example","levels":["S2"],"deadline":"2027-01-01"}]}`);
  const verified = validateResults(raw, collectSeenUrls(content));
  assert.deepEqual(verified.map((r) => r.name), ["LPDP", "Chevening"]);
  assert.deepEqual(verified[0].values, ["riset"]);
  const { results, expired } = rankScholarships(profile, "", verified, "2026-11-26");
  assert.deepEqual(results.map((r) => r.name), ["LPDP", "Chevening"]);
  assert.deepEqual(results[1].limits, ["Deadline periode ini lewat, pantau periode berikutnya"]);
  assert.equal(expired, 1);
});

test("score equals the sum of its breakdown", () => {
  const { results } = matchCatalog(profile, "", "2026-11-26");
  for (const r of results) assert.equal(r.score, Math.max(0, Math.min(100, r.breakdown.reduce((s, b) => s + b.points, 0))));
});

test("short country aliases in notes count like the destination field", () => {
  assert.deepEqual(discoveryCountries("", "beasiswa S2 UK atau USA, fully funded").sort(), ["amerika serikat", "inggris"]);
  assert.deepEqual(discoveryCountries("", "kuliah di HK"), ["hong kong"]);
  assert.deepEqual(discoveryCountries("", "please help us find one"), []);
});

test("country aliases: Hongkong matches LPDP's Hong Kong destination", () => {
  const { results } = matchCatalog({ ...profile, negara_tujuan: "Hongkong" }, "", "2026-11-26");
  const negara = results.find((r) => r.name.includes("LPDP"))?.breakdown.find((b) => b.key === "negara");
  assert.ok(negara);
  assert.equal(negara.points, 15);
  assert.match(negara.detail, /Hong Kong/);
});

test("achievements score by level, relevance and rank", () => {
  const a = classifyAchievement("Juara 2 Lomba Karya Tulis Ilmiah Nasional 2025");
  assert.equal(a.level, "Nasional");
  assert.ok(a.tags.includes("riset") && a.tags.includes("kompetisi"));
  assert.equal(a.rank, 1);
  const { results } = matchCatalog({ ...profile, prestasi: "Juara 2 Lomba Karya Tulis Ilmiah Nasional 2025; Kepala Divisi Himpunan Mahasiswa Elektro" }, "", "2026-11-26");
  const mext = results.find((r) => r.name.startsWith("MEXT"));
  assert.ok(mext);
  assert.equal(mext.achievements[0].points, 6 + 3 + 1); // nasional + relevant (riset) + juara 2
  assert.deepEqual(mext.achievements[0].relevant, ["riset"]);
});

test("quota: 1 running at a time, 5 per day, failed searches free", () => {
  const day = "2026-11-26";
  assert.equal(checkQuota([{ status: "running", day }], day)?.retry_after, 15);
  const five = Array.from({ length: 5 }, () => ({ status: "succeeded", day }));
  const blocked = checkQuota(five, day, new Date("2026-11-26T23:00:00+07:00"));
  assert.equal(blocked?.retry_after, 3600);
  assert.equal(checkQuota([...five.slice(0, 4), { status: "failed", day }], day), null);
  assert.equal(checkQuota(five.map((s) => ({ ...s, day: "2026-11-25" })), day), null);
});

test("profile validation rejects out-of-range IPK", () => {
  assert.deepEqual(validateProfile({ ...profile, ipk: 4.5 }).errors, ["ipk"]);
  assert.ok(validateProfile(profile).profile);
});

const LPDP = CATALOG.find((x) => x.name.includes("LPDP"));
assert.ok(LPDP);

test("coach: rewording options are re-scored and the best one raises the score", () => {
  const me = { ...profile, prestasi: "Asisten Laboratorium Sistem Tenaga Listrik 2024; Ketua panitia bakti sosial desa" };
  const c = coachFor(me, "", LPDP);
  assert.ok(c.cv_edits.length > 0);
  for (const e of c.cv_edits) for (const o of e.options) {
    assert.ok(o.delta > 0 && o.after === c.before + o.delta);
    assert.match(o.condition, /Pakai hanya jika/);
  }
  assert.ok(c.best > c.before);
  const top = c.cv_edits[0];
  const items = ["Asisten Laboratorium Sistem Tenaga Listrik 2024", "Ketua panitia bakti sosial desa"];
  items[top.index] = top.options[0].text;
  const p = previewFor(me, "", LPDP, { prestasi: items.join("; ") });
  assert.equal(p.after, top.options[0].after);
  const prestasi = p.rows.find((r) => r.key === "prestasi");
  assert.ok(prestasi && prestasi.after > prestasi.before);
});

test("coach: numeric gates are hard gaps with a reason, potential and growth links", () => {
  const c = coachFor({ ...profile, skor_bahasa: 5.5, ipk: 2.8 }, "", LPDP);
  const titles = c.hard_gaps.map((g) => g.title);
  assert.ok(titles.some((t) => t.startsWith("IPK di bawah")) && titles.some((t) => t.startsWith("Skor bahasa")));
  const lang = c.hard_gaps.find((g) => g.title.startsWith("Skor bahasa"));
  assert.ok(lang && lang.potential > 0 && /sertifikat/.test(lang.why) && lang.actions.every((a) => !a.url || a.url.startsWith("https://")));
});

test("coach: says honestly when wording cannot help", () => {
  const strong = "Juara 1 Kompetisi Riset Internasional 2025; Ketua Himpunan Mahasiswa tingkat nasional";
  const c = coachFor({ ...profile, prestasi: strong }, "", LPDP);
  assert.equal(c.cv_edits.length, 0);
  assert.match(c.cv_note, /sudah/);
});

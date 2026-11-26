import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyAchievement, matchCatalog, rankScholarships } from "./catalog.mjs";
import { collectSeenUrls, discoveryPreferences, firecrawlQueries, parseFinalJson, runSearch, searchProfile, validateResults } from "./agent.mjs";
import { checkQuota, validateProfile } from "./server.mjs";
import { extractCvHeuristic, redact } from "./cv.mjs";
import { pickPages, toEntries } from "./agent.mjs";
import { isOfficial, publicWebUrl, verifyQuote } from "./firecrawl.mjs";
import { coachFor, previewFor } from "./coach.mjs";
import { CATALOG } from "./catalog.mjs";

const PAGE = `# Beasiswa Reguler
| Persyaratan | Pendaftar jenjang **Magister** wajib memiliki IPK sekurang-kurangnya 3,00 pada skala 4,00 |
Skor minimal IELTS™ 6,5 untuk luar negeri.
Seleksi substansi menilai komitmen kontribusi dan kepemimpinan pendaftar.`;

test("verifyQuote accepts only sentences that are on the page", () => {
  assert.ok(verifyQuote("Pendaftar jenjang Magister wajib memiliki IPK sekurang-kurangnya 3,00", PAGE));
  assert.equal(verifyQuote("IPK minimal 3,50 untuk semua jenjang", PAGE), "");
  assert.equal(verifyQuote("IPK", PAGE), "");
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
  const queries = firecrawlQueries(privateDetails, notes, "2027");
  assert.equal(queries.length, 5);
  assert.match(queries[0], /hong kong/);
  assert.match(queries[1], /jepang/);
  assert.doesNotMatch(queries.join(" "), /NAMA_FIKTIF|rahasia|privat|pribadi|081234567890|3\.57|8\.5/i);
});

test("provider URLs use public host names and official labels match domain boundaries", () => {
  for (const url of ["file:///document.pdf", "http://127.0.0.1", "https://portal.local", "https://[::1]",
    "https://user:secret@example.com", "https://example.com:8443"]) assert.equal(publicWebUrl(url), null);
  assert.equal(isOfficial("https://scholarships.manchester.ac.uk/application"), true);
  assert.equal(isOfficial("https://lpdp.kemenkeu.go.id.example.com/application"), false);
  assert.equal(isOfficial("https://chevening-information.example.com/application"), false);
  assert.equal(publicWebUrl("https://example.com/Scholarships?id=1#details").href, "https://example.com/Scholarships?id=1");
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

test("Firecrawl workflow uses bounded discovery inputs and retains only source-backed quotes", async (t) => {
  const providerKey = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = "test-fixture-never-used";
  t.after(() => {
    if (providerKey === undefined) delete process.env.FIRECRAWL_API_KEY;
    else process.env.FIRECRAWL_API_KEY = providerKey;
  });
  const requests = [];
  const programUrl = "https://lpdp.kemenkeu.go.id/program";
  const quote = "Pendaftar jenjang Magister wajib memiliki IPK sekurang-kurangnya 3,00";
  t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.firecrawl.dev");
    assert.equal(options.redirect, "error");
    const body = JSON.parse(options.body);
    requests.push({ path: url.pathname, body });
    if (url.pathname === "/v2/search") {
      return Response.json({ success: true, data: { web: [{ url: programUrl }, { url: "https://localhost" }] } });
    }
    assert.equal(body.url, programUrl);
    return Response.json({ success: true, data: { markdown: PAGE, metadata: { url: programUrl }, json: {
      page_type: "program", scholarships: [{ name: "Program LPDP", countries: ["jepang"], levels: ["S2"],
        min_gpa: 3, min_gpa_quote: quote, ielts: 6.5, ielts_quote: "IELTS 7.0 wajib" }],
    } } });
  });

  const notes = "Jepang, catatan-pribadi@example.com";
  const output = await runSearch(profile, notes, () => {}, "2026-11-26");
  assert.deepEqual(output.usage, { firecrawl_searches: 6, firecrawl_pages: 1 });
  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].program.evidence.ipk, quote);
  assert.equal(output.results[0].program.evidence.bahasa, "");
  assert.doesNotMatch(JSON.stringify(requests), /catatan-pribadi|localhost/);
});

test("insight explains each selection stage with the member's strongest achievement", () => {
  const { results } = matchCatalog({ ...profile, prestasi: "Kepala Divisi Teknis, Himpunan Mahasiswa Elektro" }, "", "2026-11-26");
  const lpdp = results.find((r) => r.name.includes("LPDP"));
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
  assert.match(f.prestasi, /Juara 2.*; Finalis IEEEXtreme/);
  assert.match(f.bidang_minat, /IoT/);
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
  assert.deepEqual(kip.limits, ["Bukan untuk S2"]);
  assert.ok(kip.breakdown.some((b) => b.key === "penalti" && b.points === -30));
});

test("past deadline is kept but labelled", () => {
  const { results, expired } = matchCatalog({ ...profile, jenjang_tujuan: "S1" }, "", "2026-11-26");
  assert.equal(expired, 1);
  assert.ok(results.find((r) => r.name.includes("BCA")).limits.some((l) => l.startsWith("Deadline")));
});

test("unmet requirements show up as gaps", () => {
  const { results } = matchCatalog({ ...profile, ipk: 2.5, skor_bahasa: 0 }, "", "2026-11-26");
  const lpdp = results.find((r) => r.name.includes("LPDP"));
  assert.ok(lpdp.gaps.some((g) => g.includes("IPK kurang 0,50 (punya 2,50, minimal 3,00)")));
  assert.ok(lpdp.gaps.some((g) => g.includes("IELTS")));
});

test("search profile never carries identity fields", () => {
  const sent = searchProfile({ ...profile, nama: "X", email: "x@y.z", nim: "123" });
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

test("country aliases: Hongkong matches LPDP's Hong Kong destination", () => {
  const { results } = matchCatalog({ ...profile, negara_tujuan: "Hongkong" }, "", "2026-11-26");
  const negara = results.find((r) => r.name.includes("LPDP")).breakdown.find((b) => b.key === "negara");
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
  assert.equal(mext.achievements[0].points, 6 + 3 + 1); // nasional + relevant (riset) + juara 2
  assert.deepEqual(mext.achievements[0].relevant, ["riset"]);
});

test("quota: 1 running at a time, 5 per day, failed searches free", () => {
  const day = "2026-11-26";
  assert.equal(checkQuota([{ status: "running", day }], day).retry_after, 15);
  const five = Array.from({ length: 5 }, () => ({ status: "succeeded", day }));
  const blocked = checkQuota(five, day, new Date("2026-11-26T23:00:00+07:00"));
  assert.equal(blocked.retry_after, 3600);
  assert.equal(checkQuota([...five.slice(0, 4), { status: "failed", day }], day), null);
  assert.equal(checkQuota(five.map((s) => ({ ...s, day: "2026-11-25" })), day), null);
});

test("profile validation rejects out-of-range IPK", () => {
  assert.deepEqual(validateProfile({ ...profile, ipk: 4.5 }).errors, ["ipk"]);
  assert.ok(validateProfile(profile).profile);
});

const LPDP = CATALOG.find((x) => x.name.includes("LPDP"));

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
  assert.ok(p.rows.find((r) => r.key === "prestasi").after > p.rows.find((r) => r.key === "prestasi").before);
});

test("coach: numeric gates are hard gaps with a reason, potential and growth links", () => {
  const c = coachFor({ ...profile, skor_bahasa: 5.5, ipk: 2.8 }, "", LPDP);
  const titles = c.hard_gaps.map((g) => g.title);
  assert.ok(titles.some((t) => t.startsWith("IPK di bawah")) && titles.some((t) => t.startsWith("Skor bahasa")));
  const lang = c.hard_gaps.find((g) => g.title.startsWith("Skor bahasa"));
  assert.ok(lang.potential > 0 && /sertifikat/.test(lang.why) && lang.actions.every((a) => !a.url || a.url.startsWith("https://")));
});

test("coach: says honestly when wording cannot help", () => {
  const strong = "Juara 1 Kompetisi Riset Internasional 2025; Ketua Himpunan Mahasiswa tingkat nasional";
  const c = coachFor({ ...profile, prestasi: strong }, "", LPDP);
  assert.equal(c.cv_edits.length, 0);
  assert.match(c.cv_note, /sudah/);
});

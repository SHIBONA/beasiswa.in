// End-to-end: real server process (demo mode, throwaway data file), full member flow over HTTP.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3990 + Math.floor(Math.random() * 9);
const BASE = `http://localhost:${PORT}/api`;
const dir = mkdtempSync(join(tmpdir(), "beasiswa-e2e-"));
let server;

const call = async (path, method = "GET", body) => {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};
const waitDone = async (id) => {
  for (let i = 0; i < 100; i++) {
    const { body } = await call(`/searches/${id}`);
    if (["succeeded", "failed"].includes(body.search.status)) return body.search;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("search did not finish");
};

before(async () => {
  server = spawn(process.execPath, [fileURLToPath(new URL("./server.mjs", import.meta.url))], {
    env: { ...process.env, PORT: String(PORT), DATA_FILE: join(dir, "data.json"), DEMO_STEP_MS: "5", FIRECRAWL_API_KEY: "", ANTHROPIC_API_KEY: "" },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/meta`)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});
after(() => { server?.kill(); rmSync(dir, { recursive: true, force: true }); });

const CV = `Raka Aditya Pratama · raka.contoh@example.com · 0812-3456-7890
S1 Teknik Elektro · Semester 7 · IPK 3.62 / 4.00
Juara 2 Lomba Karya Tulis Ilmiah Nasional Energi Terbarukan 2025
Asisten Laboratorium Sistem Tenaga Listrik 2024
Bahasa Inggris: IELTS Academic 6.0 (2026)
Teknis: IoT, embedded system, machine learning dasar`;

test("member flow: CV → profile → search → results → coach → before/after → save → quota → failure → history", async () => {
  assert.equal((await call("/meta")).body.mode, "demo");
  assert.equal((await call("/searches", "POST", {})).status, 409, "search needs a profile first");

  const cv = await call("/cv/parse", "POST", { text: CV });
  assert.equal(cv.status, 200);
  assert.deepEqual([cv.body.fields.ipk, cv.body.fields.prodi, cv.body.fields.skor_bahasa], [3.62, "Teknik Elektro", 6]);

  const profile = { jenjang_saat_ini: "S1", jenjang_tujuan: "S2", semester: 7, negara_tujuan: "Jepang", bidang_minat: "IoT", butuh_pendanaan: true, ...cv.body.fields };
  assert.equal((await call("/profile", "PUT", { ...profile, ipk: 9 })).status, 422, "invalid IPK rejected");
  assert.equal((await call("/profile", "PUT", profile)).status, 200);

  const start = await call("/searches", "POST", { notes: "fully funded" });
  assert.equal(start.status, 202);
  assert.equal((await call("/searches", "POST", {})).status, 429, "only one running search");
  const search = await waitDone(start.body.search_id);
  assert.equal(search.status, "succeeded");
  assert.ok(search.results.length >= 15, `expected many results, got ${search.results.length}`);
  const firstLimited = search.results.findIndex((r) => r.limits.length);
  assert.ok(firstLimited > 0 && search.results.slice(firstLimited).every((r) => r.limits.length), "eligible first, limited after");
  assert.ok(search.steps.length >= 15, "detailed agent steps");

  const target = search.results.find((r) => r.name.includes("LPDP"));
  const coach = await call(`/coach/${encodeURIComponent(target.id)}`);
  assert.equal(coach.status, 200);
  assert.equal(coach.body.before, target.score);
  assert.ok(coach.body.hard_gaps.some((g) => g.title.startsWith("Skor bahasa")), "IELTS 6.0 < 6.5 is a hard gap");
  assert.ok(coach.body.cv_edits.length > 0, "Asisten Laboratorium can be reworded");

  const edit = coach.body.cv_edits[0];
  const items = profile.prestasi.split("; ");
  items[edit.index] = edit.options[0].text;
  const preview = await call(`/coach/${encodeURIComponent(target.id)}/preview`, "POST", { prestasi: items.join("; ") });
  assert.equal(preview.body.before, target.score);
  assert.equal(preview.body.after, edit.options[0].after);
  assert.ok(preview.body.after > preview.body.before, "score goes up after rewording");

  await call("/profile", "PUT", { ...profile, prestasi: items.join("; ") });
  assert.equal((await call(`/coach/${encodeURIComponent(target.id)}`)).body.before, preview.body.after, "saved profile becomes the new baseline");

  assert.equal((await call(`/saved/${encodeURIComponent(target.id)}`, "PUT")).status, 200);
  await call(`/saved/${encodeURIComponent(target.id)}`, "PUT");
  assert.equal((await call("/saved")).body.saved.length, 1, "save is idempotent");

  const quotaBefore = (await call("/meta")).body.quota_left;
  const fail = await call("/searches", "POST", { notes: "simulasi gagal" });
  assert.equal((await waitDone(fail.body.search_id)).status, "failed");
  assert.equal((await call("/meta")).body.quota_left, quotaBefore, "failed search does not use quota");

  const history = (await call("/searches")).body.searches;
  assert.equal(history.length, 2);
  assert.equal((await call(`/searches/${fail.body.search_id}`, "DELETE")).status, 200);
  assert.equal((await call("/searches")).body.searches.length, 1);
});

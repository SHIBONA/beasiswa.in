// End-to-end: real server process (demo mode, throwaway data file), full member flow over HTTP.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3990 + Math.floor(Math.random() * 9);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE = `${ORIGIN}/api`;
const dir = mkdtempSync(join(tmpdir(), "beasiswa-e2e-"));
let server;

const call = async (path: string, method = "GET", body?: unknown) => {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
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

async function startServer(env = {}) {
  server = spawn(process.execPath, [fileURLToPath(new URL("../src/server.ts", import.meta.url))], {
    env: { ...process.env, PORT: String(PORT), DATA_FILE: join(dir, "data.json"), DEMO_STEP_MS: "5", FIRECRAWL_API_KEY: "", ANTHROPIC_API_KEY: "", ...env },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/meta`, { headers: { Connection: "close" } })).ok) return; } catch { /* not up yet */ }
    if (server.exitCode !== null) throw new Error(`server exited: ${server.exitCode}`);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
}

async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const exited = once(server, "exit");
  server.kill();
  await exited;
}

before(() => startServer());
after(async () => {
  await stopServer();
  rmSync(dir, { recursive: true, force: true });
});

const CV = `Raka Aditya Pratama · raka.contoh@example.com · 0812-3456-7890
S1 Teknik Elektro · Semester 7 · IPK 3.62 / 4.00
Juara 2 Lomba Karya Tulis Ilmiah Nasional Energi Terbarukan 2025
Asisten Laboratorium Sistem Tenaga Listrik 2024
Bahasa Inggris: IELTS Academic 6.0 (2026)
Teknis: IoT, embedded system, machine learning dasar`;

test("local HTTP security headers protect the page and private API", async () => {
  const page = await fetch(ORIGIN);
  assert.equal(page.status, 200);
  const csp = page.headers.get("content-security-policy") ?? "";
  assert.match(csp, /script-src 'self'(?:;|$)/);
  assert.match(csp, /worker-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  const profile = await fetch(BASE + "/profile");
  assert.equal(profile.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal(profile.headers.get("cache-control"), "no-store");
});

test("browser-origin restrictions block foreign requests and keep normal access", async () => {
  const foreign: Record<string, string>[] = [
    { Origin: "https://example.test" },
    { Origin: "null" },
    { "Sec-Fetch-Site": "same-site" },
    { "Sec-Fetch-Site": "cross-site" },
  ];
  for (const headers of foreign) {
    const result = await fetch(BASE + "/profile", { headers });
    assert.equal(result.status, 403);
    assert.equal(result.headers.get("access-control-allow-origin"), null);
  }
  assert.equal((await fetch(BASE + "/profile", { headers: { Origin: ORIGIN, "Sec-Fetch-Site": "same-origin" } })).status, 200);
  const unexpectedHost = await new Promise((resolve, reject) => {
    const req = request(BASE + "/profile", { headers: { Host: `example.test:${PORT}` } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end();
  });
  assert.equal(unexpectedHost, 403);
});

test("API rejects malformed bodies, oversized input and undefined routes", async () => {
  assert.equal((await fetch(BASE + "/profile", { method: "PUT", body: "{}" })).status, 415);
  for (const body of ["null", "[]", "true", "{invalid"]) {
    assert.equal((await fetch(BASE + "/profile", { method: "PUT", body, headers: { "Content-Type": "application/json" } })).status, 400);
  }
  assert.equal((await call("/profile", "PUT", { prodi: "x".repeat(20_001) })).status, 413);
  assert.equal((await call("/cv/parse", "POST", { text: "x".repeat(30_001) })).status, 413);
  assert.equal((await call("/saved/%", "DELETE")).status, 400);
  assert.equal((await call("/profile/extra")).status, 404);
  assert.equal((await call("/cv/parse/extra", "POST", { text: CV })).status, 404);
  assert.equal((await fetch(ORIGIN + "/data.json")).status, 404);
  assert.equal((await fetch(ORIGIN + "/data.sqlite")).status, 404);
  assert.equal((await fetch(ORIGIN + "/app.js", { method: "POST" })).status, 405);
  assert.equal((await fetch(ORIGIN + "/app.js", { method: "HEAD" })).status, 200);
});

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

test("bookmarks match across searches and can still open the CV coach after history deletion", async () => {
  const { body: { saved: [bookmark] } } = await call("/saved");
  const { body: { search_id } } = await call("/searches", "POST", {});
  const repeated = await waitDone(search_id);
  const sameProgram = repeated.results.find((result) => result.name === bookmark.name);
  assert.notEqual(sameProgram.id, bookmark.id);
  assert.ok(sameProgram.program_id);
  assert.equal(sameProgram.program_id, bookmark.program_id);
  assert.ok((await call(`/searches/${search_id}`)).body.saved_ids.includes(sameProgram.id));
  await call(`/saved/${encodeURIComponent(sameProgram.id)}`, "PUT");
  assert.equal((await call("/saved")).body.saved.length, 1);
  assert.equal((await call(`/searches/${search_id}`, "DELETE")).status, 200);
  const originalSearch = bookmark.id.split(":")[0];
  assert.equal((await call(`/searches/${originalSearch}`, "DELETE")).status, 200);
  assert.equal((await call(`/coach/${encodeURIComponent(bookmark.id)}`)).status, 200);
  await call(`/saved/${encodeURIComponent(bookmark.id)}`, "DELETE");
  assert.deepEqual((await call("/saved")).body.saved, []);
});

test("imports a legacy store once, keeps the source, and recovers an interrupted search", async () => {
  const legacy = join(dir, "legacy.json");
  const { body: { profile } } = await call("/profile");
  const { body: { today } } = await call("/meta");
  const record = { id: "old-search", created_at: new Date().toISOString(), day: today, status: "running", notes: "", steps: [], results: [] };
  const saved = [{ id: "old-bookmark", name: "Beasiswa Lama", provider: "Kampus", country: "Indonesia", saved_at: record.created_at }];
  const original = JSON.stringify({ profile, searches: [record], saved });
  writeFileSync(legacy, original);
  await stopServer();
  await startServer({ DATA_FILE: legacy });
  assert.deepEqual((await call("/profile")).body.profile, profile);
  assert.equal((await call("/searches/old-search")).body.search.status, "failed");
  assert.equal((await call("/saved")).body.saved[0].id, "old-bookmark");
  await call("/profile", "PUT", { ...profile, prodi: "Teknik Sipil" });
  assert.equal(readFileSync(legacy, "utf8"), original);
  await stopServer();
  await startServer({ DATA_FILE: legacy });
  assert.equal((await call("/profile")).body.profile.prodi, "Teknik Sipil");
  await stopServer();
  await startServer();
});

test("deleting successful history cannot restore quota, including after restart", async () => {
  const { body: { search_id } } = await call("/searches", "POST", {});
  assert.equal((await waitDone(search_id)).status, "succeeded");
  const { body: { searches: [previous] } } = await call("/searches");
  const used = (await call("/meta")).body.quota_left;
  assert.equal((await call(`/searches/${previous.id}`, "DELETE")).status, 200);
  assert.equal((await call("/meta")).body.quota_left, used);
  await stopServer();
  await startServer();
  assert.equal((await call("/meta")).body.quota_left, used);
  assert.equal((await call("/searches")).body.searches.length, 0);
});

test("external attempt limit is enforced independently of successful searches", async () => {
  const { body: { today } } = await call("/meta");
  const { body: { profile } } = await call("/profile");
  const full = join(dir, "provider-limit.json");
  writeFileSync(full, JSON.stringify({ profile, searches: [], saved: [], providerAttempts: { day: today, count: 10 } }));
  await stopServer();
  await startServer({ DATA_FILE: full, FIRECRAWL_API_KEY: "test-fixture-never-used" });
  assert.equal((await call("/meta")).body.quota_left, 5);
  const blocked = await call("/searches", "POST", {});
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error, /Batas percobaan/);
  assert.equal((await call("/searches")).body.searches.length, 0);
});

// Demo server for PRD 6.4 "Cari Beasiswa". One demo member, JSON file storage, no framework.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { agentMode, runSearch } from "./agent.mjs";
import { MAX_CV_CHARS, parseCv } from "./cv.mjs";
import { coachFor, previewFor } from "./coach.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
// API keys (FIRECRAWL_API_KEY / ANTHROPIC_API_KEY) live in .env, never in source.
try {
  process.loadEnvFile(join(ROOT, ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
// DATA_FILE lets end-to-end tests run against a throwaway store.
const DATA_PATH = process.env.DATA_FILE || join(ROOT, "data.json");
const PUBLIC_DIR = join(ROOT, "public");
const PORT = Number(process.env.PORT) || 3000;
const DAILY_QUOTA = 5;
const DAILY_PROVIDER_ATTEMPTS = 10;
const RUNNING_RETRY_SECONDS = 15;
const MAX_BODY_BYTES = 20_000;
const MAX_CV_BODY_BYTES = 200_000;
const JS = "text/javascript; charset=utf-8";
const STATIC_FILES = new Map([
  ["/", [join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8"]],
  ["/index.html", [join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8"]],
  ["/app.js", [join(PUBLIC_DIR, "app.js"), JS]],
  ["/web-url.mjs", [join(PUBLIC_DIR, "web-url.mjs"), JS]],
  ["/pdf/pdf.mjs", [join(ROOT, "node_modules/pdfjs-dist/build/pdf.mjs"), JS]],
  ["/pdf/pdf.worker.mjs", [join(ROOT, "node_modules/pdfjs-dist/build/pdf.worker.mjs"), JS]],
]);
const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; worker-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

// Date in Asia/Jakarta, so "today" and the daily quota match the member's calendar.
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

let db = { profile: null, searches: [], saved: [] };
try {
  db = JSON.parse(await readFile(DATA_PATH, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
// Searches cut off by a restart can never finish (PRD 11: sweeper marks them failed).
for (const s of db.searches) {
  if (s.status === "queued" || s.status === "running") Object.assign(s, { status: "failed", error: "Server dimulai ulang saat pencarian berjalan." });
}

let saving = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(db, null, 2);
  const pending = saving.then(async () => {
    await writeFile(`${DATA_PATH}.tmp`, snapshot, { mode: 0o600 });
    await rename(`${DATA_PATH}.tmp`, DATA_PATH);
  });
  saving = pending.catch(() => console.error("Gagal menyimpan data lokal."));
  return pending;
}

const PROFILE_FIELDS = {
  jenjang_saat_ini: (v) => ["SMA", "D3", "S1", "S2"].includes(v),
  jenjang_tujuan: (v) => ["Exchange", "S1", "S2", "S3"].includes(v),
  prodi: (v) => typeof v === "string" && v.length <= 100,
  ipk: (v) => typeof v === "number" && v >= 0 && v <= 4,
  semester: (v) => Number.isInteger(v) && v >= 1 && v <= 14,
  negara_tujuan: (v) => typeof v === "string" && v.length <= 200,
  bidang_minat: (v) => typeof v === "string" && v.length <= 200,
  skor_bahasa: (v) => typeof v === "number" && v >= 0 && v <= 9,
  prestasi: (v) => typeof v === "string" && v.length <= 500,
  butuh_pendanaan: (v) => typeof v === "boolean",
};

export function validateProfile(body) {
  const errors = Object.entries(PROFILE_FIELDS).filter(([k, ok]) => !ok(body?.[k])).map(([k]) => k);
  return errors.length ? { errors } : { profile: Object.fromEntries(Object.keys(PROFILE_FIELDS).map((k) => [k, body[k]])) };
}

// PRD S7: 5 searches/day, 1 running; failed searches do not count (S8).
export function checkQuota(searches, day, now = new Date(), deletedUsed = 0) {
  if (searches.some((s) => s.status === "queued" || s.status === "running")) {
    return { error: "Masih ada 1 pencarian berjalan. Tunggu sampai selesai.", retry_after: RUNNING_RETRY_SECONDS };
  }
  const used = deletedUsed + searches.filter((s) => s.day === day && s.status !== "failed").length;
  if (used >= DAILY_QUOTA) {
    return { error: `Kuota ${DAILY_QUOTA} pencarian hari ini habis.`, retry_after: secondsUntilTomorrow(day, now) };
  }
  return null;
}

function secondsUntilTomorrow(day, now = new Date()) {
  const midnight = new Date(`${day}T00:00:00+07:00`).getTime() + 86_400_000;
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

const countToday = (counter, day) => counter?.day === day ? counter.count : 0;
function quotaLeft(day) {
  const used = db.searches.filter((s) => s.day === day && s.status !== "failed").length;
  return Math.max(0, DAILY_QUOTA - used - countToday(db.deletedSearches, day));
}

async function startSearch(search, profile) {
  const started = Date.now();
  search.status = "running";
  try {
    await persist(); // Reserve the quota on disk before making paid requests.
    const { results, expired, usage, others = [] } = await runSearch(profile, search.notes, (text) => {
      search.steps.push({ at: new Date().toISOString(), text });
    }, search.day);
    search.results = results.map((r, i) => ({ ...r, id: `${search.id}:${i}` }));
    Object.assign(search, { status: "succeeded", expired, usage, others });
  } catch (error) {
    console.error(`Pencarian ${search.id} gagal (${error.name}).`);
    Object.assign(search, { status: "failed", error: error.publicMessage ?? "Pencarian gagal. Coba lagi beberapa saat lagi." });
  }
  search.duration_ms = Date.now() - started;
  await persist().catch(() => {});
}

const summary = ({ id, created_at, status, notes, mode, results, error }) => ({ id, created_at, status, notes, mode, count: results.length, top: results[0]?.name ?? null, error });

async function readJson(req, limit = MAX_BODY_BYTES) {
  if (req.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw Object.assign(new Error("Gunakan Content-Type application/json."), { status: 415 });
  }
  if (Number(req.headers["content-length"]) > limit) {
    throw Object.assign(new Error("Body terlalu besar"), { status: 413 });
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Body terlalu besar"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const value = chunks.length ? JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) : {};
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw Object.assign(new Error("JSON tidak valid"), { status: 400 });
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

async function api(req, res, path) {
  const [, , resource, id, action, extra] = path.split("/");
  const method = req.method;
  if (extra !== undefined || id === "" || action === "") return send(res, 404, { error: "Endpoint tidak ada." });

  if (resource === "meta" && !id && method === "GET") {
    const day = today();
    return send(res, 200, { mode: agentMode(), quota_left: quotaLeft(day), daily_quota: DAILY_QUOTA, today: day });
  }

  if (resource === "profile" && !id) {
    if (method === "GET") return send(res, 200, { profile: db.profile });
    if (method === "PUT") {
      const { profile, errors } = validateProfile(await readJson(req));
      if (errors) return send(res, 422, { error: "Data profil tidak valid", fields: errors });
      db.profile = profile;
      await persist();
      return send(res, 200, { profile });
    }
  }

  if (resource === "cv" && id === "parse" && !action && method === "POST") {
    const { text } = await readJson(req, MAX_CV_BODY_BYTES);
    if (typeof text !== "string" || text.trim().length < 50) return send(res, 422, { error: "Teks CV tidak terbaca. Pastikan PDF berisi teks, bukan hasil scan gambar." });
    if (text.length > MAX_CV_CHARS) return send(res, 413, { error: "CV terlalu panjang." });
    const { fields, source } = await parseCv(text, today());
    // Only values that pass the profile validators reach the form.
    const valid = Object.fromEntries(Object.entries(fields).filter(([k, v]) => Object.hasOwn(PROFILE_FIELDS, k) && PROFILE_FIELDS[k](v)));
    return send(res, 200, { fields: valid, source });
  }

  if (resource === "searches" && !action) {
    if (method === "GET" && !id) return send(res, 200, { searches: [...db.searches].reverse().map(summary) });
    if (method === "POST" && !id) {
      if (!db.profile) return send(res, 409, { error: "Isi profil beasiswa dulu." });
      const { notes = "" } = await readJson(req);
      if (typeof notes !== "string" || notes.length > 300) return send(res, 422, { error: "Catatan maksimal 300 karakter." });
      const day = today();
      const blocked = checkQuota(db.searches, day, new Date(), countToday(db.deletedSearches, day));
      if (blocked) return send(res, 429, blocked, { "Retry-After": String(blocked.retry_after) });
      const mode = agentMode();
      if (mode !== "demo") {
        const attempts = countToday(db.providerAttempts, day);
        if (attempts >= DAILY_PROVIDER_ATTEMPTS) {
          const retry_after = secondsUntilTomorrow(day);
          return send(res, 429, { error: "Batas percobaan pencarian web hari ini tercapai.", retry_after }, { "Retry-After": String(retry_after) });
        }
        db.providerAttempts = { day, count: attempts + 1 };
      }
      const search = { id: randomUUID(), created_at: new Date().toISOString(), day, status: "queued", notes: notes.trim(), mode, steps: [], results: [], expired: 0, error: null };
      db.searches.push(search);
      void startSearch(search, db.profile); // background job; client polls GET /api/searches/:id
      return send(res, 202, { search_id: search.id });
    }
    const search = db.searches.find((s) => s.id === id);
    if (!search) return send(res, 404, { error: "Pencarian tidak ditemukan." });
    if (method === "GET") return send(res, 200, { search, saved_ids: db.saved.map((s) => s.id) });
    if (method === "DELETE") {
      if (search.status === "running" || search.status === "queued") return send(res, 409, { error: "Pencarian masih berjalan." });
      const day = today();
      if (search.day === day && search.status === "succeeded") {
        db.deletedSearches = { day, count: countToday(db.deletedSearches, day) + 1 };
      }
      db.searches = db.searches.filter((s) => s.id !== id);
      await persist();
      return send(res, 200, { deleted: id });
    }
  }

  if (resource === "coach" && id) {
    const resultId = decodeId(id);
    const search = db.searches.find((x) => x.results.some((r) => r.id === resultId));
    const result = search?.results.find((r) => r.id === resultId);
    if (!result) return send(res, 404, { error: "Hasil tidak ditemukan." });
    if (!result.program) return send(res, 409, { error: "Hasil ini dari versi lama. Jalankan pencarian ulang untuk memakai fitur Sesuaikan CV." });
    if (!db.profile) return send(res, 409, { error: "Isi profil beasiswa dulu." });
    if (method === "GET" && !action) return send(res, 200, { result_id: resultId, ...coachFor(db.profile, search.notes, result.program) });
    if (method === "POST" && action === "preview") {
      const body = await readJson(req);
      const patch = {};
      for (const [key, max] of [["prestasi", 500], ["bidang_minat", 200], ["negara_tujuan", 200]]) {
        if (body[key] === undefined) continue;
        if (typeof body[key] !== "string" || body[key].length > max) return send(res, 422, { error: `${key} maksimal ${max} karakter.` });
        patch[key] = body[key];
      }
      return send(res, 200, previewFor(db.profile, search.notes, result.program, patch));
    }
  }

  if (resource === "saved" && !action) {
    if (method === "GET" && !id) return send(res, 200, { saved: [...db.saved].reverse() });
    if (id && method === "PUT") {
      const resultId = decodeId(id);
      // Idempotent toggle (PRD S5): saving twice keeps one copy.
      if (!db.saved.some((s) => s.id === resultId)) {
        const result = db.searches.flatMap((s) => s.results).find((r) => r.id === resultId);
        if (!result) return send(res, 404, { error: "Hasil tidak ditemukan." });
        db.saved.push({ ...result, saved_at: new Date().toISOString() });
        await persist();
      }
      return send(res, 200, { saved: true });
    }
    if (id && method === "DELETE") {
      const resultId = decodeId(id);
      db.saved = db.saved.filter((s) => s.id !== resultId);
      await persist();
      return send(res, 200, { saved: false });
    }
  }

  return send(res, 404, { error: "Endpoint tidak ada." });
}

function decodeId(id) {
  try {
    return decodeURIComponent(id);
  } catch {
    throw Object.assign(new Error("ID tidak valid."), { status: 400 });
  }
}

async function serveStatic(req, res, path) {
  const asset = STATIC_FILES.get(path);
  if (!asset) return send(res, 404, { error: "Halaman tidak ditemukan." });
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Metode tidak didukung." }, { Allow: "GET, HEAD" });
  const [file, type] = asset;
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": type, "Content-Length": body.length, "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    send(res, 404, { error: "Berkas tidak ditemukan." });
  }
}

const server = createServer({ headersTimeout: 10_000, requestTimeout: 20_000, connectionsCheckingInterval: 1_000 }, async (req, res) => {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(header, value);
  const host = req.headers.host;
  const port = req.socket.localPort;
  if (![ `localhost:${port}`, `127.0.0.1:${port}` ].includes(host)) {
    return send(res, 403, { error: "Buka aplikasi dari alamat lokal." }, { Connection: "close" });
  }
  if (!req.url.startsWith("/") || req.url.startsWith("//") || req.url.includes("\\")) {
    return send(res, 400, { error: "Alamat tidak valid." }, { Connection: "close" });
  }
  const path = req.url.split("?")[0];
  try {
    if (path.startsWith("/api/")) {
      const { origin, "sec-fetch-site": site } = req.headers;
      if ((origin !== undefined && origin !== `http://${host}`) || (site && site !== "same-origin" && site !== "none")) {
        return send(res, 403, { error: "Permintaan harus berasal dari aplikasi lokal." }, { Connection: "close" });
      }
      return await api(req, res, path);
    }
    return await serveStatic(req, res, path);
  } catch (error) {
    if (!error.status) console.error(`Permintaan gagal (${error.name}).`);
    send(res, error.status ?? 500, { error: error.status ? error.message : "Terjadi kesalahan server." }, { Connection: "close" });
  }
});

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  server.listen(PORT, "127.0.0.1", () => console.log(`Cari Beasiswa (${agentMode()}): http://localhost:${PORT}`));
}

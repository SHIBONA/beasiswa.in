// Demo server for PRD 6.4 "Cari Beasiswa". One demo member, JSON file storage, no framework.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
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
const RUNNING_RETRY_SECONDS = 15;
const MAX_BODY_BYTES = 20_000;
const MAX_CV_BODY_BYTES = 200_000;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

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
  saving = saving.then(async () => {
    await writeFile(`${DATA_PATH}.tmp`, JSON.stringify(db, null, 2));
    await rename(`${DATA_PATH}.tmp`, DATA_PATH);
  }).catch((e) => console.error("Gagal menyimpan data:", e.message));
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
export function checkQuota(searches, day, now = new Date()) {
  if (searches.some((s) => s.status === "queued" || s.status === "running")) {
    return { error: "Masih ada 1 pencarian berjalan. Tunggu sampai selesai.", retry_after: RUNNING_RETRY_SECONDS };
  }
  const used = searches.filter((s) => s.day === day && s.status !== "failed").length;
  if (used >= DAILY_QUOTA) {
    const midnight = new Date(`${day}T00:00:00+07:00`).getTime() + 86_400_000;
    return { error: `Kuota ${DAILY_QUOTA} pencarian hari ini habis.`, retry_after: Math.ceil((midnight - now.getTime()) / 1000) };
  }
  return null;
}

const quotaLeft = () => DAILY_QUOTA - db.searches.filter((s) => s.day === today() && s.status !== "failed").length;

async function startSearch(search) {
  const started = Date.now();
  search.status = "running";
  persist();
  try {
    const { results, expired, usage, others = [] } = await runSearch(db.profile, search.notes, (text) => {
      search.steps.push({ at: new Date().toISOString(), text });
    }, search.day);
    search.results = results.map((r, i) => ({ ...r, id: `${search.id}:${i}` }));
    Object.assign(search, { status: "succeeded", expired, usage, others });
  } catch (error) {
    console.error(`Pencarian ${search.id} gagal:`, error);
    Object.assign(search, { status: "failed", error: error.message || "Terjadi kesalahan pada agen." });
  }
  search.duration_ms = Date.now() - started;
  persist();
}

const summary = ({ id, created_at, status, notes, mode, results, error }) => ({ id, created_at, status, notes, mode, count: results.length, top: results[0]?.name ?? null, error });

async function readJson(req, limit = MAX_BODY_BYTES) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Body terlalu besar"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
  } catch {
    throw Object.assign(new Error("JSON tidak valid"), { status: 400 });
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

async function api(req, res, path) {
  const [, , resource, id, action] = path.split("/");
  const method = req.method;

  if (resource === "meta" && method === "GET") return send(res, 200, { mode: agentMode(), quota_left: quotaLeft(), daily_quota: DAILY_QUOTA, today: today() });

  if (resource === "profile") {
    if (method === "GET") return send(res, 200, { profile: db.profile });
    if (method === "PUT") {
      const { profile, errors } = validateProfile(await readJson(req));
      if (errors) return send(res, 422, { error: "Data profil tidak valid", fields: errors });
      db.profile = profile;
      persist();
      return send(res, 200, { profile });
    }
  }

  if (resource === "cv" && id === "parse" && method === "POST") {
    const { text } = await readJson(req, MAX_CV_BODY_BYTES);
    if (typeof text !== "string" || text.trim().length < 50) return send(res, 422, { error: "Teks CV tidak terbaca. Pastikan PDF berisi teks, bukan hasil scan gambar." });
    if (text.length > MAX_CV_CHARS * 2) return send(res, 413, { error: "CV terlalu panjang." });
    const { fields, source } = await parseCv(text, today());
    // Only values that pass the profile validators reach the form.
    const valid = Object.fromEntries(Object.entries(fields).filter(([k, v]) => PROFILE_FIELDS[k]?.(v)));
    return send(res, 200, { fields: valid, source });
  }

  if (resource === "searches") {
    if (method === "GET" && !id) return send(res, 200, { searches: [...db.searches].reverse().map(summary) });
    if (method === "POST" && !id) {
      if (!db.profile) return send(res, 409, { error: "Isi profil beasiswa dulu." });
      const { notes = "" } = await readJson(req);
      if (typeof notes !== "string" || notes.length > 300) return send(res, 422, { error: "Catatan maksimal 300 karakter." });
      const blocked = checkQuota(db.searches, today());
      if (blocked) return send(res, 429, blocked, { "Retry-After": String(blocked.retry_after) });
      const search = { id: randomUUID(), created_at: new Date().toISOString(), day: today(), status: "queued", notes: notes.trim(), mode: agentMode(), steps: [], results: [], expired: 0, error: null };
      db.searches.push(search);
      persist();
      startSearch(search); // background job; client polls GET /api/searches/:id
      return send(res, 202, { search_id: search.id });
    }
    const search = db.searches.find((s) => s.id === id);
    if (!search) return send(res, 404, { error: "Pencarian tidak ditemukan." });
    if (method === "GET") return send(res, 200, { search, saved_ids: db.saved.map((s) => s.id) });
    if (method === "DELETE") {
      if (search.status === "running" || search.status === "queued") return send(res, 409, { error: "Pencarian masih berjalan." });
      db.searches = db.searches.filter((s) => s.id !== id);
      persist();
      return send(res, 200, { deleted: id });
    }
  }

  if (resource === "coach" && id) {
    const resultId = decodeURIComponent(id);
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

  if (resource === "saved") {
    if (method === "GET" && !id) return send(res, 200, { saved: [...db.saved].reverse() });
    const resultId = decodeURIComponent(id ?? "");
    if (method === "PUT") {
      // Idempotent toggle (PRD S5): saving twice keeps one copy.
      if (!db.saved.some((s) => s.id === resultId)) {
        const result = db.searches.flatMap((s) => s.results).find((r) => r.id === resultId);
        if (!result) return send(res, 404, { error: "Hasil tidak ditemukan." });
        db.saved.push({ ...result, saved_at: new Date().toISOString() });
        persist();
      }
      return send(res, 200, { saved: true });
    }
    if (method === "DELETE") {
      db.saved = db.saved.filter((s) => s.id !== resultId);
      persist();
      return send(res, 200, { saved: false });
    }
  }

  return send(res, 404, { error: "Endpoint tidak ada." });
}

async function serveStatic(res, path) {
  const file = normalize(join(PUBLIC_DIR, path === "/" ? "index.html" : path));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, { error: "Forbidden" });
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  try {
    if (path.startsWith("/api/")) return await api(req, res, path);
    return await serveStatic(res, path);
  } catch (error) {
    if (!error.status) console.error(error);
    send(res, error.status ?? 500, { error: error.status ? error.message : "Terjadi kesalahan server." });
  }
});

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  server.listen(PORT, () => console.log(`Cari Beasiswa MVP (${agentMode()} mode): http://localhost:${PORT}`));
}

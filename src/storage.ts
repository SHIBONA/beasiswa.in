import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { programIdentity } from "./catalog.ts";

const VERSION = 1;
const SCHEMA = `
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    body TEXT NOT NULL
  ) STRICT;
  CREATE TABLE searches (
    id TEXT NOT NULL PRIMARY KEY,
    day TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    body TEXT NOT NULL
  ) STRICT;
  CREATE INDEX searches_day_status ON searches(day, status);
  CREATE UNIQUE INDEX one_active_search ON searches((1)) WHERE status IN ('queued', 'running');
  CREATE TABLE programs (id TEXT NOT NULL PRIMARY KEY) STRICT;
  CREATE TABLE periods (
    program_id TEXT NOT NULL REFERENCES programs(id),
    deadline TEXT NOT NULL,
    PRIMARY KEY (program_id, deadline)
  ) STRICT;
  CREATE TABLE results (
    id TEXT NOT NULL PRIMARY KEY,
    search_id TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    program_id TEXT NOT NULL,
    deadline TEXT NOT NULL,
    body TEXT NOT NULL,
    UNIQUE (search_id, rank),
    FOREIGN KEY (program_id, deadline) REFERENCES periods(program_id, deadline)
  ) STRICT;
  CREATE TABLE bookmarks (
    program_id TEXT NOT NULL,
    deadline TEXT NOT NULL,
    result_id TEXT NOT NULL UNIQUE,
    body TEXT NOT NULL,
    PRIMARY KEY (program_id),
    FOREIGN KEY (program_id, deadline) REFERENCES periods(program_id, deadline)
  ) STRICT;
  CREATE TABLE counters (
    kind TEXT NOT NULL PRIMARY KEY,
    day TEXT NOT NULL,
    count INTEGER NOT NULL CHECK (count >= 0)
  ) STRICT;
  CREATE TABLE source_cache (
    url TEXT NOT NULL PRIMARY KEY,
    checked_at TEXT NOT NULL,
    body TEXT NOT NULL
  ) STRICT;
`;

function identify(result, mode) {
  const parts = programIdentity(result.program ?? result);
  const scope = mode === "demo" ? "demo" : "web";
  const key = parts.every(Boolean) ? [scope, ...parts] : ["legacy", result.id];
  const program_id = createHash("sha256").update(JSON.stringify(key)).digest("hex");
  return { ...result, program_id };
}

function legacyData(path) {
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(data.searches) || !Array.isArray(data.saved)) throw new Error("Struktur data.json tidak valid.");
    return data;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
}

const body = (row) => row ? JSON.parse(row.body) : null;
const interrupted = (search) => ({
  ...search, status: "failed", error: "Server dimulai ulang saat pencarian berjalan.",
});

export function openStore(path, legacyPath) {
  // SQLite inherits this file's permissions for its journal files on POSIX.
  try {
    writeFileSync(path, "", { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const db = new Database(path, { strict: true });
  db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  // Rows are untyped: each caller reads the columns its own query selects.
  const get = (sql, ...args): any => db.prepare(sql).get(...args);
  const all = (sql, ...args): any[] => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);

  function transaction(work) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function saveSearch(search) {
    const { results, ...record } = search;
    run(`INSERT INTO searches VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, body = excluded.body`,
      search.id, search.day, search.status, JSON.stringify(record));
    results.forEach((result, rank) => {
      const entry = identify(result, search.mode);
      const deadline = savePeriod(entry);
      run("INSERT INTO results VALUES (?, ?, ?, ?, ?, ?)",
        entry.id, search.id, rank, entry.program_id, deadline, JSON.stringify(entry));
    });
  }

  function savePeriod(result) {
    const deadline = result.program?.deadline || result.deadline || "";
    run("INSERT INTO programs VALUES (?) ON CONFLICT DO NOTHING", result.program_id);
    run("INSERT INTO periods VALUES (?, ?) ON CONFLICT DO NOTHING", result.program_id, deadline);
    return deadline;
  }

  function bookmark(result, savedAt) {
    const deadline = savePeriod(result);
    run("INSERT INTO bookmarks VALUES (?, ?, ?, ?) ON CONFLICT(program_id) DO NOTHING",
      result.program_id, deadline, result.id, JSON.stringify({ ...result, saved_at: savedAt }));
  }

  const setProfile = (profile) => run(`INSERT INTO profile VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET body = excluded.body`, JSON.stringify(profile));
  const setCount = (kind, day, count) => run(`INSERT INTO counters VALUES (?, ?, ?)
    ON CONFLICT(kind) DO UPDATE SET day = excluded.day, count = excluded.count`, kind, day, count);
  const count = (kind, day) => get("SELECT count FROM counters WHERE kind = ? AND day = ?", kind, day)?.count ?? 0;

  try {
    transaction(() => {
      const { user_version: version } = get("PRAGMA user_version");
      if (version > VERSION) throw new Error("Versi penyimpanan lebih baru daripada aplikasi ini.");
      if (version === 0) {
        db.exec(SCHEMA);
        const old = legacyData(legacyPath);
        if (old?.profile) setProfile(old.profile);
        for (const search of old?.searches ?? []) {
          saveSearch(["queued", "running"].includes(search.status) ? interrupted(search) : search);
        }
        for (const saved of old?.saved ?? []) {
          const result = get("SELECT body FROM results WHERE id = ?", saved.id);
          const mode = saved.program?.source || saved.source || (saved.program?.official === undefined ? "demo" : "web");
          bookmark(result ? { ...saved, program_id: body(result).program_id } : identify(saved, mode), saved.saved_at);
        }
        for (const [kind, counter] of [["provider", old?.providerAttempts], ["deleted", old?.deletedSearches]]) {
          if (counter) setCount(kind, counter.day, counter.count);
        }
        db.exec("PRAGMA user_version = 1");
      }
      for (const row of all("SELECT body FROM searches WHERE status IN ('queued', 'running')")) {
        saveSearch({ ...interrupted(body(row)), results: [] });
      }
    });
  } catch (error) {
    db.close();
    throw error;
  }

  return {
    transaction,
    close: () => db.close(),
    profile: () => body(get("SELECT body FROM profile WHERE id = 1")),
    setProfile,
    count,
    increment: (kind, day) => setCount(kind, day, count(kind, day) + 1),
    quotaSearches: (day) => all(`SELECT day, status FROM searches WHERE day = ?
      UNION ALL SELECT day, status FROM searches WHERE day <> ? AND status IN ('queued', 'running')`, day, day),
    saveSearch,
    history: () => all(`SELECT s.id, json_extract(s.body, '$.created_at') AS created_at,
      s.status, json_extract(s.body, '$.notes') AS notes, json_extract(s.body, '$.mode') AS mode,
      json_extract(s.body, '$.error') AS error,
      (SELECT count(*) FROM results WHERE search_id = s.id) AS count,
      (SELECT json_extract(body, '$.name') FROM results WHERE search_id = s.id AND rank = 0) AS top
      FROM searches s ORDER BY s.rowid DESC`),
    search: (id) => {
      const search = body(get("SELECT body FROM searches WHERE id = ?", id));
      return search && { ...search, results: all("SELECT body FROM results WHERE search_id = ? ORDER BY rank", id).map(body) };
    },
    removeSearch: (id) => run("DELETE FROM searches WHERE id = ?", id),
    saved: () => all("SELECT body FROM bookmarks ORDER BY rowid DESC").map(body),
    savedIds: (searchId) => all(`SELECT r.id FROM results r JOIN bookmarks b USING (program_id)
      WHERE r.search_id = ? ORDER BY r.rank`, searchId).map((row) => row.id),
    lookup: (id) => {
      const row = get(`SELECT r.body, json_extract(s.body, '$.notes') AS notes FROM results r
        JOIN searches s ON s.id = r.search_id WHERE r.id = ?`, id);
      if (row) return { result: body(row), notes: row.notes ?? "", savedOnly: false };
      return { result: body(get("SELECT body FROM bookmarks WHERE result_id = ?", id)), notes: "", savedOnly: true };
    },
    bookmark,
    removeBookmark: (id) => run("DELETE FROM bookmarks WHERE program_id = ?", id),
    readSource: (url, cutoff) => body(get("SELECT body FROM source_cache WHERE url = ? AND checked_at >= ?", url, cutoff)),
    writeSource: (url, checkedAt, entries, cutoff) => transaction(() => {
      run("DELETE FROM source_cache WHERE checked_at < ?", cutoff);
      run(`INSERT INTO source_cache VALUES (?, ?, ?) ON CONFLICT(url) DO UPDATE
        SET checked_at = excluded.checked_at, body = excluded.body`, url, checkedAt, JSON.stringify(entries));
    }),
  };
}

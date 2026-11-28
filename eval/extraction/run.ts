// Scores one extractor on the saved eval pages, through the same evidence checks the app uses (reviewPage).
//   bun eval/extraction/run.ts firecrawl                  the saved Firecrawl extraction (no new credits)
//   bun eval/extraction/run.ts <provider> <model>         any OpenAI-compatible model, see providers.ts
//   ... --cases mext-kedutaan,eiffel                      only some pages
// Results print as a table and are saved under eval/extraction/results/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { FC_SCHEMA, extractionPrompt, reviewPage } from "../../src/agent.ts";
import { CAPTURED_ON, CASES, type EvalCase } from "./cases.ts";
import { PROVIDERS } from "./providers.ts";

const envFile = new URL("../../.env", import.meta.url).pathname;
if (existsSync(envFile)) process.loadEnvFile(envFile);

const MAX_PAGE_CHARS = 60_000; // keeps the prompt inside small free-tier context windows
const here = (name: string) => new URL(`./${name}`, import.meta.url).pathname;
type Page = { finalUrl: string; markdown: string };
type Extraction = { json: unknown; markdown: string; finalUrl: string; ms: number; tokens?: { input?: number; output?: number } };

const [providerName, model] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const only = process.argv.find((a) => a.startsWith("--cases="))?.slice("--cases=".length).split(",");
if (!providerName || (providerName !== "firecrawl" && !model)) {
  console.error(`Usage: bun eval/extraction/run.ts firecrawl | <${Object.keys(PROVIDERS).join("|")}> <model> [--cases=a,b]`);
  process.exit(1);
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8"));
const firstJsonObject = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("model reply has no JSON object");
  return JSON.parse(text.slice(start, end + 1));
};

async function viaChat(c: EvalCase, page: Page): Promise<Extraction> {
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`unknown provider ${providerName}`);
  const key = provider.keyEnv ? process.env[provider.keyEnv] : "ollama";
  if (!key) throw new Error(`${provider.keyEnv} is not set`);
  const body = {
    model,
    messages: [
      { role: "system", content: `${extractionPrompt(c.target, c.destinations, CAPTURED_ON)}\n\nBalas hanya dengan satu objek JSON yang mengikuti JSON Schema berikut:\n${JSON.stringify(FC_SCHEMA)}` },
      { role: "user", content: `URL halaman: ${page.finalUrl}\n\nIsi halaman (markdown):\n\n${page.markdown.slice(0, MAX_PAGE_CHARS)}` },
    ],
  };
  const post = (withJsonMode: boolean) => fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(withJsonMode ? { ...body, response_format: { type: "json_object" } } : body),
    signal: AbortSignal.timeout(180_000),
  });
  let started = Date.now();
  let res = await post(provider.jsonMode);
  if (res.status === 400 && provider.jsonMode) res = await post(false); // some models refuse JSON mode
  // Free tiers cap tokens per minute (HTTP 429): wait as long as the provider asks, up to five times.
  for (let attempt = 1; res.status === 429 && attempt <= 5; attempt++) {
    const text = await res.text();
    const wait = Number(res.headers.get("retry-after")) || Number(text.match(/try again in ([\d.]+)s/)?.[1]) || 60;
    console.log(`${c.id}: rate limited, waiting ${Math.ceil(wait)} s`);
    await new Promise((r) => setTimeout(r, (Math.ceil(wait) + 1) * 1000));
    started = Date.now();
    res = await post(provider.jsonMode);
    if (res.status === 400 && provider.jsonMode) res = await post(false);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const reply = await res.json();
  const text = reply?.choices?.[0]?.message?.content ?? "";
  return {
    json: firstJsonObject(text), markdown: page.markdown, finalUrl: page.finalUrl, ms: Date.now() - started,
    tokens: { input: reply?.usage?.prompt_tokens, output: reply?.usage?.completion_tokens },
  };
}

function viaBaseline(c: EvalCase): Extraction {
  const file = here(`baseline/${c.id}.json`);
  if (!existsSync(file)) throw new Error("no saved baseline; run capture.ts --baseline");
  const saved = readJson<{ json: unknown; markdown: string; finalUrl: string }>(file);
  return { ...saved, ms: 0 };
}

const cases = CASES.filter((c) => !only || only.includes(c.id));
const rows = [];
for (const [i, c] of cases.entries()) {
  console.log(`[${i + 1}/${cases.length}] ${c.id}`);
  const pageFile = here(`pages/${c.id}.json`);
  if (!existsSync(pageFile)) {
    rows.push({ id: c.id, error: "page not captured; run capture.ts" });
    continue;
  }
  try {
    const x = providerName === "firecrawl" ? viaBaseline(c) : await viaChat(c, readJson<Page>(pageFile));
    const { entries, rejected } = reviewPage(x.json, x.markdown, x.finalUrl, c.target, c.destinations);
    const named = (match: string) => entries.find((e) => e.name.toLowerCase().includes(match));
    const expected = c.expect.map((e) => {
      const card = named(e.match);
      return {
        match: e.match, found: Boolean(card),
        deadline: e.deadline ? card?.deadline === e.deadline : undefined,
        opens: e.opens_at ? card?.opens_at === e.opens_at : undefined,
        got: card && { deadline: card.deadline, opens_at: card.opens_at },
      };
    });
    const extra = entries.filter((e) => !c.expect.some((x) => e.name.toLowerCase().includes(x.match))).map((e) => e.name);
    rows.push({ id: c.id, ms: x.ms, tokens: x.tokens, expected, extra, rejected });
  } catch (err) {
    rows.push({ id: c.id, error: err instanceof Error ? err.message : String(err) });
  }
}

// Summary: programmes found with full evidence, dates right, cards the page should not produce, failures.
const all = rows.flatMap((r) => ("expected" in r ? r.expected ?? [] : []));
const count = (f: (x: (typeof all)[number]) => boolean | undefined) => all.filter((x) => f(x) === true).length;
const datesChecked = all.filter((x) => x.deadline !== undefined).length;
const summary = {
  extractor: providerName === "firecrawl" ? "firecrawl (saved)" : `${providerName} ${model}`,
  pages: cases.length,
  found: `${count((x) => x.found)}/${all.length}`,
  deadline_right: `${count((x) => x.deadline)}/${datesChecked}`,
  extra_cards: rows.reduce((n, r) => n + ("extra" in r ? r.extra?.length ?? 0 : 0), 0),
  failed_pages: rows.filter((r) => "error" in r).length,
  seconds: Math.round(rows.reduce((n, r) => n + ("ms" in r ? r.ms ?? 0 : 0), 0) / 1000),
};

for (const r of rows) {
  if ("error" in r) console.log(`${r.id.padEnd(22)} ERROR ${r.error}`);
  else console.log(`${r.id.padEnd(22)} ${r.expected?.map((x) => `${x.found ? "found" : "missed"}(${x.match})${x.deadline === false ? " wrong-deadline" : ""}`).join(", ") || "no programme expected"}${r.extra?.length ? `  extra: ${r.extra.join("; ")}` : ""}`);
}
console.table([summary]);

const out = here("results");
mkdirSync(out, { recursive: true });
const file = `${out}/${summary.extractor.replace(/[^a-z0-9.-]+/gi, "_")}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify({ summary, rows }, null, 2));
console.log(`saved ${file}`);

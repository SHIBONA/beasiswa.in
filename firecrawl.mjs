// Firecrawl client (search + scrape with JSON extraction). Needs FIRECRAWL_API_KEY.
// Every quote the extractor returns is checked against the page markdown before it is shown.
import { CATALOG } from "./catalog.mjs";
import { publicWebUrl } from "./public/web-url.mjs";
export { publicWebUrl };

const API = "https://api.firecrawl.dev/v2";
const TIMEOUT_MS = 90_000;
const MIN_QUOTE_CHARS = 12;

const BLOCKED_HOSTS = ["facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "threads.net", "youtube.com", "linkedin.com", "scribd.com", "reddit.com", "quora.com", "pinterest.com"];
export const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);
const ORGANISERS = new Set([...CATALOG.map((s) => hostOf(s.url)), "daad.de", "europa.eu", "fulbrightprogram.org", "emb-japan.go.jp"]);
const INSTITUTION_DOMAIN = /\.(?:gov|edu|(?:gov|govt|edu|ac|go)\.[a-z]{2})$/;

export const isBlocked = (url) => !publicWebUrl(url) || BLOCKED_HOSTS.some((d) => hostMatches(hostOf(url), d));
export const isOfficial = (url) => {
  if (!publicWebUrl(url)) return false;
  const host = hostOf(url);
  return INSTITUTION_DOMAIN.test(host) || [...ORGANISERS].some((domain) => hostMatches(host, domain));
};

async function call(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "error",
  });
  const knownError = {
    402: "Kredit Firecrawl habis. Isi ulang kredit atau pakai mode demo.",
    429: "Firecrawl membatasi permintaan. Coba lagi dalam satu menit.",
    401: "API key Firecrawl tidak valid.",
  }[response.status];
  if (!response.ok) {
    await response.body?.cancel();
    throw Object.assign(new Error(`Firecrawl HTTP ${response.status}`), { publicMessage: knownError });
  }
  const data = await readResponse(response);
  if (data?.success !== true) throw new Error("Respons Firecrawl tidak valid.");
  return data;
}

async function readResponse(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4_000_000) {
        await reader.cancel();
        throw new Error("Respons Firecrawl terlalu besar.");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    reader.releaseLock();
  }
}

export async function search(query, limit) {
  const { data } = await call("/search", { query, limit, location: "Indonesia" });
  return Array.isArray(data?.web) ? data.web.slice(0, limit).filter((r) => !isBlocked(r?.url)).map((r) => ({
    url: publicWebUrl(r.url).href,
    title: typeof r.title === "string" ? r.title.slice(0, 240) : "",
    description: typeof r.description === "string" ? r.description.slice(0, 400) : "",
  })) : [];
}

export async function scrapeJson(url, schema, prompt) {
  if (isBlocked(url)) throw new Error("URL sumber tidak diizinkan.");
  const { data } = await call("/scrape", { url, onlyMainContent: true, formats: ["markdown", { type: "json", schema, prompt }] });
  const finalUrl = data?.metadata?.url ?? data?.metadata?.sourceURL ?? url;
  if (isBlocked(finalUrl)) throw new Error("URL akhir sumber tidak diizinkan.");
  return { json: data?.json ?? null, markdown: typeof data?.markdown === "string" ? data.markdown : "", finalUrl: publicWebUrl(finalUrl).href };
}

// Runs tasks with a small concurrency cap; keeps result order; a failed task yields { error }.
export async function pool(items, limit, task) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await task(items[i], i).catch((error) => ({ error }));
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const clean = (text) => String(text ?? "").normalize("NFKC").toLowerCase().replace(/[*_`#|>\\[\]()]/g, " ").replace(/\s+/g, " ").trim();

// A quote counts only if it is really on the page (anti-hallucination, PRD risk 11).
export function verifyQuote(quote, markdown) {
  if (typeof quote !== "string" || quote.length > 1000) return "";
  const q = clean(quote);
  return q.length >= MIN_QUOTE_CHARS && clean(markdown).includes(q) ? String(quote).trim() : "";
}

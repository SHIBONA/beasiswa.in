// Firecrawl client (search + scrape with JSON extraction). Needs FIRECRAWL_API_KEY.
// Every quote the extractor returns is checked against the page markdown before it is shown.
import { CATALOG } from "./catalog.ts";
import { publicWebUrl, type SearchHit } from "@beasiswa/shared";
export { publicWebUrl };

const API = "https://api.firecrawl.dev/v2";
const TIMEOUT_MS = 90_000;
const MIN_QUOTE_CHARS = 12;

// Provider and model JSON is untrusted: read it as a plain record and check every field.
export type Raw = Record<string, unknown>;
export const record = (value: unknown): Raw => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Raw : {};

const BLOCKED_HOSTS = ["facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "threads.com", "threads.net", "youtube.com", "linkedin.com", "scribd.com", "reddit.com", "quora.com", "pinterest.com"];
export const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
const hostMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);
const ORGANISERS = new Set([...CATALOG.map((s) => hostOf(s.url)), "daad.de", "europa.eu", "fulbrightprogram.org", "emb-japan.go.jp"]);
const INSTITUTION_DOMAIN = /\.(?:gov|edu|(?:gov|govt|edu|ac|go)\.[a-z]{2})$/;

export const isBlocked = (url: unknown) => {
  const parsed = publicWebUrl(url);
  return !parsed || BLOCKED_HOSTS.some((d) => hostMatches(hostOf(parsed.href), d));
};
export const isOfficial = (url: unknown) => {
  const parsed = publicWebUrl(url);
  if (!parsed) return false;
  const host = hostOf(parsed.href);
  return INSTITUTION_DOMAIN.test(host) || [...ORGANISERS].some((domain) => hostMatches(host, domain));
};

async function call(path: string, body: object) {
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

async function readResponse(response: Response) {
  if (!response.body) throw new Error("Respons Firecrawl kosong.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
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

export type { SearchHit };

export async function search(query: string, limit: number): Promise<SearchHit[]> {
  const { data } = await call("/search", { query, limit, location: "Indonesia" });
  return Array.isArray(data?.web) ? data.web.slice(0, limit).flatMap((item: unknown) => {
    const r = record(item);
    const url = publicWebUrl(r.url);
    return url && !isBlocked(url.href) ? [{
      url: url.href,
      title: typeof r.title === "string" ? r.title.slice(0, 240) : "",
      description: typeof r.description === "string" ? r.description.slice(0, 400) : "",
    }] : [];
  }) : [];
}

export async function scrapeJson(url: string, schema: object, prompt: string) {
  if (isBlocked(url)) throw new Error("URL sumber tidak diizinkan.");
  const { data } = await call("/scrape", { url, onlyMainContent: true, formats: ["markdown", { type: "json", schema, prompt }] });
  const finalUrl = publicWebUrl(data?.metadata?.url ?? data?.metadata?.sourceURL ?? url);
  if (!finalUrl || isBlocked(finalUrl.href)) throw new Error("URL akhir sumber tidak diizinkan.");
  return { json: data?.json ?? null, markdown: typeof data?.markdown === "string" ? data.markdown : "", finalUrl: finalUrl.href };
}

// Runs tasks with a small concurrency cap; keeps result order; a failed task yields { error }.
export type Failed = { error: unknown };
// Task results must not carry their own "error" key (all callers return arrays).
export const failed = (r: object): r is Failed => "error" in r;

export async function pool<T, R extends object>(items: T[], limit: number, task: (item: T, i: number) => Promise<R>) {
  const out = new Array<R | Failed>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await task(items[i], i).catch((error: unknown) => ({ error }));
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const clean = (text: unknown) => String(text ?? "").normalize("NFKC").toLowerCase().replace(/[*_`#|>\\[\]()]/g, " ").replace(/\s+/g, " ").trim();

// The extractor often wraps a quote in quote marks or trims it with an ellipsis; neither is page text.
const unwrap = (quote: string) => quote.replace(/^(?:\s|["“”'‘’「『]|\.{3}|…)+|(?:\s|["“”'‘’」』]|\.{3}|…)+$/g, "");

// A quote counts only if it is really on the page (anti-hallucination, PRD risk 11).
export function verifyQuote(quote: unknown, markdown: string) {
  if (typeof quote !== "string" || quote.length > 1000) return "";
  const text = unwrap(quote);
  const q = clean(text);
  return q.length >= MIN_QUOTE_CHARS && clean(markdown).includes(q) ? text : "";
}

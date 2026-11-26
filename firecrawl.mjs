// Firecrawl client (search + scrape with JSON extraction). Needs FIRECRAWL_API_KEY.
// Every quote the extractor returns is checked against the page markdown before it is shown.
const API = "https://api.firecrawl.dev/v2";
const TIMEOUT_MS = 90_000;
const MIN_QUOTE_CHARS = 12;

const BLOCKED_HOSTS = ["facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "threads.net", "youtube.com", "linkedin.com", "scribd.com", "reddit.com", "quora.com", "pinterest.com"];
const OFFICIAL_HOST = /\.(go\.id|ac\.id|gov|edu|or\.id)$|\.(gov|edu|ac|go)\.[a-z]{2}$|lpdp|chevening|daad|fulbright|aminef|studyinkorea|campuschina|nesoindonesia|australiaawards|nzscholarships|erasmus|europa\.eu|si\.se|stipendiumhungaricum|turkiyeburslari|icdf|a-star|ugc\.edu\.hk|emb-japan|mext/;

export const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);
export const isBlocked = (url) => !/^https?:/.test(url) || BLOCKED_HOSTS.some((d) => hostMatches(hostOf(url), d));
export const isOfficial = (url) => OFFICIAL_HOST.test(hostOf(url));

async function call(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 402) throw new Error("Kredit Firecrawl habis. Isi ulang kredit atau pakai mode demo.");
  if (response.status === 429) throw new Error("Firecrawl membatasi permintaan (rate limit). Coba lagi 1 menit lagi.");
  if (response.status === 401) throw new Error("API key Firecrawl tidak valid.");
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(`Firecrawl ${response.status}: ${data.error ?? "permintaan gagal"}`);
  return data;
}

export async function search(query, limit) {
  const { data } = await call("/search", { query, limit, location: "Indonesia" });
  return (data?.web ?? []).map((r) => ({ url: r.url, title: r.title ?? "", description: r.description ?? "" }));
}

export async function scrapeJson(url, schema, prompt) {
  const { data } = await call("/scrape", { url, onlyMainContent: true, formats: ["markdown", { type: "json", schema, prompt }] });
  return { json: data?.json ?? null, markdown: data?.markdown ?? "", finalUrl: data?.metadata?.url ?? url };
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
  const q = clean(quote);
  return q.length >= MIN_QUOTE_CHARS && clean(markdown).includes(q) ? String(quote).trim() : "";
}

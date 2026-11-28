// Saves each eval page once, so models can be compared offline without spending Firecrawl credits again.
//   bun eval/extraction/capture.ts             page text only (one Firecrawl scrape per page not yet saved)
//   bun eval/extraction/capture.ts --baseline  also Firecrawl's own JSON extraction, the baseline to beat
// Pages already saved are skipped; pass --force to fetch them again.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { FC_SCHEMA, extractionPrompt } from "../../src/agent.ts";
import { scrapeJson, scrapeMarkdown } from "../../src/firecrawl.ts";
import { CAPTURED_ON, CASES } from "./cases.ts";

process.loadEnvFile(new URL("../../.env", import.meta.url).pathname);
if (!process.env.FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not set in .env");

const dir = (name: string) => {
  const path = new URL(`./${name}/`, import.meta.url).pathname;
  mkdirSync(path, { recursive: true });
  return path;
};
// Free Firecrawl plans rate-limit bursts (HTTP 429): wait a minute and try again, up to three times.
async function withRetry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (err) {
      if (attempt >= 3 || !(err instanceof Error) || !err.message.includes("HTTP 429")) throw err;
      console.log("rate limited by Firecrawl; waiting 65 s");
      await new Promise((r) => setTimeout(r, 65_000));
    }
  }
}

const force = process.argv.includes("--force");
const baseline = process.argv.includes("--baseline");
const pages = dir("pages");
const baselines = dir("baseline");

for (const c of CASES) {
  const pageFile = `${pages}${c.id}.json`;
  if (force || !existsSync(pageFile)) {
    const { markdown, finalUrl } = await withRetry(() => scrapeMarkdown(c.url));
    writeFileSync(pageFile, JSON.stringify({ url: c.url, finalUrl, markdown, capturedAt: new Date().toISOString() }, null, 2));
    console.log(`page      ${c.id}: ${markdown.length} chars`);
  }
  const baselineFile = `${baselines}${c.id}.json`;
  if (baseline && (force || !existsSync(baselineFile))) {
    const result = await withRetry(() => scrapeJson(c.url, FC_SCHEMA, extractionPrompt(c.target, c.destinations, CAPTURED_ON)));
    writeFileSync(baselineFile, JSON.stringify(result, null, 2));
    console.log(`baseline  ${c.id}: ${(result.json?.scholarships ?? []).length} programmes extracted`);
  }
}

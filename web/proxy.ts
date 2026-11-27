// Front door for the local app: checks every request, forwards /api to the Bun API server
// and gives pages a per-request CSP nonce. Mirrors the checks in src/server.ts.
import { NextResponse, type NextRequest } from "next/server";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";
const PORT = process.env.PORT ?? "3000";
const LOCAL_HOSTS = [`localhost:${PORT}`, `127.0.0.1:${PORT}`];

const SECURITY_HEADERS = {
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

const reject = (status: number, error: string) =>
  NextResponse.json({ error }, { status, headers: { Connection: "close", "Cache-Control": "no-store", ...SECURITY_HEADERS } });

export function proxy(request: NextRequest) {
  // A page on another site can point its own host name at 127.0.0.1 (DNS rebinding); answer only local names.
  const host = request.headers.get("host") ?? "";
  if (!LOCAL_HOSTS.includes(host)) return reject(403, "Buka aplikasi dari alamat lokal.");
  return request.nextUrl.pathname.startsWith("/api/") ? forwardApi(request, host) : page(request);
}

function forwardApi(request: NextRequest, host: string) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin !== null && origin !== `http://${host}`) || (site && site !== "same-origin" && site !== "none")) {
    return reject(403, "Permintaan harus berasal dari aplikasi lokal.");
  }
  // The browser checks passed here; the API server sees a plain local request.
  const headers = new Headers(request.headers);
  headers.delete("origin");
  headers.delete("sec-fetch-site");
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, API_ORIGIN);
  return NextResponse.rewrite(target, { request: { headers } });
}

function page(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  // React needs eval in development only, to rebuild server error stacks in the browser.
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const csp = [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}`,
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'", // fonts are self-hosted by next/font
    "worker-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", csp); // Next.js reads the nonce from this request header.
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  return response;
}

import { request } from 'node:http';
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Status of a request sent with a chosen Host header (fetch cannot set Host).
function statusWithHost(url: URL, host: string) {
  return new Promise<number | undefined>((resolve, reject) => {
    const req = request(url, { headers: { Host: host } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Web front door', () => {
  test('pages get a nonce CSP and browser security headers', async ({ app }) => {
    const page = await fetch(new URL('/cari', app.baseUrl));
    expect(page.status).toBe(200);
    const csp = page.headers.get('content-security-policy') ?? '';
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(page.headers.get('x-frame-options')).toBe('DENY');
    expect(page.headers.get('x-content-type-options')).toBe('nosniff');
    expect(page.headers.get('referrer-policy')).toBe('no-referrer');
    const next = await fetch(new URL('/cari', app.baseUrl));
    expect(next.headers.get('content-security-policy')).not.toBe(csp);
  });

  test('rejects foreign host names and cross-site API requests', async ({ app }) => {
    const base = new URL(app.baseUrl);
    expect(await statusWithHost(new URL('/cari', base), `example.test:${base.port}`)).toBe(403);
    expect(await statusWithHost(new URL('/api/profile', base), `example.test:${base.port}`)).toBe(403);
    const foreign: Record<string, string>[] = [{ Origin: 'https://example.test' }, { 'Sec-Fetch-Site': 'cross-site' }];
    for (const headers of foreign) {
      expect((await fetch(new URL('/api/profile', base), { headers })).status).toBe(403);
    }
    expect((await fetch(new URL('/api/profile', base), { headers: { Origin: base.origin, 'Sec-Fetch-Site': 'same-origin' } })).status).toBe(200);
  });
});

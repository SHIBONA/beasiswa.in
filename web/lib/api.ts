import type { ApiErrorBody } from "@beasiswa/shared";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: ApiErrorBody) {
    super(message);
  }
}

export const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

// Responses come from the local API server; each caller names the shape it reads (see @beasiswa/shared).
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, cache: "no-store", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || "Terjadi kesalahan.", res.status, body);
  return body as T;
}

export const sendJson = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

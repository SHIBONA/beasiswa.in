const NON_PUBLIC_SUFFIX = /\.(?:localhost|local|internal|test|invalid|onion|home|lan|arpa)$/;

// Check the hostname's syntax. DNS resolution and redirects are handled by the caller's client.
export function publicWebUrl(input, { keepFragment = false } = {}) {
  if (typeof input !== "string" || input.length > 2048) return null;
  try {
    const url = new URL(input);
    const host = url.hostname;
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    if (!/^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/.test(host) || NON_PUBLIC_SUFFIX.test(host)) return null;
    if (!keepFragment) url.hash = "";
    return url;
  } catch {
    return null;
  }
}

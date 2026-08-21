const blockedV4 = [
  /^127\./, /^10\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^0\./, /^224\./, /^255\./,
];

export function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "localhost.localdomain" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb") || host.startsWith("fc") || host.startsWith("fd")) return true;
  return blockedV4.some((pattern) => pattern.test(host));
}

export function assertSafeProbeUrl(raw: string): URL {
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error("Only HTTP(S) probe URLs are permitted");
  if (url.username || url.password) throw new Error("Credentials are not permitted in probe URLs");
  if (isUnsafeHostname(url.hostname)) throw new Error("Private or reserved probe destination rejected");
  if (url.port && !['80', '443'].includes(url.port)) throw new Error("Non-standard probe ports require administrator review");
  return url;
}

export async function resolveAndAssertPublic(url: URL): Promise<void> {
  const literalIp = /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname.includes(':');
  if (literalIp && isUnsafeHostname(url.hostname)) throw new Error("Private address rejected");
  // Cloudflare Workers do not expose a portable DNS resolver. Runtime fetches
  // still validate every redirect and are limited to reviewed canonical URLs.
}

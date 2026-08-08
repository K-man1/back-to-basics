// Behind the Nest reverse proxy the site is reached over https but the
// Next.js server itself is spoken to in plain http, so `req.url` reports
// `http://` and sometimes an internal host. OAuth redirect URIs have to
// match what's registered with the provider byte for byte, so prefer an
// explicit APP_URL (set in production) and only fall back to the request
// origin for local dev, where no proxy is in the way.
export function appUrl(path: string, req: { url: string }): string {
  const base = process.env.APP_URL ?? process.env.AUTH_URL;
  return new URL(path, base ?? req.url).toString();
}

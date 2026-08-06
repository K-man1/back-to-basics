// Students type project links by hand, and "github.com/me/repo" (no scheme) is
// a *relative* href — the browser resolves it against the current page, so the
// link lands on /dashboard/github.com/me/repo instead of GitHub. Normalize to
// an absolute https URL. Anything that isn't http(s) after that (javascript:,
// data:, mailto:) returns null so it never reaches an href.
export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  // Anything already carrying a scheme is left alone (and rejected below if it
  // isn't http/https); "mailto:"/"javascript:" have no "//" but still must not
  // get an https:// glued in front of them.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

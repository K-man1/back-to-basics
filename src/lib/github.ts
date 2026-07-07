// Parsing + snippet fetching for GitHub permalinks attached to journal
// entries. Only blob URLs with a line anchor get expanded into an inline
// snippet on the review page; anything else (commit URLs, PRs, whole files)
// just renders as a link.

export interface GithubBlobLink {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  startLine: number;
  endLine: number;
}

const MAX_SNIPPET_LINES = 40;

// https://github.com/<owner>/<repo>/blob/<ref>/<path>#L10 or #L10-L30.
// The ref segment is a single path piece (SHA, tag, or branch) — branch names
// containing "/" would be ambiguous with the file path, so we accept the
// common case and fall back to a plain link otherwise.
export function parseGithubBlobLink(raw: string): GithubBlobLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.hostname !== "github.com") return null;

  const [owner, repo, blob, ref, ...pathParts] = url.pathname
    .split("/")
    .filter(Boolean);
  if (!owner || !repo || blob !== "blob" || !ref || !pathParts.length) {
    return null;
  }

  const match = url.hash.match(/^#L(\d+)(?:-L(\d+))?$/);
  if (!match) return null;

  const startLine = Number.parseInt(match[1], 10);
  const endLine = match[2] ? Number.parseInt(match[2], 10) : startLine;
  if (startLine < 1 || endLine < startLine) return null;

  return { owner, repo, ref, path: pathParts.join("/"), startLine, endLine };
}

export interface GithubSnippet {
  startLine: number;
  lines: string[];
  truncated: boolean;
}

// Public repos only, no auth: raw.githubusercontent.com serves file contents
// without API rate-limit headaches. SHA-pinned permalinks never change, so an
// hour of caching is safe (branch refs can drift, hence not `force-cache`).
export async function fetchGithubSnippet(
  link: GithubBlobLink,
): Promise<GithubSnippet | null> {
  const rawUrl = `https://raw.githubusercontent.com/${link.owner}/${link.repo}/${link.ref}/${link.path}`;
  try {
    const res = await fetch(rawUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const text = await res.text();

    const allLines = text.split("\n");
    if (link.startLine > allLines.length) return null;

    const wanted = allLines.slice(link.startLine - 1, link.endLine);
    const truncated = wanted.length > MAX_SNIPPET_LINES;
    return {
      startLine: link.startLine,
      lines: truncated ? wanted.slice(0, MAX_SNIPPET_LINES) : wanted,
      truncated,
    };
  } catch {
    return null;
  }
}

// Per the real OpenAPI spec at https://hackatime.hackclub.com/api-docs/v1/swagger.yaml
// and the OAuth Apps guide at https://hackatime.hackclub.com/docs/oauth/oauth-apps
// (the human-readable /docs pages are client-rendered and don't return usable
// content to a plain fetch — verified against the raw spec/Inertia JSON payload
// instead of guessing).
//
// The public `/api/v1/users/{username}/stats` endpoint only works if the
// student has manually enabled "public stats lookup" in their settings, which
// isn't the norm. The real integration is Hackatime's own OAuth 2.0 (Doorkeeper)
// consent flow: the student authorizes this app once (see
// src/app/api/hackatime/connect and .../callback), and we use the resulting
// access token against the `/api/v1/authenticated/*` endpoints instead.
const VERY_EARLY_DATE = "2000-01-01";

export interface HackatimeProjectStat {
  name: string;
  total_seconds: number;
}

export interface HackatimeStats {
  totalSeconds: number;
  projects: HackatimeProjectStat[];
  // Seconds with `category = "ai coding"` excluded, or null when the endpoint
  // used could not report it. See the note below: this is not the same number
  // as totalSeconds and choosing between them is a policy decision.
  humanSeconds: number | null;
}

// Hours with AI-assisted coding excluded.
//
// Hackatime tags heartbeats with a category, and agent integrations (the
// Claude Code WakaTime plugin, Cursor, Copilot) send `ai coding`. Its stats API
// takes `no_ai_coding=true`, which drops that category from the totals it
// returns. `/api/v1/authenticated/hours` does NOT support the flag — it sums
// every heartbeat regardless of category — so it cannot answer this question at
// all, which is why the calls below use `/api/v1/users/my/stats` instead.
// `my` resolves to the OAuth caller and skips the public-stats gate.
//
// Measured on a real account before this was written: 177.8h total against
// 99.5h with AI coding excluded. The gap is not noise, it is 44% of tracked
// time, and at $5/hr it is the difference between paying $889 and paying $497
// for the same work. WHICH ONE COUNTS AS PAYABLE IS A PROGRAM DECISION, not a
// technical one, so both are returned here and neither is silently preferred.
const STATS_URL = "https://hackatime.hackclub.com/api/v1/users/my/stats";

// Hackatime can return the same project name more than once in a stats window
// (the catch-all `Other` bucket especially). Names are the identity we key the
// picker and `projects.hackatime_project_names` on, so collapse them here and
// sum the seconds rather than letting duplicates reach the UI.
function parseProjects(raw: unknown): HackatimeProjectStat[] {
  if (!Array.isArray(raw)) return [];

  const byName = new Map<string, number>();
  for (const entry of raw) {
    const p = entry as { name?: unknown; total_seconds?: unknown };
    if (typeof p?.name !== "string" || typeof p?.total_seconds !== "number") continue;
    byName.set(p.name, (byName.get(p.name) ?? 0) + p.total_seconds);
  }

  return [...byName].map(([name, total_seconds]) => ({ name, total_seconds }));
}

export async function getAuthenticatedHackatimeStats(
  accessToken: string,
): Promise<HackatimeStats | null> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const today = new Date().toISOString().slice(0, 10);
  const window = `start_date=${VERY_EARLY_DATE}&end_date=${today}`;

  // Two calls to the same endpoint rather than one: the flag changes the
  // totals, and the program needs to be able to show both without a second
  // round trip when someone asks why the numbers differ.
  const [allRes, humanRes] = await Promise.all([
    fetch(`${STATS_URL}?${window}&features=projects`, { headers }),
    fetch(`${STATS_URL}?${window}&total_seconds=true&no_ai_coding=true`, {
      headers,
    }),
  ]);

  if (!allRes.ok) return null;
  const body = await allRes.json().catch(() => null);
  const data = body?.data;
  if (typeof data?.total_seconds !== "number") return null;

  // Deliberately left null rather than defaulted to totalSeconds when the
  // second call fails. Falling back would quietly report AI time as human time,
  // which is the one direction of error that costs money.
  let humanSeconds: number | null = null;
  if (humanRes.ok) {
    const h = await humanRes.json().catch(() => null);
    const seconds = h?.total_seconds ?? h?.data?.total_seconds;
    if (typeof seconds === "number") humanSeconds = seconds;
  }

  return {
    totalSeconds: data.total_seconds,
    projects: parseProjects(data.projects),
    humanSeconds,
  };
}

// Fallback for students who don't (or haven't yet) gone through the OAuth
// connect flow but have manually made their stats public. Best-effort only.
export async function getPublicHackatimeStats(
  slackId: string,
): Promise<HackatimeStats | null> {
  const res = await fetch(
    `https://hackatime.hackclub.com/api/v1/users/${slackId}/stats?features=projects`,
  );
  if (!res.ok) return null;

  const body = await res.json().catch(() => null);
  const data = body?.data;
  if (typeof data?.total_seconds !== "number") return null;

  // No AI-excluded figure on this path: it would need a second request and this
  // is already the degraded fallback for students who never connected OAuth.
  return {
    totalSeconds: data.total_seconds,
    projects: parseProjects(data.projects),
    humanSeconds: null,
  };
}

export async function getHackatimeStatsForStudent(student: {
  hackatime_access_token: string | null;
  slack_id: string | null;
}): Promise<HackatimeStats | null> {
  if (student.hackatime_access_token) {
    return getAuthenticatedHackatimeStats(student.hackatime_access_token);
  }
  if (student.slack_id) {
    return getPublicHackatimeStats(student.slack_id);
  }
  return null;
}

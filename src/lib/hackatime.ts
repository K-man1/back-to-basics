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
}

export async function getAuthenticatedHackatimeStats(
  accessToken: string,
): Promise<HackatimeStats | null> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const today = new Date().toISOString().slice(0, 10);

  const [hoursRes, projectsRes] = await Promise.all([
    fetch(
      `https://hackatime.hackclub.com/api/v1/authenticated/hours?start_date=${VERY_EARLY_DATE}&end_date=${today}`,
      { headers },
    ),
    fetch(
      `https://hackatime.hackclub.com/api/v1/authenticated/projects?start_date=${VERY_EARLY_DATE}&end_date=${today}`,
      { headers },
    ),
  ]);

  if (!hoursRes.ok) return null;

  const hours = await hoursRes.json().catch(() => null);
  if (typeof hours?.total_seconds !== "number") return null;

  let projects: HackatimeProjectStat[] = [];
  if (projectsRes.ok) {
    const body = await projectsRes.json().catch(() => null);
    if (Array.isArray(body?.projects)) {
      projects = body.projects
        .filter((p: unknown): p is { name: string; total_seconds: number } =>
          typeof (p as { name?: unknown })?.name === "string" &&
          typeof (p as { total_seconds?: unknown })?.total_seconds === "number",
        )
        .map((p: { name: string; total_seconds: number }) => ({
          name: p.name,
          total_seconds: p.total_seconds,
        }));
    }
  }

  return { totalSeconds: hours.total_seconds, projects };
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

  const projects: HackatimeProjectStat[] = Array.isArray(data.projects)
    ? data.projects
        .filter((p: unknown): p is { name: string; total_seconds: number } =>
          typeof (p as { name?: unknown })?.name === "string" &&
          typeof (p as { total_seconds?: unknown })?.total_seconds === "number",
        )
        .map((p: { name: string; total_seconds: number }) => ({
          name: p.name,
          total_seconds: p.total_seconds,
        }))
    : [];

  return { totalSeconds: data.total_seconds, projects };
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

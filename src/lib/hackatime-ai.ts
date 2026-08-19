import { supabaseAdmin } from "@/lib/supabase";

// AI line attribution, pulled from Hackatime's raw heartbeats and cached.
//
// Hackatime already computes this for every student without anyone installing
// anything of ours. Two independent producers write the columns:
//
//   hackatime-cli (pkg/ai/*.go)  parses the agent's own session transcripts and
//                                writes ai_line_changes as a signed
//                                newLines-oldLines over the patch hunks, with
//                                ai_model set.
//   vscode-hackatime             classifies each editor edit with a local
//                                heuristic (paste size, chat-sidebar focus,
//                                timing) and splits doc.lineCount deltas into
//                                ai_line_changes / human_line_changes. Sets no
//                                ai_model at all.
//
// Both land in the same columns and are summed. That is Hackatime's design, not
// a choice available to us, and it is why nothing here reports a model-level
// total as if it were the whole picture.
//
// The endpoint: /api/v1/my/heartbeats authenticates with the OAuth token we
// already store (`api_user_from_credentials(oauth_scopes: ["read"])`) and
// renders the heartbeat relation with no as_json override, so every column
// comes back. It is also the ONLY readable source for human_line_changes --
// their aggregate endpoints never expose it -- and the only complete source for
// ai_line_changes, since /summaries reports AI lines solely inside
// `ai_model_breakdown`, which WakatimeService#daily_activity builds under
// `if row["ai_model"].present?`. Every VS Code student's lines are dropped
// there, which is the case we most need to get right.
//
// The cost, and the reason for the cache table: no project filter, no row cap,
// a time window and nothing else.

const HEARTBEATS_URL = "https://hackatime.hackclub.com/api/v1/my/heartbeats";

const DAY_MS = 86_400_000;

// Days per request. Heartbeats arrive roughly every couple of minutes while
// coding, so a week is a few thousand rows at worst -- small enough for one
// response, large enough that a term's backfill is tens of requests and not
// hundreds.
const CHUNK_DAYS = 7;

// How many chunks are in flight at once. Deliberately low: this is somebody
// else's free service and a backfill is not urgent.
const CONCURRENCY = 3;

// How long a student's cache stays fresh before a page load triggers another
// pull. Heartbeats are batched by the editor anyway, so a tighter loop buys
// nothing but load.
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

// How far back a student with no watermark is backfilled. Projects older than
// this show partial AI data rather than none; the alternative is every first
// page load pulling a year of heartbeats inline.
const INITIAL_BACKFILL_DAYS = 120;

// Re-fetch this much before the watermark on every sync. Heartbeats can be
// written late (an editor that was offline flushes its queue on reconnect), so
// a window that was complete when we read it may not stay complete. Days are
// upserted whole, so overlapping costs nothing but a request.
const OVERLAP_MS = 36 * 60 * 60 * 1000;

export interface HackatimeAiTelemetry {
  aiLines: number;
  humanLines: number;
  inputTokens: number;
  outputTokens: number;
  // {model: lines} for the rows that carried a model name. Its total is
  // normally LESS than aiLines, because the VS Code path sets no model. Never
  // render this as a complete breakdown of aiLines.
  byModel: { name: string; lines: number }[];
  // Lines that arrived with no model attached: aiLines minus the model total.
  // Surfaced rather than hidden so the gap is legible instead of looking like
  // an arithmetic error.
  unattributedModelLines: number;
  activeDays: number;
  start: string;
  end: string;
}

interface RawHeartbeat {
  time?: unknown;
  project?: unknown;
  ai_line_changes?: unknown;
  human_line_changes?: unknown;
  ai_input_tokens?: unknown;
  ai_output_tokens?: unknown;
  ai_model?: unknown;
}

interface DayBucket {
  ai_lines: number;
  human_lines: number;
  ai_input_tokens: number;
  ai_output_tokens: number;
  models: Record<string, number>;
  heartbeats: number;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function emptyBucket(): DayBucket {
  return {
    ai_lines: 0,
    human_lines: 0,
    ai_input_tokens: 0,
    ai_output_tokens: 0,
    models: {},
    heartbeats: 0,
  };
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchWindow(
  accessToken: string,
  start: Date,
  end: Date,
): Promise<RawHeartbeat[] | null> {
  const qs = new URLSearchParams({
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  });
  const res = await fetch(`${HEARTBEATS_URL}?${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return Array.isArray(body?.heartbeats) ? body.heartbeats : null;
}

// Fold raw heartbeats into (day, project) buckets. Keyed on the heartbeat's own
// `time`, which is a float epoch second, so a row is attributed to the day it
// happened rather than the day we happened to fetch it.
function bucketise(
  heartbeats: RawHeartbeat[],
  into: Map<string, DayBucket>,
): void {
  for (const hb of heartbeats) {
    const time = num(hb.time);
    if (!time) continue;
    const date = isoDay(new Date(time * 1000));
    // Null project is Hackatime's "Other" bucket, not a row to discard: it
    // still holds real line counts and dropping it would understate totals.
    const project =
      typeof hb.project === "string" && hb.project ? hb.project : "Other";
    const key = `${date}\t${project}`;
    const bucket = into.get(key) ?? emptyBucket();
    const aiLines = num(hb.ai_line_changes);
    bucket.ai_lines += aiLines;
    bucket.human_lines += num(hb.human_line_changes);
    bucket.ai_input_tokens += num(hb.ai_input_tokens);
    bucket.ai_output_tokens += num(hb.ai_output_tokens);
    bucket.heartbeats += 1;
    if (typeof hb.ai_model === "string" && hb.ai_model) {
      bucket.models[hb.ai_model] = (bucket.models[hb.ai_model] ?? 0) + aiLines;
    }
    into.set(key, bucket);
  }
}

async function runChunks<T>(
  jobs: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const out: T[] = new Array(jobs.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, jobs.length) },
    async () => {
      while (next < jobs.length) {
        const i = next++;
        out[i] = await jobs[i]();
      }
    },
  );
  await Promise.all(workers);
  return out;
}

// Pull everything since the watermark and rewrite the days it covers.
//
// Never throws and never blocks a render on a bad network: a failed sync leaves
// the watermark where it was and the cached rows intact, so the page shows
// slightly stale numbers instead of an error. Returns whether anything moved.
export async function syncStudentAiDays(
  student: { id: string; hackatime_access_token: string | null },
  { force = false }: { force?: boolean } = {},
): Promise<boolean> {
  const token = student.hackatime_access_token;
  if (!token) return false;
  const supabase = supabaseAdmin();

  const { data: sync } = await supabase
    .from("hackatime_ai_sync")
    .select("*")
    .eq("student_id", student.id)
    .maybeSingle();

  const now = new Date();
  const lastAttempt = sync?.last_attempt ? new Date(sync.last_attempt) : null;
  if (
    !force &&
    lastAttempt &&
    now.getTime() - lastAttempt.getTime() < SYNC_INTERVAL_MS
  ) {
    return false;
  }

  // Debounce on the attempt, not on success, so a student whose Hackatime grant
  // was revoked does not retry on every single page load.
  await supabase
    .from("hackatime_ai_sync")
    .upsert(
      { student_id: student.id, last_attempt: now.toISOString() },
      { onConflict: "student_id" },
    );

  const watermark = sync?.synced_through
    ? new Date(new Date(sync.synced_through).getTime() - OVERLAP_MS)
    : new Date(now.getTime() - INITIAL_BACKFILL_DAYS * DAY_MS);

  const windows: [Date, Date][] = [];
  for (
    let t = watermark.getTime();
    t < now.getTime();
    t += CHUNK_DAYS * DAY_MS
  ) {
    windows.push([
      new Date(t),
      new Date(Math.min(t + CHUNK_DAYS * DAY_MS, now.getTime())),
    ]);
  }
  if (!windows.length) return false;

  const results = await runChunks(
    windows.map(
      ([start, end]) =>
        () =>
          fetchWindow(token, start, end).catch(() => null),
    ),
    CONCURRENCY,
  );

  // A hole in the middle would mean upserting a day computed from a partial
  // fetch, which silently *lowers* a previously-correct count. So the watermark
  // only advances to the end of the last window before the first failure, and
  // only those windows' days are written.
  const firstFailure = results.findIndex((r) => r === null);
  const good = firstFailure === -1 ? results.length : firstFailure;
  if (good === 0) {
    await supabase
      .from("hackatime_ai_sync")
      .upsert(
        { student_id: student.id, failures: (sync?.failures ?? 0) + 1 },
        { onConflict: "student_id" },
      );
    return false;
  }

  const buckets = new Map<string, DayBucket>();
  for (let i = 0; i < good; i++) bucketise(results[i]!, buckets);

  const rows = [...buckets].map(([key, b]) => {
    const tab = key.indexOf("\t");
    return {
      student_id: student.id,
      local_date: key.slice(0, tab),
      project: key.slice(tab + 1),
      ai_lines: Math.round(b.ai_lines),
      human_lines: Math.round(b.human_lines),
      ai_input_tokens: Math.round(b.ai_input_tokens),
      ai_output_tokens: Math.round(b.ai_output_tokens),
      models: b.models,
      heartbeats: b.heartbeats,
      synced_at: new Date().toISOString(),
    };
  });

  if (rows.length) {
    // Whole-day replace, not increment. The window we just fetched is the
    // authority for the days it covers, so an upsert is idempotent and a
    // re-run of an overlapping window cannot double-count.
    await supabase
      .from("hackatime_ai_days")
      .upsert(rows, { onConflict: "student_id,local_date,project" });
  }

  const syncedThrough = windows[good - 1][1];
  await supabase.from("hackatime_ai_sync").upsert(
    {
      student_id: student.id,
      synced_through: syncedThrough.toISOString(),
      last_success: new Date().toISOString(),
      failures: firstFailure === -1 ? 0 : (sync?.failures ?? 0) + 1,
    },
    { onConflict: "student_id" },
  );

  return true;
}

// Read the cache for one project's linked Hackatime project names.
//
// Deliberately unwindowed. An earlier version floored this at the project's
// `created_at` on the reasoning that a date range keeps the figure describing
// this project rather than the whole account. That reasoning was wrong twice
// over: the scoping is already total, because `hackatime_project_names` selects
// exactly the Hackatime projects this one is made of, and `created_at` is when
// the row was made on our site, not when the work started. Students build for
// weeks and register the project when they are ready to submit, so the floor
// silently deleted everything before that -- more than half the agent lines on
// one of the first projects it ran against, with no sign on the page that
// anything was missing.
//
// The reported range is therefore derived from the rows themselves: what
// Hackatime actually recorded, not what we thought to ask for.
export async function getProjectAiTelemetry(
  studentId: string,
  projectNames: string[],
): Promise<HackatimeAiTelemetry | null> {
  if (!projectNames.length) return null;

  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("hackatime_ai_days")
    .select("*")
    .eq("student_id", studentId)
    .in("project", projectNames);

  if (!data?.length) return null;

  const byModel = new Map<string, number>();
  let aiLines = 0;
  let humanLines = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const activeDates = new Set<string>();
  let firstDay: string | null = null;
  let lastDay: string | null = null;

  for (const row of data) {
    // Every cached day counts toward the reported span, not only the days with
    // AI on them: "tracked since May, agent active on 6 of those days" is the
    // shape of the thing a reviewer needs, and dating the range from the first
    // AI edit would hide the months of work before it.
    if (!firstDay || row.local_date < firstDay) firstDay = row.local_date;
    if (!lastDay || row.local_date > lastDay) lastDay = row.local_date;
    aiLines += row.ai_lines ?? 0;
    humanLines += row.human_lines ?? 0;
    inputTokens += row.ai_input_tokens ?? 0;
    outputTokens += row.ai_output_tokens ?? 0;
    if ((row.ai_lines ?? 0) !== 0) activeDates.add(row.local_date);
    const models = (row.models ?? {}) as Record<string, number>;
    for (const [name, lines] of Object.entries(models)) {
      if (typeof lines !== "number") continue;
      byModel.set(name, (byModel.get(name) ?? 0) + lines);
    }
  }

  const models = [...byModel]
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines - a.lines || a.name.localeCompare(b.name));
  const modelTotal = models.reduce((n, m) => n + m.lines, 0);

  return {
    aiLines,
    humanLines,
    inputTokens,
    outputTokens,
    byModel: models,
    unattributedModelLines: aiLines - modelTotal,
    activeDays: activeDates.size,
    start: firstDay ?? "",
    end: lastDay ?? "",
  };
}

// What the pages call: refresh if stale, then read. The sync is awaited rather
// than fired and forgotten, because a student who just linked a project and
// reloads should see numbers, not an empty box that fills in on some later
// visit for reasons they cannot see.
export async function getAiTelemetryForStudent(
  student: { id: string; hackatime_access_token: string | null },
  projectNames: string[],
): Promise<HackatimeAiTelemetry | null> {
  if (!projectNames.length) return null;
  await syncStudentAiDays(student).catch(() => false);
  return getProjectAiTelemetry(student.id, projectNames);
}

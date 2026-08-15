import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

// AI attribution: how much of a project's code an AI agent wrote.
//
// Fed by the `ai-attribution` Claude Code plugin. A student installs it once
// (Settings -> Install to Claude Code), it then tracks every git repo they
// open, and posts an index of those repos to /api/attribution/sync. The
// student later picks which repos counted toward a project, the same way
// hackatime_project_names works.
//
// Read this before trusting any number in here: everything the sync endpoint
// receives is SELF-REPORTED by a machine the student controls. It is fine for
// the picker and for a student's own view of their work. It is NOT evidence,
// and anywhere a reviewer sees it, it must be labelled as self-reported.
// Trustworthy numbers come from `attribution_verifications`, which a separate
// worker writes after cloning the student's repo and checking the append-only
// ledger the plugin commits into it.

const KEY_PREFIX = "b2b_";
const PREFIX_VISIBLE = 8;

export interface AttributionRepo {
  id: string;
  student_id: string;
  repo_key: string;
  name: string;
  remote: string | null;
  first_seen: string | null;
  last_activity: string | null;
  ai_raw: number;
  ai_sig: number;
  human_raw: number;
  human_sig: number;
  unobserved_raw: number;
  unobserved_sig: number;
  ledger_head: string | null;
  ledger_records: number | null;
  head_sha: string | null;
  last_synced_at: string;
}

export interface AttributionVerification {
  id: string;
  repo_id: string;
  head_sha: string | null;
  verdict: "info" | "warning" | "critical";
  added: number;
  ai: number;
  human: number;
  unattributed: number;
  findings: { severity: string; code: string; message: string }[];
  verified_at: string;
}

// What the plugin posts. Aggregates only — no file paths, no file names, no
// source text. See the plugin's core/registry.py sync_payload().
export interface SyncedProject {
  id: string;
  name: string;
  remote: string | null;
  first_seen: string | null;
  last_activity: string | null;
  totals: Record<string, { raw: number; sig: number }> | null;
  ledger_head: string | null;
  ledger_records: number | null;
  head: string | null;
}

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

// Creates a new key, replacing any existing one for this student. The
// plaintext is returned once and never stored: only its SHA-256 goes to the
// database, so a leaked dump does not hand out working keys. Rotating simply
// overwrites, which also gives students a way to revoke a machine they no
// longer have.
export async function issueKey(studentId: string): Promise<string> {
  const plaintext = KEY_PREFIX + randomBytes(24).toString("hex");
  const supabase = supabaseAdmin();
  await supabase.from("attribution_keys").upsert(
    {
      student_id: studentId,
      key_hash: hashKey(plaintext),
      key_prefix: plaintext.slice(0, PREFIX_VISIBLE),
      created_at: new Date().toISOString(),
      last_used_at: null,
    },
    { onConflict: "student_id" },
  );
  return plaintext;
}

export async function getKeyInfo(
  studentId: string,
): Promise<{ key_prefix: string; created_at: string; last_used_at: string | null } | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("attribution_keys")
    .select("key_prefix, created_at, last_used_at")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as { key_prefix: string; created_at: string; last_used_at: string | null } | null) ?? null;
}

export interface AttributionAgent {
  slug: string;
  connected_at: string;
  first_activity_at: string | null;
  last_activity_at: string | null;
}

// Records that a student set an app up on the website. Deliberately does NOT
// touch the activity columns: this is a claim of intent, and overwriting a
// real "it reported at 14:02" with "they clicked the button again at 16:30"
// would turn evidence back into a claim.
export async function markAgentConnected(
  studentId: string,
  slug: string,
): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase
    .from("attribution_agents")
    .upsert(
      { student_id: studentId, slug },
      { onConflict: "student_id,slug", ignoreDuplicates: true },
    );
}

// Called from the record ingest path with the agent slugs a batch carried.
// Creates the row if the student never picked this app on the site, so an app
// that just starts working is visible rather than silently missing.
export async function recordAgentActivity(
  studentId: string,
  slugs: string[],
): Promise<void> {
  if (!slugs.length) return;
  const supabase = supabaseAdmin();
  const now = new Date().toISOString();

  await supabase.from("attribution_agents").upsert(
    slugs.map((slug) => ({
      student_id: studentId,
      slug,
      first_activity_at: now,
      last_activity_at: now,
    })),
    { onConflict: "student_id,slug", ignoreDuplicates: true },
  );

  // The upsert above only fills these in for rows it created. Rows that already
  // existed (the normal case -- the student set the app up on the site first)
  // need them set explicitly, and first_activity_at only where it is still
  // null, because "when did this first work" must not move.
  await supabase
    .from("attribution_agents")
    .update({ first_activity_at: now })
    .eq("student_id", studentId)
    .in("slug", slugs)
    .is("first_activity_at", null);

  await supabase
    .from("attribution_agents")
    .update({ last_activity_at: now })
    .eq("student_id", studentId)
    .in("slug", slugs);
}

export async function listAgentsForStudent(
  studentId: string,
): Promise<AttributionAgent[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("attribution_agents")
    .select("slug, connected_at, first_activity_at, last_activity_at")
    .eq("student_id", studentId)
    .order("connected_at", { ascending: true });
  return (data as AttributionAgent[] | null) ?? [];
}

// Resolves a Bearer token to a student id, or null.
//
// The lookup is by hash, so the comparison Postgres does is already on a
// digest rather than the secret. The extra timingSafeEqual guards the case
// where a caller probes with keys sharing a prefix; it costs nothing and keeps
// the comparison constant-time on our side.
export async function studentIdForKey(plaintext: string): Promise<string | null> {
  if (!plaintext.startsWith(KEY_PREFIX)) return null;
  const digest = hashKey(plaintext);
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("attribution_keys")
    .select("student_id, key_hash")
    .eq("key_hash", digest)
    .maybeSingle();
  if (!data) return null;

  const a = Buffer.from(digest, "hex");
  const b = Buffer.from((data as { key_hash: string }).key_hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  await supabase
    .from("attribution_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", digest);
  return (data as { student_id: string }).student_id;
}

function bucket(
  totals: SyncedProject["totals"],
  name: string,
  field: "raw" | "sig",
): number {
  const value = totals?.[name]?.[field];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : 0;
}

// Upserts the repos from one sync. Keyed on (student_id, repo_key) so repeated
// syncs update in place rather than piling up duplicates.
//
// Repos the plugin stops reporting are deliberately left alone rather than
// deleted: a student who opts a repo out locally should not have the history
// of it vanish from a project that already selected it.
export async function upsertSyncedRepos(
  studentId: string,
  projects: SyncedProject[],
): Promise<number> {
  if (!projects.length) return 0;
  const now = new Date().toISOString();

  const rows = projects
    .filter((p) => typeof p?.id === "string" && typeof p?.name === "string")
    .slice(0, 200) // a sane ceiling; nobody has 200 real projects
    .map((p) => ({
      student_id: studentId,
      repo_key: p.id.slice(0, 128),
      name: p.name.slice(0, 200),
      remote: p.remote?.slice(0, 500) ?? null,
      first_seen: p.first_seen ?? null,
      last_activity: p.last_activity ?? null,
      ai_raw: bucket(p.totals, "ai", "raw"),
      ai_sig: bucket(p.totals, "ai", "sig"),
      human_raw: bucket(p.totals, "human", "raw"),
      human_sig: bucket(p.totals, "human", "sig"),
      unobserved_raw: bucket(p.totals, "unobserved", "raw"),
      unobserved_sig: bucket(p.totals, "unobserved", "sig"),
      ledger_head: p.ledger_head?.slice(0, 128) ?? null,
      ledger_records:
        typeof p.ledger_records === "number" ? Math.trunc(p.ledger_records) : null,
      head_sha: p.head?.slice(0, 64) ?? null,
      last_synced_at: now,
    }));

  if (!rows.length) return 0;
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("attribution_repos")
    .upsert(rows, { onConflict: "student_id,repo_key" });
  if (error) throw new Error(`failed to upsert attribution repos: ${error.message}`);
  return rows.length;
}

export async function listReposByStudent(studentId: string): Promise<AttributionRepo[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("attribution_repos")
    .select("*")
    .eq("student_id", studentId)
    .order("last_activity", { ascending: false });
  return (data as AttributionRepo[] | null) ?? [];
}

export async function listReposByKeys(
  studentId: string,
  repoKeys: string[],
): Promise<AttributionRepo[]> {
  if (!repoKeys.length) return [];
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("attribution_repos")
    .select("*")
    .eq("student_id", studentId)
    .in("repo_key", repoKeys);
  return (data as AttributionRepo[] | null) ?? [];
}

// Latest verification per repo, keyed by repo id. Empty map when the
// verification worker has not run — which is the normal state until one is
// deployed, and the UI must handle it rather than implying "clean".
export async function latestVerifications(
  repoIds: string[],
): Promise<Map<string, AttributionVerification>> {
  const out = new Map<string, AttributionVerification>();
  if (!repoIds.length) return out;
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("attribution_verifications")
    .select("*")
    .in("repo_id", repoIds)
    .order("verified_at", { ascending: false });
  for (const row of (data as AttributionVerification[] | null) ?? []) {
    if (!out.has(row.repo_id)) out.set(row.repo_id, row);
  }
  return out;
}

// --- streamed ledger records ----------------------------------------------
//
// The plugin posts its ledger records here as it writes them. Unlike the sync
// payload above, these are NOT self-reported summaries: they are the raw
// append-only records, stored immutably, and they are what verification
// actually reads. A student can rewrite the ledger in their own repo and
// force-push; they cannot reach these rows.

export interface LedgerRecord {
  seq: number;
  hash: string;
  prev_hash: string;
  kind: string;
  ts?: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface AppendOutcome {
  stored: number;
  // Where the server's copy now ends. The client sets its watermark from this
  // rather than from its own arithmetic, so a partially applied batch cannot
  // look fully delivered.
  next_seq: number;
  // Set when the client sent records that do not continue from what we hold.
  // The client rewinds to this and refills, because a gap in our copy is
  // indistinguishable from deleted records at verification time.
  expected_seq?: number;
  // Records offered for a seq we already hold, with different content. Empty
  // on every honest install.
  conflicts: number;
}

const GENESIS = "0".repeat(64);
const MAX_RECORDS_PER_BATCH = 500;

// Finds or creates the repo row these records belong to. Records can arrive
// before the first /sync (the streaming hook fires on edits, sync only at
// session end), so this cannot assume the row exists.
async function repoIdForKey(
  studentId: string,
  key: string,
  name: string,
  remote: string | null,
): Promise<string> {
  const supabase = supabaseAdmin();
  const { data: existing } = await supabase
    .from("attribution_repos")
    .select("id")
    .eq("student_id", studentId)
    .eq("repo_key", key)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await supabase
    .from("attribution_repos")
    .upsert(
      {
        student_id: studentId,
        repo_key: key.slice(0, 128),
        name: name.slice(0, 200),
        remote: remote?.slice(0, 500) ?? null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "student_id,repo_key" },
    )
    .select("id")
    .single();
  if (error) throw new Error(`failed to register repo: ${error.message}`);
  return (data as { id: string }).id;
}

function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

// Appends a batch of records to the server's copy of one repo's ledger.
//
// Deliberately does NOT recompute record hashes. Doing so would mean
// reimplementing the plugin's canonical JSON encoding in TypeScript — sorted
// keys at every level, \uXXXX escaping of non-ASCII, Python's exact number
// formatting — and any mismatch would reject records from an honest student,
// which is the worst failure this system can have. Hash recomputation happens
// at verification time, in the same Python that wrote them. What we enforce
// here is the part that needs no shared encoding and that the student's machine
// cannot do for itself: seq continuity, prev_hash linkage, and immutability of
// anything already stored.
export async function appendRecords(
  studentId: string,
  repo: { key: string; name: string; remote: string | null },
  records: LedgerRecord[],
): Promise<AppendOutcome> {
  const repoId = await repoIdForKey(studentId, repo.key, repo.name, repo.remote);
  const supabase = supabaseAdmin();

  const incoming = records
    .filter(
      (r) =>
        r &&
        Number.isInteger(r.seq) &&
        r.seq >= 0 &&
        typeof r.hash === "string" &&
        typeof r.prev_hash === "string" &&
        typeof r.kind === "string",
    )
    .slice(0, MAX_RECORDS_PER_BATCH)
    .sort((a, b) => a.seq - b.seq);

  const { data: tailRow } = await supabase
    .from("attribution_records")
    .select("seq, hash")
    .eq("repo_id", repoId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  const tail = tailRow as { seq: number; hash: string } | null;

  let nextSeq = tail ? tail.seq + 1 : 0;
  let prevHash = tail ? tail.hash : GENESIS;

  if (!incoming.length) return { stored: 0, next_seq: nextSeq, conflicts: 0 };

  // Anything at or below what we already hold is either a duplicate (fine, the
  // client re-sent after a lost acknowledgement) or an attempt to change
  // history (not fine). Tell those two apart by comparing hashes.
  const overlap = incoming.filter((r) => r.seq < nextSeq);
  let conflicts = 0;
  if (overlap.length) {
    const { data: storedRows } = await supabase
      .from("attribution_records")
      .select("seq, hash")
      .eq("repo_id", repoId)
      .in("seq", overlap.map((r) => r.seq));
    const stored = new Map(
      ((storedRows as { seq: number; hash: string }[] | null) ?? []).map((r) => [
        r.seq,
        r.hash,
      ]),
    );
    const differing = overlap.filter(
      (r) => stored.has(r.seq) && stored.get(r.seq) !== r.hash,
    );
    if (differing.length) {
      conflicts = differing.length;
      await supabase.from("attribution_record_conflicts").insert(
        differing.map((r) => ({
          repo_id: repoId,
          seq: r.seq,
          stored_hash: stored.get(r.seq)!,
          offered_hash: r.hash,
          offered_body: r,
        })),
      );
    }
  }

  // A gap means the client is ahead of us. Refuse the batch and say where to
  // resume rather than storing records with a hole behind them.
  const fresh = incoming.filter((r) => r.seq >= nextSeq);
  if (fresh.length && fresh[0].seq > nextSeq) {
    return { stored: 0, next_seq: nextSeq, expected_seq: nextSeq, conflicts };
  }

  // Take the longest run that chains cleanly onto what we hold, and stop at the
  // first break. A batch whose linkage breaks halfway is either corruption or
  // forgery; either way the records after the break do not belong to this log.
  const accepted: LedgerRecord[] = [];
  for (const rec of fresh) {
    if (rec.seq !== nextSeq || rec.prev_hash !== prevHash) break;
    accepted.push(rec);
    prevHash = rec.hash;
    nextSeq += 1;
  }

  if (accepted.length) {
    const { error } = await supabase.from("attribution_records").insert(
      accepted.map((r) => ({
        repo_id: repoId,
        seq: r.seq,
        hash: r.hash,
        prev_hash: r.prev_hash,
        kind: r.kind.slice(0, 64),
        ts: parseTimestamp(r.ts),
        session_id: typeof r.session_id === "string" ? r.session_id.slice(0, 128) : null,
        body: r,
      })),
    );
    // A unique-violation here means a concurrent request from the same machine
    // already stored these. Harmless: re-read the tail and report the truth.
    if (error) {
      const { data: after } = await supabase
        .from("attribution_records")
        .select("seq")
        .eq("repo_id", repoId)
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tailSeq = (after as { seq: number } | null)?.seq;
      return {
        stored: 0,
        next_seq: typeof tailSeq === "number" ? tailSeq + 1 : 0,
        conflicts,
      };
    }

    // Every record body carries the agent that produced it (the plugin's
    // hooks/_common.py emit()). This is the only place we learn that a
    // student's setup actually works end to end, so it is worth the write.
    const seen = new Set<string>();
    for (const rec of accepted) {
      const agent = rec.agent;
      if (typeof agent === "string" && agent) seen.add(agent.slice(0, 64));
    }
    // Best-effort: a failure here must not fail a batch we already stored, or
    // the client would retry records that are safely in the table.
    try {
      await recordAgentActivity(studentId, [...seen]);
    } catch {
      // status display only; nothing downstream depends on it
    }
  }

  return { stored: accepted.length, next_seq: nextSeq, conflicts };
}

// The server's copy of a repo's ledger, in order. This is what the verifier
// reads instead of the file in the student's repo.
export async function serverLedger(repoId: string): Promise<LedgerRecord[]> {
  const supabase = supabaseAdmin();
  const out: LedgerRecord[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("attribution_records")
      .select("body")
      .eq("repo_id", repoId)
      .order("seq", { ascending: true })
      .range(from, from + PAGE - 1);
    const rows = (data as { body: LedgerRecord }[] | null) ?? [];
    out.push(...rows.map((r) => r.body));
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function countRecordConflicts(repoId: string): Promise<number> {
  const supabase = supabaseAdmin();
  const { count } = await supabase
    .from("attribution_record_conflicts")
    .select("id", { count: "exact", head: true })
    .eq("repo_id", repoId);
  return count ?? 0;
}

// --- verification worker support ------------------------------------------
//
// Verification runs outside the app: it needs a full `git clone` with complete
// history, which a serverless route cannot do. The worker asks for work here,
// clones each repo, runs the plugin's verify_repo.py against the server's
// record copy, and posts results back.
//
// It runs ONCE PER SUBMISSION, not on a schedule. The schedule existed to build
// a trail of observed commit SHAs, because with a single observation there was
// no "previously recorded SHA" to contradict and a force-push rewrite was free.
// attribution_records replaced that: the ledger reaches us as the work happens,
// so there is nothing left for repeated cloning to protect against. What
// remains — comparing records to real commit diffs — only needs to happen when
// there is something to grade.

export interface PendingVerification {
  repo_id: string;
  name: string;
  // Where to clone from. The remote the plugin observed is preferred; the
  // project's github_url is the fallback for a student who never set an origin.
  clone_url: string;
  // Commit SHAs we recorded earlier, either from a previous verification or
  // from the plugin's own reports. Cheap to check and still worth checking: a
  // missing one means history was rewritten, which is no longer how someone
  // fakes the ledger but is still worth telling a reviewer about.
  known_shas: string[];
  // The server's copy of this repo's ledger. The worker writes it to a file and
  // passes it to the verifier with --ledger.
  records: LedgerRecord[];
  // Attempts to overwrite an already-stored record. Non-zero has no innocent
  // explanation and is surfaced as a critical finding.
  conflicts: number;
}

// Projects whose work is finished enough to grade. Drafts are excluded: a
// student still building has nothing to verify, and cloning their repo every
// time the worker ran was the entire scaling problem.
const VERIFIABLE_STATUSES = ["submitted", "approved", "changes_requested"];

export async function listPendingVerifications(): Promise<PendingVerification[]> {
  const supabase = supabaseAdmin();

  const { data: projects } = await supabase
    .from("projects")
    .select("student_id, github_url, attribution_repo_keys, status")
    .in("status", VERIFIABLE_STATUSES)
    .not("attribution_repo_keys", "eq", "{}");

  const rows = (projects as
    | { student_id: string; github_url: string | null; attribution_repo_keys: string[] }[]
    | null) ?? [];
  if (!rows.length) return [];

  const { data: repos } = await supabase
    .from("attribution_repos")
    .select("id, student_id, repo_key, name, remote, head_sha");
  const repoRows = (repos as
    | { id: string; student_id: string; repo_key: string; name: string; remote: string | null; head_sha: string | null }[]
    | null) ?? [];

  const { data: verifications } = await supabase
    .from("attribution_verifications")
    .select("repo_id, head_sha");
  const seen = new Map<string, Set<string>>();
  for (const v of (verifications as { repo_id: string; head_sha: string | null }[] | null) ?? []) {
    if (!v.head_sha) continue;
    if (!seen.has(v.repo_id)) seen.set(v.repo_id, new Set());
    seen.get(v.repo_id)!.add(v.head_sha);
  }

  const candidates = new Map<
    string,
    { repo_id: string; name: string; clone_url: string; known_shas: string[] }
  >();
  for (const project of rows) {
    for (const key of project.attribution_repo_keys ?? []) {
      const repo = repoRows.find(
        (r) => r.student_id === project.student_id && r.repo_key === key,
      );
      if (!repo) continue;
      const cloneUrl = repo.remote ?? project.github_url;
      if (!cloneUrl) continue;

      // Already verified at the head the student last reported? Nothing has
      // changed, so re-cloning would burn a few seconds to reach the same
      // conclusion. This is what keeps a daily catch-up run cheap.
      const known = seen.get(repo.id);
      if (repo.head_sha && known?.has(repo.head_sha)) continue;

      const shas = new Set(known ?? []);
      if (repo.head_sha) shas.add(repo.head_sha);
      candidates.set(repo.id, {
        repo_id: repo.id,
        name: repo.name,
        clone_url: cloneUrl,
        known_shas: [...shas],
      });
    }
  }

  // Ledgers are fetched only for repos that survived the filter above, since
  // this is the expensive part of building the queue.
  const out: PendingVerification[] = [];
  for (const c of candidates.values()) {
    out.push({
      ...c,
      records: await serverLedger(c.repo_id),
      conflicts: await countRecordConflicts(c.repo_id),
    });
  }
  return out;
}

export interface VerificationResult {
  repo_id: string;
  head_sha?: string | null;
  verdict: "info" | "warning" | "critical";
  added?: number;
  ai?: number;
  human?: number;
  unattributed?: number;
  findings?: { severity: string; code: string; message: string }[];
}

export async function recordVerifications(
  results: VerificationResult[],
): Promise<number> {
  const valid = results.filter(
    (r) =>
      typeof r?.repo_id === "string" &&
      ["info", "warning", "critical"].includes(r?.verdict),
  );
  if (!valid.length) return 0;

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("attribution_verifications").insert(
    valid.map((r) => ({
      repo_id: r.repo_id,
      head_sha: r.head_sha ?? null,
      verdict: r.verdict,
      added: Math.max(0, Math.trunc(r.added ?? 0)),
      ai: Math.max(0, Math.trunc(r.ai ?? 0)),
      human: Math.max(0, Math.trunc(r.human ?? 0)),
      unattributed: Math.max(0, Math.trunc(r.unattributed ?? 0)),
      findings: r.findings ?? [],
    })),
  );
  if (error) throw new Error(`failed to record verifications: ${error.message}`);
  return valid.length;
}

// --- the coarse label students see ----------------------------------------
//
// Must stay in step with core/report.py in the plugin, which computes the same
// band client-side. Duplicated here only because the sync payload's `band`
// object has nowhere to live until attribution_repos gains a column for it;
// once it does, read the client's value and delete these constants rather than
// keeping two definitions of "high" alive.

export const BAND_HIGH = 60;
export const BAND_LOW = 20;
const MIN_OBSERVED_PCT = 20;
const MIN_OBSERVED_LINES = 25;

export type BandLevel = "low" | "moderate" | "high" | "unknown";

export const BAND_LABELS: Record<BandLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  unknown: "Not enough tracked",
};

export interface AttributionSummary {
  ai: number;
  human: number;
  unobserved: number;
  total: number;
  // Null when nothing has been computed yet. Deliberately NOT 0: a project the
  // plugin has never rolled up and a project genuinely containing no AI code
  // look identical at 0% and mean opposite things to a reviewer. Callers must
  // render the two differently.
  aiPercent: number | null;
  // AI as a share of code the plugin actually watched (ai + human), which is
  // the figure the band is drawn from. `unobserved` lines are excluded because
  // nobody knows who wrote them; folding them into the denominator reports a
  // repo that predates tracking as low-AI, which is a guess dressed as a fact.
  aiPercentOfObserved: number | null;
  observedPercent: number;
  observedLines: number;
  band: BandLevel;
  bandLabel: string;
  repoCount: number;
  lastActivity: string | null;
}

// Sums the selected repos. Uses significant lines (blank and comment-only
// lines excluded), since raw counts flatter whoever wrote the boilerplate.
export function summarise(repos: AttributionRepo[]): AttributionSummary {
  const ai = repos.reduce((n, r) => n + r.ai_sig, 0);
  const human = repos.reduce((n, r) => n + r.human_sig, 0);
  const unobserved = repos.reduce((n, r) => n + r.unobserved_sig, 0);
  const total = ai + human + unobserved;
  const observed = ai + human;
  const observedPercent = total > 0 ? Math.round((100 * observed) / total) : 0;
  const aiOfObserved =
    observed > 0 ? Math.round((100 * ai) / observed) : null;

  let band: BandLevel;
  if (observed < MIN_OBSERVED_LINES || observedPercent < MIN_OBSERVED_PCT) {
    band = "unknown";
  } else if (aiOfObserved! >= BAND_HIGH) {
    band = "high";
  } else if (aiOfObserved! <= BAND_LOW) {
    band = "low";
  } else {
    band = "moderate";
  }

  const lastActivity = repos
    .map((r) => r.last_activity)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();

  return {
    ai,
    human,
    unobserved,
    total,
    aiPercent: total > 0 ? Math.round((100 * ai) / total) : null,
    aiPercentOfObserved: aiOfObserved,
    observedPercent,
    observedLines: observed,
    band,
    bandLabel: BAND_LABELS[band],
    repoCount: repos.length,
    lastActivity: lastActivity ?? null,
  };
}

// What the repo picker is allowed to know.
//
// The picker is a client component, so every field on the objects handed to it
// is serialised into the page payload and readable with Inspect Element no
// matter what the markup chooses to display. Narrowing the props is therefore
// the only thing that actually keeps the ratio away from a student; rewording
// the tooltip alone left `ai_sig` and `human_sig` sitting in the HTML, one
// division apart from the number the band exists to replace.
//
// Bands are decided here, on the server, and only the name of the band travels.
export interface AttributionRepoChoice {
  repo_key: string;
  name: string;
  last_activity: string | null;
  band: BandLevel;
  bandLabel: string;
  // Safe to send, and worth showing. Coverage says how much of the repository
  // the plugin watched, never who wrote it, so it qualifies the band without
  // reconstituting the percentage behind it.
  observedPercent: number;
  // Distinguishes "no roll-up has arrived" from "a roll-up arrived and found
  // nothing", which look identical at zero and mean opposite things.
  reported: boolean;
}

export function toRepoChoices(
  repos: AttributionRepo[],
): AttributionRepoChoice[] {
  return repos.map((repo) => {
    const summary = summarise([repo]);
    return {
      repo_key: repo.repo_key,
      name: repo.name,
      last_activity: repo.last_activity,
      band: summary.band,
      bandLabel: summary.bandLabel,
      observedPercent: summary.observedPercent,
      reported: summary.total > 0,
    };
  });
}

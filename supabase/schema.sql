create extension if not exists pgcrypto;

create table students (
  id uuid primary key default gen_random_uuid(),
  hackclub_id text unique not null,
  slack_id text,
  name text,
  email text,
  hackatime_access_token text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  title text not null,
  description text,
  github_url text,
  demo_url text,
  hackatime_project_names text[] not null default '{}',
  -- Which repos tracked by the ai-attribution plugin count toward this
  -- project. Stores repo_key values rather than names, since a student can
  -- have several checkouts sharing a folder name. See attribution_repos below.
  attribution_repo_keys text[] not null default '{}',
  -- Status mirrors the latest review outcome (draft/submitted are pre-review).
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'changes_requested', 'rejected')),
  created_at timestamptz not null default now()
);

create index projects_student_id_idx on projects(student_id);

-- A student-authored journal entry: title plus a markdown reflection
-- (screenshots embedded as image links, uploaded to the journal-screenshots
-- storage bucket below). Written by the student on their dashboard while they
-- build (with Lapse recording the session); points is the reviewer's graded
-- learning value (null = ungraded). See src/lib/currency.ts for how these
-- feed points.
-- lapse_url/github_links are optional evidence: a Lapse timelapse of the
-- session and GitHub permalinks to the code the entry is about. Reviewers
-- grade unbacked entries skeptically rather than the form refusing them.
-- Grading has three axes, scored 0-3 each and set together in one action:
-- depth (how much the student had to reason out that the goal didn't hand
-- them), explanation (is the reason specific to this entry) and proof (does
-- the evidence point at this claim). level is MIN(depth, explanation, proof) —
-- stored rather than derived so a rubric edit can't silently restate history —
-- and null level means ungraded. See src/lib/rubric.ts for the gate ladders
-- reviewers walk to get each number.
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  reflection text not null,
  lapse_url text,
  github_links text[] not null default '{}',
  depth integer check (depth between 0 and 3),
  explanation integer check (explanation between 0 and 3),
  proof integer check (proof between 0 and 3),
  level integer check (level between 0 and 3),
  created_at timestamptz not null default now()
);

create index journal_entries_project_id_idx on journal_entries(project_id);

-- A reviewer is a flagged student. One row per student who can review.
create table reviewers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One row per review action. Full history is kept; projects.status just
-- reflects the decision of the latest one. points_delta is signed — a
-- reviewer can award (+) or deflate (-) a student's points.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  reviewer_id uuid not null references reviewers(id) on delete cascade,
  decision text not null check (decision in ('approved', 'changes_requested', 'rejected')),
  feedback text,
  points_delta integer not null default 0,
  created_at timestamptz not null default now()
);

create index reviews_project_id_idx on reviews(project_id);
create index reviews_reviewer_id_idx on reviews(reviewer_id);

-- All access goes through the server using the service role key, which
-- bypasses RLS anyway. Enabling RLS with no policies is just a safety net
-- in case the anon key is ever exposed to a client.
alter table students enable row level security;
alter table projects enable row level security;
alter table journal_entries enable row level security;
alter table reviewers enable row level security;
alter table reviews enable row level security;

-- AI attribution: how much of a project's code was written by an AI agent.
--
-- Fed by the `ai-attribution` Claude Code plugin, which a student installs
-- once (Settings -> Code authorship) and which then tracks every git repo they
-- open. The plugin posts an index of those repos to /api/attribution/sync; the
-- student later picks which ones counted toward a project, exactly like
-- hackatime_project_names. Lib: src/lib/attribution.ts.
--
-- IMPORTANT: everything the plugin sends is SELF-REPORTED by a machine the
-- student controls. Fine for the picker and a student's own view; it is not
-- evidence, and the reviewer UI labels it as such. Trustworthy numbers come
-- from attribution_verifications, written by a separate worker that clones the
-- pushed repo and checks the append-only ledger the plugin commits into it.

-- One key per student. Only the hash is stored: the plaintext is shown once at
-- creation and never again, so a DB leak does not hand out working keys.
-- key_prefix exists purely so the UI can say which key is installed.
create table attribution_keys (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- One row per repository the plugin has seen on a student's machine. repo_key
-- is the plugin's own hashed id for a checkout — stable across sessions, and
-- deliberately not a filesystem path, so we never store where on their disk
-- the work lives. Counts are split raw (every line) and sig (excluding blank
-- and comment-only lines) because neither is honest alone.
create table attribution_repos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  repo_key text not null,
  name text not null,
  remote text,
  first_seen timestamptz,
  last_activity timestamptz,
  ai_raw integer not null default 0,
  ai_sig integer not null default 0,
  human_raw integer not null default 0,
  human_sig integer not null default 0,
  unobserved_raw integer not null default 0,
  unobserved_sig integer not null default 0,
  ledger_head text,
  ledger_records integer,
  head_sha text,
  last_synced_at timestamptz not null default now(),
  unique (student_id, repo_key)
);

create index attribution_repos_student_id_idx on attribution_repos(student_id);

-- The server's own copy of the plugin's append-only ledger, streamed live by
-- the plugin as the student works (hooks/stream.py -> /api/attribution/records).
--
-- This table is why the numbers can be trusted. The ledger the plugin also
-- commits into the student's repo is a copy THEY control: they can edit it,
-- recompute the hash chain so it self-validates, and force-push, and nothing
-- left in the repo contradicts them. A force-push cannot reach this table. Once
-- a record lands here the student can no longer change what it says, so the
-- attack stops being something we detect after the fact and starts being
-- something that does not work.
--
-- `body` is the record exactly as the plugin wrote it, byte-for-byte, because
-- the hash chain is only checkable against the original bytes. The other
-- columns are lifted out of it for indexing.
create table attribution_records (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references attribution_repos(id) on delete cascade,
  seq integer not null,
  hash text not null,
  prev_hash text not null,
  kind text not null,
  ts timestamptz,
  session_id text,
  body jsonb not null,
  received_at timestamptz not null default now(),
  -- Immutability enforced by the database, not by application code: a second
  -- record claiming the same seq cannot be inserted at all.
  unique (repo_id, seq)
);

create index attribution_records_repo_id_seq_idx
  on attribution_records(repo_id, seq);

-- Every attempt to send a record for a seq we already hold, with different
-- content. On an honest install this stays empty forever — the plugin only ever
-- re-sends bytes it already sent — so a row here means the local ledger was
-- rewritten between two sends.
--
-- Stored as evidence rather than merely rejected: "the student tried to change
-- record 41 from X to Y on this date" is far more useful to a reviewer than a
-- 409 in a log somewhere.
create table attribution_record_conflicts (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references attribution_repos(id) on delete cascade,
  seq integer not null,
  stored_hash text not null,
  offered_hash text not null,
  offered_body jsonb not null,
  detected_at timestamptz not null default now()
);

create index attribution_record_conflicts_repo_id_idx
  on attribution_record_conflicts(repo_id);

-- Server-side verification, run ONCE when a project is submitted (not on a
-- schedule — the records above already close the history-rewriting hole that
-- periodic checks used to exist for). Written by a separate worker, NOT by the
-- app: verification needs a real git clone with full history, which serverless
-- routes cannot do. The worker checks the records above against the commit
-- diffs in the pushed repo.
--
-- `unattributed` is lines that appeared in a commit with no observation behind
-- them. It has many innocent causes (coded before git init, ledger not pushed,
-- worked in another editor) as well as one guilty one, so treat a high value
-- as a prompt to ask the student, never as a verdict.
create table attribution_verifications (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references attribution_repos(id) on delete cascade,
  head_sha text,
  verdict text not null check (verdict in ('info', 'warning', 'critical')),
  added integer not null default 0,
  ai integer not null default 0,
  human integer not null default 0,
  unattributed integer not null default 0,
  findings jsonb not null default '[]'::jsonb,
  verified_at timestamptz not null default now()
);

create index attribution_verifications_repo_id_idx
  on attribution_verifications(repo_id);

alter table attribution_keys enable row level security;
alter table attribution_repos enable row level security;
alter table attribution_records enable row level security;
alter table attribution_record_conflicts enable row level security;
alter table attribution_verifications enable row level security;

-- Public storage bucket for learning-journal screenshots. Uploads go through
-- src/app/api/journal/upload via the service role (RLS bypassed); public read
-- serves the embedded ![](url) images. 5 MB cap, image mime types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-screenshots', 'journal-screenshots', true, 5242880,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

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
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  reflection text not null,
  lapse_url text,
  github_links text[] not null default '{}',
  points integer,
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

-- Public storage bucket for learning-journal screenshots. Uploads go through
-- src/app/api/journal/upload via the service role (RLS bypassed); public read
-- serves the embedded ![](url) images. 5 MB cap, image mime types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-screenshots', 'journal-screenshots', true, 5242880,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project: Back to Basics

Back to Basics is a YSWS (You Ship, We Ship) program run by the user (not a
submission to one). Participants record their work sessions with Lapse
(https://lapse.hackclub.com, Hack Club's screen-timelapse recorder that syncs
with Hackatime) and keep a per-project learning journal on this website's
dashboard, so recognition is based on demonstrated understanding — not just
code shipped. Reviewers grade journal entries against the timelapse and the
code. (An earlier iteration had students' coding agents log "learning events"
via an installed `b2b-report` CLI + AGENTS.md snippet; that whole mechanism
was removed in favor of Lapse + self-written journals.)

Stack:
- Next.js (App Router) + Tailwind, Geist Mono as the default font
- Auth: Hack Club Auth (`auth.hackclub.com`), a standard OAuth 2.0 provider —
  custom Auth.js provider at `src/lib/hackclub-provider.ts`, wired up in
  `src/auth.ts`. Docs: https://auth.hackclub.com/docs/oauth-guide
- DB: Supabase (Postgres), project `back-to-basics` (id `ysocqfnihmhreqnavrtw`,
  managed via the Supabase MCP — `supabase/schema.sql` is kept in sync with
  applied migrations, not the other way around). Tables:
  - `students`: one row per signed-in student — `hackclub_id` (OIDC sub),
    `slack_id` (for Hackatime lookups), `hackatime_access_token`,
    `onboarded_at`.
  - `projects`: a student's shipped/in-progress projects — title,
    `github_url`, `demo_url`, `hackatime_project_names` (text array, which
    Hackatime projects count toward this one), `status`
    (draft/submitted/approved/changes_requested/rejected — mirrors the
    latest review).
  - `journal_entries`: student-authored journal entries (title + markdown
    `reflection`, reviewer-graded `depth`/`explanation`/`proof` 0-3 each
    plus the derived `level` = MIN of the three), fk'd to `projects` (NOT
    `students` directly — entries are scoped per-project since a student
    can have multiple projects going). Lib: `src/lib/journal.ts`. (Was
    named `learning_events` in the b2b-report era; renamed. The old
    holistic `points` 0-5 column is now `level` 0-3.)
  - `reviewers` / `reviews`: reviewer flags and per-project review history.
  Server-only access via `src/lib/supabase.ts` (service role key, bypasses
  RLS — never expose that key to the client).
- Journal flow: students add/edit/delete entries on their project page
  (`/dashboard/projects/[id]`) as they build; markdown with pasted/uploaded
  screenshots (public `journal-screenshots` bucket via
  `/api/journal/upload`). An entry graded by a reviewer is locked in the
  student UI (the grade already counted; the text can't change under it).
  Submitting a project for review requires description, GitHub URL, demo
  URL, and at least one journal entry (`missingSubmitRequirements`).
  Entries carry optional evidence links — `lapse_url` (must be
  lapse.hackclub.com) and `github_links[]` (must be github.com, max 10;
  validated server-side in `validateJournalLinks`). Optional by design:
  reviewers grade unbacked entries skeptically (the review page flags
  them) rather than the form refusing them. On the review page, GitHub
  blob permalinks with a line anchor are expanded into inline snippets
  via `src/lib/github.ts` (raw.githubusercontent.com, public repos only,
  graceful fallback to a plain link).
- Hackatime integration (`src/lib/hackatime.ts`): `GET
  https://hackatime.hackclub.com/api/v1/users/{slackId}/stats?features=projects`
  — the `{username}` path segment accepts a Slack ID directly (no separate
  lookup call needed), response is nested under `data`. Verified against the
  real OpenAPI spec at `https://hackatime.hackclub.com/api-docs/v1/swagger.yaml`
  (the human `/docs` pages are client-rendered and return nothing to a plain
  fetch — always check the swagger.yaml directly instead of guessing).
- Coins (`src/lib/currency.ts`, explained + calculated at `/coins`): the
  currency, from Hackatime seconds coded and reviewer-graded journal levels.
  `rate = 0.3 + 0.35 * avgLevel`; `coins = rate * sqrt(2 * hours *
  effectiveEntries)`, where entries past 1/hour are damped to
  `threshold + sqrt(excess)`. Geometric mean on purpose: hours alone and
  journals alone both pay zero, and at one entry per 2h the sqrt collapses to
  `hours`, making coins linear in hours at the intended cadence. Anchor:
  40h / avg level 2 / 20 entries = 40 coins (~$5 each). No difficulty
  multiplier (that lives in the rubric's Depth gates). `awardedCoins()` rounds
  to whole coins for balances; `computeCoins()` stays raw for the calculator.
  `src/lib/balance.ts` sums approved projects for the nav total. The DB column
  for the reviewer's manual adjustment is still named `points_delta`.
- Rubric (`src/lib/rubric.ts`, rendered by `src/components/RubricTable.tsx`,
  published at `/rubric`): the user's own rubric, three axes — Depth of Topic,
  Explanation, Proof — each scored 0-3 by a ladder of yes/no gates answered in
  order, stopping at the first "no". The entry's level is **MIN** of the three,
  never an average: that's what stops a great write-up on a trivial topic from
  buying credit, and a fraud flag (proof contradicts the claim) zeroes Proof and
  therefore the entry. Depth is measured against the stated goal, not the
  project's overall complexity or the construct's name — the same if-statement
  can be Level 1 in an ML pipeline and Level 3 in a to-do app. Difficulty
  scaling belongs in Depth's gates only; don't add difficulty multipliers to the
  coin formula. Rubric wording lives only in `rubric.ts`; the reviewer form,
  the student's project page and `/rubric` all render from it.
- App shell under `/dashboard` (gated by `src/app/dashboard/layout.tsx`):
  My Projects (index), Explore (public approved projects), Review (queue,
  reviewers only), Shop (placeholder — reward mechanism not decided),
  Settings (coins, Hackatime link status, Lapse pointer).
- New-user flow is sign-in first, then forced onboarding. The
  `students.onboarded_at` timestamp is the gate: the dashboard layout
  redirects any signed-in user with `onboarded_at IS NULL` to `/onboarding`,
  so a new user can't reach the dashboard until they finish. `/onboarding`
  is a fully server-rendered checklist (connect Hackatime — the OAuth
  connect/callback routes honor a `next=/onboarding` param so the user
  lands back there — install Lapse, journal expectations). Its "Continue
  to dashboard" button runs a server action that calls `markOnboarded()`
  and redirects — that's the only thing that sets `onboarded_at`, so until
  they click it they keep landing back on onboarding.

Open decisions not yet made (flag to the user, don't guess):
- Real landing page / program copy — `src/app/page.tsx` is placeholder text.
- What the Shop actually sells / what coins are redeemable for.
- The coin constants can still move before launch, but the shape of the
  formula (geometric mean, sqrt damping) is settled — don't redesign it.

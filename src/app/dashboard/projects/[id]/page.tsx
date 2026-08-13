import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getProjectById, missingSubmitRequirements } from "@/lib/projects";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { getKeyInfo, listReposByStudent, summarise } from "@/lib/attribution";
import {
  getEntriesForProject,
  gradedLevels,
  axisScores,
  type JournalEntry,
} from "@/lib/journal";
import { awardedCoins, bestCaseCoins } from "@/lib/currency";
import { LEVEL_MAX, levelLabel, axisBreakdown } from "@/lib/rubric";
import { getReviewsForProject } from "@/lib/reviews";
import { normalizeExternalUrl } from "@/lib/url";
import {
  submitProjectAction,
  updateProjectAction,
  deleteProjectAction,
  addJournalEntryAction,
  updateJournalEntryAction,
  deleteJournalEntryAction,
} from "@/app/dashboard/actions";
import ProjectEditor from "@/components/ProjectEditor";
import AddJournalEntry from "@/components/AddJournalEntry";
import JournalEntryCard from "@/components/JournalEntryCard";
import StatusBadge, { statusLabel } from "@/components/StatusBadge";
import SubmitProjectButton from "@/components/SubmitProjectButton";

const REVIEW_ACCENT: Record<string, string> = {
  approved: "border-green-300",
  changes_requested: "border-orange-300",
  rejected: "border-red-300",
};

// The grade shown at the foot of an entry: the level on its own, plus the
// per-axis detail behind it. Ungraded entries say nothing at all, and entries
// graded before the three axes existed only have a level.
function gradeLabels(entry: JournalEntry): {
  level: string | null;
  axes: string | null;
} {
  const scores = axisScores(entry);
  if (scores) return { level: levelLabel(scores), axes: axisBreakdown(scores) };
  if (entry.level != null) {
    return { level: `Level ${entry.level} of ${LEVEL_MAX}`, axes: null };
  }
  return { level: null, axes: null };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return null; // layout handles the sign-in gate

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );

  // Unscoped fetch: any signed-in student can open a project by its link. The
  // owner gets the full editable page; everyone else gets a read-only view
  // (rendered below), so a shared link "just works" without exposing controls.
  const project = await getProjectById(id);
  if (!project) notFound();

  const isOwner = project.student_id === student.id;
  const entries = await getEntriesForProject(project.id);

  // Older rows can hold a schemeless URL ("github.com/me/repo"), which as an
  // href resolves relative to /dashboard. Normalize on the way out too.
  const githubHref = normalizeExternalUrl(project.github_url);
  const demoHref = normalizeExternalUrl(project.demo_url);

  // Shared read-only view: overview + journal only. Reviewer feedback, grades,
  // coins and every edit/submit/delete control stay hidden from non-owners.
  if (!isOwner) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <Link
            href="/dashboard/explore"
            className="text-xs text-zinc-500 hover:text-zinc-900"
          >
            ← Explore
          </Link>
          <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">
            {project.title}
          </h1>
          <p className="mt-1 text-xs text-zinc-400">Shared project</p>
          {project.description ? (
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              {project.description}
            </p>
          ) : null}
        </div>

        <section className="border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Project details
          </h2>
          <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-y-2 text-sm">
            <dt className="text-zinc-500">GitHub</dt>
            <dd className="min-w-0">
              {githubHref ? (
                <a
                  href={githubHref}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all underline hover:text-zinc-600"
                >
                  {project.github_url}
                </a>
              ) : (
                <span className="text-zinc-400">not set</span>
              )}
            </dd>
            <dt className="text-zinc-500">Demo</dt>
            <dd className="min-w-0">
              {demoHref ? (
                <a
                  href={demoHref}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all underline hover:text-zinc-600"
                >
                  {project.demo_url}
                </a>
              ) : (
                <span className="text-zinc-400">not set</span>
              )}
            </dd>
          </dl>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Learning journal
          </h2>
          {entries.length ? (
            <div className="flex flex-col divide-y divide-zinc-200 border border-zinc-200 bg-white">
              {entries.map((entry) => (
                <JournalEntryCard
                  key={entry.id}
                  title={entry.title}
                  reflection={entry.reflection}
                  lapseUrl={entry.lapse_url}
                  githubLinks={entry.github_links}
                  createdAtLabel={new Date(entry.created_at).toLocaleString()}
                  graded={entry.level != null}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No journal entries yet.</p>
          )}
        </section>
      </div>
    );
  }

  const reviews = await getReviewsForProject(project.id);
  const latestReview = reviews[0] ?? null; // ordered newest-first
  const reviewAdjustment = reviews.reduce((sum, r) => sum + r.points_delta, 0);

  const hackatimeStats = await getHackatimeStatsForStudent(student);

  const [attributionRepos, attributionKey] = await Promise.all([
    listReposByStudent(student.id),
    getKeyInfo(student.id),
  ]);

  const linkedSeconds = (hackatimeStats?.projects ?? [])
    .filter((p) => project.hackatime_project_names.includes(p.name))
    .reduce((sum, p) => sum + p.total_seconds, 0);

  // Only the repos this project actually selected, the same way linkedSeconds
  // narrows Hackatime projects. Summing every repo the student has ever opened
  // would describe their whole machine rather than this project.
  const linkedRepos = attributionRepos.filter((r) =>
    project.attribution_repo_keys.includes(r.repo_key),
  );
  const linkedAttribution = summarise(linkedRepos);

  // Ungraded entries are worth nothing until the review pass, so pre-review
  // this sits at zero — `best` shows what the entries already written can
  // unlock if they all grade out at the top level.
  const graded = gradedLevels(entries);
  const hasPending = entries.some((e) => e.level == null);
  const projectCoins = awardedCoins(linkedSeconds, graded, reviewAdjustment);
  const best = Math.round(bestCaseCoins(linkedSeconds, entries.length));

  const canSubmit =
    project.status === "draft" ||
    project.status === "changes_requested" ||
    project.status === "approved";
  const missing = canSubmit
    ? missingSubmitRequirements(project, entries.length)
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← My Projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl tracking-tight text-zinc-900">
              {project.title}
            </h1>
            {/* "Draft" is just the not-yet-submitted default and says nothing
                the Submit button doesn't already. Badge only once a review
                has actually moved the project somewhere. */}
            {project.status !== "draft" ? (
              <StatusBadge status={project.status} />
            ) : null}
          </div>
          <SubmitProjectButton
            label={project.status === "draft" ? "Submit" : "Resubmit"}
            showButton={canSubmit}
            action={async () => {
              "use server";
              return submitProjectAction(project.id);
            }}
          />
        </div>
        {project.description ? (
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            {project.description}
          </p>
        ) : null}
        {/* Small again, but amber rather than another grey caption. The dialog
            behind the Submit button is what actually stops you. */}
        {missing.length ? (
          <p className="mt-2 text-xs text-amber-700">
            Still needed: {missing.join(", ")}
          </p>
        ) : null}
      </div>

      {latestReview ? (
        <section
          className={`border bg-white p-4 text-sm ${
            REVIEW_ACCENT[latestReview.decision] ?? "border-zinc-200"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-zinc-900">Reviewer feedback</h2>
            <span className="shrink-0 text-xs text-zinc-500">
              {statusLabel(latestReview.decision)}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl text-zinc-900">{projectCoins}</span>
            <span className="text-xs text-zinc-500">
              coins awarded for this project
              {hasPending
                ? ` so far — up to ${best} if every entry grades out at the top level`
                : ""}
              {reviewAdjustment !== 0
                ? ` (includes a ${reviewAdjustment > 0 ? "+" : ""}${reviewAdjustment} reviewer adjustment)`
                : ""}
            </span>
          </div>
          {latestReview.feedback ? (
            <p className="mt-3 text-zinc-700">{latestReview.feedback}</p>
          ) : (
            <p className="mt-3 text-zinc-500">No written feedback.</p>
          )}
        </section>
      ) : null}

      <ProjectEditor
        project={project}
        hackatimeProjects={hackatimeStats?.projects ?? []}
        hackatimeConnected={!!student.hackatime_access_token}
        attributionRepos={attributionRepos}
        attributionInstalled={!!attributionKey}
        updateAction={updateProjectAction.bind(null, project.id)}
        deleteAction={deleteProjectAction.bind(null, project.id)}
      />

      <div className="grid grid-cols-3 divide-x divide-zinc-200 border border-zinc-200 bg-white text-sm">
        <div className="p-4">
          <p className="text-2xl text-zinc-900">
            {(linkedSeconds / 3600).toFixed(2)}
          </p>
          <p className="mt-1 text-zinc-500">Hours Logged</p>
        </div>
        <div className="p-4">
          <p className="text-2xl text-zinc-900">{entries.length}</p>
          <p className="mt-1 text-zinc-500">Journal Entries</p>
        </div>
        {/* The band, not a percentage. A number here would invite optimising
            against it, and on its own it hides how much of the project was
            actually tracked. Reviewers get the exact figure on the review page.
            An em dash covers both "no repositories linked" and "too little
            tracked to say" — neither is a finding, and neither is 0%. */}
        <div className="p-4">
          <p className="text-2xl text-zinc-900">
            {linkedAttribution.band === "unknown"
              ? "—"
              : linkedAttribution.bandLabel}
          </p>
          <p className="mt-1 text-zinc-500">AI Usage</p>
        </div>
      </div>
      {linkedAttribution.band === "unknown" ? (
        <p className="-mt-6 text-xs text-zinc-500">
          {linkedRepos.length === 0
            ? "Pick the repositories this project was built in, under Edit project. Required before you submit."
            : `Only ${linkedAttribution.observedPercent}% of this project was tracked, which is too little to say. Code written before the plugin was installed is not counted either way.`}
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            Learning journal
          </h2>
          <a
            href="/rubric"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-zinc-500 underline hover:text-zinc-900"
          >
            Read the Rubric ↗
          </a>
        </div>

        <AddJournalEntry action={addJournalEntryAction.bind(null, project.id)} />

        {entries.length ? (
          <div className="flex flex-col divide-y divide-zinc-200 border border-zinc-200 bg-white">
            {entries.map((entry) => {
              const grade = gradeLabels(entry);
              return (
                <JournalEntryCard
                  key={entry.id}
                  title={entry.title}
                  reflection={entry.reflection}
                  lapseUrl={entry.lapse_url}
                  githubLinks={entry.github_links}
                  createdAtLabel={new Date(entry.created_at).toLocaleString()}
                  levelLabel={grade.level}
                  axisLabel={grade.axes}
                  graded={entry.level != null}
                  updateAction={updateJournalEntryAction.bind(
                    null,
                    project.id,
                    entry.id,
                  )}
                  deleteAction={deleteJournalEntryAction.bind(
                    null,
                    project.id,
                    entry.id,
                  )}
                />
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}

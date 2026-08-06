import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getProjectById, missingSubmitRequirements } from "@/lib/projects";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { getKeyInfo, latestVerifications, listReposByStudent } from "@/lib/attribution";
import {
  getEntriesForProject,
  gradedLevels,
  axisScores,
  type JournalEntry,
} from "@/lib/journal";
import { awardedCoins, bestCaseCoins } from "@/lib/currency";
import { LEVEL_MAX, scoreBreakdown } from "@/lib/rubric";
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
import AttributionSummary from "@/components/AttributionSummary";
import AddJournalEntry from "@/components/AddJournalEntry";
import JournalEntryCard from "@/components/JournalEntryCard";
import StatusBadge, { statusLabel } from "@/components/StatusBadge";

const REVIEW_ACCENT: Record<string, string> = {
  approved: "border-green-300",
  changes_requested: "border-orange-300",
  rejected: "border-red-300",
};

// "D2 · E3 · P1 → 1/3" once graded, so a student can see which axis capped the
// entry without opening the rubric. Older entries graded before the three axes
// existed only have a level.
function levelLabel(entry: JournalEntry): string {
  const scores = axisScores(entry);
  if (scores) return scoreBreakdown(scores);
  return entry.level != null
    ? `graded ${entry.level}/${LEVEL_MAX}`
    : "pending review";
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
        </div>

        <section className="border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Project details
          </h2>
          <p className="mt-3 text-sm text-zinc-700">
            {project.description || (
              <span className="text-zinc-400">No description yet.</span>
            )}
          </p>
          <dl className="mt-4 grid grid-cols-[6.5rem_1fr] gap-y-2 text-sm">
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
                  pointsLabel=""
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
  const linkedRepos = attributionRepos.filter((r) =>
    project.attribution_repo_keys.includes(r.repo_key),
  );
  const attributionVerifications = await latestVerifications(
    linkedRepos.map((r) => r.id),
  );

  const linkedSeconds = (hackatimeStats?.projects ?? [])
    .filter((p) => project.hackatime_project_names.includes(p.name))
    .reduce((sum, p) => sum + p.total_seconds, 0);

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
            <StatusBadge status={project.status} />
          </div>
          {canSubmit ? (
            <form
              action={async () => {
                "use server";
                await submitProjectAction(project.id);
              }}
            >
              <button
                type="submit"
                disabled={missing.length > 0}
                className="rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
              >
                {project.status === "draft" ? "Submit" : "Resubmit"}
              </button>
            </form>
          ) : null}
        </div>
        {missing.length ? (
          <p className="mt-2 text-xs text-zinc-500">
            To submit for review, this project still needs: {missing.join(", ")}.
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

      <div className="grid grid-cols-2 divide-x divide-zinc-200 border border-zinc-200 bg-white text-sm">
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
      </div>

      <ProjectEditor
        project={project}
        hackatimeProjects={hackatimeStats?.projects ?? []}
        hackatimeConnected={!!student.hackatime_access_token}
        attributionRepos={attributionRepos}
        attributionInstalled={!!attributionKey}
        updateAction={updateProjectAction.bind(null, project.id)}
        deleteAction={deleteProjectAction.bind(null, project.id)}
      />

      {linkedRepos.length > 0 ? (
        <section className="border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Code authorship</h2>
          <div className="mt-3">
            <AttributionSummary
              repos={linkedRepos}
              verifications={attributionVerifications}
            />
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Learning journal
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Journal what you learn here. Every entry is scored 0–{LEVEL_MAX} on
            three axes — how much you had to figure out, how well you explain
            it, and whether your evidence backs it — and the entry is worth the
            lowest of the three.{" "}
            <a
              href="/rubric"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-zinc-900"
            >
              Read the rubric
            </a>{" "}
            before you write.
          </p>
        </div>

        <AddJournalEntry action={addJournalEntryAction.bind(null, project.id)} />

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
                pointsLabel={levelLabel(entry)}
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
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            You need at least one journal before you submit.
          </p>
        )}
      </section>
    </div>
  );
}

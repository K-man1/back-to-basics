import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getProjectForStudent, missingSubmitRequirements } from "@/lib/projects";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { getEntriesForProject } from "@/lib/journal";
import { GRADE_MAX, computePoints, pointsRange } from "@/lib/currency";
import { getLatestReviewForProject } from "@/lib/reviews";
import {
  submitProjectAction,
  updateProjectAction,
  addJournalEntryAction,
  updateJournalEntryAction,
  deleteJournalEntryAction,
} from "@/app/dashboard/actions";
import ProjectEditor from "@/components/ProjectEditor";
import AddJournalEntry from "@/components/AddJournalEntry";
import JournalEntryCard from "@/components/JournalEntryCard";
import StatusBadge, { statusLabel } from "@/components/StatusBadge";

const REVIEW_ACCENT: Record<string, string> = {
  approved: "border-green-300",
  changes_requested: "border-orange-300",
  rejected: "border-red-300",
};

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

  const project = await getProjectForStudent(id, student.id);
  if (!project) notFound();

  const entries = await getEntriesForProject(project.id);

  const latestReview = await getLatestReviewForProject(project.id);

  const hackatimeStats = await getHackatimeStatsForStudent(student);

  const linkedSeconds = (hackatimeStats?.projects ?? [])
    .filter((p) => project.hackatime_project_names.includes(p.name))
    .reduce((sum, p) => sum + p.total_seconds, 0);

  // Ungraded entries are worth nothing until the review pass, so pre-review
  // this sits at the hours floor — the cap shows what journaling can unlock.
  const grades = entries
    .filter((e) => e.points != null)
    .map((e) => e.points as number);
  const hasPending = entries.some((e) => e.points == null);
  const projectPoints = computePoints(linkedSeconds, grades);
  const { cap } = pointsRange(linkedSeconds);

  const canSubmit =
    project.status === "draft" || project.status === "changes_requested";
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
                {project.status === "changes_requested"
                  ? "Resubmit for review"
                  : "Submit for review"}
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
              {latestReview.points_delta !== 0
                ? ` · ${latestReview.points_delta > 0 ? "+" : ""}${latestReview.points_delta} pts`
                : ""}
            </span>
          </div>
          {latestReview.feedback ? (
            <p className="mt-2 text-zinc-700">{latestReview.feedback}</p>
          ) : (
            <p className="mt-2 text-zinc-500">No written feedback.</p>
          )}
        </section>
      ) : null}

      <div className="grid grid-cols-3 divide-x divide-zinc-200 border border-zinc-200 bg-white text-sm">
        <div className="p-4">
          <p className="text-2xl text-zinc-900">
            {(linkedSeconds / 3600).toFixed(2)}
          </p>
          <p className="mt-1 text-zinc-500">hours logged</p>
        </div>
        <div className="p-4">
          <p className="text-2xl text-zinc-900">{entries.length}</p>
          <p className="mt-1 text-zinc-500">journal entries</p>
        </div>
        <div className="p-4">
          <p className="text-2xl text-zinc-900">{projectPoints}</p>
          <p className="mt-1 text-zinc-500">
            {hasPending ? `pts so far — up to ${cap} after review` : "pts earned"}
          </p>
        </div>
      </div>

      <ProjectEditor
        project={project}
        hackatimeProjects={hackatimeStats?.projects ?? []}
        hackatimeConnected={!!student.hackatime_access_token}
        updateAction={updateProjectAction.bind(null, project.id)}
      />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Learning journal
            {entries.length ? (
              <span className="ml-2 font-normal text-zinc-400">
                {entries.length}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            This is what reviewers grade. Whenever something clicks while you
            build — a concept, a bug you finally understood, a tradeoff you
            made — write it down here in your own words. Keep{" "}
            <a
              href="https://lapse.hackclub.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-zinc-900"
            >
              Lapse
            </a>{" "}
            recording while you work so your timelapse backs it up.
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
                pointsLabel={
                  entry.points != null
                    ? `graded ${entry.points}/${GRADE_MAX}`
                    : "pending review"
                }
                graded={entry.points != null}
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
            No entries yet — you need at least one before you can submit.
          </p>
        )}
      </section>
    </div>
  );
}

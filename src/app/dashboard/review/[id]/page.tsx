import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateStudent, getStudentById } from "@/lib/students";
import { getReviewerForStudent, ALLOW_SELF_REVIEW } from "@/lib/reviewers";
import { getReviewsForProject } from "@/lib/reviews";
import { getProjectById } from "@/lib/projects";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { getEntriesForProject } from "@/lib/journal";
import {
  parseGithubBlobLink,
  fetchGithubSnippet,
  GithubSnippet,
} from "@/lib/github";
import { GRADE_MAX } from "@/lib/currency";
import {
  submitReviewAction,
  gradeEntryAction,
} from "@/app/dashboard/review/actions";
import StatusBadge, { statusLabel } from "@/components/StatusBadge";

export default async function ReviewDetailPage({
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

  const reviewer = await getReviewerForStudent(student.id);
  if (!reviewer) notFound();

  const project = await getProjectById(id);
  if (!project) notFound();

  const owner = await getStudentById(project.student_id);

  const journalEntries = await getEntriesForProject(project.id);

  // Expand GitHub permalinks with a line anchor into inline snippets so
  // grading doesn't require tab-hopping. Fetched per unique link; anything
  // unparseable or unfetchable just stays a plain link.
  const uniqueGithubLinks = [
    ...new Set(journalEntries.flatMap((e) => e.github_links)),
  ];
  const snippetsByLink = new Map<string, GithubSnippet | null>(
    await Promise.all(
      uniqueGithubLinks.map(async (link): Promise<[string, GithubSnippet | null]> => {
        const parsed = parseGithubBlobLink(link);
        return [link, parsed ? await fetchGithubSnippet(parsed) : null];
      }),
    ),
  );

  const hackatimeStats = owner ? await getHackatimeStatsForStudent(owner) : null;
  const linkedSeconds = (hackatimeStats?.projects ?? [])
    .filter((p) => project.hackatime_project_names.includes(p.name))
    .reduce((sum, p) => sum + p.total_seconds, 0);

  const priorReviews = await getReviewsForProject(project.id);
  const isOwnProject = project.student_id === student.id;
  const canReview =
    project.status === "submitted" && (ALLOW_SELF_REVIEW || !isOwnProject);
  const canGrade = ALLOW_SELF_REVIEW || !isOwnProject;

  const gradedCount = journalEntries.filter((e) => e.points != null).length;
  const ungradedCount = journalEntries.length - gradedCount;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard/review"
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← Review queue
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl tracking-tight text-zinc-900">
            {project.title}
          </h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          by {owner?.name ?? "a student"}
        </p>
      </div>

      <section className="border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">Project</h2>
          <div className="flex gap-2 text-xs">
            {project.github_url ? (
              <a
                href={project.github_url}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-zinc-300 px-2.5 py-1 text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
              >
                GitHub ↗
              </a>
            ) : null}
            {project.demo_url ? (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-zinc-300 px-2.5 py-1 text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
              >
                Demo ↗
              </a>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          {project.description || (
            <span className="text-zinc-400">No description.</span>
          )}
        </p>
        <div className="mt-4 flex gap-8 border-t border-zinc-200 pt-3 text-sm">
          <div>
            <p className="text-xl text-zinc-900">
              {(linkedSeconds / 3600).toFixed(2)}
            </p>
            <p className="text-xs text-zinc-500">hours logged</p>
          </div>
          <div>
            <p className="text-xl text-zinc-900">{journalEntries.length}</p>
            <p className="text-xs text-zinc-500">journal entries</p>
          </div>
          <div>
            <p className="text-xl text-zinc-900">
              {gradedCount}/{journalEntries.length}
            </p>
            <p className="text-xs text-zinc-500">entries graded</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Learning journal
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            What the student says they learned, in their own words — this is
            what you&apos;re judging. Check it against their timelapse and
            code, then grade each entry.
          </p>
        </div>

        {journalEntries.length ? (
          journalEntries.map((entry) => (
            <div key={entry.id} className="border border-zinc-200 bg-white">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {entry.title}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-xs ${
                      entry.points != null
                        ? "border-green-300 text-green-700"
                        : "border-amber-300 text-amber-700"
                    }`}
                  >
                    {entry.points != null
                      ? `${entry.points}/${GRADE_MAX}`
                      : "ungraded"}
                  </span>
                </div>
                <div className="prose-journal mt-2 text-sm text-zinc-700">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {entry.reflection}
                  </Markdown>
                </div>

                {entry.lapse_url ? (
                  <p className="mt-2 text-xs">
                    <a
                      href={entry.lapse_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-600 underline hover:text-zinc-900"
                    >
                      ▶ session timelapse
                    </a>
                  </p>
                ) : null}

                {entry.github_links.map((link) => {
                  const snippet = snippetsByLink.get(link);
                  return (
                    <div key={link} className="mt-2 text-xs">
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-zinc-600 underline hover:text-zinc-900"
                      >
                        {link.replace("https://github.com/", "")}
                      </a>
                      {snippet ? (
                        <pre className="mt-1 overflow-x-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-[11px] leading-relaxed text-zinc-800">
                          {snippet.lines
                            .map(
                              (line, i) =>
                                `${String(snippet.startLine + i).padStart(4)}  ${line}`,
                            )
                            .join("\n")}
                          {snippet.truncated ? "\n  …truncated" : ""}
                        </pre>
                      ) : null}
                    </div>
                  );
                })}

                {!entry.lapse_url && !entry.github_links.length ? (
                  <p className="mt-2 text-xs text-amber-600">
                    No timelapse or code linked — grade skeptically.
                  </p>
                ) : null}
              </div>

              {canGrade ? (
                <form
                  action={gradeEntryAction.bind(null, project.id, entry.id)}
                  className="flex flex-wrap items-center gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-3"
                >
                  <label className="flex items-center gap-2 text-xs text-zinc-600">
                    Grade 0–{GRADE_MAX}
                    <input
                      type="number"
                      name="points"
                      min="0"
                      max={GRADE_MAX}
                      step="1"
                      defaultValue={entry.points ?? ""}
                      placeholder="—"
                      className="w-16 rounded border border-zinc-300 bg-white p-1.5 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded border border-zinc-900 px-3 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
                  >
                    {entry.points != null ? "Regrade" : "Grade"}
                  </button>
                  <span className="text-xs text-zinc-400">
                    higher = deeper journal
                  </span>
                </form>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">
            No journal entries for this project.
          </p>
        )}
      </section>

      {canReview ? (
        <form
          action={submitReviewAction.bind(null, project.id)}
          className="flex flex-col gap-4 border border-zinc-200 bg-white p-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Record a decision
            </h2>
            {ungradedCount > 0 ? (
              <p className="mt-1 text-xs text-amber-600">
                {ungradedCount} of {journalEntries.length}{" "}
                {journalEntries.length === 1 ? "entry is" : "entries are"} still
                ungraded — grades set the journal points, so grade everything
                above first.
              </p>
            ) : null}
          </div>

          <fieldset className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="decision" value="approved" defaultChecked />
              Approve
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="decision" value="changes_requested" />
              Request changes (sends it back for a resubmit)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="decision" value="rejected" />
              Reject
            </label>
          </fieldset>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Feedback for the student</span>
            <textarea
              name="feedback"
              rows={4}
              className="rounded border border-zinc-300 p-2 text-sm"
              placeholder="What stood out, what to work on…"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">
              Points adjustment (negative to deflate, blank for none)
            </span>
            <input
              type="number"
              name="points_delta"
              step="1"
              defaultValue={0}
              className="w-32 rounded border border-zinc-300 p-2 text-sm"
            />
          </label>

          <button
            type="submit"
            className="w-fit rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Submit review
          </button>
        </form>
      ) : !ALLOW_SELF_REVIEW && isOwnProject ? (
        <p className="text-sm text-zinc-500">
          This is your own project — you can&apos;t review it.
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          This project isn&apos;t awaiting review right now.
        </p>
      )}

      {priorReviews.length ? (
        <section>
          <h2 className="text-sm font-semibold text-zinc-900">Review history</h2>
          <div className="mt-3 flex flex-col divide-y divide-zinc-200 border border-zinc-200 bg-white">
            {priorReviews.map((review) => (
              <div key={review.id} className="p-3 text-sm">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{statusLabel(review.decision)}</span>
                  <span>
                    {review.points_delta >= 0 ? "+" : ""}
                    {review.points_delta} pts ·{" "}
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.feedback ? (
                  <p className="mt-1 text-zinc-700">{review.feedback}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

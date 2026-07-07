import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getReviewerForStudent, ALLOW_SELF_REVIEW } from "@/lib/reviewers";
import { listProjectsAwaitingReview } from "@/lib/reviews";
import { supabaseAdmin } from "@/lib/supabase";

export default async function ReviewQueuePage() {
  const session = await auth();
  if (!session?.user?.id) return null; // layout handles the sign-in gate

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );

  const reviewer = await getReviewerForStudent(student.id);
  if (!reviewer) notFound(); // not a reviewer — this route doesn't exist for you

  // Reviewers can't grade their own submissions, so keep those out of the
  // queue entirely — the review page guards it server-side too. Temporarily
  // relaxed by ALLOW_SELF_REVIEW so you can see your own projects here.
  const projects = (await listProjectsAwaitingReview()).filter(
    (p) => ALLOW_SELF_REVIEW || p.student_id !== student.id,
  );

  const supabase = supabaseAdmin();
  const studentIds = [...new Set(projects.map((p) => p.student_id))];
  const { data: students } = studentIds.length
    ? await supabase.from("students").select("id, name").in("id", studentIds)
    : { data: [] };
  const nameById = new Map((students ?? []).map((s) => [s.id, s.name]));

  // Journal-entry counts per project, in one query.
  const projectIds = projects.map((p) => p.id);
  const entryCount = new Map<string, number>();
  if (projectIds.length) {
    const { data: entryRows } = await supabase
      .from("journal_entries")
      .select("project_id")
      .in("project_id", projectIds);
    for (const row of entryRows ?? []) {
      entryCount.set(row.project_id, (entryCount.get(row.project_id) ?? 0) + 1);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">Review queue</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {projects.length} project{projects.length === 1 ? "" : "s"} awaiting review
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {projects.length ? (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/review/${project.id}`}
              className="rounded border border-zinc-200 p-4 transition-colors hover:border-zinc-400"
            >
              <p className="text-sm font-semibold text-zinc-900">{project.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                by {nameById.get(project.student_id) ?? "a student"} ·{" "}
                {entryCount.get(project.id) ?? 0} journal entr
                {(entryCount.get(project.id) ?? 0) === 1 ? "y" : "ies"} · submitted{" "}
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-zinc-500">Nothing awaiting review right now.</p>
        )}
      </div>
    </div>
  );
}

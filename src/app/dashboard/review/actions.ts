"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getReviewerForStudent, ALLOW_SELF_REVIEW } from "@/lib/reviewers";
import { createReview, ReviewDecision } from "@/lib/reviews";
import { getProjectById } from "@/lib/projects";
import { gradeEntry } from "@/lib/journal";

const DECISIONS: ReviewDecision[] = ["approved", "changes_requested", "rejected"];

// Resolves the signed-in user to their reviewer id and student id, or throws.
// Every review mutation runs through this, so a non-reviewer can never write a
// review even by POSTing the action directly. We return the student id too so
// the caller can enforce that a reviewer isn't grading their own project.
async function requireReviewer(): Promise<{ reviewerId: string; studentId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );
  const reviewer = await getReviewerForStudent(student.id);
  if (!reviewer) throw new Error("not a reviewer");
  return { reviewerId: reviewer.id, studentId: student.id };
}

// A reviewer grading a single journal entry's learning value.
// Decoupled from the approve/reject decision — a reviewer can grade any time
// they view someone else's project, not only while it's in the queue.
export async function gradeEntryAction(
  projectId: string,
  entryId: string,
  formData: FormData,
) {
  const { studentId } = await requireReviewer();

  const project = await getProjectById(projectId);
  if (!project) throw new Error("project not found");
  if (!ALLOW_SELF_REVIEW && project.student_id === studentId) {
    throw new Error("you can't grade your own project");
  }

  // One score per rubric axis. NaN from a blank select is caught by
  // gradeEntry's range check, so a half-filled form can't grade an entry.
  const axisScore = (name: string) =>
    Number.parseInt(String(formData.get(name) ?? "").trim(), 10);

  await gradeEntry(entryId, projectId, {
    depth: axisScore("depth"),
    explanation: axisScore("explanation"),
    proof: axisScore("proof"),
  });

  revalidatePath(`/dashboard/review/${projectId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function submitReviewAction(projectId: string, formData: FormData) {
  const { reviewerId, studentId } = await requireReviewer();

  // A reviewer can't grade their own submission — enforced here, not just in
  // the UI, so it holds even if the form is POSTed directly. Temporarily
  // relaxed by ALLOW_SELF_REVIEW for end-to-end testing.
  const project = await getProjectById(projectId);
  if (!project) throw new Error("project not found");
  if (!ALLOW_SELF_REVIEW && project.student_id === studentId) {
    throw new Error("you can't review your own project");
  }

  const decision = String(formData.get("decision") ?? "");
  if (!DECISIONS.includes(decision as ReviewDecision)) {
    throw new Error("invalid decision");
  }

  const feedback = String(formData.get("feedback") ?? "").trim() || null;

  const rawDelta = String(formData.get("points_delta") ?? "").trim();
  const pointsDelta = rawDelta ? Number.parseInt(rawDelta, 10) : 0;
  if (!Number.isFinite(pointsDelta)) {
    throw new Error("coin adjustment must be a whole number");
  }

  await createReview(reviewerId, projectId, decision as ReviewDecision, feedback, pointsDelta);

  revalidatePath("/dashboard/review");
  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect("/dashboard/review");
}

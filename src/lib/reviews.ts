import { supabaseAdmin } from "@/lib/supabase";
import type { Project } from "@/lib/projects";

export type ReviewDecision = "approved" | "changes_requested" | "rejected";

export interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  decision: ReviewDecision;
  feedback: string | null;
  points_delta: number;
  created_at: string;
}

// Projects awaiting a reviewer's call: status is exactly 'submitted'.
export async function listProjectsAwaitingReview(): Promise<Project[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "submitted")
    .order("created_at", { ascending: true }); // oldest first — review queue
  return (data as Project[] | null) ?? [];
}

export async function getReviewsForProject(projectId: string): Promise<Review[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data as Review[] | null) ?? [];
}

// Latest review across ALL of a student's projects would need a join; this
// gives the latest for a single project (what the student sees on its page).
export async function getLatestReviewForProject(
  projectId: string,
): Promise<Review | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Review | null) ?? null;
}

// Records a review and moves the project into the decided state. The state
// guard lives in the UPDATE filter (status = 'submitted'): if the project
// isn't actually awaiting review — already decided, or a stale double-submit —
// no row is updated, we detect the empty return, and we never write the
// review. That makes the transition the source of truth, not the button.
export async function createReview(
  reviewerId: string,
  projectId: string,
  decision: ReviewDecision,
  feedback: string | null,
  pointsDelta: number,
): Promise<void> {
  const supabase = supabaseAdmin();

  const { data: moved } = await supabase
    .from("projects")
    .update({ status: decision })
    .eq("id", projectId)
    .eq("status", "submitted")
    .select("id");

  if (!moved || moved.length === 0) {
    throw new Error("project is not awaiting review");
  }

  const { error } = await supabase.from("reviews").insert({
    project_id: projectId,
    reviewer_id: reviewerId,
    decision,
    feedback,
    points_delta: pointsDelta,
  });

  if (error) {
    throw new Error(`failed to record review: ${error.message}`);
  }
}

// Sum of every points_delta across all reviews of a student's projects.
// Feeds the student's displayed points balance.
export async function sumReviewPointsForStudent(studentId: string): Promise<number> {
  const supabase = supabaseAdmin();

  const { data: projectRows } = await supabase
    .from("projects")
    .select("id")
    .eq("student_id", studentId);

  const projectIds = (projectRows ?? []).map((p) => p.id);
  if (!projectIds.length) return 0;

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("points_delta")
    .in("project_id", projectIds);

  return (reviewRows ?? []).reduce((sum, r) => sum + (r.points_delta ?? 0), 0);
}

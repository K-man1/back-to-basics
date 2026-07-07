import { supabaseAdmin } from "@/lib/supabase";

// TEMPORARY: lets a reviewer review/grade their own projects, so the flow can
// be tested end-to-end without a second account. Flip back to false before this
// is real — self-review defeats the point of a reviewer gate.
export const ALLOW_SELF_REVIEW = true;

export interface Reviewer {
  id: string;
  student_id: string;
  created_at: string;
}

// Returns the reviewer row for a student, or null if they aren't one.
// Also serves as the "is this student a reviewer?" check.
export async function getReviewerForStudent(
  studentId: string,
): Promise<Reviewer | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("reviewers")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data as Reviewer | null) ?? null;
}

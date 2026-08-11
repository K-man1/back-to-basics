import { supabaseAdmin } from "@/lib/supabase";

export interface Student {
  id: string;
  hackclub_id: string;
  slack_id: string | null;
  name: string | null;
  email: string | null;
  hackatime_access_token: string | null;
  onboarded_at: string | null;
  created_at: string;
}

// `isNew` tells the caller whether this call is what created the row — the
// dashboard layout uses it to send a brand-new student to the AI-app picker
// once, on their very first visit, instead of a separate onboarding page.
export async function getOrCreateStudent(
  hackclubId: string,
  slackId: string | null,
  name: string | null,
  email: string | null,
): Promise<Student & { isNew: boolean }> {
  const supabase = supabaseAdmin();

  const { data: existing } = await supabase
    .from("students")
    .select("*")
    .eq("hackclub_id", hackclubId)
    .single();

  if (existing) {
    if (slackId && existing.slack_id !== slackId) {
      const { data: updated } = await supabase
        .from("students")
        .update({ slack_id: slackId })
        .eq("id", existing.id)
        .select()
        .single();
      if (updated) return { ...(updated as Student), isNew: false };
    }
    return { ...(existing as Student), isNew: false };
  }

  const { data: created, error } = await supabase
    .from("students")
    .insert({ hackclub_id: hackclubId, slack_id: slackId, name, email })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`failed to create student: ${error?.message}`);
  }

  return { ...(created as Student), isNew: true };
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();
  return (data as Student | null) ?? null;
}

export async function setHackatimeAccessToken(
  studentId: string,
  accessToken: string,
): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase
    .from("students")
    .update({ hackatime_access_token: accessToken })
    .eq("id", studentId);
}


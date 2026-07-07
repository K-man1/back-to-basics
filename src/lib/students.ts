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

export async function getOrCreateStudent(
  hackclubId: string,
  slackId: string | null,
  name: string | null,
  email: string | null,
): Promise<Student> {
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
      if (updated) return updated as Student;
    }
    return existing as Student;
  }

  const { data: created, error } = await supabase
    .from("students")
    .insert({ hackclub_id: hackclubId, slack_id: slackId, name, email })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`failed to create student: ${error?.message}`);
  }

  return created as Student;
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

export async function markOnboarded(studentId: string): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase
    .from("students")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", studentId);
}

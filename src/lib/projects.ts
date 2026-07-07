import { supabaseAdmin } from "@/lib/supabase";

export interface Project {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  github_url: string | null;
  demo_url: string | null;
  hackatime_project_names: string[];
  status: "draft" | "submitted" | "approved" | "changes_requested" | "rejected";
  created_at: string;
}

// Things that are optional while drafting but required to submit for review.
// Pure helper (no "use server") so both the submit action and the project page
// can call it. Returns the human-readable names of whatever's still missing.
// journalEntryCount is required because the journal is the artifact reviewers
// grade — a project with no entries has nothing demonstrating learning.
export function missingSubmitRequirements(
  project: {
    description: string | null;
    github_url: string | null;
    demo_url: string | null;
  },
  journalEntryCount: number,
): string[] {
  const missing: string[] = [];
  if (!project.description?.trim()) missing.push("description");
  if (!project.github_url?.trim()) missing.push("GitHub URL");
  if (!project.demo_url?.trim()) missing.push("demo URL");
  if (journalEntryCount === 0) missing.push("journal entry");
  return missing;
}

export interface ProjectFields {
  title?: string;
  description?: string | null;
  github_url?: string | null;
  demo_url?: string | null;
  hackatime_project_names?: string[];
}

export async function listProjectsByStudent(studentId: string): Promise<Project[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return (data as Project[] | null) ?? [];
}

// Explore is public-facing, so it shows only projects a reviewer has already
// approved — never ones still sitting in the queue ('submitted') or bounced
// back ('changes_requested'/'rejected').
export async function listApprovedProjects(): Promise<Project[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  return (data as Project[] | null) ?? [];
}

export async function getProjectForStudent(
  projectId: string,
  studentId: string,
): Promise<Project | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("student_id", studentId)
    .single();
  return (data as Project | null) ?? null;
}

// Unscoped fetch — for reviewers, who look at projects they don't own.
export async function getProjectById(projectId: string): Promise<Project | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  return (data as Project | null) ?? null;
}

export async function createProject(
  studentId: string,
  fields: ProjectFields,
): Promise<Project> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .insert({ student_id: studentId, ...fields })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`failed to create project: ${error?.message}`);
  }
  return data as Project;
}

export async function updateProject(
  projectId: string,
  studentId: string,
  fields: ProjectFields,
): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase
    .from("projects")
    .update(fields)
    .eq("id", projectId)
    .eq("student_id", studentId);
}

// Student-scoped delete: the student_id filter means a student can only ever
// remove their own project. journal_entries and reviews fk to projects with
// ON DELETE CASCADE, so those rows go with it.
export async function deleteProject(
  projectId: string,
  studentId: string,
): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("student_id", studentId);
}

// A student can submit a fresh draft or resubmit one a reviewer bounced back
// with changes_requested. Approved/rejected are terminal, so the status filter
// refuses those transitions server-side even if the UI slips.
export async function submitProject(projectId: string, studentId: string): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase
    .from("projects")
    .update({ status: "submitted" })
    .eq("id", projectId)
    .eq("student_id", studentId)
    .in("status", ["draft", "changes_requested"]);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import {
  createProject,
  updateProject,
  deleteProject,
  submitProject,
  getProjectForStudent,
  missingSubmitRequirements,
  ProjectFields,
} from "@/lib/projects";
import { normalizeExternalUrl } from "@/lib/url";
import {
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getEntriesForProject,
  validateJournalLinks,
} from "@/lib/journal";

async function requireStudentId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );
  return student.id;
}

function fieldsFromFormData(formData: FormData): ProjectFields {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    github_url: normalizeExternalUrl(String(formData.get("github_url") ?? "")),
    demo_url: normalizeExternalUrl(String(formData.get("demo_url") ?? "")),
    hackatime_project_names: formData.getAll("hackatime_project").map(String),
    attribution_repo_keys: formData.getAll("attribution_repo").map(String),
  };
}

export async function createProjectAction(formData: FormData) {
  const studentId = await requireStudentId();
  const fields = fieldsFromFormData(formData);

  if (!fields.title) throw new Error("title is required");

  const project = await createProject(studentId, fields);
  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${project.id}`);
}

export async function deleteProjectAction(projectId: string) {
  const studentId = await requireStudentId();
  await deleteProject(projectId, studentId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const studentId = await requireStudentId();
  const fields = fieldsFromFormData(formData);

  if (!fields.title) throw new Error("title is required");

  await updateProject(projectId, studentId, fields);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

// A journal entry is a title plus one markdown reflection (which can embed
// uploaded screenshots as image links), with optional evidence links — a
// Lapse timelapse and GitHub permalinks (textarea, one per line). The lib
// functions re-check that the project belongs to the student; projectId is
// bound for the revalidate.
function journalFieldsFromFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    reflection: String(formData.get("reflection") ?? "").trim(),
    lapse_url: String(formData.get("lapse_url") ?? "").trim() || null,
    github_links: String(formData.get("github_links") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

// Expected validation failures are returned (not thrown) so the form can
// show them next to the fields instead of Next.js replacing the page — and
// eating the student's draft — with an error screen.
function journalFieldsError(
  fields: ReturnType<typeof journalFieldsFromFormData>,
): string | null {
  if (!fields.title) return "title is required";
  if (!fields.reflection) return "reflection is required";
  return validateJournalLinks(fields);
}

export async function addJournalEntryAction(
  projectId: string,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const studentId = await requireStudentId();

  const fields = journalFieldsFromFormData(formData);
  const error = journalFieldsError(fields);
  if (error) return { error };

  await createJournalEntry(projectId, studentId, fields);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateJournalEntryAction(
  projectId: string,
  entryId: string,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const studentId = await requireStudentId();

  const fields = journalFieldsFromFormData(formData);
  const error = journalFieldsError(fields);
  if (error) return { error };

  await updateJournalEntry(entryId, studentId, fields);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function deleteJournalEntryAction(
  projectId: string,
  entryId: string,
) {
  const studentId = await requireStudentId();
  await deleteJournalEntry(entryId, studentId);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

// Returns instead of throwing on an incomplete project: the button is always
// clickable now, so "you still need a demo URL" is an expected answer to a
// normal click, not an error boundary.
export async function submitProjectAction(
  projectId: string,
): Promise<{ ok: true } | { ok: false; missing: string[] }> {
  const studentId = await requireStudentId();

  const project = await getProjectForStudent(projectId, studentId);
  if (!project) throw new Error("project not found");

  const entries = await getEntriesForProject(projectId);
  const missing = missingSubmitRequirements(project, entries.length);
  // The dialog lists these as bullets, so hand back the raw labels rather than
  // a sentence.
  if (missing.length) return { ok: false, missing };

  await submitProject(projectId, studentId);
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { ok: true };
}

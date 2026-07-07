import { supabaseAdmin } from "@/lib/supabase";
import { GRADE_MAX } from "@/lib/currency";
import { getProjectForStudent } from "@/lib/projects";

// A student-authored journal entry. Students write these on the project page
// while they build (with Lapse recording the session); a reviewer later grades
// each entry's learning value into points.
export interface JournalEntry {
  id: string;
  project_id: string;
  title: string;
  reflection: string;
  // Optional evidence: a Lapse timelapse of the session and GitHub permalinks
  // to the code this entry is about. Reviewers grade unbacked entries
  // skeptically rather than the form refusing them.
  lapse_url: string | null;
  github_links: string[];
  // Graded by a reviewer (null = ungraded).
  points: number | null;
  created_at: string;
}

export async function getEntriesForProject(
  projectId: string,
): Promise<JournalEntry[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data as JournalEntry[] | null) ?? [];
}

export interface JournalEntryFields {
  title: string;
  reflection: string;
  lapse_url: string | null;
  github_links: string[];
}

const MAX_GITHUB_LINKS = 10;

function hostOf(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

// Server-side validation so a hand-crafted POST can't attach links reviewers
// would trust to arbitrary hosts. Returns a message for the form to display,
// or null if the links are fine — expected validation failures are return
// values, not throws (a thrown error in a server action becomes the error
// page and eats the student's draft instead of showing in the form).
export function validateJournalLinks(
  fields: Pick<JournalEntryFields, "lapse_url" | "github_links">,
): string | null {
  if (fields.lapse_url && hostOf(fields.lapse_url) !== "lapse.hackclub.com") {
    return "Lapse link must be an https://lapse.hackclub.com URL";
  }
  if (fields.github_links.length > MAX_GITHUB_LINKS) {
    return `at most ${MAX_GITHUB_LINKS} GitHub links per entry`;
  }
  for (const link of fields.github_links) {
    if (hostOf(link) !== "github.com") {
      return `not a GitHub URL: ${link}`;
    }
  }
  return null;
}

// Ownership is enforced by resolving the project through getProjectForStudent —
// a student can't write into a project they don't own, even by POSTing the
// action directly.
export async function createJournalEntry(
  projectId: string,
  studentId: string,
  fields: JournalEntryFields,
): Promise<void> {
  const owned = await getProjectForStudent(projectId, studentId);
  if (!owned) throw new Error("not your project");

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("journal_entries")
    .insert({ project_id: projectId, ...fields });
  if (error) throw new Error(`failed to create journal entry: ${error.message}`);
}

export async function updateJournalEntry(
  entryId: string,
  studentId: string,
  fields: JournalEntryFields,
): Promise<void> {
  const supabase = supabaseAdmin();

  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id, project_id, points")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry) throw new Error("journal entry not found");

  const owned = await getProjectForStudent(entry.project_id, studentId);
  if (!owned) throw new Error("not your journal entry");

  // A graded entry is locked: its grade already counted, so the text can't be
  // swapped out from under it. The UI hides the edit control, but enforce it
  // here too so a hand-crafted POST can't bypass it.
  if (entry.points != null) throw new Error("graded entries can't be edited");

  await supabase.from("journal_entries").update(fields).eq("id", entryId);
}

export async function deleteJournalEntry(
  entryId: string,
  studentId: string,
): Promise<void> {
  const supabase = supabaseAdmin();

  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id, project_id, points")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry) return;

  const owned = await getProjectForStudent(entry.project_id, studentId);
  if (!owned) throw new Error("not your journal entry");

  // Same lock as editing — a graded entry can't be deleted out from under its
  // counted grade.
  if (entry.points != null) throw new Error("graded entries can't be deleted");

  await supabase.from("journal_entries").delete().eq("id", entryId);
}

// A reviewer grading an entry's learning value. The project_id filter scopes
// the write to the project being reviewed; the caller (review action) has
// already checked reviewer status and that it isn't the reviewer's own project.
export async function gradeEntry(
  entryId: string,
  projectId: string,
  points: number,
): Promise<void> {
  if (!Number.isInteger(points) || points < 0 || points > GRADE_MAX) {
    throw new Error(`grade must be an integer from 0 to ${GRADE_MAX}`);
  }
  const supabase = supabaseAdmin();
  await supabase
    .from("journal_entries")
    .update({ points })
    .eq("id", entryId)
    .eq("project_id", projectId);
}

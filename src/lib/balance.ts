import { supabaseAdmin } from "@/lib/supabase";
import type { Student } from "@/lib/students";
import { listProjectsByStudent } from "@/lib/projects";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { awardedCoins } from "@/lib/currency";

// Coins a student has actually been awarded — the number shown in the nav.
// Only projects a reviewer has APPROVED count. Each approved project is scored
// on its own linked hours + graded journal entries + reviewer adjustment, then
// summed. Scoring per-project (rather than globally) means hours from drafts or
// bounced-back projects never inflate the floor into the awarded total.
export async function approvedCoinsForStudent(student: Student): Promise<number> {
  const projects = await listProjectsByStudent(student.id);
  const approved = projects.filter((p) => p.status === "approved");
  if (!approved.length) return 0;

  const hackatimeStats = await getHackatimeStatsForStudent(student);
  const secondsByName = new Map(
    (hackatimeStats?.projects ?? []).map((p) => [p.name, p.total_seconds]),
  );

  const ids = approved.map((p) => p.id);
  const supabase = supabaseAdmin();

  const [{ data: entryRows }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("project_id, level")
      .in("project_id", ids)
      .not("level", "is", null),
    supabase
      .from("reviews")
      .select("project_id, points_delta")
      .in("project_id", ids),
  ]);

  const gradesByProject = new Map<string, number[]>();
  for (const row of entryRows ?? []) {
    const arr = gradesByProject.get(row.project_id) ?? [];
    arr.push(row.level as number);
    gradesByProject.set(row.project_id, arr);
  }
  const deltaByProject = new Map<string, number>();
  for (const row of reviewRows ?? []) {
    deltaByProject.set(
      row.project_id,
      (deltaByProject.get(row.project_id) ?? 0) + (row.points_delta ?? 0),
    );
  }

  let total = 0;
  for (const project of approved) {
    const seconds = project.hackatime_project_names.reduce(
      (sum, name) => sum + (secondsByName.get(name) ?? 0),
      0,
    );
    total += awardedCoins(
      seconds,
      gradesByProject.get(project.id) ?? [],
      deltaByProject.get(project.id) ?? 0,
    );
  }
  return total;
}

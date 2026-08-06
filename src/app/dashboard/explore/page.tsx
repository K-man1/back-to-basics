import { listApprovedProjects } from "@/lib/projects";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeExternalUrl } from "@/lib/url";

export default async function ExplorePage() {
  const projects = await listApprovedProjects();

  const supabase = supabaseAdmin();
  const studentIds = [...new Set(projects.map((p) => p.student_id))];
  const { data: students } = studentIds.length
    ? await supabase.from("students").select("id, name").in("id", studentIds)
    : { data: [] };
  const nameById = new Map((students ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">
          Approved projects
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        {projects.length ? (
          projects.map((project) => {
            const githubHref = normalizeExternalUrl(project.github_url);
            const demoHref = normalizeExternalUrl(project.demo_url);
            return (
              <div key={project.id} className="rounded border border-zinc-200 p-4">
                <p className="text-sm font-semibold text-zinc-900">{project.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  by {nameById.get(project.student_id) ?? "a student"}
                </p>
                <div className="mt-2 flex gap-3 text-xs">
                  {githubHref ? (
                    <a
                      href={githubHref}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      GitHub
                    </a>
                  ) : null}
                  {demoHref ? (
                    <a
                      href={demoHref}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Demo
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-zinc-500">No approved projects yet.</p>
        )}
      </div>
    </div>
  );
}

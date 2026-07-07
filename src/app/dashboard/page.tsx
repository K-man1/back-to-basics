import Link from "next/link";
import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { listProjectsByStudent } from "@/lib/projects";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { statusLabel } from "@/components/StatusBadge";

export default async function MyProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return null; // layout handles the sign-in gate

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );

  const [projects, hackatimeStats] = await Promise.all([
    listProjectsByStudent(student.id),
    getHackatimeStatsForStudent(student),
  ]);

  const secondsByName = new Map(
    (hackatimeStats?.projects ?? []).map((p) => [p.name, p.total_seconds]),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">Projects</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const seconds = project.hackatime_project_names.reduce(
            (sum, name) => sum + (secondsByName.get(name) ?? 0),
            0,
          );
          const hours = seconds / 3600;

          return (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="flex min-h-[176px] flex-col gap-3 border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold text-zinc-900">{project.title}</p>
                <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-500">
                  <ClockIcon />
                  {hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(seconds / 60)}m`}
                </span>
              </div>
              {project.status !== "draft" ? (
                <span className="w-fit border border-zinc-200 px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-500">
                  {statusLabel(project.status)}
                </span>
              ) : null}
              <p className="line-clamp-3 text-sm text-zinc-600">
                {project.description || "No description yet."}
              </p>
            </Link>
          );
        })}

        <Link
          href="/dashboard/projects/new"
          className="flex min-h-[176px] flex-col items-center justify-center gap-2 border border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-600"
        >
          <span className="text-3xl leading-none">+</span>
          <span className="text-sm">Create new project</span>
        </Link>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
      <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

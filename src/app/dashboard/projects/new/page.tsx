import { auth } from "@/auth";
import { getOrCreateStudent } from "@/lib/students";
import { getHackatimeStatsForStudent } from "@/lib/hackatime";
import { getKeyInfo, listReposByStudent, toRepoChoices } from "@/lib/attribution";
import { createProjectAction } from "@/app/dashboard/actions";
import ProjectFormFields from "@/components/ProjectFormFields";
import { AI_PLUGIN_ENABLED } from "@/lib/features";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) return null; // layout handles the sign-in gate

  const student = await getOrCreateStudent(
    session.user.id,
    session.user.slackId,
    session.user.name ?? null,
    session.user.email ?? null,
  );
  // Both attribution reads only feed the repo picker, which does not render
  // while the plugin is off.
  const [hackatimeStats, attributionRepos, attributionKey] = await Promise.all([
    getHackatimeStatsForStudent(student),
    AI_PLUGIN_ENABLED ? listReposByStudent(student.id) : [],
    AI_PLUGIN_ENABLED ? getKeyInfo(student.id) : null,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-zinc-500">[*] new project</p>
        <h1 className="mt-2 text-2xl tracking-tight text-zinc-900">New project</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Only the title is required — fill in the rest now or later.
        </p>
      </div>

      <form action={createProjectAction}>
        <ProjectFormFields
          hackatimeProjects={hackatimeStats?.projects ?? []}
          hackatimeConnected={!!student.hackatime_access_token}
          attributionRepos={toRepoChoices(attributionRepos)}
          attributionInstalled={!!attributionKey}
        />
        <button
          type="submit"
          className="mt-4 w-fit rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          Create project
        </button>
      </form>
    </div>
  );
}

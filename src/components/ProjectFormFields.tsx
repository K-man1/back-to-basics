import HackatimeProjectPicker from "@/components/HackatimeProjectPicker";
import type { HackatimeProjectStat } from "@/lib/hackatime";
import type { Project } from "@/lib/projects";

export default function ProjectFormFields({
  project,
  hackatimeProjects,
  hackatimeConnected = false,
}: {
  project?: Pick<
    Project,
    "title" | "description" | "github_url" | "demo_url" | "hackatime_project_names"
  >;
  hackatimeProjects: HackatimeProjectStat[];
  hackatimeConnected?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        Title (required)
        <input
          name="title"
          required
          defaultValue={project?.title}
          className="rounded border border-zinc-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={project?.description ?? ""}
          className="rounded border border-zinc-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        GitHub URL
        <input
          name="github_url"
          type="text"
          placeholder="https://github.com/you/repo"
          defaultValue={project?.github_url ?? ""}
          className="rounded border border-zinc-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Demo URL
        <input
          name="demo_url"
          type="text"
          placeholder="https://your-demo.example.com"
          defaultValue={project?.demo_url ?? ""}
          className="rounded border border-zinc-300 px-2 py-1"
        />
      </label>

      <div className="flex flex-col gap-1">
        <p>Hackatime projects</p>
        <HackatimeProjectPicker
          projects={hackatimeProjects}
          initialSelected={project?.hackatime_project_names ?? []}
          connected={hackatimeConnected}
        />
      </div>
    </div>
  );
}

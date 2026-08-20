import AttributionRepoPicker from "@/components/AttributionRepoPicker";
import HackatimeProjectPicker from "@/components/HackatimeProjectPicker";
import type { AttributionRepoChoice } from "@/lib/attribution";
import type { HackatimeProjectStat } from "@/lib/hackatime";
import type { Project } from "@/lib/projects";
import { AI_PLUGIN_ENABLED } from "@/lib/features";

export default function ProjectFormFields({
  project,
  hackatimeProjects,
  hackatimeConnected = false,
  attributionRepos = [],
  attributionInstalled = false,
}: {
  project?: Pick<
    Project,
    | "title"
    | "description"
    | "github_url"
    | "demo_url"
    | "hackatime_project_names"
    | "attribution_repo_keys"
  >;
  hackatimeProjects: HackatimeProjectStat[];
  hackatimeConnected?: boolean;
  attributionRepos?: AttributionRepoChoice[];
  attributionInstalled?: boolean;
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

      {/* With the plugin off there is no repo list to pick from, and no
          "AI usage" submit requirement to satisfy (see
          missingSubmitRequirements). The form posts no attribution_repo
          fields, so saving simply leaves the column as it was. */}
      {AI_PLUGIN_ENABLED ? (
        <div className="flex flex-col gap-1">
          {/* Like the description: fine to leave empty while drafting, checked
              by missingSubmitRequirements when you submit. */}
          <p>AI Usage (required to submit)</p>
          <AttributionRepoPicker
            repos={attributionRepos}
            initialSelected={project?.attribution_repo_keys ?? []}
            installed={attributionInstalled}
          />
        </div>
      ) : null}
    </div>
  );
}

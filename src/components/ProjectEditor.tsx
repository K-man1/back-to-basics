"use client";

import { useState } from "react";
import ProjectFormFields from "@/components/ProjectFormFields";
import ConfirmButton from "@/components/ConfirmButton";
import type { Project } from "@/lib/projects";
import { normalizeExternalUrl } from "@/lib/url";
import type { HackatimeProjectStat } from "@/lib/hackatime";
import type { AttributionRepoChoice } from "@/lib/attribution";

export default function ProjectEditor({
  project,
  hackatimeProjects,
  hackatimeConnected = false,
  attributionRepos = [],
  attributionInstalled = false,
  updateAction,
  deleteAction,
}: {
  project: Project;
  hackatimeProjects: HackatimeProjectStat[];
  hackatimeConnected?: boolean;
  attributionRepos?: AttributionRepoChoice[];
  attributionInstalled?: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  // A schemeless URL ("github.com/me/repo") in an href is relative, so it would
  // resolve against /dashboard/... instead of leaving the site.
  const githubHref = normalizeExternalUrl(project.github_url);
  const demoHref = normalizeExternalUrl(project.demo_url);

  if (!editing) {
    return (
      <section className="border border-zinc-200 bg-white p-4">
        {/* The description lives under the page title now, so this card is
            just the links and the Hackatime mapping. */}
        <h2 className="text-sm font-semibold text-zinc-900">Project details</h2>

        <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-y-2 text-sm">
          <dt className="text-zinc-500">GitHub</dt>
          <dd className="min-w-0">
            {githubHref ? (
              <a
                href={githubHref}
                target="_blank"
                rel="noreferrer"
                className="break-all underline hover:text-zinc-600"
              >
                {project.github_url}
              </a>
            ) : (
              <span className="text-zinc-400">not set</span>
            )}
          </dd>
          <dt className="text-zinc-500">Demo</dt>
          <dd className="min-w-0">
            {demoHref ? (
              <a
                href={demoHref}
                target="_blank"
                rel="noreferrer"
                className="break-all underline hover:text-zinc-600"
              >
                {project.demo_url}
              </a>
            ) : (
              <span className="text-zinc-400">not set</span>
            )}
          </dd>
          <dt className="text-zinc-500">Hackatime</dt>
          <dd className="flex flex-wrap gap-1.5">
            {project.hackatime_project_names.length ? (
              project.hackatime_project_names.map((name) => (
                <span
                  key={name}
                  className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600"
                >
                  {name}
                </span>
              ))
            ) : (
              <span className="text-zinc-400">no projects linked</span>
            )}
          </dd>
        </dl>

        {/* Both controls for this card live together at its foot, so "what can
            I do with this project" is one place instead of two corners. */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
          >
            Edit project
          </button>
          <ConfirmButton
            label="Delete project"
            className="text-xs text-zinc-500 underline hover:text-red-600"
            title="Delete this project?"
            body="This also removes its journal entries. It can't be undone."
            confirmLabel="Delete project"
            action={deleteAction}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Edit project</h2>
      <form
        className="mt-3"
        action={async (formData) => {
          await updateAction(formData);
          setEditing(false);
        }}
      >
        <ProjectFormFields
          project={project}
          hackatimeProjects={hackatimeProjects}
          hackatimeConnected={hackatimeConnected}
          attributionRepos={attributionRepos}
          attributionInstalled={attributionInstalled}
        />
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="w-fit rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-zinc-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

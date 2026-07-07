"use client";

import { useState } from "react";
import ProjectFormFields from "@/components/ProjectFormFields";
import type { Project } from "@/lib/projects";
import type { HackatimeProjectStat } from "@/lib/hackatime";

export default function ProjectEditor({
  project,
  hackatimeProjects,
  hackatimeConnected = false,
  updateAction,
}: {
  project: Project;
  hackatimeProjects: HackatimeProjectStat[];
  hackatimeConnected?: boolean;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <section className="border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Project details</h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
          >
            Edit
          </button>
        </div>

        <p className="mt-3 text-sm text-zinc-700">
          {project.description || (
            <span className="text-zinc-400">No description yet.</span>
          )}
        </p>

        <dl className="mt-4 grid grid-cols-[6.5rem_1fr] gap-y-2 text-sm">
          <dt className="text-zinc-500">GitHub</dt>
          <dd className="min-w-0">
            {project.github_url ? (
              <a
                href={project.github_url}
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
            {project.demo_url ? (
              <a
                href={project.demo_url}
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

"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import JournalEntryForm from "@/components/JournalEntryForm";
import ConfirmButton from "@/components/ConfirmButton";

// One journal entry on the student's own project page: rendered markdown with
// edit/delete, or the edit form. Once a reviewer has graded the entry it's
// locked — otherwise the text could change under a grade that already counted.
export default function JournalEntryCard({
  title,
  reflection,
  lapseUrl,
  githubLinks,
  createdAtLabel,
  levelLabel,
  axisLabel,
  graded,
  updateAction,
  deleteAction,
}: {
  title: string;
  reflection: string;
  lapseUrl: string | null;
  githubLinks: string[];
  // Pre-formatted on the server so SSR and hydration agree on the timezone.
  createdAtLabel: string;
  // The grade, split in two: "Level 1 of 3" and the per-axis detail behind it.
  // Both absent until a reviewer has graded the entry.
  levelLabel?: string | null;
  axisLabel?: string | null;
  graded: boolean;
  // Omitted when the viewer isn't the project owner (shared read-only view):
  // the entry renders without edit/delete controls.
  updateAction?: (formData: FormData) => Promise<{ error: string } | undefined>;
  deleteAction?: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="p-4">
      <div>
        <p className="text-xs text-zinc-500">{createdAtLabel}</p>
        {!editing ? (
          <p className="mt-1 text-sm font-semibold text-zinc-900">{title}</p>
        ) : null}
      </div>

      {editing && updateAction ? (
        <div className="mt-3">
          <JournalEntryForm
            initialTitle={title}
            initialReflection={reflection}
            initialLapseUrl={lapseUrl ?? ""}
            initialGithubLinks={githubLinks.join("\n")}
            submitLabel="Save entry"
            action={updateAction}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="prose-journal mt-2 text-sm text-zinc-700">
            <Markdown remarkPlugins={[remarkGfm]}>{reflection}</Markdown>
          </div>
          {lapseUrl || githubLinks.length ? (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {lapseUrl ? (
                <a
                  href={lapseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-600 underline hover:text-zinc-900"
                >
                  ▶ timelapse
                </a>
              ) : null}
              {githubLinks.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-zinc-600 underline hover:text-zinc-900"
                >
                  {link.replace("https://github.com/", "")}
                </a>
              ))}
            </div>
          ) : null}
          {updateAction && deleteAction && !graded ? (
            <div className="mt-3 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-zinc-600 underline hover:text-zinc-900"
              >
                Edit
              </button>
              <ConfirmButton
                label="Delete"
                className="text-zinc-500 underline hover:text-red-600"
                title="Delete this journal entry?"
                body="The entry and its evidence links go with it. This can't be undone."
                confirmLabel="Delete entry"
                action={deleteAction}
              />
            </div>
          ) : null}

          {/* The grade sits at the foot of the entry it belongs to, headline
              number first and the axes spelled out under it. */}
          {levelLabel ? (
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-xs">
              <span className="text-zinc-900">{levelLabel}</span>
              {axisLabel ? (
                <span className="text-zinc-500">{axisLabel}</span>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

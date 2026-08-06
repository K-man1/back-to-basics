"use client";

import { useState } from "react";
import type { AttributionRepo } from "@/lib/attribution";

// Which tracked repos count toward this project. Same shape and interaction as
// HackatimeProjectPicker — the student selects from what was already observed
// rather than typing anything — but showing the AI/you split instead of hours.

const INITIAL_VISIBLE = 12;

function split(repo: AttributionRepo) {
  const total = repo.ai_sig + repo.human_sig + repo.unobserved_sig;
  const aiPercent = total > 0 ? Math.round((100 * repo.ai_sig) / total) : 0;
  return { total, aiPercent };
}

export default function AttributionRepoPicker({
  repos,
  initialSelected,
  installed = false,
}: {
  repos: AttributionRepo[];
  initialSelected: string[];
  installed?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [showAll, setShowAll] = useState(false);

  const sorted = [...repos].sort((a, b) =>
    (b.last_activity ?? "").localeCompare(a.last_activity ?? ""),
  );
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const hiddenCount = sorted.length - visible.length;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!sorted.length) {
    return installed ? (
      <p className="text-xs text-green-700">
        Plugin installed — no tracked repositories yet. Open one in Claude Code.
      </p>
    ) : (
      <p className="text-xs text-zinc-500">
        No tracked repositories —{" "}
        <a href="/dashboard/settings" className="underline">
          install the Claude Code plugin in Settings
        </a>{" "}
        first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((repo) => {
          const isSelected = selected.has(repo.repo_key);
          const { total, aiPercent } = split(repo);
          return (
            <label
              key={repo.repo_key}
              title={
                total > 0
                  ? `${repo.ai_sig} AI / ${repo.human_sig} you / ${repo.unobserved_sig} unobserved (significant lines)`
                  : "No lines recorded yet"
              }
              className={`cursor-pointer rounded border px-3 py-1.5 text-xs transition-colors ${
                isSelected
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-500"
              }`}
            >
              <input
                type="checkbox"
                name="attribution_repo"
                value={repo.repo_key}
                checked={isSelected}
                onChange={() => toggle(repo.repo_key)}
                className="sr-only"
              />
              {repo.name}
              {total > 0 ? ` (${aiPercent}% AI)` : ""}
            </label>
          );
        })}
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-fit text-xs text-zinc-500 underline"
        >
          Show all ({hiddenCount} more)
        </button>
      ) : null}
      <p className="text-xs text-zinc-500">
        Reported by the plugin on your own machine. Reviewers see these as
        self-reported until the repository is verified from GitHub.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { AttributionRepo } from "@/lib/attribution";
import { summarise } from "@/lib/attribution";

// Which tracked repos count toward this project. Same shape and interaction as
// HackatimeProjectPicker — the student selects from what was already observed
// rather than typing anything — but showing the AI/you split instead of hours.

const INITIAL_VISIBLE = 12;

// The student sees a band, not a percentage. Exact figures are a reviewer's
// tool: a number on a chip invites optimising against it, and it is the least
// reliable reading of the three since it says nothing about coverage.
//
// `total === 0` means no roll-up has arrived yet, which is NOT the same as a
// project with no AI in it. Saying "0% AI" for it was a real bug: a student who
// built a whole site with an agent and had not closed their session saw
// "0% AI" and reasonably concluded the tool was broken.
function split(repo: AttributionRepo) {
  const summary = summarise([repo]);
  return {
    total: summary.total,
    band: summary.band,
    label: summary.bandLabel,
    detail:
      summary.total === 0
        ? "Nothing reported yet for this repository"
        : `${repo.ai_sig} AI / ${repo.human_sig} you / ${repo.unobserved_sig} unobserved ` +
          `(significant lines; ${summary.observedPercent}% of it was tracked)`,
  };
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
          const { band, label, detail } = split(repo);
          return (
            <label
              key={repo.repo_key}
              title={detail}
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
              {band === "unknown" ? "" : ` — AI: ${label}`}
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
    </div>
  );
}

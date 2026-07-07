"use client";

import { useState } from "react";
import type { HackatimeProjectStat } from "@/lib/hackatime";

const INITIAL_VISIBLE = 12;

export default function HackatimeProjectPicker({
  projects,
  initialSelected,
  connected = false,
}: {
  projects: HackatimeProjectStat[];
  initialSelected: string[];
  connected?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [showAll, setShowAll] = useState(false);

  const sorted = [...projects].sort((a, b) => b.total_seconds - a.total_seconds);
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const hiddenCount = sorted.length - visible.length;

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (!sorted.length) {
    return connected ? (
      <p className="text-xs text-green-700">
        Hackatime Connected — no coding activity to link yet.
      </p>
    ) : (
      <p className="text-xs text-zinc-500">
        No Hackatime projects found —{" "}
        <a href="/dashboard/settings" className="underline">
          connect Hackatime in Settings
        </a>{" "}
        first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((p) => {
          const isSelected = selected.has(p.name);
          return (
            <label
              key={p.name}
              className={`cursor-pointer rounded border px-3 py-1.5 text-xs transition-colors ${
                isSelected
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-500"
              }`}
            >
              <input
                type="checkbox"
                name="hackatime_project"
                value={p.name}
                checked={isSelected}
                onChange={() => toggle(p.name)}
                className="sr-only"
              />
              {p.name} ({(p.total_seconds / 3600).toFixed(1)}h)
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

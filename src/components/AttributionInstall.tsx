"use client";

import { useState } from "react";

// "Install to Claude Code": generates a key and shows the three commands that
// bind a student's machine to their account.
//
// The key is shown once and never again. It exists only in this component's
// state after the POST returns; the server stored a hash. Rotating is the only
// recovery, which is deliberate — it also means a student can revoke a machine
// they no longer have by generating a new key.

const MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_ATTRIBUTION_MARKETPLACE_URL ??
  "https://github.com/K-man1/b2b-hook";

function Command({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-800">
        {children}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function AttributionInstall({
  installed,
  keyPrefix,
  lastUsedAt,
}: {
  installed: boolean;
  keyPrefix: string | null;
  lastUsedAt: string | null;
}) {
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/attribution/key", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      setKey(body.key);
    } catch {
      setError("Could not generate a key. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const studentKey = key ?? "YOUR_KEY";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-zinc-600">
        {installed
          ? `Installed — key ${keyPrefix}…${
              lastUsedAt
                ? `, last reported ${new Date(lastUsedAt).toLocaleDateString()}`
                : ", not reported yet"
            }.`
          : "Tracks how much of your code you wrote versus your AI agent, so reviewers can see it alongside your journal."}
      </p>

      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="w-fit rounded border border-zinc-900 px-3 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-50"
      >
        {busy
          ? "Generating…"
          : installed
            ? "Generate a new key"
            : "Install to Claude Code"}
      </button>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      {key ? (
        <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">
            Copy this now. It is shown once and cannot be retrieved later.
          </p>
          <Command>{key}</Command>
        </div>
      ) : null}

      {installed || key ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">
            Run these three commands. You only do this once, on each machine you
            code on.
          </p>
          <Command>{`claude plugin marketplace add ${MARKETPLACE_URL}`}</Command>
          <Command>
            {"claude plugin install ai-attribution@ai-attribution-marketplace --scope user"}
          </Command>
          <Command>
            {`python3 ~/.claude/plugins/cache/ai-attribution-marketplace/ai-attribution/*/cli/aiattr.py configure --key ${studentKey} --endpoint ${origin}`}
          </Command>
          <p className="text-xs text-zinc-500">
            After that it runs in every git repository you open. Pick which ones
            count toward a project on the project page. Nothing is recorded in a
            folder that is not a git repository, so run <code>git init</code>{" "}
            before you start coding.
          </p>
        </div>
      ) : null}
    </div>
  );
}

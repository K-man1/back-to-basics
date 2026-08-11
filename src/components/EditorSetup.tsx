"use client";

import { useEffect, useState } from "react";
import { EDITOR_TOOLS, buildSetupCommands } from "@/lib/editors";

// Select an AI app -> see its setup commands -> Continue.
//
// Key handling has one rule that matters: issuing a key REPLACES any key the
// student already has (see issueKey in lib/attribution.ts), which would break
// every other machine already configured with the old one. So a fresh key is
// only ever auto-generated for a student who does not have one yet -- the
// common first-run case, where there is nothing to break. A student who
// already has one sees their prefix and an explicit button instead; rotating
// has to be something they chose, not a side effect of browsing this page.
export default function EditorSetup({
  continueHref,
  hasExistingKey,
  keyPrefix,
}: {
  continueHref: string;
  hasExistingKey: boolean;
  keyPrefix: string | null;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [noLogo, setNoLogo] = useState<Set<string>>(new Set());
  const [key, setKey] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  // Derived per-render, not state: it never changes after mount, and setting
  // it via an effect would be a setState call with no corresponding external
  // event, which is the exact pattern react-hooks/set-state-in-effect flags.
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function generateKey() {
    setKeyBusy(true);
    setKeyError(null);
    try {
      const res = await fetch("/api/attribution/key", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      setKey(body.key);
    } catch {
      setKeyError("Could not generate a key. Try again.");
    } finally {
      setKeyBusy(false);
    }
  }

  // Auto-fire exactly once, and only for a student with nothing to lose.
  // generateKey's first line sets state before its first await, which is
  // real work happening in response to mount (fetching this student's key),
  // not a synthesized render loop -- the pattern the lint rule exists to catch.
  useEffect(() => {
    if (!hasExistingKey && key === null && !keyBusy && !keyError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      generateKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasExistingKey]);

  function markNoLogo(slug: string) {
    setNoLogo((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      return next;
    });
  }

  const selected = EDITOR_TOOLS.find((t) => t.slug === selectedSlug) ?? null;

  if (selected) {
    const commands = origin ? buildSetupCommands(selected, { key, origin }) : [];
    const waitingOnKey = !hasExistingKey && !key && keyBusy;

    return (
      <div className="flex flex-col gap-6 text-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center">
            {noLogo.has(selected.slug) ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-sm font-semibold text-zinc-400">
                {selected.label[0]}
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/logos/${selected.logo}`}
                alt=""
                className="max-h-10 max-w-full object-contain"
                onError={() => markNoLogo(selected.slug)}
              />
            )}
          </span>
          <p className="text-base font-semibold text-zinc-900">{selected.label}</p>
        </div>

        {hasExistingKey && !key ? (
          <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
            <p>
              You already have a key ({keyPrefix}…). If this is a machine you
              have already configured, skip straight to the app-specific
              command below. If this is a new machine, generate a new key —
              doing so replaces the old one, so any other machine using it
              will need to be reconfigured.
            </p>
            <button
              type="button"
              onClick={generateKey}
              disabled={keyBusy}
              className="w-fit rounded border border-zinc-900 px-3 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-50"
            >
              {keyBusy ? "Generating…" : "Generate a new key"}
            </button>
          </div>
        ) : null}

        {keyError ? <p className="text-xs text-red-700">{keyError}</p> : null}

        {key ? (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Copy the command below now — this key is shown once and cannot be
            retrieved later.
          </div>
        ) : null}

        {waitingOnKey ? (
          <div className="rounded border border-dashed border-zinc-300 px-3 py-4 text-xs text-zinc-500">
            Generating your key…
          </div>
        ) : commands.length ? (
          <div className="flex flex-col gap-2">
            {commands.map((cmd, i) => (
              <Command key={i}>{cmd}</Command>
            ))}
          </div>
        ) : (
          <div className="rounded border border-dashed border-zinc-300 px-3 py-4 text-xs text-zinc-500">
            {selected.note ?? `Setup commands for ${selected.label} are coming soon.`}
          </div>
        )}

        {selected.note && commands.length ? (
          <p className="text-xs text-zinc-500">{selected.note}</p>
        ) : null}

        <div className="flex items-center gap-4">
          <a
            href={continueHref}
            className="w-fit rounded border border-zinc-900 px-4 py-2 text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Continue
          </a>
        </div>

        <button
          type="button"
          onClick={() => setSelectedSlug(null)}
          className="w-fit text-xs text-zinc-500 underline hover:text-zinc-900"
        >
          Use a different app? Click here
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {EDITOR_TOOLS.map((t) => (
        <button
          key={t.slug}
          type="button"
          onClick={() => setSelectedSlug(t.slug)}
          className="flex flex-col items-center gap-3 rounded-xl border border-zinc-300 px-3 py-4 text-center transition-colors hover:border-zinc-900"
        >
          <span className="flex h-10 w-10 items-center justify-center">
            {noLogo.has(t.slug) ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-sm font-semibold text-zinc-400">
                {t.label[0]}
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={(node) => {
                  if (node && node.complete && node.naturalWidth === 0) {
                    markNoLogo(t.slug);
                  }
                }}
                src={`/logos/${t.logo}`}
                alt=""
                className="max-h-10 max-w-full object-contain"
                onError={() => markNoLogo(t.slug)}
              />
            )}
          </span>
          <span className="text-xs font-medium leading-tight text-zinc-900">
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function Command({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded border border-zinc-200 bg-white/60 px-3 py-2 text-xs text-zinc-900">
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

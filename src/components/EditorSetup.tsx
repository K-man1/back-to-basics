"use client";

import { useState } from "react";
import { EDITOR_TOOLS, buildSetupCommands, type EditorTool } from "@/lib/editors";

// Select an AI app -> see its setup commands -> Continue.
//
// The whole design turns on one constraint: issuing a key REPLACES the
// student's existing one (see issueKey in lib/attribution.ts), which breaks
// every machine already using the old key. So the page never rotates a key on
// its own for someone who has one.
//
// That leaves a question we genuinely cannot answer from the server -- is this
// the computer they already set up, or a different one? Rather than explain the
// ambiguity and make the student resolve it (what the old amber warning box
// did, badly), the page picks the overwhelmingly common answer as the default:
// a student with a WORKING machine is adding another app to it, which needs no
// key and no installer, just one command. The rarer case gets a quiet link, and
// only that path shows a warning -- because only that path can break anything.
//
// "Working" is the load-bearing word, and getting it wrong cost a student two
// days. The gate used to be "does a key exist", which is not the same question
// and is wrong in the direction that fails silently: a key is issued the moment
// the picker is opened, and it is shown exactly once. Open the picker, do not
// run the commands, come back later, and the page now believes you have a
// configured computer. It then hands over the short path -- which for Claude
// Code is `plugin marketplace add` and `plugin install`, and no `configure` --
// so the plugin installs, the hooks fire, every edit is recorded to disk, and
// not one byte is ever sent, because the endpoint and key it would need were
// never written. Nothing anywhere reports an error. The site just says
// "connected, waiting for its first edit" forever.
//
// `keyEverUsed` is the honest version of the question: the server sets
// last_used_at when a machine authenticates with the key, so it is proof that
// some machine got all the way through setup. When it is false there is
// nothing to protect and rotating is free, so we issue a fresh key and show the
// full install -- no warning, because a key no machine has ever used cannot be
// broken by replacing it.
export default function EditorSetup({
  continueHref,
  keyEverUsed,
  keyPrefix,
}: {
  continueHref: string;
  keyEverUsed: boolean;
  keyPrefix: string | null;
}) {
  const [selected, setSelected] = useState<EditorTool | null>(null);
  const [noLogo, setNoLogo] = useState<Set<string>>(new Set());
  const [key, setKey] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [showNewComputer, setShowNewComputer] = useState(false);
  // Derived per-render, not state: it never changes after mount, and setting it
  // from an effect is the exact pattern react-hooks/set-state-in-effect flags.
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

  // Everything that happens on selection happens here, in the event handler,
  // rather than in an effect watching `selected` — same result, no effect to
  // reason about, and no lint suppression.
  async function selectTool(tool: EditorTool) {
    setSelected(tool);
    setShowNewComputer(false);

    // Fire-and-forget: this only drives the Settings status list, so a failure
    // must not interrupt setup.
    fetch("/api/attribution/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: tool.slug }),
    }).catch(() => {});

    // No machine has ever reported with this student's key, so there is nothing
    // a rotation could break. Issue one and show the full install, exactly as
    // for a first-ever setup -- an abandoned key and no key are the same
    // situation from here.
    if (!keyEverUsed && key === null) await generateKey();
  }

  function markNoLogo(slug: string) {
    setNoLogo((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      return next;
    });
  }

  if (selected) {
    const commands = origin ? buildSetupCommands(selected, { key, origin }) : [];
    // No working machine and no key in hand. The commands are deliberately
    // withheld here rather than rendered without the `configure` step: an
    // install that cannot report is the failure this whole component exists to
    // prevent, and handing one over because a fetch failed would reintroduce it
    // through the back door.
    const needsKey = !keyEverUsed && !key;
    // A student with a key some machine has actually reported with, who has not
    // asked for a new computer, is being shown the short "add this app to the
    // computer you already set up" path.
    const shortPath = keyEverUsed && !key;

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
          <div>
            <p className="text-base font-semibold text-zinc-900">
              {selected.label}
            </p>
            {selected.supported ? (
              <p className="text-xs text-zinc-500">
                {shortPath
                  ? "Adding this to the computer you already set up."
                  : "Run these in your terminal, in order."}
              </p>
            ) : null}
          </div>
        </div>

        {keyError ? (
          <p className="text-xs text-red-700">{keyError}</p>
        ) : null}

        {key ? (
          <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            Your key is filled in below. It is shown once and cannot be looked
            up later, so run these now — if you lose it, come back here and get
            a new one.
          </p>
        ) : null}

        {needsKey ? (
          <div className="flex flex-col gap-2 rounded border border-dashed border-zinc-300 px-3 py-4 text-xs text-zinc-500">
            {keyBusy ? (
              "Generating your key…"
            ) : (
              <>
                <span>
                  Your setup commands need a key, and this one could not be
                  generated. Nothing is installed until you have it.
                </span>
                <button
                  type="button"
                  onClick={generateKey}
                  className="w-fit rounded border border-zinc-900 px-3 py-1.5 text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
                >
                  Try again
                </button>
              </>
            )}
          </div>
        ) : commands.length ? (
          <div className="flex flex-col gap-4">
            {commands.map((c, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Command>{c.cmd}</Command>
                {c.hint ? (
                  <p className="text-xs text-zinc-500">{c.hint}</p>
                ) : null}
              </div>
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

        {shortPath ? (
          <div className="text-xs">
            {showNewComputer ? (
              <div className="flex flex-col gap-2 rounded border border-zinc-200 p-3">
                <p className="text-zinc-600">
                  A new key replaces your current one ({keyPrefix}…). Any other
                  computer still using the old key stops reporting until you set
                  it up again. Only do this if you are setting up a computer you
                  have not used before.
                </p>
                <button
                  type="button"
                  onClick={generateKey}
                  disabled={keyBusy}
                  className="w-fit rounded border border-zinc-900 px-3 py-1.5 text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-50"
                >
                  {keyBusy ? "Generating…" : "Get a new key"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewComputer(true)}
                className="text-zinc-500 underline hover:text-zinc-900"
              >
                Setting this up on a different computer?
              </button>
            )}
          </div>
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
          onClick={() => setSelected(null)}
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
          onClick={() => selectTool(t)}
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

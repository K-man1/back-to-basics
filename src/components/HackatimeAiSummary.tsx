import type { HackatimeAiTelemetry } from "@/lib/hackatime-ai";

// What an agent wrote in this project, sourced from Hackatime.
//
// This replaced a component fed by our own Claude Code plugin. Not because the
// plugin measured worse -- it measured better -- but because Hackatime already
// computes this for every student without anyone installing anything. A number
// that exists for everybody beats a better number that exists for whoever
// remembered to run an installer.
//
// WHY THERE IS NO HEADLINE PERCENTAGE, and why adding one would be wrong even
// though both counts are now on screen. The two sides do not come from the same
// place and are not comparable:
//
//   ai_lines     written by two producers at once. hackatime-cli parses the
//                agent's transcripts and reports a signed newLines-oldLines;
//                vscode-hackatime reports a doc.lineCount delta bucketed by a
//                paste-size-and-timing heuristic. Hackatime sums them into one
//                column, so this is net lines changed, not lines authored.
//   human_lines  produced ONLY by vscode-hackatime, and only when it detected a
//                real single-character keystroke in that file during the
//                interval -- otherwise the extension zeroes it before sending.
//                A student on JetBrains or Neovim reports no human lines at
//                all, whatever they typed.
//
// So the human side is systematically under-reported and the AI side is not.
// Dividing one by the other yields an AI share biased upward, against the
// student, on nothing but their choice of editor. The counts are worth showing;
// the ratio is not, and a reviewer reading two numbers will weigh them more
// carefully than one reading a percentage.

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function HackatimeAiSummary({
  telemetry,
  forReviewer = false,
}: {
  telemetry: HackatimeAiTelemetry | null;
  forReviewer?: boolean;
}) {
  if (!telemetry) {
    return (
      <p className="text-xs text-zinc-500">
        No Hackatime activity recorded for this project. Either nothing has been
        tracked yet, or Hackatime is not connected.
      </p>
    );
  }

  const { aiLines, humanLines } = telemetry;

  // Zero is a real, reportable answer and must not look like missing data. A
  // project with hours logged and no AI lines is a claim worth showing.
  if (aiLines === 0 && humanLines === 0) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <p className="text-zinc-900">No line changes recorded.</p>
        <p className="text-xs text-zinc-500">
          Hackatime tracked activity here between {telemetry.start} and{" "}
          {telemetry.end}, but no editor reported line counts. Not every editor
          plugin does.
        </p>
      </div>
    );
  }

  // Both columns can carry negatives: a transcript patch that removes more than
  // it adds is a legitimately negative delta. Bar widths need magnitudes, while
  // the printed figures stay signed and honest.
  const aiWidth = Math.abs(aiLines);
  const humanWidth = Math.abs(humanLines);
  const span = aiWidth + humanWidth;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-zinc-600">Line changes</p>
        <p className="text-zinc-900">
          {aiLines.toLocaleString()} agent / {humanLines.toLocaleString()} typed
        </p>
      </div>

      {span > 0 ? (
        <div className="flex h-2 w-full overflow-hidden rounded bg-zinc-100">
          <div
            className="bg-zinc-900"
            style={{ width: `${(100 * aiWidth) / span}%` }}
            title={`Agent: ${aiLines} lines`}
          />
          <div
            className="bg-zinc-400"
            style={{ width: `${(100 * humanWidth) / span}%` }}
            title={`Typed: ${humanLines} lines`}
          />
        </div>
      ) : null}

      {telemetry.byModel.length ? (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600">
          {telemetry.byModel.map((m) => (
            <div key={m.name}>
              <dt className="inline">{m.name} </dt>
              <dd className="inline text-zinc-900">
                {m.lines.toLocaleString()}
              </dd>
            </div>
          ))}
          {/* The gap between the model breakdown and the agent total is not an
              error and is shown rather than quietly absorbed: only the
              transcript-parsing path records which model wrote a line, so
              anything the VS Code heuristic caught arrives nameless. */}
          {telemetry.unattributedModelLines !== 0 ? (
            <div>
              <dt className="inline">model not recorded </dt>
              <dd className="inline text-zinc-900">
                {telemetry.unattributedModelLines.toLocaleString()}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {forReviewer ? (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600">
          <div>
            <dt className="inline">Tokens in </dt>
            <dd className="inline text-zinc-900">
              {compact(telemetry.inputTokens)}
            </dd>
          </div>
          <div>
            <dt className="inline">Tokens out </dt>
            <dd className="inline text-zinc-900">
              {compact(telemetry.outputTokens)}
            </dd>
          </div>
          <div>
            <dt className="inline">Active days </dt>
            <dd className="inline text-zinc-900">{telemetry.activeDays}</dd>
          </div>
        </dl>
      ) : null}

      <p className="text-xs text-zinc-500">
        Counted by Hackatime from the student&apos;s own editor, {telemetry.start}{" "}
        to {telemetry.end}.
      </p>

      {forReviewer ? (
        <p className="text-xs text-zinc-500">
          Net lines changed, not a share of the project. The typed figure comes
          only from the VS Code extension, and only when it detected real
          keystrokes in a file, so it under-reports on other editors and cannot
          be turned into a reliable AI percentage. Read it next to hours logged,
          and ask rather than conclude.
        </p>
      ) : null}
    </div>
  );
}

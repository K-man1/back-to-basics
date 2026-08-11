import type {
  AttributionRepo,
  AttributionVerification,
} from "@/lib/attribution";
import { summarise } from "@/lib/attribution";

// Shows the AI/you/unobserved split for a project's selected repositories.
//
// Two very different numbers can appear here and they must never be confused:
//
//   self-reported  a roll-up the plugin computed on the student's own machine
//                  and posted at session end. Useful, but it is a claim.
//   verified       the ledger records this server received as the work happened,
//                  reconciled against the diffs in the repo they pushed. The
//                  student can rewrite their local copy of those records; they
//                  cannot rewrite ours. This is the one a reviewer can lean on.
//
// The `unattributed` bucket only exists on verified results. It means lines
// appeared in a commit with nothing observing them being written, which has
// plenty of innocent causes (coded before `git init`, never pushed the ledger,
// used a different editor) alongside one guilty one. The copy below is
// deliberately neutral: this is a prompt to ask the student, not a verdict.

function Bar({
  segments,
}: {
  segments: { value: number; className: string; label: string }[];
}) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  if (total <= 0) return null;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded bg-zinc-100">
      {segments.map((s) =>
        s.value > 0 ? (
          <div
            key={s.label}
            className={s.className}
            style={{ width: `${(100 * s.value) / total}%` }}
            title={`${s.label}: ${s.value} lines`}
          />
        ) : null,
      )}
    </div>
  );
}

export default function AttributionSummary({
  repos,
  verifications,
  forReviewer = false,
}: {
  repos: AttributionRepo[];
  verifications?: Map<string, AttributionVerification>;
  forReviewer?: boolean;
}) {
  if (!repos.length) {
    return (
      <p className="text-xs text-zinc-500">
        No repositories linked to this project.
      </p>
    );
  }

  const summary = summarise(repos);
  const verified = (verifications
    ? repos.map((r) => verifications.get(r.id)).filter(Boolean)
    : []) as AttributionVerification[];

  const hasVerified = verified.length > 0;
  const vAdded = verified.reduce((n, v) => n + v.added, 0);
  const vAi = verified.reduce((n, v) => n + v.ai, 0);
  const vHuman = verified.reduce((n, v) => n + v.human, 0);
  const vUnattributed = verified.reduce((n, v) => n + v.unattributed, 0);
  const findings = verified.flatMap((v) => v.findings ?? []);
  const critical = findings.filter((f) => f.severity === "critical");

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <p className="text-zinc-600">
            {hasVerified ? "Verified" : "Reported as you worked"}
          </p>
          {/* Students see the band; reviewers see the band and the number
              behind it. A percentage on its own is the least trustworthy of the
              three readings, because it says nothing about how much of the
              project was actually watched. */}
          <p className="text-zinc-900">
            {hasVerified
              ? vAdded > 0
                ? `AI: ${Math.round((100 * vAi) / vAdded)}%`
                : "no lines"
              : summary.total === 0
                ? "not reported yet"
                : forReviewer
                  ? `AI: ${summary.bandLabel}` +
                    (summary.aiPercentOfObserved === null
                      ? ""
                      : ` (${summary.aiPercentOfObserved}% of ${summary.observedPercent}% tracked)`)
                  : `AI: ${summary.bandLabel}`}
          </p>
        </div>

        {hasVerified ? (
          <Bar
            segments={[
              { value: vAi, className: "bg-zinc-900", label: "AI" },
              { value: vHuman, className: "bg-zinc-400", label: "You" },
              {
                value: vUnattributed,
                className: "bg-amber-400",
                label: "Unattributed",
              },
            ]}
          />
        ) : (
          <Bar
            segments={[
              { value: summary.ai, className: "bg-zinc-900", label: "AI" },
              { value: summary.human, className: "bg-zinc-400", label: "You" },
              {
                value: summary.unobserved,
                className: "bg-zinc-200",
                label: "Unobserved",
              },
            ]}
          />
        )}
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600">
        {hasVerified ? (
          <>
            <div>
              <dt className="inline">AI </dt>
              <dd className="inline text-zinc-900">{vAi}</dd>
            </div>
            <div>
              <dt className="inline">You </dt>
              <dd className="inline text-zinc-900">{vHuman}</dd>
            </div>
            <div>
              <dt className="inline">Unattributed </dt>
              <dd className="inline text-zinc-900">{vUnattributed}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt className="inline">AI </dt>
              <dd className="inline text-zinc-900">{summary.ai}</dd>
            </div>
            <div>
              <dt className="inline">You </dt>
              <dd className="inline text-zinc-900">{summary.human}</dd>
            </div>
            <div>
              <dt className="inline">Unobserved </dt>
              <dd className="inline text-zinc-900">{summary.unobserved}</dd>
            </div>
          </>
        )}
        <div>
          <dt className="inline">Repos </dt>
          <dd className="inline text-zinc-900">{summary.repoCount}</dd>
        </div>
      </dl>

      <p className="text-xs text-zinc-500">
        {repos.map((r) => r.name).join(", ")}
      </p>

      {/* The old copy promised the numbers were "verified from GitHub" once a
          check ran. No worker performs that check yet, and most repos arrive
          with remote = null because they are not git repositories at all, so
          the sentence described something that could not happen. What is
          actually true is worth more: records reach this server as each edit
          lands, before a student has any reason to want them different. */}
      <p className="text-xs text-zinc-500">
        {hasVerified
          ? "Reconciled against the commits in this repository."
          : forReviewer
            ? "Each edit was streamed here as it happened, so these records cannot be revised after the fact. The percentages are computed on the student's machine. Not cross-checked against commit history."
            : "Reported by the plugin on your machine as you work."}
      </p>

      {forReviewer && !hasVerified && summary.band === "unknown" && summary.total > 0 ? (
        <p className="text-xs text-zinc-500">
          Only {summary.observedPercent}% of this project was tracked, which is
          too little to characterise. Usually means the plugin was installed
          after the work started.
        </p>
      ) : null}

      {forReviewer && critical.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-amber-700">
          {critical.map((f, i) => (
            <li key={i}>{f.message}</li>
          ))}
        </ul>
      ) : null}

      {forReviewer && hasVerified && vUnattributed > 0 ? (
        <p className="text-xs text-zinc-500">
          &quot;Unattributed&quot; means lines appeared in a commit without the
          plugin observing them being written. Coding before{" "}
          <code>git init</code>, not pushing the ledger, or working in another
          editor all cause it. Worth asking about, not a conclusion.
        </p>
      ) : null}
    </div>
  );
}

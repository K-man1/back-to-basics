import {
  AXES,
  LEVEL_MAX,
  SCORING_RULES,
  WORKED_EXAMPLES,
} from "@/lib/rubric";

const LEVELS = Array.from({ length: LEVEL_MAX + 1 }, (_, i) => i);

// The whole rubric, rendered from src/lib/rubric.ts. Shown to reviewers while
// they grade and to students before they write, on purpose: a rubric argued
// over after the fact is a rubric nobody trusts.
export default function RubricTable({
  showExamples = true,
}: {
  showExamples?: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="text-sm font-semibold text-zinc-900">
          The levels at a glance
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Three axes, scored 0–{LEVEL_MAX} each. The entry&apos;s level is the{" "}
          <span className="text-zinc-900">lowest</span> of the three.
        </p>
        {/* Wide table on a narrow phone: scroll the table, not the page. */}
        <div className="mt-3 overflow-x-auto border border-zinc-200 bg-white">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                <th className="w-14 p-3 font-normal">Level</th>
                {AXES.map((axis) => (
                  <th key={axis.key} className="p-3 font-normal">
                    {axis.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((level) => (
                <tr
                  key={level}
                  className="border-b border-zinc-100 last:border-0 align-top"
                >
                  <td className="p-3 text-zinc-400">{level}</td>
                  {AXES.map((axis) => (
                    <td key={axis.key} className="p-3 text-zinc-700">
                      {axis.levels[level]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">
          The gates, answered in order
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Walk each ladder from the top and stop at the first &quot;no&quot; —
          that&apos;s the level for that axis.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {AXES.map((axis) => (
            <div key={axis.key} className="border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 p-4">
                <p className="text-sm text-zinc-900">{axis.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{axis.measures}</p>
              </div>
              <div className="flex flex-col divide-y divide-zinc-100">
                {axis.gates.map((gate) => (
                  <div key={gate.n} className="p-4">
                    <p className="text-sm text-zinc-700">
                      <span className="text-zinc-400">Gate {gate.n} — </span>
                      {gate.question}
                    </p>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-zinc-500">
                      <p>
                        <span className="text-zinc-400">No →</span> {gate.no}
                      </p>
                      <p>
                        <span className="text-zinc-400">Yes →</span> {gate.yes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">
          How the three combine
        </h3>
        <div className="mt-3 flex flex-col divide-y divide-zinc-200 border border-zinc-200 bg-white">
          {SCORING_RULES.map((rule) => (
            <div key={rule.title} className="p-4">
              <p className="text-sm text-zinc-900">{rule.title}</p>
              <p className="mt-0.5 text-sm text-zinc-700">{rule.body}</p>
            </div>
          ))}
        </div>
      </section>

      {showExamples ? (
        <section>
          <h3 className="text-sm font-semibold text-zinc-900">
            Worked examples
          </h3>
          <div className="mt-3 flex flex-col divide-y divide-zinc-200 border border-zinc-200 bg-white">
            {WORKED_EXAMPLES.map((example) => (
              <div key={example.setup} className="p-4">
                <p className="text-sm text-zinc-700">{example.setup}</p>
                <p className="mt-1 text-sm text-zinc-900">{example.verdict}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

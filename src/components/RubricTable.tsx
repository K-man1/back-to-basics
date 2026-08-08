import { AXES, LEVEL_MAX } from "@/lib/rubric";

const LEVELS = Array.from({ length: LEVEL_MAX + 1 }, (_, i) => i);

// The rubric at a glance, rendered from src/lib/rubric.ts. Shown to reviewers
// while they grade and to students before they write, on purpose: a rubric
// argued over after the fact is a rubric nobody trusts.
export default function RubricTable() {
  return (
    <section>
      
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
  );
}

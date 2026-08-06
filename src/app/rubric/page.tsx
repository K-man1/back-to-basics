import Link from "next/link";
import RubricTable from "@/components/RubricTable";
import { LEVEL_MAX } from "@/lib/rubric";
import { BASE_RATE, QUALITY_RATE, HOURS_PER_ENTRY } from "@/lib/currency";

export const metadata = {
  title: "Grading rubric — Back to Basics",
  description: "Exactly how journal entries are graded, published up front.",
};

// Public on purpose. A student who can read the rubric before they write is a
// student who doesn't have to argue about it afterwards — and reviewers get a
// fixed thing to quote instead of defending a gut call.
export default function RubricPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900">
        ← Back to Basics
      </Link>
      <h1 className="mt-4 text-2xl tracking-tight text-zinc-900">
        How journal entries are graded
      </h1>
      <p className="mt-3 max-w-xl text-sm text-zinc-600">
        Every entry is scored on three axes —{" "}
        <span className="text-zinc-900">Depth of Topic</span>,{" "}
        <span className="text-zinc-900">Explanation</span> and{" "}
        <span className="text-zinc-900">Proof</span>
        {" — "}and each one is a ladder
        of yes/no gates, not a vibe. A reviewer answers the gates in order and
        stops at the first &quot;no&quot;. Your entry&apos;s level is the{" "}
        <span className="text-zinc-900">lowest</span> of the three, so no axis
        can carry another.
      </p>
      <p className="mt-3 max-w-xl text-sm text-zinc-600">
        Depth is measured against the goal you were working toward, not against
        the size of your project or the name of the construct. The same
        if-statement can be Level 1 in a machine learning pipeline and Level 3
        in a to-do app — what counts is how much the goal already handed you.
      </p>

      <div className="mt-10">
        <RubricTable />
      </div>

      <section className="mt-10">
        <h3 className="text-sm font-semibold text-zinc-900">
          How levels turn into coins
        </h3>
        <p className="mt-2 max-w-xl text-sm text-zinc-600">
          Your average entry level, out of {LEVEL_MAX}, sets your hourly rate —{" "}
          <span className="text-zinc-900">{BASE_RATE}</span> coins an hour at
          level 0, plus <span className="text-zinc-900">{QUALITY_RATE}</span>{" "}
          for every level above it. That rate is multiplied by your hours and
          your entry count together, so aim for one entry per ~
          {HOURS_PER_ENTRY}h session: hours no entry covers still count, but at
          a discount, and ungraded entries are worth nothing until the review
          pass.
        </p>
        <p className="mt-3 max-w-xl text-sm text-zinc-600">
          <Link href="/coins" className="text-zinc-900 underline">
            The full formula and a calculator are here
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

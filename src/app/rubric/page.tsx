import Link from "next/link";
import RubricTable from "@/components/RubricTable";
import CoinCalculator from "@/components/CoinCalculator";

export const metadata = {
  title: "Grading rubric and coin calculator — Back to Basics",
  description:
    "Exactly how journal entries are graded, plus an estimate of what a project can earn.",
};

// Public on purpose. A student who can read the rubric and reward formula before
// they write is a student who doesn't have to argue about it afterwards.
export default function RubricPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900">
        ← Back to Basics
      </Link>
      <h1 className="mt-4 text-2xl tracking-tight text-zinc-900">
        Grading rubric and coin calculator
      </h1>

      <div className="mt-10">
        <section>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            How journal entries are graded
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            The rubric is published up front so students and reviewers share the
            same expectations.
          </p>

          <div className="mt-6">
            <RubricTable />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            How coins are calculated
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Estimate reward totals using the same formula the dashboard uses.
          </p>

          <div className="mt-8">
            <CoinCalculator />
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import CoinCalculator from "@/components/CoinCalculator";
import { LEVEL_MAX } from "@/lib/rubric";
import {
  BASE_RATE,
  QUALITY_RATE,
  ENTRIES_PER_HOUR_CAP,
  HOURS_PER_ENTRY,
  coinsPerHour,
} from "@/lib/currency";

export const metadata = {
  title: "How coins are calculated — Back to Basics",
  description:
    "The exact coin formula, plus a calculator that runs the same code the dashboard does.",
};

const MAX_RATE = coinsPerHour([LEVEL_MAX]);

// Public on purpose, same reasoning as /rubric: a student who can see the
// formula before they start doesn't have to argue about the number afterwards.
export default function CoinsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900">
        ← Back to Basics
      </Link>
      <h1 className="mt-4 text-2xl tracking-tight text-zinc-900">
        How coins are calculated
      </h1>
      <p className="mt-3 max-w-xl text-sm text-zinc-600">
        Coins come from two things: hours you actually coded (from Hackatime)
        and journal entries a reviewer has graded. They&apos;re{" "}
        <span className="text-zinc-900">multiplied, not added</span> — so hours
        with no journals pay nothing, journals with no hours pay nothing, and
        your total tracks whichever of the two you have less of.
      </p>

      <pre className="mt-6 overflow-x-auto rounded border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-700">
        {`rate    = ${BASE_RATE} + ${QUALITY_RATE} × quality        quality = average entry level, 0–${LEVEL_MAX}
entries = journals, damped above ${ENTRIES_PER_HOUR_CAP}/hour
coins   = rate × √(2 × hours × entries)`}
      </pre>

      <div className="mt-8">
        <CoinCalculator />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        This runs the same function the dashboard does, so the estimate is the
        real number.
      </p>

      <section className="mt-12 flex flex-col gap-8">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Quality sets your rate
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Every graded entry gets a level from 0 to {LEVEL_MAX} — the{" "}
            <span className="text-zinc-900">lowest</span> of its three rubric
            axes, so a great write-up on a trivial topic doesn&apos;t buy
            credit. Your rate is the average of those levels: {BASE_RATE} coins
            an hour at level 0, {MAX_RATE.toFixed(2)} at level {LEVEL_MAX}.
          </p>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            It&apos;s an average, not a sum. One thin entry pulls every other
            entry&apos;s rate down with it, which is why padding the count is
            self-defeating.{" "}
            <Link href="/rubric" className="text-zinc-900 underline">
              The full rubric is published here
            </Link>
            .
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            One entry per {HOURS_PER_ENTRY} hours is the cadence
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Hold that ratio and the square root collapses to exactly your hours:
            √(2 × H × H/{HOURS_PER_ENTRY}) = H. So at the intended cadence,
            coins are simply your rate times your hours — a 100-hour project
            pays five times a 20-hour one, and splitting one project into five
            gains you nothing.
          </p>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Journal less often than that and the square root bites: the hours
            nothing was written about still count, but at a discount. Journal
            more often and you climb above your hours.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Above {ENTRIES_PER_HOUR_CAP} entry per hour, extras are damped
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Nobody learns something genuinely new every twenty minutes. Past one
            entry per hour coded, additional entries count as √(excess) rather
            than one each — 40 hours with 140 entries counts as 50, not 140.
            It&apos;s a curve rather than a cutoff, so an honestly prolific
            journaler still gains; a spammer just doesn&apos;t gain much.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            What doesn&apos;t affect your coins
          </h2>
          <ul className="mt-2 flex max-w-xl list-disc flex-col gap-2 pl-5 text-sm text-zinc-600">
            <li>
              <span className="text-zinc-900">Ungraded entries.</span> Grading
              happens in one review pass. Until a reviewer scores an entry it
              counts as neither hours coverage nor quality.
            </li>
            <li>
              <span className="text-zinc-900">
                How impressive the project is.
              </span>{" "}
              There&apos;s no difficulty multiplier. Difficulty already lives
              inside the Depth axis, measured against the goal you set — so the
              same if-statement can be Level 1 in an ML pipeline and Level 3 in
              a to-do app.
            </li>
            <li>
              <span className="text-zinc-900">Lines of code, or shipping.</span>{" "}
              Approval gates whether a project&apos;s coins count at all, but it
              doesn&apos;t change the number.
            </li>
          </ul>
          <p className="mt-4 max-w-xl text-sm text-zinc-600">
            Reviewers can apply a manual adjustment on top, up or down, and have
            to leave a reason for it. That&apos;s the escape hatch for anything
            the formula gets wrong — not a routine part of scoring.
          </p>
        </div>
      </section>

      <p className="mt-10 text-xs text-zinc-500">
        The weighting can still move before launch. If it does, this page and
        the dashboard change together — they read the same constants.
      </p>
    </main>
  );
}

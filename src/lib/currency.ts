import { LEVEL_MAX } from "@/lib/rubric";

// Coins — the program currency. Two inputs, multiplied, not added:
//
//   rate    = BASE_RATE + QUALITY_RATE * quality        (quality = avg entry level, 0..LEVEL_MAX)
//   coins   = rate * sqrt(2 * hours * effectiveEntries)
//
// The geometric mean (that sqrt of a product) is the whole point. Hours alone
// earn nothing and journals alone earn nothing — you need both, and the payout
// tracks whichever one you have less of. Adding the two terms instead would let
// a grinder with no journals, or a journal-spammer with no hours, still cash out.
//
// Keep one journal per two hours and the sqrt collapses to exactly `hours`:
// sqrt(2 * H * H/2) = H. That's the intended cadence, and it makes coins linear
// in hours for anyone holding it — no penalty for long projects, no bonus for
// splitting one project into five.
//
// Difficulty doesn't get its own multiplier: an entry's level is already
// MIN(depth, explanation, proof), so a trivial topic caps the entry at the
// source. Anything that scales rewards by how hard the thing was belongs in
// Depth's gates, not in this file.

/** Coins per hour at quality 0 — the rate for graded-but-worthless journaling. */
export const BASE_RATE = 0.3;
/** Added to the rate per level of average quality. At LEVEL_MAX: 0.3 + 1.05 = 1.35. */
export const QUALITY_RATE = 0.35;
/** Above this many entries per hour, extra entries are sqrt-damped. */
export const ENTRIES_PER_HOUR_CAP = 1;
/** One entry per this many hours makes coins exactly linear in hours. */
export const HOURS_PER_ENTRY = 2;

// Average entry level, 0..LEVEL_MAX. An average (not a sum) so spamming
// mediocre entries drags the rate down instead of stacking it up.
export function quality(levels: number[]): number {
  if (!levels.length) return 0;
  return levels.reduce((s, l) => s + l, 0) / levels.length;
}

export function coinsPerHour(levels: number[]): number {
  return BASE_RATE + QUALITY_RATE * quality(levels);
}

// Past one entry per hour, further entries count as sqrt(excess) instead of 1
// each. Nobody genuinely learns something new every twenty minutes, so beyond
// the cadence the curve flattens hard rather than cutting off — an honest
// heavy journaler still gains, a spammer gains almost nothing.
export function effectiveEntries(hours: number, count: number): number {
  const threshold = hours * ENTRIES_PER_HOUR_CAP;
  if (count <= threshold) return count;
  return threshold + Math.sqrt(count - threshold);
}

// Raw (unrounded) coins for a project. Ungraded entries never reach this — only
// reviewer-graded levels count, so pre-review a student sits at zero.
export function computeCoins(
  secondsCoded: number,
  levels: number[],
  reviewAdjustment: number = 0,
): number {
  const hours = Math.max(0, secondsCoded) / 3600;
  const n = effectiveEntries(hours, levels.length);
  return coinsPerHour(levels) * Math.sqrt(2 * hours * n) + reviewAdjustment;
}

// The ceiling for the entries a student has actually written — every one of
// them coming back at the top level. Shown next to the earned number while
// entries are still awaiting review.
export function bestCaseCoins(
  secondsCoded: number,
  entryCount: number,
): number {
  return computeCoins(
    secondsCoded,
    Array.from({ length: entryCount }, () => LEVEL_MAX),
  );
}

/** Whole coins, for anything that's an actual balance rather than an estimate. */
export function awardedCoins(
  secondsCoded: number,
  levels: number[],
  reviewAdjustment: number = 0,
): number {
  return Math.round(computeCoins(secondsCoded, levels, reviewAdjustment));
}

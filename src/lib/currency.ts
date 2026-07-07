// Placeholder currency — the name isn't decided yet ("points" is a stand-in).
// Hours coded (from Hackatime) set the scale (~1 point ≈ 1 hour ≈ $5). The
// quality of reviewer-graded journal entries sets the effective hourly rate,
// and coverage (roughly one entry per work session) gates how much of that
// quality counts. Grading happens in one review pass, so ungraded entries are
// worth nothing yet — pre-review, a student sits at the floor.

export const FLOOR = 0.4; // grinder rate: hours with no demonstrated learning
export const CAP = 1.5; // learner ceiling: avg grade 5 with full coverage
export const GRADE_MAX = 5; // reviewers grade each journal entry 0-5
export const HOURS_PER_ENTRY = 5; // full coverage ≈ one entry per ~5h session

// quality: average grade, normalized to 0..1. An average (not a sum) so
// spamming mediocre entries drags the rate down instead of stacking it up.
function quality(grades: number[]): number {
  if (!grades.length) return 0;
  const avg = grades.reduce((s, g) => s + g, 0) / grades.length;
  return avg / GRADE_MAX;
}

// coverage: graded entries vs the ~one-per-session pace, capped at 1. Stops a
// single brilliant entry from multiplying a whole project's hours by itself.
function coverage(hours: number, entryCount: number): number {
  const expected = Math.max(1, hours / HOURS_PER_ENTRY);
  return Math.min(1, entryCount / expected);
}

// rate  = FLOOR + (CAP - FLOOR) * quality * coverage
// total = rate * hours + reviewer adjustment
// Both quality and coverage must be high to earn the premium: quality alone is
// cherry-picking, coverage alone is spam, and either one at zero pays the floor.
export function computePoints(
  secondsCoded: number,
  grades: number[],
  reviewAdjustment: number = 0,
): number {
  const hours = secondsCoded / 3600;
  const rate =
    FLOOR + (CAP - FLOOR) * quality(grades) * coverage(hours, grades.length);
  return Math.round(rate * hours) + reviewAdjustment;
}

// Floor/cap bounds for the same hours — the dashboard shows this as a range
// ("X guaranteed, up to Y pending review") while entries are ungraded.
export function pointsRange(secondsCoded: number): {
  floor: number;
  cap: number;
} {
  const hours = secondsCoded / 3600;
  return { floor: Math.round(FLOOR * hours), cap: Math.round(CAP * hours) };
}

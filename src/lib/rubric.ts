// The grading rubric, in one place, so the reviewer form, the student's
// project page and the public /rubric page can never drift apart.
//
// Three axes, each scored by a single ladder of gates answered in order: stop
// at the first "no", and that's the level. Because a gate is only reached once
// the previous one passes, an entry can never satisfy two levels on the same
// axis — that's what makes the score reproducible between reviewers.
//
// The entry's level is the MIN of the three, not the average (see entryLevel).

export const LEVEL_MAX = 3;

export interface Gate {
  n: number;
  question: string;
  /** What a "no" answer settles on. */
  no: string;
  /** What a "yes" answer settles on. */
  yes: string;
}

export interface RubricAxis {
  key: "depth" | "explanation" | "proof";
  name: string;
  /** One line: what this axis measures. */
  measures: string;
  /** Indexed by level 0..LEVEL_MAX — the short form used in the matrix. */
  levels: string[];
  gates: Gate[];
}

export const AXES: RubricAxis[] = [
  {
    key: "depth",
    name: "Depth of Topic",
    measures:
      "How big the reasoning gap was for this specific goal — not the construct's name, and not how complex the surrounding project is.",
    levels: [
      "No real logic — renaming, formatting, or copy/paste.",
      "Real logic, but the correct code was a direct, obvious translation of the stated goal.",
      "Something had to be worked out that the goal didn't hand over.",
      "Goes beyond what the goal asked for.",
    ],
    gates: [
      {
        n: 1,
        question:
          "Is there at least some real logic here (more than renaming, formatting, or copy/paste)?",
        no: "Level 0",
        yes: "Gate 2",
      },
      {
        n: 2,
        question:
          "To get this correct, did the student have to reason out something the stated goal didn't hand them directly — which specific condition(s) actually satisfy the requirement, correct handling of state/mutability, an algorithmic property, correct non-trivial library semantics — rather than translating an already-obvious instruction straight into code?",
        no: "Level 1 — the correct code was a direct translation of the goal, nothing to figure out",
        yes: "Gate 3",
      },
      {
        n: 3,
        question:
          "Does this go beyond what the stated goal asked for — an edge case not mentioned, a performance concern beyond correctness, or two non-trivial concepts combined where either alone would have sufficed?",
        no: "Level 2",
        yes: "Level 3",
      },
    ],
  },
  {
    key: "explanation",
    name: "Explanation",
    measures:
      "Whether the entry gives a reason that belongs to this entry and could not be pasted onto any other one.",
    levels: [
      "Only lists what happened, no reason.",
      "Gives a reason, but generic or unsupported.",
      "Reason is specific to this entry — a named function, variable, error, or constraint.",
      "Also names a rejected alternative, an edge case, or a specific mistake and its fix.",
    ],
    gates: [
      {
        n: 1,
        question:
          "Does the entry give any reason at all, or does it only list what happened?",
        no: "Level 0 — only lists actions",
        yes: "Gate 2",
      },
      {
        n: 2,
        question:
          "Is the reason specific to this entry — tied to a named function, variable, error, or constraint — rather than generic enough to paste onto any entry unchanged?",
        no: "Level 1 — generic or unsupported",
        yes: "Gate 3 — the reason is classifiable as mechanism / constraint / requirement / tradeoff",
      },
      {
        n: 3,
        question:
          "Does the entry additionally, explicitly name one of: a rejected alternative and why; a specific edge case the reasoning had to handle; a specific mistake, what was wrong, and how it was fixed?",
        no: "Level 2",
        yes: "Level 3",
      },
    ],
  },
  {
    key: "proof",
    name: "Proof",
    measures:
      "Whether the evidence points at this specific claim, not just at the repo in general.",
    levels: [
      "No evidence, or the evidence contradicts the claim (fraud flag).",
      "Evidence exists, but doesn't point at this claim.",
      "At least one piece of evidence points at this claim specifically.",
      "A second, independent evidence type backs the same claim.",
    ],
    gates: [
      {
        n: 1,
        question: "Is there any evidence, and does it not contradict the claim?",
        no: "Level 0 — and raise a fraud flag if it contradicts",
        yes: "Gate 2",
      },
      {
        n: 2,
        question:
          "Does at least one piece of evidence specifically point at this claim — a commit/PR link containing the change, a specific diff line, matching function/variable names between journal and diff, or a quoted test/error output — rather than just existing somewhere in the repo?",
        no: "Level 1",
        yes: "Gate 3",
      },
      {
        n: 3,
        question:
          "Does a second, independent evidence type from that list also back the same claim?",
        no: "Level 2",
        yes: "Level 3",
      },
    ],
  },
];

export const SCORING_RULES: { title: string; body: string }[] = [
  {
    title: "Answer the gates in order, stop at the first no",
    body: "Each axis is one ladder, not a menu. A gate is only reached once the previous one passes, so an entry can never sit at two levels of the same axis and two reviewers walking the same ladder land in the same place.",
  },
  {
    title: "The entry level is the MIN of the three axes, not the average",
    body: "A trivial-topic entry is capped by its Depth score no matter how well it is explained or proven. That is what stops volume-gaming: quality write-ups on dumb topics can't buy back credit, and a deep topic written as \"added memoization\" can't either.",
  },
  {
    title: "Fraud check overrides everything",
    body: "If the proof contradicts the claim, Proof = 0, and by MIN the whole entry is 0.",
  },
  {
    title: "Depth tracks the gap, not the topic",
    body: "The same syntax can land at different depths. An if-statement can be Level 1 in a complex ML pipeline and Level 3 in a to-do app — what matters is how much the stated goal already handed over.",
  },
];

export const WORKED_EXAMPLES: { setup: string; verdict: string }[] = [
  {
    setup:
      "An if-statement branching training vs eval mode inside a complex ML pipeline, goal: \"branch training vs eval mode\". The condition is handed over by the goal itself, nothing to reason out (Gate 2 = no).",
    verdict:
      "Depth 1, regardless of how sophisticated the surrounding model is.",
  },
  {
    setup:
      "An if-statement preventing a task from being marked done twice in a simple to-do app, goal: \"prevent marking a task done twice\". What actually counts as \"already done\" — a flag check? a timestamp comparison? a race on rapid double-clicks? — isn't handed over (Gate 2 = yes).",
    verdict:
      "Can reach Depth 2 or 3, in a project far simpler than the ML pipeline above.",
  },
  {
    setup:
      "Deep topic, weak write-up: Depth 3, but the journal just says \"added memoization\" — no reason, no evidence.",
    verdict: "Explanation 0, Proof 0 → MIN(3, 0, 0) = 0.",
  },
  {
    setup: "Trivial topic, great write-up: Depth 0, beautifully explained and proven.",
    verdict: "MIN(0, 3, 3) = 0.",
  },
];

export interface AxisScores {
  depth: number;
  explanation: number;
  proof: number;
}

// The entry's level: the weakest axis carries the whole entry. Neither
// direction lets one axis buy back another.
export function entryLevel(scores: AxisScores): number {
  return Math.min(scores.depth, scores.explanation, scores.proof);
}

export function isValidLevel(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= LEVEL_MAX;
}

// "D2 · E3 · P1 → 1/3" — the compact form on entry cards, so a student can see
// which axis capped them without opening anything.
export function scoreBreakdown(scores: AxisScores): string {
  return `D${scores.depth} · E${scores.explanation} · P${scores.proof} → ${entryLevel(scores)}/${LEVEL_MAX}`;
}

// The axis (or axes) that set the entry's level — what the student has to fix.
export function limitingAxes(scores: AxisScores): RubricAxis[] {
  const level = entryLevel(scores);
  return AXES.filter((axis) => scores[axis.key] === level);
}

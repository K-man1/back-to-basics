"use client";

import { useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Build",
    body: "Create a polished software project with any tools while tracking your time with Hackatime.",
  },
  {
    n: "02",
    title: "Journal",
    body: "Journal what you learn as you build while referencing code you wrote.",
  },
  {
    n: "03",
    title: "Get Reviewed",
    body: "Reviewers grade the time spent coding and learning, and reward points based off of that.",
  },
  {
    n: "04",
    title: "Earn Prizes",
    body: "Use your points to buy stuff in the shop, like 3D printers, Raspberry Pi's and so much more!",
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <div className="mt-10 grid gap-px overflow-hidden rounded border border-zinc-200 bg-zinc-200 sm:grid-cols-[minmax(0,240px)_1fr]">
      {/* Step rail */}
      <div className="grid grid-cols-2 gap-px bg-zinc-200 sm:grid-cols-1">
        {STEPS.map((step, i) => (
          <button
            key={step.n}
            type="button"
            onClick={() => setActive(i)}
            aria-current={i === active}
            className={`flex items-center gap-3 px-5 py-4 text-left text-sm transition-colors ${
              i === active
                ? "bg-white text-zinc-900"
                : "bg-white/60 text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <span
              className={i === active ? "text-zinc-900" : "text-zinc-300"}
            >
              {i + 1}
            </span>
            <span className={i === active ? "font-bold" : ""}>
              {step.title}
            </span>
          </button>
        ))}
      </div>

      {/* Active panel */}
      <div className="flex min-h-[180px] flex-col justify-center bg-white p-8">
        <h3 className="text-xl font-bold text-zinc-900">
          {STEPS[active].title}
        </h3>
        <p className="mt-3 max-w-md text-sm leading-7 text-zinc-600">
          {STEPS[active].body}
        </p>
      </div>
    </div>
  );
}

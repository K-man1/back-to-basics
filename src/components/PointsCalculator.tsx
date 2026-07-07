"use client";

import { useState } from "react";
import {
  computePoints,
  pointsRange,
  GRADE_MAX,
  HOURS_PER_ENTRY,
} from "@/lib/currency";

// Interactive estimator for the placeholder points formula. Uses the exact same
// computePoints() the dashboard does, so the number here matches what a student
// would actually earn for the given hours / journal quality / coverage.
export default function PointsCalculator() {
  const [hours, setHours] = useState(40);
  const [grade, setGrade] = useState(4);
  const [entries, setEntries] = useState(8);

  const seconds = hours * 3600;
  // The formula takes per-entry grades; a calculator only has an average, so
  // model it as `entries` entries all at the chosen average grade.
  const grades = Array.from({ length: entries }, () => grade);
  const points = computePoints(seconds, grades);
  const { floor, cap } = pointsRange(seconds);

  // Full coverage ≈ one entry per work session; show the target so students
  // know how many entries stop under-counting their hours.
  const targetEntries = Math.max(1, Math.ceil(hours / HOURS_PER_ENTRY));

  return (
    <div className="rounded border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-5">
        <Field
          label="Hours coded"
          value={`${hours}h`}
          min={0}
          max={200}
          step={1}
          current={hours}
          onChange={setHours}
        />
        <Field
          label="Average journal grade"
          value={`${grade} / ${GRADE_MAX}`}
          min={0}
          max={GRADE_MAX}
          step={0.5}
          current={grade}
          onChange={setGrade}
        />
        <div>
          <Field
            label="Journal entries"
            value={`${entries}`}
            min={0}
            max={50}
            step={1}
            current={entries}
            onChange={setEntries}
          />
          <p className="mt-1 text-xs text-zinc-400">
            Aim for ~{targetEntries} to fully cover {hours}h.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-zinc-200 pt-5">
        <div>
          <p className="text-4xl text-zinc-900">{points}</p>
          <p className="mt-1 text-xs text-zinc-500">estimated points</p>
        </div>
        <p className="text-right text-xs text-zinc-400">
          floor {floor} · cap {cap}
          <br />
          for {hours}h
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm text-zinc-700">
        {label}
        <span className="text-zinc-900">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-zinc-900"
      />
    </label>
  );
}

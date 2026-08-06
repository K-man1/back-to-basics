"use client";

import { useState } from "react";
import {
  computeCoins,
  coinsPerHour,
  effectiveEntries,
  ENTRIES_PER_HOUR_CAP,
  HOURS_PER_ENTRY,
} from "@/lib/currency";
import { LEVEL_MAX } from "@/lib/rubric";

// Interactive estimator for the coin formula. Uses the exact same computeCoins()
// the dashboard does, so the number here is what a student would actually earn
// for those hours / journal quality / entry count.
export default function CoinCalculator() {
  const [hours, setHours] = useState(40);
  const [level, setLevel] = useState(2);
  const [entries, setEntries] = useState(20);

  // The formula takes a level per entry; a calculator only has an average, so
  // model it as `entries` entries all sitting at the chosen average level.
  const levels = Array.from({ length: entries }, () => level);
  const coins = computeCoins(hours * 3600, levels);

  const rate = coinsPerHour(levels);
  const threshold = hours * ENTRIES_PER_HOUR_CAP;
  const effective = effectiveEntries(hours, entries);
  const damped = entries > threshold;

  // The cadence that makes coins exactly linear in hours: sqrt(2·H·H/2) = H.
  const targetEntries = Math.max(1, Math.round(hours / HOURS_PER_ENTRY));

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
        <div>
          <Field
            label="Average entry level"
            value={level.toFixed(1)}
            min={0}
            max={LEVEL_MAX}
            step={0.1}
            current={level}
            onChange={setLevel}
          />
          <p className="mt-1 text-xs text-zinc-400">
            The lowest of an entry&apos;s three rubric axes, averaged over your
            graded entries. Sets your rate: {rate.toFixed(2)} coins/hr.
          </p>
        </div>
        <div>
          <Field
            label="Journal entries"
            value={`${entries}`}
            min={0}
            max={200}
            step={1}
            current={entries}
            onChange={setEntries}
          />
          <p className="mt-1 text-xs text-zinc-400">
            {entries === 0
              ? "No entries means no coins, however many hours you put in."
              : hours === 0
                ? "No hours means no coins, however much you journal."
                : damped
                  ? `Past ${threshold.toFixed(0)} entries (1/hr) the extras are damped — these ${entries} count as ${effective.toFixed(1)}.`
                  : `~${targetEntries} entries is the cadence where coins go linear in hours.`}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-zinc-200 pt-5">
        <div>
          <p className="text-4xl text-zinc-900">{coins.toFixed(2)}</p>
          <p className="mt-1 text-xs text-zinc-500">estimated coins</p>
        </div>
        <p className="text-right text-xs text-zinc-400">
          {rate.toFixed(2)} coins/hr × √(2 × {hours} × {effective.toFixed(1)})
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

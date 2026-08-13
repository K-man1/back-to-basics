"use client";

import { useEffect, useState } from "react";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diff = Math.max(0, now - then);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE);
    return `${mins} min${mins === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(diff / DAY);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatRelativeTime(iso));

  useEffect(() => {
    setLabel(formatRelativeTime(iso));
    const id = setInterval(() => setLabel(formatRelativeTime(iso)), MINUTE);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()}>
      {label}
    </time>
  );
}

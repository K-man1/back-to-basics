"use client";

import { useEffect, useRef, useState } from "react";

const CELL_SIZE = 28;
const FADE_MS = 650;

export default function GridBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ cols: 0, rows: 0 });
  const [active, setActive] = useState<Set<number>>(new Set());
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const ticking = useRef(false);

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      setDims({
        cols: Math.ceil(el.offsetWidth / CELL_SIZE),
        rows: Math.ceil(el.offsetHeight / CELL_SIZE),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const total = dims.cols * dims.rows;
    if (total === 0) return;

    const flipRandomCells = () => {
      const count = 2 + Math.floor(Math.random() * 4);
      setActive((prev) => {
        const next = new Set(prev);
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * total);
          next.add(idx);
          const existing = timers.current.get(idx);
          if (existing) clearTimeout(existing);
          const t = setTimeout(() => {
            setActive((s) => {
              const copy = new Set(s);
              copy.delete(idx);
              return copy;
            });
            timers.current.delete(idx);
          }, FADE_MS + Math.random() * 500);
          timers.current.set(idx, t);
        }
        return next;
      });
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        flipRandomCells();
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dims]);

  useEffect(() => {
    return () => {
      // Intentionally reading the live ref here, not a snapshot — timers
      // keep getting added for the component's whole lifetime.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div
        className="grid h-full w-full"
        style={{ gridTemplateColumns: `repeat(${dims.cols}, ${CELL_SIZE}px)` }}
      >
        {Array.from({ length: dims.cols * dims.rows }).map((_, i) => (
          <div
            key={i}
            className="transition-opacity ease-out"
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              transitionDuration: `${FADE_MS}ms`,
              opacity: active.has(i) ? 0.06 : 0,
              backgroundColor: "#000",
            }}
          />
        ))}
      </div>
    </div>
  );
}

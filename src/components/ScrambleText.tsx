"use client";

import { useEffect, useRef, useState } from "react";

// Glyphs the text churns through before resolving. Kept to code-ish symbols so
// the "decoding" motif reads as terminal noise settling into real words.
const GLYPHS = "!<>-_\\/[]{}=+*^?#abcdef0123456789";

type Slot = { to: string; start: number; end: number; char: string };

/**
 * Renders `text` as if it's being decoded from random glyphs. Relies on the
 * monospace font so every glyph is the same width — no layout shift while it
 * churns. Respects prefers-reduced-motion.
 */
export default function ScrambleText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [output, setOutput] = useState(text);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setOutput(text);
      return;
    }

    const slots: Slot[] = Array.from(text, (to) => {
      const start = Math.floor(Math.random() * 24);
      return { to, start, end: start + 12 + Math.floor(Math.random() * 28), char: "" };
    });

    let frame = 0;
    const tick = () => {
      let out = "";
      let done = 0;
      for (const s of slots) {
        if (frame >= s.end || s.to === " ") {
          done++;
          out += s.to;
        } else if (frame >= s.start) {
          if (!s.char || Math.random() < 0.3) {
            s.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          out += s.char;
        } else {
          out += " ";
        }
      }
      setOutput(out);
      if (done < slots.length) {
        frame++;
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    setOutput("");
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [text]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{output}</span>
    </span>
  );
}

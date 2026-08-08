"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";

// The <html data-theme> attribute is the single source of truth — the script
// above sets it before React exists, so React reads it rather than owning it.
// useSyncExternalStore is what lets a Client Component read live DOM state
// without a hydration mismatch: it renders the server snapshot during
// hydration, then swaps to the real one.
function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  // Someone who has never pressed the button still tracks their OS flipping
  // at sunset; an explicit choice wins until they clear it.
  const onSystemChange = () => {
    if (!localStorage.getItem(THEME_KEY)) {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    }
    onStoreChange();
  };

  media.addEventListener("change", onSystemChange);
  window.addEventListener("themechange", onStoreChange);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("themechange", onStoreChange);
  };
}

const getSnapshot = () =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

// Matches the `data-theme="light"` the server renders on <html>.
const getServerSnapshot = () => "light" as const;

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          // Private mode with storage blocked: the theme still switches, it
          // just won't survive a reload.
        }
        window.dispatchEvent(new Event("themechange"));
      }}
      className="mt-2 w-fit rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
    >
      Switch to {next} mode
    </button>
  );
}

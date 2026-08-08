// Shared by the root layout (a Server Component) and ThemeToggle (a Client
// Component), so it lives outside both — every export of a "use client" module
// becomes a client reference, which a server-rendered <script> can't inline.

export const THEME_KEY = "theme";

// Runs in <head> before first paint, so the page never flashes the wrong
// palette. No saved choice means follow the OS.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

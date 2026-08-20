These are the requirements for the demo link. 

*~~Copied from~~ Inspired by [Macondo Docs](https://macondo.hackclub.com/docs/submitting-design#software-ships-a-playable-link)*

Drop in the **deployed link** so a reviewer can click it and play with your project in their browser. If your project genuinely isn't deployable (a CLI, a desktop app, a script someone runs locally), link a **downloadable build** a reviewer can run instead, a compiled binary or installer, or a GitHub `/releases` page. A bare source repo isn't a playable link, so put your code in the separate **Repository** field, not here.

A few things that **won't** pass for software, so you don't get caught out:

- A bare code repo, a `/tree` or `/blob` browse page, or a raw source file (like `bagel.cpp`). Link the running site instead. A GitHub `/releases` or `/tags` page, or a direct download of a compiled build (`.exe`, `.dmg`, `.apk`, a `.zip` of the binary) is fine when your project is a downloadable app.
- A **video**.
- A free host that sleeps when idle (Render, Replit, Glitch, and similar). It works when awake, but a reviewer opening it later often finds it down and fines it. Prefer a host that stays up: GitHub Pages, Netlify, Vercel, or Cloudflare Pages.

The playable link is **always required** for software ships.
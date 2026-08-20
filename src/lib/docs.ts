// The student handbook, minus the markdown itself — reading the files lives in
// docs-content.ts, because the sidebar is a client component and anything it
// imports has to stay free of node:fs.
// The student handbook. Pages are plain markdown in src/content/docs, and the
// list below is the only place the order and titles live — the sidebar, the
// static params and the per-page lookup all read from it, so adding a page is
// a new .md file plus one entry here.
//
// Flat on purpose. Pages used to nest under other pages, which meant a sidebar
// entry was a link and a folder at once and its depth was doing two jobs:
// "click me" and "these belong to me". Sections are labels only — never links —
// so anything you can click is a page, and every page sits at one depth.
export type DocPage = {
  slug: string;
  title: string;
};

export type DocSection = {
  label: string;
  pages: DocPage[];
};

export const DOCS_INDEX: DocPage = {
  slug: "index",
  title: "Welcome to Back to Basics!",
};

export const DOC_SECTIONS: DocSection[] = [
  {
    label: "Start here",
    pages: [
      DOCS_INDEX,
      { slug: "how-it-works-beginners", title: "How it Works (Beginners)" },
      { slug: "how-it-works", title: "How it Works" },
    ],
  },
  {
    label: "Returned projects",
    pages: [
      { slug: "fixing-my-project", title: "Fixing My Project" },
      { slug: "github-repo-requirements", title: "Github Repo Requirements" },
      { slug: "demo-requirements", title: "Demo Requirements" },
      { slug: "readme-guide", title: "README Guide" },
      { slug: "lack-of-polish", title: "Lack of Polish" },
      { slug: "ai", title: "AI" },
    ],
  },
  {
    label: "More",
    pages: [
      { slug: "token-calculations", title: "Token Calculations" },
      { slug: "guides", title: "Guides" },
    ],
  },
];

export function docHref(slug: string): string {
  return slug === DOCS_INDEX.slug ? "/docs" : `/docs/${slug}`;
}

// Every page, in sidebar order, index included.
export function flattenDocs(): DocPage[] {
  return DOC_SECTIONS.flatMap((section) => section.pages);
}

export function findDoc(slug: string): DocPage | null {
  return flattenDocs().find((doc) => doc.slug === slug) ?? null;
}

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export type Heading = { id: string; text: string };

// Section headings for the "On this page" list. Only `##` — `###` is used for
// the sub-parts of a journal entry and would double the length of the list.
// Fenced blocks are skipped so a `#` comment inside a code sample can't be
// mistaken for a heading.
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      const text = match[1].replace(/\*\*/g, "");
      headings.push({ id: headingId(text), text });
    }
  }

  return headings;
}

export type DocEntry = {
  slug: string;
  title: string;
  headings: Heading[];
  text: string;
};

// Markdown reduced to the words a reader would actually see, for search
// snippets — link syntax collapses to the link text, code fences drop out
// entirely, and everything else loses its punctuation so a search for
// "gitignore" still matches `.gitignore`.
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

// The student handbook, minus the markdown itself — reading the files lives in
// docs-content.ts, because the sidebar is a client component and anything it
// imports has to stay free of node:fs.
// The student handbook. Pages are plain markdown in src/content/docs, and the
// nesting below is the only place the order and titles live — the sidebar, the
// static params and the per-page lookup all read from it, so adding a page is
// a new .md file plus one entry here.
export type DocNode = {
  slug: string;
  title: string;
  children?: DocNode[];
};

export const DOC_TREE: DocNode[] = [
  {
    slug: "how-it-works-beginners",
    title: "How it Works (Beginners)",
    children: [{ slug: "token-calculations", title: "Token Calculations" }],
  },
  {
    slug: "how-it-works",
    title: "How it Works",
  },
  {
    slug: "fixing-my-project",
    title: "Fixing My Project",
    children: [
      {
        slug: "github-repo-requirements",
        title: "Github Repo Requirements",
        children: [{ slug: "demo-requirements", title: "Demo Requirements" }],
      },
      { slug: "readme-guide", title: "README Guide" },
      { slug: "lack-of-polish", title: "Lack of Polish" },
      { slug: "ai", title: "AI" },
    ],
  },
  {
    slug: "guides",
    title: "Guides",
  },
];

export const DOCS_INDEX: DocNode = {
  slug: "index",
  title: "Welcome to Back to Basics!",
};

export function docHref(slug: string): string {
  return slug === DOCS_INDEX.slug ? "/docs" : `/docs/${slug}`;
}

// Depth-first walk, so callers get the pages in the same order they're listed
// in the sidebar.
export function flattenDocs(nodes: DocNode[] = DOC_TREE): DocNode[] {
  return nodes.flatMap((node) => [node, ...flattenDocs(node.children ?? [])]);
}

export function findDoc(slug: string): DocNode | null {
  if (slug === DOCS_INDEX.slug) return DOCS_INDEX;
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

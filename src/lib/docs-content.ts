import fs from "node:fs";
import path from "node:path";

// Server-only half of src/lib/docs.ts: the markdown pages on disk. Kept in its
// own module so the client-side sidebar can import the doc tree without
// dragging node:fs into the browser bundle.
const DOCS_DIR = path.join(process.cwd(), "src", "content", "docs");

export function readDoc(slug: string): string | null {
  // The slug always comes from DOC_TREE (never straight off the URL), but keep
  // the filename join blunt about it anyway.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    return fs.readFileSync(path.join(DOCS_DIR, `${slug}.md`), "utf8");
  } catch {
    return null;
  }
}

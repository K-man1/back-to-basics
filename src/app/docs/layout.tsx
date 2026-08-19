import Link from "next/link";
import DocsSidebar from "@/components/DocsSidebar";
import {
  DOCS_INDEX,
  extractHeadings,
  flattenDocs,
  plainText,
  type DocEntry,
} from "@/lib/docs";
import { readDoc } from "@/lib/docs-content";

export const metadata = {
  title: "Docs — Back to Basics",
  description:
    "How Back to Basics works, what a ship needs, and how to fix a project that was returned.",
};

// Every page's headings and prose, read once here and handed to the sidebar.
// That's what makes search work without an API route: the corpus is a few
// kilobytes, it's baked into the prerendered HTML, and the client filters it.
function docEntries(): DocEntry[] {
  return [DOCS_INDEX, ...flattenDocs()].map((doc) => {
    const markdown = readDoc(doc.slug) ?? "";
    return {
      slug: doc.slug,
      title: doc.title,
      headings: extractHeadings(markdown),
      text: plainText(markdown),
    };
  });
}

export default function DocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-16">
      <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900">
        ← Back to Basics
      </Link>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row lg:gap-14">
        <DocsSidebar entries={docEntries()} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}

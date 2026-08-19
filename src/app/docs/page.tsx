import { notFound } from "next/navigation";
import DocMarkdown from "@/components/DocMarkdown";
import { DOCS_INDEX } from "@/lib/docs";
import { readDoc } from "@/lib/docs-content";

export default function DocsHome() {
  const markdown = readDoc(DOCS_INDEX.slug);
  if (!markdown) notFound();

  return (
    <article>
      <h1 className="text-2xl tracking-tight text-zinc-900">
        {DOCS_INDEX.title}
      </h1>
      <div className="mt-8">
        <DocMarkdown>{markdown}</DocMarkdown>
      </div>
    </article>
  );
}

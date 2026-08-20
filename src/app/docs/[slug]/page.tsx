import { notFound } from "next/navigation";
import DocMarkdown from "@/components/DocMarkdown";
import { DOCS_INDEX, findDoc, flattenDocs } from "@/lib/docs";
import { readDoc } from "@/lib/docs-content";

// The page list is fixed at build time, so every doc page is prerendered and an
// unknown slug 404s instead of hitting the filesystem. The index is the one
// page this route doesn't own — it's served at /docs itself.
export function generateStaticParams() {
  return flattenDocs()
    .filter((doc) => doc.slug !== DOCS_INDEX.slug)
    .map((doc) => ({ slug: doc.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = findDoc(slug);
  return { title: doc ? `${doc.title} — Back to Basics` : "Docs" };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = findDoc(slug);
  const markdown = doc ? readDoc(doc.slug) : null;
  if (!doc || !markdown) notFound();

  return (
    <article>
      <h1 className="text-2xl tracking-tight text-zinc-900">{doc.title}</h1>
      <div className="mt-8">
        <DocMarkdown>{markdown}</DocMarkdown>
      </div>
    </article>
  );
}

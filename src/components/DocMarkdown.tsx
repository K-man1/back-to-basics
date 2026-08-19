import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingId } from "@/lib/docs";

// One docs page's markdown. The h2 ids are what the sidebar's "on this page"
// links point at, so they're generated with the same slugifier the sidebar
// uses (src/lib/docs.ts) rather than a second rule that could drift.
export default function DocMarkdown({ children }: { children: string }) {
  return (
    <div className="prose-docs text-sm leading-7 text-zinc-700">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 id={headingId(String(children))} className="scroll-mt-8">
              {children}
            </h2>
          ),
          a: ({ href, children }) =>
            href?.startsWith("/") ? (
              <Link href={href}>{children}</Link>
            ) : (
              <a href={href} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

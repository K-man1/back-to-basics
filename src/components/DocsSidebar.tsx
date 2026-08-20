"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DOC_SECTIONS, docHref, type DocEntry, type DocPage } from "@/lib/docs";

// The docs table of contents: a search box over every page, then the pages
// under their section labels. Pages only — the headings of the page you're on
// used to unfold under it, so the list changed shape as you navigated and the
// same indent meant "section of this page" in one place and "different page"
// in another.
export default function DocsSidebar({ entries }: { entries: DocEntry[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [queryPath, setQueryPath] = useState(pathname);

  // Clearing the search on navigation keeps the tree from staying hidden
  // behind a stale result list after you click through to a page. Adjusted
  // during render rather than in an effect, so the tree is already back the
  // first time the new page paints.
  if (queryPath !== pathname) {
    setQueryPath(pathname);
    setQuery("");
  }

  return (
    <>
      {/* Mobile: the whole panel folds away above the page. */}
      <details className="border-b border-zinc-200 pb-4 lg:hidden">
        <summary className="cursor-pointer list-none py-1 text-sm text-zinc-500 marker:content-none">
          Contents
        </summary>
        <div className="mt-4">
          <DocsPanel
            entries={entries}
            pathname={pathname}
            query={query}
            onQuery={setQuery}
          />
        </div>
      </details>

      <div className="hidden shrink-0 lg:sticky lg:top-8 lg:block lg:max-h-[calc(100vh-4rem)] lg:w-60 lg:self-start lg:overflow-y-auto">
        <DocsPanel
          entries={entries}
          pathname={pathname}
          query={query}
          onQuery={setQuery}
          shortcut
        />
      </div>
    </>
  );
}

function DocsPanel({
  entries,
  pathname,
  query,
  onQuery,
  shortcut = false,
}: {
  entries: DocEntry[];
  pathname: string;
  query: string;
  onQuery: (value: string) => void;
  shortcut?: boolean;
}) {
  const results = useSearch(entries, query);

  return (
    <>
      <DocsSearch query={query} onQuery={onQuery} shortcut={shortcut} />

      {query.trim() ? (
        <SearchResults results={results} query={query} />
      ) : (
        <nav aria-label="Docs" className="mt-6 flex flex-col gap-6">
          {DOC_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-2 text-[0.6875rem] tracking-widest text-zinc-400 uppercase">
                {section.label}
              </p>
              <ul className="flex flex-col text-sm">
                {section.pages.map((page) => (
                  <DocsLink key={page.slug} page={page} pathname={pathname} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </>
  );
}

function DocsSearch({
  query,
  onQuery,
  shortcut,
}: {
  query: string;
  onQuery: (value: string) => void;
  shortcut: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  // "/" jumps to the box the way it does on most docs sites — but not while
  // you're already typing somewhere, or it eats the slash in a URL.
  useEffect(() => {
    if (!shortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  return (
    <div className="relative">
      <input
        ref={input}
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onQuery("");
            event.currentTarget.blur();
          }
        }}
        placeholder="Search docs"
        aria-label="Search docs"
        className="w-full rounded border border-zinc-200 bg-white py-2 pr-9 pl-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
      />
      {shortcut && !query && (
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-zinc-200 px-1.5 py-0.5 text-[0.625rem] text-zinc-400">
          /
        </kbd>
      )}
    </div>
  );
}

function SearchResults({
  results,
  query,
}: {
  results: SearchResult[];
  query: string;
}) {
  if (results.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        No pages match &ldquo;{query.trim()}&rdquo;.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <p className="mb-3 text-[0.6875rem] tracking-widest text-zinc-400 uppercase">
        {results.length} {results.length === 1 ? "result" : "results"}
      </p>
      <ul className="flex flex-col gap-3 text-sm">
        {results.map((result) => (
          <li key={result.slug}>
            <Link href={docHref(result.slug)} className="group block">
              <span className="text-zinc-900 group-hover:underline">
                {result.title}
              </span>
              {result.snippet && (
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  {result.snippet}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DocsLink({ page, pathname }: { page: DocPage; pathname: string }) {
  const href = docHref(page.slug);
  const isActive = pathname === href;

  return (
    <li>
      {/* The active page gets a rule down its left edge as well as the darker
          text — colour alone was too quiet to find at a glance. */}
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={`-ml-px block border-l-2 py-1.5 pl-3 transition-colors ${
          isActive
            ? "border-zinc-900 font-bold text-zinc-900"
            : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
        }`}
      >
        {page.title}
      </Link>
    </li>
  );
}

type SearchResult = { slug: string; title: string; snippet: string | null };

// Substring search, ranked title > heading > body. The whole corpus is a
// handful of kilobytes of prose, so scoring every page on every keystroke is
// cheaper than any index would be to build.
function useSearch(entries: DocEntry[], query: string): SearchResult[] {
  return useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const scored: { result: SearchResult; score: number }[] = [];

    for (const entry of entries) {
      const inTitle = entry.title.toLowerCase().includes(needle);
      const heading = entry.headings.find((h) =>
        h.text.toLowerCase().includes(needle),
      );
      const bodyAt = entry.text.toLowerCase().indexOf(needle);
      if (!inTitle && !heading && bodyAt === -1) continue;

      const snippet = heading
        ? heading.text
        : bodyAt >= 0
          ? excerpt(entry.text, bodyAt, needle.length)
          : null;

      scored.push({
        result: { slug: entry.slug, title: entry.title, snippet },
        score: inTitle ? 0 : heading ? 1 : 2,
      });
    }

    return scored.sort((a, b) => a.score - b.score).map((s) => s.result);
  }, [entries, query]);
}

// A window of text around the hit, cut back to whole words so the snippet
// doesn't start mid-syllable.
function excerpt(text: string, at: number, length: number): string {
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + length + 80);
  const slice = text.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}

"use client";

import { useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Shared editor for journal entries: a title plus one markdown reflection
// (with paste/upload screenshot embedding). Used both to add a new entry and
// to edit an existing one — the bound server action decides which.
export default function JournalEntryForm({
  initialTitle = "",
  initialReflection = "",
  initialLapseUrl = "",
  initialGithubLinks = "",
  submitLabel,
  action,
  onDone,
}: {
  initialTitle?: string;
  initialReflection?: string;
  initialLapseUrl?: string;
  // Newline-joined, matching the textarea's one-URL-per-line format.
  initialGithubLinks?: string;
  submitLabel: string;
  // Bound addJournalEntryAction(projectId) or
  // updateJournalEntryAction(projectId, entryId) — takes `title`,
  // `reflection`, `lapse_url`, `github_links`. Resolves to `{ error }` on
  // validation failure (shown inline; the draft stays put).
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
  onDone?: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [value, setValue] = useState(initialReflection);
  const [lapseUrl, setLapseUrl] = useState(initialLapseUrl);
  const [githubLinks, setGithubLinks] = useState(initialGithubLinks);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert text at the caret so an uploaded screenshot lands where you were
  // typing, not just tacked on at the end.
  function insertAtCaret(snippet: string) {
    const el = textareaRef.current;
    if (!el) {
      setValue((v) => v + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setValue((v) => v.slice(0, start) + snippet + v.slice(end));
    // Restore the caret just after what we inserted, next tick.
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/journal/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "upload failed");
      insertAtCaret(`\n![screenshot](${data.url})\n`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(e.clipboardData.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) {
      e.preventDefault();
      void uploadFile(file);
    }
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        const result = await action(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setTitle(initialTitle);
        setValue(initialReflection);
        setLapseUrl(initialLapseUrl);
        setGithubLinks(initialGithubLinks);
        setPreview(false);
        onDone?.();
      }}
      className="flex flex-col gap-2"
    >
      <input
        type="text"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        placeholder="What did you figure out? (e.g. Why BFS finds shortest paths)"
        className="rounded border border-zinc-300 p-2 text-sm"
      />

      <div className="flex items-center gap-3 text-xs">
        <label className="cursor-pointer text-zinc-600 underline hover:text-zinc-900">
          {uploading ? "Uploading…" : "Upload screenshot"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="text-zinc-500 underline hover:text-zinc-900"
        >
          {preview ? "Edit" : "Preview"}
        </button>
        {error ? <span className="text-red-600">{error}</span> : null}
      </div>

      {preview ? (
        <div className="prose-journal min-h-[8rem] rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
          {value.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
          ) : (
            <p className="text-zinc-400">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          name="reflection"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={onPaste}
          required
          rows={8}
          className="rounded border border-zinc-300 p-2 font-mono text-sm"
          placeholder="Markdown supported. In your own words: what did you learn, how did it click, and what did you build? Paste or upload screenshots to embed them."
        />
      )}

      <input
        type="url"
        name="lapse_url"
        value={lapseUrl}
        onChange={(e) => setLapseUrl(e.target.value)}
        placeholder="Lapse timelapse of this session (optional) — https://lapse.hackclub.com/…"
        className="rounded border border-zinc-300 p-2 text-sm"
      />
      <textarea
        name="github_links"
        value={githubLinks}
        onChange={(e) => setGithubLinks(e.target.value)}
        rows={2}
        placeholder={
          "GitHub permalinks to the code this is about (optional, one per line).\nTip: press Y on a GitHub file to pin the commit, click a line number to link it."
        }
        className="rounded border border-zinc-300 p-2 font-mono text-xs"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="w-fit rounded border border-zinc-900 px-3 py-1.5 text-xs text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          {submitLabel}
        </button>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="text-xs text-zinc-500 underline hover:text-zinc-900"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

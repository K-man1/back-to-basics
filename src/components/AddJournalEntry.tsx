"use client";

import { useState } from "react";
import JournalEntryForm from "@/components/JournalEntryForm";

// Collapsed by default so the journal page reads entries-first; the full form
// only takes over when the student is actually writing one.
export default function AddJournalEntry({
  action,
}: {
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-800"
      >
        <span className="text-lg leading-none">+</span>
        Add journal entry
      </button>
    );
  }

  return (
    <div className="border border-zinc-200 bg-white p-4">
      <JournalEntryForm
        submitLabel="Add entry"
        action={action}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}

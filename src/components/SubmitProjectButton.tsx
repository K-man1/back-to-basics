"use client";

import { useCallback, useState, useTransition } from "react";
import Modal from "@/components/Modal";

type SubmitResult = { ok: true } | { ok: false; missing: string[] };

/** The button stays enabled even when the project is incomplete — a dead
 *  greyed-out button doesn't say what's wrong, so clicking it and getting a
 *  dialog back is the louder answer. */
export default function SubmitProjectButton({
  label,
  action,
  showButton = true,
}: {
  label: string;
  action: () => Promise<SubmitResult>;
  /** A successful submit flips the project out of a submittable status, so the
   *  page re-renders with this false. The component stays mounted either way —
   *  otherwise the confirmation dialog would unmount the moment it appeared. */
  showButton?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{
    title: string;
    body: string;
    /** Rendered as bullets under the body. */
    items?: string[];
  } | null>(null);

  const close = useCallback(() => setDialog(null), []);

  return (
    <>
      <button
        type="button"
        hidden={!showButton}
        disabled={pending || !showButton}
        onClick={() => {
          setDialog(null);
          startTransition(async () => {
            const result = await action();
            setDialog(
              result.ok
                ? {
                    title: "Submitted",
                    body: "This project is in the review queue. You'll see the reviewer's feedback here once it's graded.",
                  }
                : {
                    title: "Not ready to submit",
                    body: "Add these first:",
                    items: result.missing,
                  },
            );
          });
        }}
        className="rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:cursor-wait disabled:opacity-50"
      >
        {pending ? "Submitting…" : label}
      </button>
      {dialog ? (
        <Modal title={dialog.title} onClose={close}>
          <p>{dialog.body}</p>
          {dialog.items?.length ? (
            <ul className="mt-2 flex flex-col gap-1">
              {dialog.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-amber-600">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}

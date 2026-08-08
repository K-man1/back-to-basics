"use client";

import { useCallback, useState, useTransition } from "react";
import Modal from "@/components/Modal";

/** A button whose action runs only after a confirm dialog. Replaces
 *  window.confirm everywhere: same guard, but it looks like the site and it
 *  can't be suppressed by the browser's "prevent additional dialogs" box. */
export default function ConfirmButton({
  label,
  className,
  title,
  body,
  confirmLabel,
  action,
}: {
  label: string;
  className?: string;
  title: string;
  body: string;
  confirmLabel: string;
  action: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open ? (
        <Modal
          title={title}
          onClose={close}
          footer={
            <>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await action();
                    setOpen(false);
                  })
                }
                className="rounded border border-red-600 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-wait disabled:opacity-50"
              >
                {pending ? "Working…" : confirmLabel}
              </button>
            </>
          }
        >
          {body}
        </Modal>
      ) : null}
    </>
  );
}

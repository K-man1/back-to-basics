"use client";

import { useEffect, useRef } from "react";

/** The site's one dialog. Takes over the screen and stays until you dismiss it
 *  — Esc, the ×, or a click on the backdrop — so a message can't be scrolled
 *  past or ignored the way an inline caption can. Everything that used to be
 *  window.confirm/alert goes through here instead.
 *
 *  Not <dialog>: showModal() needs an effect to open it and brings its own
 *  ::backdrop and close semantics, which is more to fight than to reuse for a
 *  dialog that's conditionally rendered anyway. */
export default function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children?: React.ReactNode;
  /** Action buttons. Omit for a plain acknowledge-and-move-on message. */
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    // Focus the panel so Esc lands here and a screen reader reads the dialog,
    // and freeze the page behind it so scrolling doesn't leak through.
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      // modal-scrim, not bg-black/50: the dark palette mirrors black and white,
      // so `black` here would come out as a white sheet over the page.
      className="modal-scrim animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4"
      // Backdrop click only: a drag that starts inside the panel and ends out
      // here would otherwise close it mid-selection.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="animate-panel-in w-full max-w-md border border-zinc-300 bg-white p-5 shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 px-1 text-zinc-400 transition-colors hover:text-zinc-900"
          >
            ×
          </button>
        </div>
        {children ? (
          <div className="mt-3 text-sm text-zinc-700">{children}</div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          {footer ?? (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

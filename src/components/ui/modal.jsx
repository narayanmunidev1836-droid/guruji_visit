"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal dialog (native <dialog>: focus stays inside, Esc closes). It sits in the top layer but still INHERITS text styles from
 * where it is rendered in the DOM (e.g. a `text-right` table cell), so it resets the text alignment itself. Render it only while it should be open and unmount it to
 * close it; `onClose` is also called when the user closes it (X, Esc or a click outside) so the parent can unmount it.
 */
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const element = ref.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close(); // click on the backdrop
      }}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-border bg-surface p-0 text-left text-foreground shadow-2xl backdrop:bg-black/50"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" title="Close" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Pencil, Plus } from "lucide-react";
import { useFormState } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

function Row({ label, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[8rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  );
}

/**
 * Shown right after a new entry is saved: only what was saved, so the user can check it once. "Edit" opens the entry's
 * edit page; closing it (button, Esc or click outside) calls `onClose`, which starts a fresh, empty "New entry" form.
 * Must be rendered inside the entry's <ActionForm> (it reads the action result from there).
 */
export function SavedEntryDialog({ onClose }) {
  const { state } = useFormState();
  const saved = state?.ok ? state.saved : null;
  const [closedFor, setClosedFor] = useState(null);
  const open = Boolean(saved) && closedFor !== state;
  const dialog = useRef(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
  }, [open]);

  if (!saved) return null;

  function close() {
    setClosedFor(state);
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      onClose={close}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close(); // click on the backdrop
      }}
      aria-labelledby="saved-entry-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-2xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden />
          <h2 id="saved-entry-title" className="text-lg font-semibold">
            Entry saved
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted">Please check the details below. If something is wrong, choose Edit.</p>

        <dl className="mt-4 divide-y divide-border rounded-xl border border-border px-4">
          <Row label="Haribhagat">
            {saved.people.map((person) => (
              <div key={person.id} className="py-0.5">
                <p className="font-medium">{[person.name, person.fatherName, person.surname].filter(Boolean).join(" ")}</p>
                <p className="text-xs text-muted">{[person.gam, person.taluko, person.jillo, person.state, person.country, person.pincode].filter(Boolean).join(", ")}</p>
                {person.mobileNo && <p className="font-mono text-xs text-muted">{person.mobileNo}</p>}
              </div>
            ))}
          </Row>
          <Row label="Date">{saved.visitDate}</Row>
          <Row label="Event">{saved.event}</Row>
          <Row label="Place">{saved.place}</Row>
          <Row label="Hard disk">{saved.disk}</Row>
          <Row label="Path">{saved.folder}</Row>
          <Row label="Notes">{saved.notes && <span className="whitespace-pre-line">{saved.notes}</span>}</Row>
        </dl>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Link href={`/visits/${saved.id}/edit`} className={buttonClasses({ variant: "secondary" })}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </Link>
          <button type="button" autoFocus onClick={() => dialog.current?.close()} className={buttonClasses({})}>
            <Plus className="h-4 w-4" aria-hidden />
            New entry
          </button>
        </div>
      </div>
    </dialog>
  );
}

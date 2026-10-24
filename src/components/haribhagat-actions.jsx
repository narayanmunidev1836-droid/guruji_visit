"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";
import { deleteHaribhagatAction } from "@/actions/haribhagats";
import { HaribhagatForm } from "@/components/haribhagat-form";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Modal } from "@/components/ui/modal";

const iconLink = "inline-grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-primary-soft";

/** "Add" button: the new-Haribhagat form opens in a dialog; when saved the dialog closes and the list refreshes. */
export function AddHaribhagatButton({ labels, countries, variant = "primary" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {labels.add}
      </Button>
      {open && (
        <Modal title="New Haribhagat" onClose={() => setOpen(false)}>
          <HaribhagatForm modal labels={labels} countries={countries} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

/** View / Edit (same dialog as Add, filled in) / Delete icons for one row of the Haribhagat table. */
export function HaribhagatRowActions({ person, canWrite, labels, countries }) {
  const [editing, setEditing] = useState(false);
  const name = [person.name, person.fatherName, person.surname].filter(Boolean).join(" ");
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link href={`/haribhagats/${person.id}`} className={iconLink} data-tip="View" aria-label="View">
        <Eye className="h-4 w-4" aria-hidden />
      </Link>
      {canWrite && (
        <>
          <button type="button" onClick={() => setEditing(true)} className={iconLink} data-tip="Edit" aria-label="Edit">
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <ConfirmDeleteButton action={deleteHaribhagatAction} id={person.id} confirmText={`Delete ${name}? This cannot be undone.`} successMessage="Haribhagat deleted." />
        </>
      )}
      {editing && (
        <Modal title={`Edit: ${name}`} onClose={() => setEditing(false)}>
          <HaribhagatForm modal person={person} labels={labels} countries={countries} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}

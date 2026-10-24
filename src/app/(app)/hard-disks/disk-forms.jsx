"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Power, PowerOff } from "lucide-react";
import { createDiskAction, deleteDiskAction, toggleDiskAction, updateDiskAction } from "@/actions/disks";
import { ActionForm, CloseWhenSaved, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Input, Textarea } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";

/** One compact row: label, description, serial number and the Add button on the right. Notes are added later with Edit. */
export function AddDiskForm({ labels }) {
  return (
    <ActionForm action={createDiskAction} resetOnSuccess className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
      <Field label={labels.label} name="labelName" required>
        <Input name="labelName" required maxLength={60} placeholder="HDD-001 (sticker)" autoComplete="off" />
      </Field>
      <Field label={labels.description} name="description">
        <Input name="description" maxLength={300} placeholder="e.g. Pathramani 2018-2019, WD 2TB" autoComplete="off" />
      </Field>
      <Field label="Serial number" name="serialNumber">
        <Input name="serialNumber" maxLength={100} autoComplete="off" />
      </Field>
      <SubmitButton>{labels.add}</SubmitButton>
    </ActionForm>
  );
}

/** `onSaved` is given when the form sits in a dialog that should close after saving. */
export function EditDiskForm({ disk, labels, onSaved }) {
  return (
    <ActionForm action={updateDiskAction}>
      {onSaved && <CloseWhenSaved onDone={onSaved} />}
      <input type="hidden" name="id" value={disk.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.label} name="labelName" required hint="Renaming keeps every visit linked to this disk.">
          <Input name="labelName" defaultValue={disk.labelName} required maxLength={60} autoComplete="off" />
        </Field>
        <Field label={labels.description} name="description">
          <Input name="description" defaultValue={disk.description ?? ""} maxLength={300} autoComplete="off" />
        </Field>
        <Field label="Serial number (optional)" name="serialNumber">
          <Input name="serialNumber" defaultValue={disk.serialNumber ?? ""} maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.notes} name="notes" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={disk.notes ?? ""} maxLength={1000} />
        </Field>
      </div>
      <FormActions className={onSaved ? "justify-end" : undefined}>
        <SubmitButton>{labels.save}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

const ICON_BUTTON = "inline-grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-primary-soft";

/**
 * Icon-only actions of one disk row: View (everyone), then - for people who may manage disks - Activate / Deactivate, Edit (opens a dialog)
 * and Delete. A disk that entries use cannot be deleted (the server says so).
 */
export function DiskRowActions({ disk, labels, canManage }) {
  const [editing, setEditing] = useState(false);
  const toggleLabel = disk.isActive ? labels.deactivate : labels.activate;
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/hard-disks/${disk.id}`} data-tip={labels.view} aria-label={labels.view} className={ICON_BUTTON}>
        <Eye className="h-4 w-4" aria-hidden />
      </Link>
      {canManage && (
        <>
          <form action={toggleDiskAction}>
            <input type="hidden" name="id" value={disk.id} />
            <input type="hidden" name="isActive" value={String(!disk.isActive)} />
            <button type="submit" data-tip={toggleLabel} aria-label={toggleLabel} className={ICON_BUTTON}>
              {disk.isActive ? <PowerOff className="h-4 w-4" aria-hidden /> : <Power className="h-4 w-4" aria-hidden />}
            </button>
          </form>
          <button type="button" onClick={() => setEditing(true)} data-tip={labels.edit} aria-label={labels.edit} className={ICON_BUTTON}>
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <ConfirmDeleteButton action={deleteDiskAction} id={disk.id} confirmText={`Delete the hard disk "${disk.labelName}"? This cannot be undone.`} successMessage="Hard disk deleted." />
          {editing && (
            <Modal title={`${labels.edit}: ${disk.labelName}`} onClose={() => setEditing(false)}>
              <EditDiskForm disk={disk} labels={labels} onSaved={() => setEditing(false)} />
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

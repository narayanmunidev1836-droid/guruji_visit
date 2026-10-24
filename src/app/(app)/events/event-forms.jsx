"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { createEventAction, deleteEventAction, updateEventAction } from "@/actions/events";
import { ActionForm, CloseWhenSaved, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Input } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";

export function AddEventForm({ labels }) {
  return (
    <ActionForm action={createEventAction} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
      <Field label={labels.name} name="name" required>
        <Input name="name" required maxLength={100} placeholder="e.g. Pathramani" autoComplete="off" />
      </Field>
      <Field label={labels.description} name="description">
        <Input name="description" maxLength={500} autoComplete="off" />
      </Field>
      <SubmitButton>{labels.add}</SubmitButton>
    </ActionForm>
  );
}

function EditEventForm({ event, labels, onSaved }) {
  return (
    <ActionForm action={updateEventAction} className="space-y-4">
      <CloseWhenSaved onDone={onSaved} />
      <input type="hidden" name="id" value={event.id} />
      <Field label={labels.name} name="name" required>
        <Input name="name" defaultValue={event.name} required maxLength={100} autoComplete="off" />
      </Field>
      <Field label={labels.description} name="description">
        <Input name="description" defaultValue={event.description ?? ""} maxLength={500} autoComplete="off" />
      </Field>
      <FormActions className="justify-end">
        <SubmitButton>{labels.save}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

/** Edit (opens a dialog) and Delete icons for one event row. Shown only to people who may manage events. */
export function EventRowActions({ event, labels }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        data-tip={labels.edit}
        aria-label={labels.edit}
        className="inline-grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-primary-soft"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
      <ConfirmDeleteButton action={deleteEventAction} id={event.id} confirmText={`Delete the event "${event.name}"? This cannot be undone.`} successMessage="Event deleted." />
      {editing && (
        <Modal title={`${labels.edit}: ${event.name}`} onClose={() => setEditing(false)}>
          <EditEventForm event={event} labels={labels} onSaved={() => setEditing(false)} />
        </Modal>
      )}
    </>
  );
}

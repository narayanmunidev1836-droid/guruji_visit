"use client";

import { createEventAction, updateEventAction } from "@/actions/events";
import { ActionForm, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/inputs";

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

export function EditEventForm({ event, labels }) {
  return (
    <ActionForm action={updateEventAction} className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
      <input type="hidden" name="id" value={event.id} />
      <Field label={labels.name} name="name" required>
        <Input name="name" defaultValue={event.name} required maxLength={100} autoComplete="off" />
      </Field>
      <Field label={labels.description} name="description">
        <Input name="description" defaultValue={event.description ?? ""} maxLength={500} autoComplete="off" />
      </Field>
      <FormActions className="mt-0">
        <SubmitButton size="md">{labels.save}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

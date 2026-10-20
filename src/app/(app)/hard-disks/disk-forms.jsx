"use client";

import { createDiskAction, updateDiskAction } from "@/actions/disks";
import { ActionForm, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/inputs";

export function AddDiskForm({ labels }) {
  return (
    <ActionForm action={createDiskAction} resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.label} name="labelName" required hint="Exactly as written on the sticker, e.g. HDD-001">
          <Input name="labelName" required maxLength={60} placeholder="HDD-001" autoComplete="off" />
        </Field>
        <Field label={labels.description} name="description">
          <Input name="description" maxLength={300} placeholder="e.g. Pathramani 2018-2019, WD 2TB blue" autoComplete="off" />
        </Field>
        <Field label="Serial number (optional)" name="serialNumber">
          <Input name="serialNumber" maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.notes} name="notes">
          <Input name="notes" maxLength={1000} autoComplete="off" />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>{labels.add}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

export function EditDiskForm({ disk, labels }) {
  return (
    <ActionForm action={updateDiskAction}>
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
      <FormActions>
        <SubmitButton>{labels.save}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

"use client";

import { createUserAction, resetPasswordAction, updateUserAction } from "@/actions/users";
import { ActionForm, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/inputs";
import { Checkbox } from "@/components/ui/inputs";

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Staff" },
  { value: "ADMIN", label: "Admin" },
];

export function AddUserForm({ labels }) {
  return (
    <ActionForm action={createUserAction} resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={labels.name} name="name" required>
          <Input name="name" required maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.email} name="email" required>
          <Input name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label={labels.role} name="role" required>
          <Select name="role" defaultValue="STAFF" options={ROLE_OPTIONS} />
        </Field>
        <Field label="Temporary password" name="password" required hint="At least 10 characters">
          <Input name="password" type="text" required minLength={10} autoComplete="new-password" />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>{labels.add}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

export function EditUserForm({ user, labels }) {
  return (
    <div className="space-y-6">
      <ActionForm action={updateUserAction}>
        <input type="hidden" name="id" value={user.id} />
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <Field label={labels.name} name="name" required>
            <Input name="name" defaultValue={user.name} required maxLength={100} />
          </Field>
          <Field label={labels.role} name="role">
            <Select name="role" defaultValue={user.role} options={ROLE_OPTIONS} />
          </Field>
          <div className="pb-2">
            <Checkbox name="isActive" label={labels.active} defaultChecked={user.isActive} value="true" />
          </div>
        </div>
        <FormActions>
          <SubmitButton size="sm">{labels.save}</SubmitButton>
        </FormActions>
      </ActionForm>

      <ActionForm action={resetPasswordAction} resetOnSuccess>
        <input type="hidden" name="id" value={user.id} />
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Set a new password" name="password" hint="At least 10 characters. Existing sessions of this user stop working.">
            <Input name="password" type="text" minLength={10} autoComplete="new-password" required />
          </Field>
          <SubmitButton size="md" variant="secondary">
            Reset password
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

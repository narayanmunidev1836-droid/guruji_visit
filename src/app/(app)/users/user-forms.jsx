"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { createUserAction, resetPasswordAction, updateUserAction } from "@/actions/users";
import { ActionForm, Field, FormActions, SubmitButton, useFormState } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/inputs";
import { MobileInput } from "@/components/ui/mobile-input";
import { Checkbox } from "@/components/ui/inputs";

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Staff" },
  { value: "ADMIN", label: "Admin" },
];

/** "Can add hard disks / events": only matters for Staff (an Admin can always do both). */
function GrantBoxes({ user }) {
  return (
    <fieldset className="rounded-xl border border-border p-3">
      <legend className="px-1 text-xs font-medium text-muted">Staff can also (Admins always can)</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Checkbox name="canCreateDisks" label="Add hard disks" defaultChecked={user?.canCreateDisks ?? false} value="true" />
        <Checkbox name="canCreateEvents" label="Add events" defaultChecked={user?.canCreateEvents ?? false} value="true" />
      </div>
    </fieldset>
  );
}

export function AddUserForm({ labels }) {
  return (
    <ActionForm action={createUserAction} resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={labels.name} name="name" required>
          <Input name="name" required maxLength={100} autoComplete="off" />
        </Field>
        <Field label="Username" name="username" required hint="Used to log in">
          <Input name="username" required maxLength={50} autoComplete="off" autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field label={labels.email} name="email" required>
          <Input name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Mobile no" name="mobileNo" hint="10 digits (also a login)">
          <MobileInput name="mobileNo" />
        </Field>
        <Field label={labels.role} name="role" required>
          <Select name="role" defaultValue="STAFF" options={ROLE_OPTIONS} />
        </Field>
        <Field label="Temporary password" name="password" required hint="At least 10 characters">
          <Input name="password" type="text" required minLength={10} autoComplete="new-password" />
        </Field>
      </div>
      <div className="mt-4">
        <GrantBoxes />
      </div>
      <FormActions>
        <SubmitButton>{labels.add}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

/** Closes the edit dialog once the server says the user was saved. */
function CloseWhenSaved({ onDone }) {
  const { state } = useFormState();
  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);
  return null;
}

/** Pencil icon in the table row: the user's edit form (details, rights, password) opens in a dialog. */
export function UserRowActions({ user, labels }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tip={labels.edit}
        aria-label={labels.edit}
        className="inline-grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-primary-soft"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <Modal title={`${labels.edit}: ${user.name}`} onClose={() => setOpen(false)}>
          <p className="-mt-2 mb-4 text-sm text-muted">{user.email}</p>
          <EditUserForm user={user} labels={labels} onSaved={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

export function EditUserForm({ user, labels, onSaved }) {
  return (
    <div className="space-y-6">
      <ActionForm action={updateUserAction}>
        {onSaved && <CloseWhenSaved onDone={onSaved} />}
        <input type="hidden" name="id" value={user.id} />
        <div className="grid gap-4 sm:grid-cols-3 sm:items-start">
          <Field label={labels.name} name="name" required>
            <Input name="name" defaultValue={user.name} required maxLength={100} />
          </Field>
          <Field label="Username" name="username" hint="Login name">
            <Input name="username" defaultValue={user.username ?? ""} maxLength={50} autoComplete="off" autoCapitalize="none" spellCheck={false} />
          </Field>
          <Field label="Mobile no" name="mobileNo" hint="10 digits (also a login)">
            <MobileInput name="mobileNo" defaultValue={user.mobileNo ?? ""} />
          </Field>
          <Field label={labels.role} name="role">
            <Select name="role" defaultValue={user.role} options={ROLE_OPTIONS} />
          </Field>
          <div className="sm:mt-[2.125rem]">
            <Checkbox name="isActive" label={labels.active} defaultChecked={user.isActive} value="true" />
          </div>
        </div>
        <div className="mt-4">
          <GrantBoxes user={user} />
        </div>
        <FormActions className="justify-end">
          <SubmitButton>{labels.save}</SubmitButton>
        </FormActions>
      </ActionForm>

      <ActionForm action={resetPasswordAction} resetOnSuccess>
        <input type="hidden" name="id" value={user.id} />
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <Field label="Set a new password" name="password" hint="At least 10 characters. Existing sessions of this user stop working.">
            <Input name="password" type="text" minLength={10} autoComplete="new-password" required />
          </Field>
          <SubmitButton size="md" variant="secondary" className="sm:mt-6">
            Reset password
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

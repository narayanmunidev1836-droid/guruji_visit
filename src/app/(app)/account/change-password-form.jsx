"use client";

import { changePasswordAction } from "@/actions/auth";
import { ActionForm, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/inputs";

export function ChangePasswordForm() {
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess>
      <div className="space-y-4">
        <Field label="Current password" name="currentPassword" required>
          <Input type="password" name="currentPassword" autoComplete="current-password" required />
        </Field>
        <Field label="New password" name="newPassword" required hint="At least 10 characters">
          <Input type="password" name="newPassword" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Repeat new password" name="confirmPassword" required>
          <Input type="password" name="confirmPassword" autoComplete="new-password" minLength={10} required />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>Change password</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

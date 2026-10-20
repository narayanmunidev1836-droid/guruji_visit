"use client";

import { Lock, User } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/inputs";

export function LoginForm({ labels }) {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <Field label={labels.email} name="email">
        <span className="relative block">
          <User aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input type="text" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus className="pl-9" />
        </span>
      </Field>
      <Field label={labels.password} name="password">
        <span className="relative block">
          <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input type="password" name="password" autoComplete="current-password" required className="pl-9" />
        </span>
      </Field>
      <SubmitButton className="w-full" size="lg">
        {labels.login}
      </SubmitButton>
    </ActionForm>
  );
}

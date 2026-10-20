"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/inputs";

export function LoginForm({ labels }) {
  const [show, setShow] = useState(false);
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <Field label={labels.login} name="login">
        <span className="relative block">
          <User aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input type="text" name="login" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus className="pl-9" />
        </span>
      </Field>
      <Field label={labels.password} name="password">
        <span className="relative block">
          <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input type={show ? "text" : "password"} name="password" autoComplete="current-password" required className="px-9" />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Hide password" : "Show password"}
            title={show ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:text-slate-700"
          >
            {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </span>
      </Field>
      <SubmitButton className="w-full" size="lg">
        {labels.submit}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </SubmitButton>
    </ActionForm>
  );
}

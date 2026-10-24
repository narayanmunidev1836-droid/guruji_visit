"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Label } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/toast";

const FormStateContext = createContext({ state: null, pending: false });

export function useFormState() {
  return useContext(FormStateContext);
}

/** Put inside an ActionForm shown in a dialog: calls `onDone` once the server says the form was saved. */
export function CloseWhenSaved({ onDone }) {
  const { state } = useFormState();
  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);
  return null;
}

/**
 * Form wired to a server action (signature: (prevState, formData) => result).
 * - Submits through startTransition instead of <form action> so React does NOT clear the inputs after a
 *   validation error; the user keeps what they typed.
 * - `resetOnSuccess` clears the form after a successful save (e.g. "add event").
 * - Server results look like { ok, message, error, fieldErrors, ... } (see src/lib/result.js); message / error are toasts.
 */
export function ActionForm({ action, children, className, resetOnSuccess = false }) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  // The result is shown as a toast that closes by itself. Errors of single fields also stay under their fields, and a
  // "similar person already exists" warning has its own panel in the form, so that one is not toasted.
  useEffect(() => {
    if (state?.ok && state.message) toast.success(state.message);
    else if (state?.ok === false && state.error && !state.duplicates?.length) toast.error(state.error);
  }, [state, toast]);

  function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form, event.nativeEvent.submitter ?? undefined);
    startTransition(() => formAction(data));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      <FormStateContext value={{ state, pending }}>
        {children}
      </FormStateContext>
    </form>
  );
}

/** Label + control + inline error. The control is nested in <label> so no ids are needed. */
export function Field({ label, name, hint, required, children, className }) {
  const { state } = useFormState();
  const error = state?.fieldErrors?.[name];
  return (
    <div className={className}>
      <label className="block">
        {label && (
          <Label>
            {label}
            {required && <span className="text-danger"> *</span>}
          </Label>
        )}
        {children}
      </label>
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Value to show in a field: what the user just submitted (after an error) or the saved value. */
export function useFieldValue(name, fallback = "") {
  const { state } = useFormState();
  const submitted = state?.values?.[name];
  return submitted !== undefined && submitted !== null ? submitted : (fallback ?? "");
}

const noopSubscribe = () => () => {};

/**
 * false while the page is server-rendered / hydrating, true afterwards.
 * Submit buttons stay disabled until then: before hydration the browser would submit the form natively
 * (a GET that puts every field - even a password - into the URL) instead of calling the server action.
 */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function SubmitButton({ children, variant = "primary", size = "md", className, name, value, ...props }) {
  const { pending } = useFormState();
  const hydrated = useHydrated();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || !hydrated}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function FormActions({ children, className }) {
  return <div className={clsx("mt-6 flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

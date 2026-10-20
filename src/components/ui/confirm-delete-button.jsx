"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import clsx from "clsx";

/**
 * Trash icon that deletes something after a confirmation. `action(id)` is a server action returning { ok, error }.
 * Lists just refresh (the action revalidates them); `redirectTo` is for a page that shows the deleted thing itself.
 */
export function ConfirmDeleteButton({ action, id, confirmText = "Delete this? This cannot be undone.", redirectTo, label = "Delete", className }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function onClick() {
    if (!window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (!result?.ok) {
        setError(result?.error ?? "Could not delete.");
        return;
      }
      if (redirectTo) router.push(redirectTo);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        title={label}
        aria-label={label}
        className={clsx("inline-grid h-8 w-8 place-items-center rounded-lg text-danger hover:bg-danger-soft disabled:opacity-60", className)}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
      </button>
      {error && (
        <span role="alert" className="max-w-56 text-left text-xs text-danger">
          {error}
        </span>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { deleteVisitAction } from "@/actions/visits";

/** Deletes one entry after a confirmation. `redirectTo` is for the entry's own page; lists just refresh. */
export function DeleteVisitButton({ id, redirectTo, label = "Delete", className }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function onClick() {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteVisitAction(id);
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
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </>
  );
}

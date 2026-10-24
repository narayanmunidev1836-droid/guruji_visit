"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useToast } from "@/components/ui/toast";

/**
 * Trash icon that deletes something after a confirmation. `action(id)` is a server action returning { ok, error }.
 * Lists just refresh (the action revalidates them); `redirectTo` is for a page that shows the deleted thing itself.
 */
export function ConfirmDeleteButton({ action, id, confirmText = "Delete this? This cannot be undone.", successMessage = "Deleted.", redirectTo, label = "Delete", className }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(confirmText)) return;
    startTransition(async () => {
      let result;
      try {
        result = await action(id);
      } catch {
        result = null;
      }
      if (!result?.ok) {
        toast.error(result?.error ?? "Could not delete. Please try again.");
        return;
      }
      toast.success(successMessage);
      if (redirectTo) router.push(redirectTo);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      data-tip={label}
      aria-label={label}
      className={clsx("inline-grid h-8 w-8 place-items-center rounded-lg text-danger hover:bg-danger-soft disabled:opacity-60", className)}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
    </button>
  );
}

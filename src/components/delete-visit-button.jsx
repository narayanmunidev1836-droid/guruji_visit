"use client";

import { deleteVisitAction } from "@/actions/visits";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";

/** Deletes one entry after a confirmation. `redirectTo` is for the entry's own page; lists just refresh. */
export function DeleteVisitButton(props) {
  return <ConfirmDeleteButton action={deleteVisitAction} confirmText="Delete this entry? This cannot be undone." successMessage="Entry deleted." {...props} />;
}

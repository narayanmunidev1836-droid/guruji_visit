"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

/** Shown instead of a broken page when something unexpected fails while a page loads. The details are only in the log. */
export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">The page could not be shown. This can happen right after the app was updated. Reload the page; if it keeps happening, tell the administrator.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={() => reset()} className={buttonClasses({ variant: "secondary" })}>
          Try again
        </button>
        <button type="button" onClick={() => window.location.reload()} className={buttonClasses({})}>
          Reload page
        </button>
      </div>
    </div>
  );
}

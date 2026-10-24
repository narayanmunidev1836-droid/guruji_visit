"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * "Back" button: goes back in the browser history (so the page you came from comes back exactly as it was, e.g. a search with its
 * filters). `href` is only the fallback for a page opened directly (no history) and for a middle click / open in new tab.
 */
export function BackButton({ href, label }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      title={label ? `Back to ${label}` : "Back"}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (window.history.length > 1) {
          event.preventDefault();
          router.back();
        }
      }}
      className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-sm font-medium text-muted shadow-card transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </Link>
  );
}

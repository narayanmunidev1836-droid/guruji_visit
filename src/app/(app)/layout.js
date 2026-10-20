import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/page-skeleton";

// Everything below is private, per-user data (session + database) that can never be part of a static shell,
// so these routes are exempt from the "instant navigation" dev validation. This `false` only covers the layout itself;
// the child pages are exempted by `experimental.instantInsights` in next.config.mjs. Pages still show skeletons via loading.js.
export const instant = false;

// Every page below this layout is private and per-request, so it streams in behind this boundary.
// The shell re-checks the session on every full page load; each page and server action ALSO checks
// authorization itself (layouts do not re-run on client-side navigation).
export default function AppLayout({ children }) {
  return (
    <Suspense fallback={<PageSkeleton full />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

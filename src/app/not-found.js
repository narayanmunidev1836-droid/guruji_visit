import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="text-5xl font-semibold text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold">This page could not be found</h1>
        <p className="mt-1 text-sm text-muted">આ પાનું મળ્યું નથી. The record may have been removed or the link is wrong.</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-primary-foreground shadow-brand hover:brightness-105">
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}

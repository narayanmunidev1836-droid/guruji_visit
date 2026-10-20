export function PageSkeleton({ full = false }) {
  const body = (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-surface-muted" />
      <div className="h-4 w-80 max-w-full rounded bg-surface-muted" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface-muted" />
    </div>
  );
  if (!full) return body;
  return <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{body}</div>;
}

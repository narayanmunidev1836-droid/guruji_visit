import Link from "next/link";
import clsx from "clsx";

export function Card({ className, children, ...props }) {
  return (
    <section className={clsx("rounded-2xl border border-border bg-surface shadow-card", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, actions, className }) {
  return (
    <div className={clsx("flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={clsx("p-5", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions, backHref, backLabel }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {backHref && (
          <Link href={backHref} className="mb-1 inline-block text-sm text-muted hover:text-foreground">
            ← {backLabel ?? "Back"}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
      <p className="text-base font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={clsx("mt-1 text-2xl font-semibold tabular-nums", tone === "warning" && "text-warning", tone === "danger" && "text-danger")}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

import Link from "next/link";
import clsx from "clsx";
import { formatNumber } from "@/lib/format";

/** Builds "?a=1&b=2" from an object, skipping empty values. */
export function buildQuery(params, overrides = {}) {
  const merged = { ...params, ...overrides };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) value.forEach((v) => query.append(key, String(v)));
    else query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** Page links that keep every other search parameter. `params` = the current filters as a plain object. */
export function Pagination({ basePath, params, page, pageSize, total }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return <p className="text-sm text-muted">{formatNumber(total)} result{total === 1 ? "" : "s"}</p>;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const link = (p) => `${basePath}${buildQuery(params, { page: p === 1 ? undefined : p })}`;

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </p>
      <ul className="flex items-center gap-1">
        <li>
          <PageLink href={page > 1 ? link(page - 1) : null}>Prev</PageLink>
        </li>
        {list.map((p, i) => (
          <li key={p} className="flex items-center gap-1">
            {i > 0 && p - list[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
            <PageLink href={link(p)} current={p === page}>
              {p}
            </PageLink>
          </li>
        ))}
        <li>
          <PageLink href={page < totalPages ? link(page + 1) : null}>Next</PageLink>
        </li>
      </ul>
    </nav>
  );
}

function PageLink({ href, current, children }) {
  const cls = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm";
  if (!href) return <span className={clsx(cls, "border-transparent text-muted/50")}>{children}</span>;
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={clsx(cls, current ? "border-primary bg-brand text-primary-foreground" : "border-border bg-surface hover:bg-surface-muted")}
    >
      {children}
    </Link>
  );
}

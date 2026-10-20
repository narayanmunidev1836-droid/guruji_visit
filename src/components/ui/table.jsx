import clsx from "clsx";

// Thin styling wrappers. The wrapper scrolls horizontally on small screens instead of breaking the layout.

export function Table({ className, children }) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("w-full min-w-[640px] border-collapse text-left text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ className, children, ...props }) {
  return (
    <th
      scope="col"
      className={clsx("border-b border-border bg-surface-muted px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted", className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }) {
  return (
    <td className={clsx("border-b border-border px-4 py-3 align-top", className)} {...props}>
      {children}
    </td>
  );
}

import clsx from "clsx";

// Thin styling wrappers. The wrapper scrolls horizontally on small screens instead of breaking the layout.
// `scroll`: the wrapper also scrolls vertically and fills its (flex) parent, with the header row kept on top; the parent must have a fixed height.

export function Table({ className, scroll = false, children }) {
  return (
    <div className={scroll ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto"}>
      <table className={clsx("w-full min-w-[640px] border-collapse text-left text-sm", scroll && "[&_th]:sticky [&_th]:top-0 [&_th]:z-10", className)}>{children}</table>
    </div>
  );
}

export function Th({ className, children, ...props }) {
  return (
    <th
      scope="col"
      className={clsx("border-b border-border bg-surface-muted px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted", className)}
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

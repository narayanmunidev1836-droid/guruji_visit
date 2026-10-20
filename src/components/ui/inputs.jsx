import clsx from "clsx";

// Plain, server-compatible form controls. Labels / errors come from <Field> (see form.jsx).

const control =
  "w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground placeholder:normal-case placeholder:text-muted/70 transition-[border-color,box-shadow] focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 disabled:opacity-60";

// Everything users type is shown (and saved) in CAPITALS; e-mail, password and the login e-mail field stay as typed.
const keepCase = (type, name) => type === "password" || type === "email" || name === "email";

export function Input({ className, ...props }) {
  return <input className={clsx(control, "h-10", !keepCase(props.type, props.name) && "uppercase", className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }) {
  return <textarea rows={rows} className={clsx(control, "py-2 uppercase", className)} {...props} />;
}

/** options: [{ value, label }] - always built from database rows by the caller. */
export function Select({ className, options, placeholder, children, ...props }) {
  return (
    <select className={clsx(control, "ui-select h-10 pr-8", className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={clsx("inline-flex items-center gap-2 text-sm", className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-border-strong accent-primary" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Label({ children, className }) {
  return <span className={clsx("mb-1 block text-sm font-medium text-foreground", className)}>{children}</span>;
}

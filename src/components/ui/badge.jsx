import clsx from "clsx";

const tones = {
  neutral: "bg-surface-muted text-muted border-border",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
  primary: "bg-primary-soft text-primary border-primary/25",
};

export function Badge({ tone = "neutral", className, children, dot = false }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

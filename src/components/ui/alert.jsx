import clsx from "clsx";

const tones = {
  info: "border-info/30 bg-info-soft text-info",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

export function Alert({ tone = "info", title, children, className }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={clsx("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={clsx(title && "mt-1", "text-foreground/80")}>{children}</div>}
    </div>
  );
}

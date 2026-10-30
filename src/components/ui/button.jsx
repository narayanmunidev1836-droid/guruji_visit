import Link from "next/link";
import clsx from "clsx";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition-[transform,box-shadow,filter,background-color] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap";

const variants = {
  primary:
    "bg-brand shadow-brand font-semibold text-primary-foreground hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:translate-y-0",
  secondary: "border border-border bg-white text-slate-700 hover:border-border-strong hover:bg-slate-50 hover:text-slate-900",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-foreground hover:bg-surface-muted",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export function buttonClasses({ variant = "primary", size = "md", className } = {}) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({ variant, size, className, type = "button", ...props }) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}

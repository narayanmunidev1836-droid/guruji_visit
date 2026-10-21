"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

const DURATION = { success: 4000, error: 6000 }; // ms until a toast closes by itself (errors stay a little longer)

const ToastContext = createContext(null);

/** `const toast = useToast(); toast.success("Saved.")` / `toast.error("...")`. Toasts close by themselves. */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

/**
 * Shows the toasts at the top right. The stack is a popover, which lives in the browser's "top layer", so a toast is also
 * visible above an open dialog (a normal fixed element would be hidden behind the dialog's backdrop).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const stack = useRef(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (type, message) => {
      if (!message) return;
      const id = nextId.current++;
      // the same message is not stacked twice (e.g. suggestions failing on every key press)
      setToasts((list) => (list.some((toast) => toast.message === message) ? list : [...list.slice(-3), { id, type, message }]));
      setTimeout(() => dismiss(id), DURATION[type] ?? DURATION.success);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ success: (message) => show("success", message), error: (message) => show("error", message) }), [show]);

  useEffect(() => {
    const element = stack.current;
    if (!element || typeof element.showPopover !== "function") return;
    if (toasts.length === 0) {
      if (element.matches(":popover-open")) element.hidePopover();
      return;
    }
    if (element.matches(":popover-open")) element.hidePopover(); // re-open so it sits above a dialog opened meanwhile
    element.showPopover();
  }, [toasts]);

  return (
    <ToastContext value={api}>
      {children}
      <div
        ref={stack}
        popover="manual"
        aria-live="polite"
        className="pointer-events-none fixed inset-auto right-4 top-4 m-0 w-[min(24rem,calc(100vw-2rem))] overflow-visible border-0 bg-transparent p-0"
      >
        <div className="flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role={toast.type === "error" ? "alert" : "status"}
              className={clsx(
                "fade-up pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-sm shadow-card",
                toast.type === "error" ? "border-danger/40" : "border-success/40",
              )}
            >
              {toast.type === "error" ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />}
              <p className="min-w-0 flex-1 break-words text-foreground">{toast.message}</p>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Close" className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted hover:text-foreground">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext>
  );
}

/**
 * For a message that arrives with the page (a redirect with ?saved=1): shows it once as a toast and removes the parameter
 * from the address, so a refresh does not show it again.
 */
export function FlashToast({ message, param = "saved" }) {
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    toast.success(message);
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [toast, router, message, param]);
  return null;
}

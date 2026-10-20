"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";

/** Copies text (e.g. "HDD-001/2019/March/IMG_0001.jpg") to the clipboard. */
export function CopyButton({ text, label, copiedLabel, className, iconOnly = false }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs HTTPS / user permission; fall back to a temporary textarea.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={label}
      aria-label={label}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface text-sm font-medium hover:bg-surface-muted",
        iconOnly ? "h-8 w-8 justify-center" : "h-8 px-3",
        className,
      )}
    >
      {copied ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {!iconOnly && <span aria-live="polite">{copied ? copiedLabel : label}</span>}
    </button>
  );
}

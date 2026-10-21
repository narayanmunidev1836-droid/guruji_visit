"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { suggestPlaceAction } from "@/actions/haribhagats";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/inputs";

/**
 * Text input with suggestions taken from the Haribhagats already saved (village / taluko / district).
 * Controlled (`value` / `onChange`, plus `onPick(text)` for a chosen suggestion) or uncontrolled (`defaultValue`).
 * `context` narrows the suggestions to people whose other fields match (e.g. { jillo: "ANAND" } for talukas).
 * The user can always type something new; suggestions only help.
 */
export function SuggestInput({ field, context, value: controlledValue, defaultValue = "", onChange, onPick, readOnly, className, ...props }) {
  const [ownValue, setOwnValue] = useState(defaultValue ?? ""); // used when no `value` is passed
  const value = controlledValue ?? ownValue;
  const listId = useId();
  const toast = useToast();
  const root = useRef(null);
  const requestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const contextKey = JSON.stringify(context ?? {});

  useEffect(() => {
    if (!open || readOnly) return undefined;
    const current = ++requestId.current;
    const timer = setTimeout(async () => {
      let rows;
      try {
        rows = await suggestPlaceAction(field, value ?? "", JSON.parse(contextKey));
      } catch {
        toast.error("Suggestions could not be loaded. You can still type it.");
        return;
      }
      if (current === requestId.current) {
        setItems(rows);
        setActive(-1);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [open, value, field, contextKey, readOnly, toast]);

  const typed = (value ?? "").trim().toUpperCase();
  const shown = items.filter((item) => item.toUpperCase() !== typed); // nothing to suggest once the exact value is typed
  const visible = open && !readOnly && shown.length > 0;

  function pick(text) {
    setOwnValue(text);
    onPick?.(text);
    setOpen(false);
  }

  function onKeyDown(event) {
    if (!visible) {
      if (event.key === "ArrowDown" && !readOnly) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % shown.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? shown.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault(); // choose the suggestion, do not submit the form
      pick(shown[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Input
        {...props}
        value={value}
        readOnly={readOnly}
        onChange={(event) => {
          setOwnValue(event.target.value);
          onChange?.(event);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className={className}
      />
      {visible && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-surface p-1 shadow-card">
          {shown.map((item, index) => (
            <li key={item} role="option" aria-selected={index === active}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()} // keep focus in the input
                onClick={() => pick(item)}
                className={clsx("block w-full rounded-lg px-3 py-1.5 text-left text-sm", index === active ? "bg-primary-soft text-primary" : "hover:bg-surface-muted")}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

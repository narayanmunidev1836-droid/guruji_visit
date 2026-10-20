"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, History, X } from "lucide-react";
import { Input } from "@/components/ui/inputs";

/**
 * Dropdown you can search: click it (or press the Down arrow) to see the whole list, type to narrow it down, pick with the
 * mouse or Up / Down + Enter. Only a value from `options` ([{ value, label }]) can be chosen. Posts `name` = the value.
 * Controlled (`value` / `onChange(value)`) or uncontrolled (`defaultValue`).
 * An option with `recent: true` (see lib/recent.js) gets a "Last used" badge; while nothing is typed the list is split into
 * "Last used" and "All".
 */
const groupHeader = "px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted";

export function SearchableSelect({ name, options, value: controlledValue, defaultValue = "", onChange, placeholder = "Select…", disabled = false, required = false, clearable = true, className }) {
  const listId = useId();
  const root = useRef(null);
  const list = useRef(null);
  const [ownValue, setOwnValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? ownValue;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null); // null: show the chosen label; text: the user is searching
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.value === value);
  const text = query === null ? (selected?.label ?? value ?? "") : query;
  const needle = (query ?? "").trim().toLocaleLowerCase("en-US");
  const shown = needle ? options.filter((option) => option.label.toLocaleLowerCase("en-US").includes(needle)) : options;
  const grouped = !needle && shown.some((option) => option.recent); // headers only when there is something recent to separate

  useEffect(() => {
    if (!open) return;
    const row = list.current?.querySelector('[data-active="true"]');
    row?.scrollIntoView({ block: "nearest" });
  }, [open, active, query]);

  function choose(option) {
    const next = option ? option.value : "";
    setOwnValue(next);
    onChange?.(next);
    setQuery(null);
    setOpen(false);
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActive((index) => Math.min(index + 1, shown.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (open) {
        event.preventDefault(); // choose, do not submit the form
        if (shown[active]) choose(shown[active]);
      }
    } else if (event.key === "Escape") {
      setQuery(null);
      setOpen(false);
    }
  }

  return (
    <div
      ref={root}
      className={clsx("relative", className)}
      onBlur={(event) => {
        if (root.current?.contains(event.relatedTarget)) return;
        setQuery(null); // what was typed but not chosen is dropped
        setOpen(false);
      }}
    >
      <input type="hidden" name={name} value={value} />
      <Input
        value={text}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="pr-14"
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        {clearable && value && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear"
            title="Clear"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(null)}
            className="grid h-6 w-6 place-items-center rounded-md text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
        <ChevronDown aria-hidden className={clsx("pointer-events-none h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </span>

      {open && !disabled && (
        <ul ref={list} id={listId} role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-surface p-1 shadow-card">
          {shown.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No match</li>
          ) : (
            shown.map((option, index) => (
              <Fragment key={option.value}>
                {grouped && index === 0 && option.recent && <li className={groupHeader}>Last used</li>}
                {grouped && !option.recent && (index === 0 || shown[index - 1].recent) && <li className={clsx(groupHeader, index > 0 && "mt-1 border-t border-border pt-2")}>All</li>}
                <li role="option" aria-selected={option.value === value} data-active={index === active}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()} // keep focus in the box
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option)}
                    className={clsx("flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm", index === active ? "bg-surface-muted" : "", option.value === value && "font-semibold text-primary")}
                  >
                    <span className="min-w-0 flex-1">{option.label}</span>
                    {option.recent && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <History className="h-3 w-3" aria-hidden />
                        Last used
                      </span>
                    )}
                    {option.value === value && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                  </button>
                </li>
              </Fragment>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

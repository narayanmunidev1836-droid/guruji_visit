"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { isoToDisplay, maskDate, parseDisplayDate } from "@/lib/date-input";
import { Input } from "@/components/ui/inputs";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const FIRST_YEAR = 1950;

const pad = (n) => String(n).padStart(2, "0");
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match ? { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) } : null;
}

function today() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

const selectClass =
  "ui-select h-8 rounded-lg border border-border bg-white px-2 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20";

/**
 * Date field in the app's own style. You can TYPE the date as dd/mm/yyyy (digits only, the slashes appear by themselves) or
 * click the field / the calendar icon and pick it. Posts `name` as YYYY-MM-DD (empty when there is no valid date), exactly like
 * <input type="date">. Text that is not a complete, real date blocks the form with a message when it is submitted.
 */
export function DatePicker({ name, defaultValue = "", required = false, placeholder = "dd/mm/yyyy", className }) {
  const [value, setValue] = useState(defaultValue ?? ""); // YYYY-MM-DD or ""
  const [text, setText] = useState(isoToDisplay(defaultValue)); // what the box shows: dd/mm/yyyy
  const [open, setOpen] = useState(false);
  const field = useRef(null);
  const selected = parseIso(value);
  const now = today();
  const [view, setView] = useState({ y: (selected ?? now).y, m: (selected ?? now).m });
  const root = useRef(null);

  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return undefined;
    const onReset = () => {
      setValue("");
      setText("");
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  // Something typed that is not a complete, real date must not be submitted silently.
  const invalid = text !== "" && value === "";
  useEffect(() => {
    field.current?.setCustomValidity(invalid ? "Enter the date as dd/mm/yyyy." : "");
  }, [invalid]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (root.current && !root.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openCalendar() {
    if (open) return;
    const base = parseIso(value) ?? today();
    setView({ y: base.y, m: base.m });
    setOpen(true);
  }

  function toggle() {
    if (open) setOpen(false);
    else openCalendar();
  }

  function pick(iso) {
    setValue(iso);
    setText(isoToDisplay(iso));
    setOpen(false);
  }

  function onType(event) {
    const masked = maskDate(event.target.value);
    const iso = parseDisplayDate(masked);
    setText(masked);
    setValue(iso ?? "");
    if (iso) {
      const date = parseIso(iso);
      setView({ y: date.y, m: date.m }); // the calendar follows what is typed
    }
  }

  function shift(delta) {
    setView((current) => {
      const index = current.y * 12 + current.m + delta;
      return { y: Math.floor(index / 12), m: ((index % 12) + 12) % 12 };
    });
  }

  const firstWeekday = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const lastYear = Math.max(now.y + 1, view.y);
  const years = Array.from({ length: lastYear - Math.min(FIRST_YEAR, view.y) + 1 }, (_, i) => lastYear - i);

  return (
    <div
      ref={root}
      className={clsx("relative", className)}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget)) setOpen(false); // Tab moved away
      }}
    >
      {/* What the form posts: the date as YYYY-MM-DD. The visible box below does the "required" / validity check. */}
      <input type="hidden" name={name} value={value} />
      <Input
        ref={field}
        value={text}
        onChange={onType}
        onClick={openCalendar}
        required={required}
        inputMode="numeric"
        maxLength={10}
        autoComplete="off"
        placeholder={placeholder}
        aria-invalid={text.length === 10 && invalid ? true : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={clsx("pr-10", text.length === 10 && invalid && "border-danger focus:border-danger focus:ring-danger/20")}
      />
      <button type="button" onClick={toggle} aria-label="Open calendar" title="Open calendar" tabIndex={-1} className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-foreground">
        <CalendarDays aria-hidden className="h-4 w-4" />
      </button>

      {open && (
        <div role="dialog" aria-label="Choose date" className="fade-up absolute left-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-3 shadow-card">
          <div className="mb-2 flex items-center gap-1">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-primary-soft hover:text-primary">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex flex-1 items-center justify-center gap-1">
              <select aria-label="Month" value={view.m} onChange={(event) => setView((v) => ({ ...v, m: Number(event.target.value) }))} className={selectClass}>
                {MONTHS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
              <select aria-label="Year" value={view.y} onChange={(event) => setView((v) => ({ ...v, y: Number(event.target.value) }))} className={selectClass}>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-primary-soft hover:text-primary">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium text-muted">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
            {cells.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} />;
              const isSelected = selected && selected.y === view.y && selected.m === view.m && selected.d === day;
              const isToday = now.y === view.y && now.m === view.m && now.d === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(toIso(view.y, view.m, day))}
                  aria-pressed={Boolean(isSelected)}
                  className={clsx(
                    "mx-auto grid h-9 w-9 place-items-center rounded-full transition-colors",
                    isSelected ? "bg-brand font-semibold text-white shadow-brand" : "hover:bg-primary-soft hover:text-primary",
                    !isSelected && isToday && "font-semibold text-primary ring-1 ring-primary/40",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-medium text-primary">
            {required ? <span /> : (
              <button type="button" onClick={() => pick("")} className="rounded-md px-2 py-1 hover:bg-primary-soft">
                Clear
              </button>
            )}
            <button type="button" onClick={() => pick(toIso(now.y, now.m, now.d))} className="rounded-md px-2 py-1 hover:bg-primary-soft">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Search, Star, X } from "lucide-react";
import clsx from "clsx";
import { pickerSearchAction } from "@/actions/haribhagats";
import { useToast } from "@/components/ui/toast";
import { DebounceInput } from "@/components/ui/debounce-input";
import { Label } from "@/components/ui/inputs";

function describe(p) {
  const name = [p.name, p.fatherName, p.surname].filter(Boolean).join(" ");
  const place = [p.gam, p.jillo, p.mobileNo].filter(Boolean).join(", ");
  return { name, place };
}

/**
 * Multi-select for existing Haribhagats. Posts `haribhagatIds` (repeated) and `primaryHaribhagatId`.
 * Existing people are searched first so the same person is not created twice.
 */
export function HaribhagatPicker({ initial = [], initialPrimaryId = null, label, newPersonLabel }) {
  const [selected, setSelected] = useState(initial);
  const [primaryId, setPrimaryId] = useState(initialPrimaryId ?? initial[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [searchKey, setSearchKey] = useState(0); // changing it clears the search box
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);
  const toast = useToast();

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return undefined;
    const current = ++requestId.current;
    startTransition(async () => {
      let rows;
      try {
        rows = await pickerSearchAction(text);
      } catch {
        toast.error("Search failed. Please try again.");
        return;
      }
      if (current === requestId.current) {
        setResults(rows);
        setSearched(true);
      }
    });
    return undefined;
  }, [query, toast]);

  const selectedIds = new Set(selected.map((p) => p.id));
  const effectivePrimary = selectedIds.has(primaryId) ? primaryId : (selected[0]?.id ?? null);

  function add(person) {
    if (selectedIds.has(person.id)) return;
    setSelected((list) => [...list, person]);
    setQuery("");
    setResults([]);
    setSearched(false);
    setSearchKey((key) => key + 1);
  }

  function remove(id) {
    setSelected((list) => list.filter((p) => p.id !== id));
  }

  return (
    <div>
      <Label>{label}</Label>

      {selected.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {selected.map((p) => {
            const d = describe(p);
            const isPrimary = p.id === effectivePrimary;
            return (
              <li key={p.id} className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-muted py-1 pl-2 pr-1 text-sm">
                <input type="hidden" name="haribhagatIds" value={p.id} />
                <button
                  type="button"
                  onClick={() => setPrimaryId(p.id)}
                  aria-label={isPrimary ? "Primary person" : "Make primary person"}
                  title={isPrimary ? "Primary person" : "Make primary person"}
                  className="grid h-6 w-6 place-items-center rounded hover:bg-surface"
                >
                  <Star className={clsx("h-3.5 w-3.5", isPrimary ? "fill-primary text-primary" : "text-muted")} aria-hidden />
                </button>
                <span>
                  {d.name}
                  {d.place && <span className="text-muted"> · {d.place}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={`Remove ${d.name}`}
                  className="grid h-6 w-6 place-items-center rounded hover:bg-surface"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <input type="hidden" name="primaryHaribhagatId" value={effectivePrimary ?? ""} />

      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <DebounceInput
          key={searchKey}
          type="search"
          onDebouncedChange={(value) => {
            setQuery(value);
            if (value.trim().length < 2) {
              requestId.current += 1; // ignore any search still in flight
              setResults([]);
              setSearched(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault(); // Enter must not submit the visit form
          }}
          placeholder="Type name, surname or village to find a Haribhagat…"
          className="pl-10"
          autoComplete="off"
          aria-label={label}
        />
      </div>

      {(results.length > 0 || searched) && (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {results.map((p) => {
            const d = describe(p);
            const already = selectedIds.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => add(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium">{d.name}</span>
                    {d.place && <span className="block text-xs text-muted">{d.place}</span>}
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                </button>
              </li>
            );
          })}
          {searched && results.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matching Haribhagat found.</li>}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {pending ? "Searching…" : "The star marks the primary person. "}
        <a href="/haribhagats/new" target="_blank" rel="noopener" className="text-primary underline">
          {newPersonLabel}
        </a>{" "}
        (opens in a new tab, then search again here).
      </p>
    </div>
  );
}

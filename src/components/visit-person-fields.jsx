"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Loader2, Search, UserCheck, X } from "lucide-react";
import { haribhagatDetailsAction, pickerSearchAction } from "@/actions/haribhagats";
import { Field, SubmitButton, useFormState } from "@/components/ui/form";
import { Input, Label } from "@/components/ui/inputs";

const FIELDS = ["surname", "name", "fatherName", "mobileNo", "gam", "taluko", "jillo", "pincode"];
const EMPTY = Object.fromEntries(FIELDS.map((key) => [key, ""]));

function toValues(person) {
  return Object.fromEntries(FIELDS.map((key) => [key, person?.[key] ?? ""]));
}

function DuplicateWarning({ onUse }) {
  const { state } = useFormState();
  if (!state?.duplicates?.length) return null;
  return (
    <div role="alert" className="rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-warning">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {state.error}
      </p>
      <ul className="mt-3 space-y-2">
        {state.duplicates.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{[d.name, d.fatherName, d.surname].filter(Boolean).join(" ")}</span>
            <span className="text-muted">{[d.gam, d.jillo].filter(Boolean).join(", ")}</span>
            {d.sameMobile && <span className="rounded bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-warning">same mobile number</span>}
            <button type="button" onClick={() => onUse(d.id)} className="font-medium text-primary underline">
              Use this person
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <SubmitButton name="confirmDuplicate" value="1" variant="secondary" size="sm">
          It is a different person - save as new
        </SubmitButton>
      </div>
    </div>
  );
}

/**
 * Haribhagat part of the "new visit" form: search an existing Haribhagat (the details below are filled in), or type the
 * details of a new one (surname, name, father name, mobile, ...). Posts `haribhagatIds` for an existing person, otherwise
 * the typed fields, from which the server creates the Haribhagat together with the visit.
 */
export function VisitPersonFields({ initialPerson = null, canSeeMobile, labels }) {
  const [person, setPerson] = useState(initialPerson);
  const [values, setValues] = useState(toValues(initialPerson));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, startSearch] = useTransition();
  const [loading, startLoad] = useTransition();
  const requestId = useRef(0);
  const locked = Boolean(person);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return undefined;
    const current = ++requestId.current;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const rows = await pickerSearchAction(text);
        if (current === requestId.current) {
          setResults(rows);
          setSearched(true);
        }
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function select(id) {
    startLoad(async () => {
      const details = await haribhagatDetailsAction(id);
      if (!details) return;
      setPerson(details);
      setValues(toValues(details));
      setQuery("");
      setResults([]);
      setSearched(false);
    });
  }

  function clear() {
    setPerson(null);
    setValues(EMPTY);
  }

  const bind = (key) => ({
    value: values[key],
    onChange: (event) => setValues((current) => ({ ...current, [key]: event.target.value })),
    readOnly: locked,
    className: locked ? "bg-slate-50 text-slate-600" : undefined,
    autoComplete: "off",
  });

  return (
    <div className="space-y-3">
      {person && <input type="hidden" name="haribhagatIds" value={person.id} />}

      <div>
        <Label>{labels.haribhagats}</Label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault(); // Enter must not submit the visit form
            }}
            placeholder="Search an existing Haribhagat by name, surname or village…"
            className="pl-10"
            aria-label="Search Haribhagat"
            autoComplete="off"
          />
          {(searching || loading) && <Loader2 aria-hidden className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />}
        </div>

        {query.trim().length >= 2 && searched && (
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted">No Haribhagat found. Fill the details below to add a new one with this visit.</li>
            ) : (
              results.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => select(p.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-primary-soft">
                    <span className="font-medium">{[p.name, p.fatherName, p.surname].filter(Boolean).join(" ")}</span>
                    <span className="text-xs text-muted">{[p.gam, p.jillo].filter(Boolean).join(", ")}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {locked ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f0d0b8] bg-primary-soft px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-primary">
            <UserCheck className="h-4 w-4" aria-hidden /> Existing Haribhagat selected
          </span>
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <X className="h-4 w-4" aria-hidden /> Clear / add a new one
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">Not in the list? Fill in the details below - a new Haribhagat is saved together with this visit.</p>
      )}

      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={labels.surname} name="surname" required={!locked}>
          <Input name="surname" maxLength={100} {...bind("surname")} />
        </Field>
        <Field label={labels.name} name="name" required={!locked}>
          <Input name="name" maxLength={100} {...bind("name")} />
        </Field>
        <Field label={labels.fatherName} name="fatherName">
          <Input name="fatherName" maxLength={100} {...bind("fatherName")} />
        </Field>
        {canSeeMobile && (
          <Field label={labels.mobileNo} name="mobileNo">
            <Input name="mobileNo" inputMode="tel" maxLength={20} placeholder={locked ? undefined : "10 digits"} {...bind("mobileNo")} />
          </Field>
        )}
        <Field label={labels.gam} name="gam">
          <Input name="gam" maxLength={100} {...bind("gam")} />
        </Field>
        <Field label={labels.taluko} name="taluko">
          <Input name="taluko" maxLength={100} {...bind("taluko")} />
        </Field>
        <Field label={labels.jillo} name="jillo">
          <Input name="jillo" maxLength={100} {...bind("jillo")} />
        </Field>
        <Field label={labels.pincode} name="pincode">
          <Input name="pincode" inputMode="numeric" maxLength={6} placeholder={locked ? undefined : "6 digits"} {...bind("pincode")} />
        </Field>
      </div>

      {!locked && <DuplicateWarning onUse={select} />}
    </div>
  );
}

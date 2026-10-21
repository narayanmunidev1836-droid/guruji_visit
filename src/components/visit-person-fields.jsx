"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Loader2, Search, UserPlus, X } from "lucide-react";
import { haribhagatDetailsAction, pickerSearchAction } from "@/actions/haribhagats";
import { Field, SubmitButton, useFormState } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DebounceInput } from "@/components/ui/debounce-input";
import { MobileInput } from "@/components/ui/mobile-input";
import { SuggestInput } from "@/components/ui/suggest-input";
import { StateSelect } from "@/components/state-select";
import { Input, Label } from "@/components/ui/inputs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { countryOptions, DEFAULT_COUNTRY, DEFAULT_STATE } from "@/lib/countries";

const FIELDS = ["surname", "name", "fatherName", "mobileNo", "gam", "taluko", "jillo", "state", "country", "pincode"];
// A new person starts with the usual state and country already filled in.
const EMPTY = { ...Object.fromEntries(FIELDS.map((key) => [key, ""])), state: DEFAULT_STATE, country: DEFAULT_COUNTRY };

function toValues(person) {
  return Object.fromEntries(FIELDS.map((key) => [key, person?.[key] ?? ""]));
}

/** What was typed in the search box, split into name / father name / surname ("Ramesh Kanji Patel"). Staff can correct it. */
function guessNewPerson(text) {
  const words = text.trim().split(/s+/).filter(Boolean);
  if (words.length === 0) return {};
  if (words.length === 1) return { name: words[0] };
  if (words.length === 2) return { name: words[0], surname: words[1] };
  return { name: words[0], fatherName: words.slice(1, -1).join(" "), surname: words[words.length - 1] };
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
export function VisitPersonFields({ initialPerson = null, canSeeMobile, labels, countries = [] }) {
  const [person, setPerson] = useState(initialPerson);
  const [values, setValues] = useState(initialPerson ? toValues(initialPerson) : EMPTY);
  const [query, setQuery] = useState("");
  const [searchKey, setSearchKey] = useState(0); // changing it clears the search box
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, startSearch] = useTransition();
  const [loading, startLoad] = useTransition();
  const requestId = useRef(0);
  const root = useRef(null);
  const toast = useToast();
  const locked = Boolean(person);

  useEffect(() => {
    if (countries.length === 0) toast.error("The country list could not be loaded. Type the country instead.");
  }, [countries.length, toast]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return undefined;
    const current = ++requestId.current;
    startSearch(async () => {
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

  /** Called by the search box once the user pauses typing. */
  function onQuery(value) {
    setQuery(value);
    if (value.trim().length < 2) {
      requestId.current += 1; // ignore any search still in flight
      setResults([]);
      setSearched(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSearched(false);
    setSearchKey((key) => key + 1);
  }

  function select(id) {
    startLoad(async () => {
      let details;
      try {
        details = await haribhagatDetailsAction(id);
      } catch {
        toast.error("The Haribhagat details could not be loaded. Please try again.");
        return;
      }
      if (!details) return;
      setPerson(details);
      setValues(toValues(details));
      clearSearch();
    });
  }

  function clear() {
    setPerson(null);
    setValues(EMPTY);
  }

  /** "Create" from the search box: start a new Haribhagat, prefilled from what was typed. */
  function createNew() {
    const guess = guessNewPerson(query);
    setPerson(null);
    setValues({ ...EMPTY, ...guess });
    clearSearch();
    setTimeout(() => root.current?.querySelector(`input[name="${guess.surname ? "fatherName" : "surname"}"]`)?.focus(), 0);
  }

  const hint = (text) => (locked ? undefined : text); // placeholders only while the person is being typed in
  const pick = (key) => (text) => setValues((current) => ({ ...current, [key]: text }));

  const bind = (key) => ({
    value: values[key],
    onChange: (event) => setValues((current) => ({ ...current, [key]: event.target.value })),
    readOnly: locked,
    className: locked ? "bg-slate-50 text-slate-600" : undefined,
    autoComplete: "off",
  });

  return (
    <div ref={root} className="space-y-3">
      {person && <input type="hidden" name="haribhagatIds" value={person.id} />}

      <div>
        <Label>{labels.haribhagats}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <DebounceInput
              key={searchKey}
              type="search"
              onDebouncedChange={onQuery}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault(); // Enter must not submit the visit form
              }}
              placeholder="Search an existing Haribhagat by name, surname, village or mobile…"
              className="pl-10"
              aria-label="Search Haribhagat"
              autoComplete="off"
            />
            {(searching || loading) && <Loader2 aria-hidden className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />}
        </div>
        {locked && (
          <Button type="button" variant="secondary" onClick={clear}>
            <X className="h-4 w-4" aria-hidden />
            Clear
          </Button>
        )}
        </div>

        {query.trim().length >= 2 && searched && (
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted">No Haribhagat found for “{query.trim()}”.</li>
            ) : (
              results.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => select(p.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-primary-soft">
                    <span className="font-medium">{[p.name, p.fatherName, p.surname].filter(Boolean).join(" ")}</span>
                    <span className="text-xs text-muted">{[p.gam, p.jillo, p.mobileNo].filter(Boolean).join(", ")}</span>
                  </button>
                </li>
              ))
            )}
            <li>
              <button type="button" onClick={createNew} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-primary-soft">
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                Create new Haribhagat “{query.trim()}”
              </button>
            </li>
          </ul>
        )}
      </div>

      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={labels.surname} name="surname" required={!locked}>
          <Input name="surname" maxLength={100} placeholder={hint("Surname")} {...bind("surname")} />
        </Field>
        <Field label={labels.name} name="name" required={!locked}>
          <Input name="name" maxLength={100} placeholder={hint("Name")} {...bind("name")} />
        </Field>
        <Field label={labels.fatherName} name="fatherName">
          <Input name="fatherName" maxLength={100} placeholder={hint("Father Name")} {...bind("fatherName")} />
        </Field>
        {canSeeMobile && (
          <Field label={labels.mobileNo} name="mobileNo">
            <MobileInput name="mobileNo" placeholder={locked ? undefined : "10 digits"} {...bind("mobileNo")} />
          </Field>
        )}
        <Field label={labels.pincode} name="pincode">
          <Input name="pincode" inputMode="numeric" maxLength={6} placeholder={locked ? undefined : "6 digits"} {...bind("pincode")} />
        </Field>
        <Field label={labels.gam} name="gam">
          <SuggestInput name="gam" field="gam" context={{ taluko: values.taluko, jillo: values.jillo, state: values.state, country: values.country }} maxLength={100} placeholder={hint("Village")} {...bind("gam")} onPick={pick("gam")} />
        </Field>
        <Field label={labels.taluko} name="taluko">
          <SuggestInput name="taluko" field="taluko" context={{ jillo: values.jillo, state: values.state, country: values.country }} maxLength={100} placeholder={hint("Taluko")} {...bind("taluko")} onPick={pick("taluko")} />
        </Field>
        <Field label={labels.jillo} name="jillo">
          <SuggestInput name="jillo" field="jillo" context={{ state: values.state, country: values.country }} maxLength={100} placeholder={hint("District")} {...bind("jillo")} onPick={pick("jillo")} />
        </Field>
        <Field label={labels.state} name="state">
          <StateSelect
            country={values.country}
            countries={countries}
            value={values.state}
            onChange={(state) => setValues((current) => ({ ...current, state }))}
            disabled={locked}
            placeholder={hint("State")}
          />
        </Field>
        <Field label={labels.country} name="country">
          {countries.length > 0 ? (
            <SearchableSelect
              name="country"
              value={values.country}
              onChange={(country) => setValues((current) => ({ ...current, country, state: country === DEFAULT_COUNTRY ? DEFAULT_STATE : "" }))}
              disabled={locked}
              placeholder="Search or select a country"
              options={countryOptions(countries, values.country)}
            />
          ) : (
            <SuggestInput name="country" field="country" maxLength={100} placeholder={hint("Type or pick a country")} {...bind("country")} onPick={pick("country")} />
          )}
        </Field>
      </div>

      {!locked && <DuplicateWarning onUse={select} />}
    </div>
  );
}

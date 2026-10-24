"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Loader2, Search, UserPlus, X } from "lucide-react";
import { haribhagatDetailsAction, pickerSearchAction } from "@/actions/haribhagats";
import { Field, SubmitButton, useFormState } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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

/**
 * What was typed in the search box, split into name / father name / surname ("Ramesh Kanji Patel"); a 10-digit number is the
 * mobile and a 6-digit number the pincode. Staff can correct it.
 */
function guessNewPerson(text) {
  const guess = {};
  const words = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const digits = word.replace(/\D/g, "");
    if (digits.length === 10 && /^[6-9]/.test(digits) && !guess.mobileNo) guess.mobileNo = digits;
    else if (digits.length === 6 && digits === word && !guess.pincode) guess.pincode = digits;
    else words.push(word);
  }
  if (words.length === 1) guess.name = words[0];
  else if (words.length === 2) Object.assign(guess, { name: words[0], surname: words[1] });
  else if (words.length > 2) Object.assign(guess, { name: words[0], fatherName: words.slice(1, -1).join(" "), surname: words[words.length - 1] });
  return guess;
}

/** "Select Haribhagat" window: live search with a table of matches; a row picks the person, "Create New" starts a new one. */
function PersonSearchModal({ canSeeMobile, loading, onSelect, onCreate, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, startSearch] = useTransition();
  const requestId = useRef(0);
  const body = useRef(null);
  const toast = useToast();
  const text = query.trim();

  useEffect(() => {
    // the <dialog> is opened by Modal's own effect, so focus the box a tick later
    const timer = setTimeout(() => body.current?.querySelector("input")?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (text.length < 1) return;
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
  }, [text, toast]);

  function onQuery(value) {
    setQuery(value);
    if (value.trim().length < 1) {
      requestId.current += 1; // ignore any search still in flight
      setResults([]);
      setSearched(false);
    }
  }

  const showMobile = canSeeMobile && results.some((p) => p.mobileNo);

  return (
    <Modal title="Select Haribhagat" onClose={onClose} wide fixed>
      <div ref={body} className="flex min-h-0 flex-1 flex-col">
        <Label className="shrink-0">Keyword to search Haribhagat</Label>
        <div className="relative shrink-0">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <DebounceInput
            type="search"
            onDebouncedChange={onQuery}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault(); // Enter must not submit the entry form
            }}
            placeholder="Name, father name, surname, village or mobile…"
            className="pl-10"
            aria-label="Search Haribhagat"
            autoComplete="off"
          />
          {(searching || loading) && <Loader2 aria-hidden className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-border">
          {text.length < 1 ? (
            <p className="px-4 py-6 text-sm text-muted">Type a letter to search.</p>
          ) : !searched ? (
            <p className="px-4 py-6 text-sm text-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No Haribhagat found for “{text}”.</p>
          ) : (
            <table className="w-full text-left text-base">
              <thead className="sticky top-0 border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">Village</th>
                  <th className="px-4 py-2.5 font-semibold">District</th>
                  {showMobile && <th className="px-4 py-2.5 font-semibold">Mobile</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((p) => (
                  <tr key={p.id} onClick={() => onSelect(p.id)} className="cursor-pointer hover:bg-primary-soft">
                    <td className="px-4 py-2.5 font-medium">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(p.id); }} className="text-left text-foreground hover:underline">
                        {[p.name, p.fatherName, p.surname].filter(Boolean).join(" ")}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">{p.gam}</td>
                    <td className="px-4 py-2.5">{p.jillo}</td>
                    {showMobile && <td className="px-4 py-2.5">{p.mobileNo}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={() => onCreate(query)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Create New
          </Button>
        </div>
      </div>
    </Modal>
  );
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, startLoad] = useTransition();
  const root = useRef(null);
  const toast = useToast();
  const locked = Boolean(person);

  useEffect(() => {
    if (countries.length === 0) toast.error("The country list could not be loaded. Type the country instead.");
  }, [countries.length, toast]);

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
      setSearchOpen(false);
    });
  }

  function clear() {
    setPerson(null);
    setValues(EMPTY);
  }

  /** "Create New" in the search window: start a new Haribhagat, prefilled from what was typed. */
  function createNew(text) {
    const guess = guessNewPerson(text);
    setPerson(null);
    setValues({ ...EMPTY, ...guess });
    setSearchOpen(false);
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
          <Button type="button" variant="secondary" className="flex-1 justify-start font-normal text-muted" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Search an existing Haribhagat by name, surname, village or mobile…</span>
          </Button>
          {locked && (
            <Button type="button" variant="secondary" onClick={clear}>
              <X className="h-4 w-4" aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </div>

      {searchOpen && <PersonSearchModal canSeeMobile={canSeeMobile} loading={loading} onSelect={select} onCreate={createNew} onClose={() => setSearchOpen(false)} />}

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
        <Field label={labels.gam} name="gam">
          <SuggestInput name="gam" field="gam" context={{ taluko: values.taluko, jillo: values.jillo, state: values.state, country: values.country }} maxLength={100} placeholder={hint("Village")} {...bind("gam")} onPick={pick("gam")} />
        </Field>
        <Field label={labels.taluko} name="taluko">
          <SuggestInput name="taluko" field="taluko" context={{ jillo: values.jillo, state: values.state, country: values.country }} maxLength={100} placeholder={hint("Taluko")} {...bind("taluko")} onPick={pick("taluko")} />
        </Field>
        <Field label={labels.jillo} name="jillo">
          <SuggestInput name="jillo" field="jillo" context={{ state: values.state, country: values.country }} maxLength={100} placeholder={hint("District")} {...bind("jillo")} onPick={pick("jillo")} />
        </Field>
        <Field label={labels.pincode} name="pincode">
          <Input name="pincode" inputMode="numeric" maxLength={6} placeholder={locked ? undefined : "6 digits"} {...bind("pincode")} />
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
      </div>

      {!locked && <DuplicateWarning onUse={select} />}
    </div>
  );
}

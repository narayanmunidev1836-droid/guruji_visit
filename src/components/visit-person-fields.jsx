"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Loader2, Search, UserPlus, X } from "lucide-react";
import { haribhagatDetailsAction } from "@/actions/haribhagats";
import { Field, SubmitButton, useFormState } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { DebounceInput } from "@/components/ui/debounce-input";
import { MobileInput } from "@/components/ui/mobile-input";
import { SuggestInput } from "@/components/ui/suggest-input";
import { Highlight } from "@/components/ui/highlight";
import { MemberAvatar } from "@/components/member-avatar";
import { StateSelect } from "@/components/state-select";
import { Input, Label } from "@/components/ui/inputs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { countryOptions, DEFAULT_COUNTRY, DEFAULT_STATE, placeFromMember } from "@/lib/countries";
import { formatDate } from "@/lib/format";

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

/** Browser console, development only (`raw` does not exist in production): the rows the Members API sent for this page of the search. */
function logDirectoryAnswer(text, raw) {
  if (!raw) return;
  console.log(`[Select Member] Members API response for "${text}": rows ${raw.offset + 1}-${raw.offset + raw.rows.length}`, raw.rows);
}

/**
 * "Select Member" window: live search over the saved Members AND the Members directory, one table. A saved Member is picked by
 * id (`onSelect`); a directory Member (`source: "directory"`, has a Member ID) fills the form as a new person (`onPickDirectory`).
 * "Create New" starts an empty new person.
 */
function PersonSearchModal({ canSeeMobile, loading, onSelect, onPickDirectory, onCreate, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [shownFor, setShownFor] = useState(""); // the search text the rows on screen belong to (they lag behind the box while typing)
  const [truncated, setTruncated] = useState(false); // the search hit the ceiling of rows, so more exist than can be listed
  const [searched, setSearched] = useState(false);
  const [failedFor, setFailedFor] = useState(""); // the search text whose search failed (so the spinner stops)
  // The directory is read a page at a time: `nextOffset` is where the next page starts, `hasMore` that there is one.
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false); // loading the next page failed: stop loading by itself until "try again"
  const warned = useRef(false); // the directory-down message is shown once per window, not on every keystroke
  const body = useRef(null);
  const listRef = useRef(null); // the scrolling list
  const endRef = useRef(null); // marker after the last row: when it comes into view, the next page is loaded
  const moreRequest = useRef(null); // AbortController of the next-page request in flight
  const toast = useToast();
  const text = query.trim();
  const searching = text.length > 0 && shownFor !== text && failedFor !== text; // the rows on screen are still those of an earlier text

  useEffect(() => {
    // the <dialog> is opened by Modal's own effect, so focus the box a tick later
    const timer = setTimeout(() => body.current?.querySelector("input")?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  // One search per text. Typing on cancels the search still running (cleanup -> abort), so a slow search for a broad word can
  // never hold back the next one; the server cancels its call to the directory too.
  useEffect(() => {
    if (text.length < 1) return;
    const controller = new AbortController();
    (async () => {
      let found;
      try {
        const response = await fetch(`/api/members/search?q=${encodeURIComponent(text)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        found = await response.json();
      } catch {
        if (controller.signal.aborted) return;
        setFailedFor(text);
        setLoadingMore(false);
        toast.error("Search failed. Please try again.");
        return;
      }
      setResults(found.rows);
      setShownFor(text);
      setTruncated(Boolean(found.truncated));
      setNextOffset(found.nextOffset ?? 0);
      setHasMore(Boolean(found.hasMore) && !found.directoryFailed);
      setLoadingMore(false);
      setMoreFailed(false);
      setSearched(true);
      logDirectoryAnswer(text, found.directoryRaw);
      if (found.directoryFailed && !warned.current) {
        warned.current = true;
        toast.error("The Members directory could not be searched. Only saved Members are listed.");
      }
    })();
    return () => {
      controller.abort();
      moreRequest.current?.abort(); // a next page of the previous text is of no use any more
    };
  }, [text, toast]);

  // The next page: when the marker after the last row comes into view (also when the first rows do not fill the list), the
  // next rows of the directory are fetched and appended, until there are none. One page at a time; a failure stops it.
  useEffect(() => {
    const end = endRef.current;
    const root = listRef.current;
    if (!end || !root || !hasMore || loadingMore || moreFailed || searching || !shownFor) return;
    let started = false;
    async function loadMore() {
      if (started) return;
      started = true;
      const controller = new AbortController();
      moreRequest.current = controller;
      setLoadingMore(true);
      let found;
      try {
        const response = await fetch(`/api/members/search?q=${encodeURIComponent(shownFor)}&offset=${nextOffset}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        found = await response.json();
      } catch {
        if (controller.signal.aborted) return; // the text changed: the new search resets everything
        setLoadingMore(false);
        setMoreFailed(true);
        toast.error("Could not load more Members. Use “Try again” at the end of the list.");
        return;
      }
      setResults((current) => {
        const seen = new Set(current.map((row) => row.key));
        return [...current, ...found.rows.filter((row) => !seen.has(row.key))];
      });
      setNextOffset(found.nextOffset ?? nextOffset);
      setHasMore(Boolean(found.hasMore) && !found.directoryFailed);
      setTruncated(Boolean(found.truncated));
      setLoadingMore(false);
      logDirectoryAnswer(shownFor, found.directoryRaw);
      if (found.directoryFailed) toast.error("The Members directory could not be searched. The list may be incomplete.");
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { root, rootMargin: "400px" });
    observer.observe(end);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, moreFailed, searching, nextOffset, shownFor, toast]);

  function onQuery(value) {
    setQuery(value);
    if (value.trim().length < 1) {
      moreRequest.current?.abort();
      setResults([]);
      setShownFor("");
      setTruncated(false);
      setNextOffset(0);
      setHasMore(false);
      setLoadingMore(false);
      setMoreFailed(false);
      setSearched(false);
    }
  }

  const showDirectory = results.some((p) => p.source === "directory"); // Member ID, Birthday and Type exist for directory Members only
  // Columns follow the first page and do not appear later (the table would jump while scrolling): the mobiles are always there for directory rows.
  const showMobile = canSeeMobile && (showDirectory || results.some((p) => p.mobileText || p.mobileNo));
  const showFatherMobile = canSeeMobile && showDirectory;
  const choose = (p) => (p.source === "directory" ? onPickDirectory(p) : onSelect(p.id));

  return (
    <Modal title="Select Member" onClose={onClose} wider fixed>
      <div ref={body} className="flex min-h-0 flex-1 flex-col">
        <Label className="shrink-0">Keyword to search Member</Label>
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
            aria-label="Search Member"
            autoComplete="off"
          />
          {(searching || loading) && <Loader2 aria-hidden className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />}
        </div>

        <div ref={listRef} className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-border">
          {text.length < 1 ? (
            <p className="px-4 py-6 text-sm text-muted">Type a letter to search.</p>
          ) : !searched ? (
            <p className="px-4 py-6 text-sm text-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No Member found for “{text}”.</p>
          ) : (
            <table className="w-full text-left text-base">
              <thead className="sticky top-0 border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  {showDirectory && <th className="px-4 py-2.5 font-semibold">Member ID</th>}
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  {showDirectory && <th className="px-4 py-2.5 font-semibold">Birthday</th>}
                  <th className="px-4 py-2.5 font-semibold">Village</th>
                  <th className="px-4 py-2.5 font-semibold">District</th>
                  {showMobile && <th className="px-4 py-2.5 font-semibold">Mobile</th>}
                  {showFatherMobile && <th className="px-4 py-2.5 font-semibold">Father Mobile</th>}
                  {showDirectory && <th className="px-4 py-2.5 font-semibold">Type</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((p) => (
                  <tr key={p.key} onClick={() => choose(p)} className="cursor-pointer hover:bg-primary-soft">
                    {showDirectory && <td className="px-4 py-2.5">{p.source === "directory" ? <Highlight text={String(p.displayMemberId)} query={shownFor} /> : ""}</td>}
                    <td className="px-4 py-2.5 font-medium">
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={p.name} surname={p.surname} photoUrl={p.photoUrl} />
                        <button type="button" onClick={(event) => { event.stopPropagation(); choose(p); }} className="text-left text-foreground hover:underline">
                          <Highlight text={[p.name, p.fatherName, p.surname].filter(Boolean).join(" ")} query={shownFor} />
                        </button>
                      </div>
                    </td>
                    {showDirectory && <td className="whitespace-nowrap px-4 py-2.5">{p.birthday ? formatDate(p.birthday) : ""}</td>}
                    <td className="px-4 py-2.5"><Highlight text={p.gam} query={shownFor} /></td>
                    <td className="px-4 py-2.5"><Highlight text={p.jillo} query={shownFor} /></td>
                    {showMobile && <td className="whitespace-nowrap px-4 py-2.5"><Highlight text={p.mobileText || p.mobileNo} query={shownFor} /></td>}
                    {showFatherMobile && <td className="whitespace-nowrap px-4 py-2.5"><Highlight text={p.fatherMobile} query={shownFor} /></td>}
                    {showDirectory && <td className="whitespace-nowrap px-4 py-2.5 text-sm text-muted">{(p.memberType ?? "").replace(/([a-z])([A-Z])/g, "$1 $2")}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {hasMore && results.length > 0 && (
            <div ref={endRef} className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-muted">
              {moreFailed ? (
                <button type="button" onClick={() => setMoreFailed(false)} className="font-medium text-primary underline">
                  Could not load more - try again
                </button>
              ) : (
                <>
                  <Loader2 aria-hidden className={loadingMore ? "h-4 w-4 animate-spin" : "h-4 w-4 opacity-40"} />
                  {loadingMore ? "Loading more Members…" : "Scroll down for more"}
                </>
              )}
            </div>
          )}
        </div>

        {searched && results.length > 0 && (
          <p className={truncated ? "mt-2 shrink-0 text-sm font-medium text-warning" : "mt-2 shrink-0 text-sm text-muted"}>
            {truncated
              ? `Only the first ${results.length.toLocaleString("en-IN")} Members are listed - there are more. Type more of the name to narrow the list.`
              : hasMore
                ? `${results.length.toLocaleString("en-IN")} Members shown - more load as you scroll down.`
                : `${results.length.toLocaleString("en-IN")} ${results.length === 1 ? "Member" : "Members"} found.`}
          </p>
        )}

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
        toast.error("The Member details could not be loaded. Please try again.");
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

  /**
   * A Member found only in the directory: fill the form as a NEW Haribhagat (saved together with the entry). Nothing is locked,
   * so staff can add what the directory does not have (taluko, district, state ...). If the person turns out to be saved
   * already, the usual "similar person" warning offers "Use this person".
   */
  function pickDirectory(member) {
    const { name, fatherName, surname, gam, pincode, mobileNo, dialCode } = member;
    setPerson(null);
    // country / state: from the city when it names a country ("CANADA", "USA"), else from the mobile's dial code (+91 or none: India / Gujarat)
    setValues({ ...EMPTY, ...placeFromMember({ city: gam, dialCode }, countries), name, fatherName, surname, gam, pincode, mobileNo: canSeeMobile ? mobileNo ?? "" : "" });
    setSearchOpen(false);
    setTimeout(() => root.current?.querySelector('input[name="taluko"]')?.focus(), 0);
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

      <div className="min-w-0">
        <Label>{labels.haribhagats}</Label>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="min-w-0 flex-1 justify-start overflow-hidden font-normal text-muted" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">Search an existing Member by name, surname, village or mobile…</span>
          </Button>
          {locked && (
            <Button type="button" variant="secondary" onClick={clear}>
              <X className="h-4 w-4" aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </div>

      {searchOpen && <PersonSearchModal canSeeMobile={canSeeMobile} loading={loading} onSelect={select} onPickDirectory={pickDirectory} onCreate={createNew} onClose={() => setSearchOpen(false)} />}

      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
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
            <MobileInput international name="mobileNo" placeholder={locked ? undefined : "10 digits or +code"} {...bind("mobileNo")} />
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

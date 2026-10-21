"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { saveHaribhagatAction } from "@/actions/haribhagats";
import { ActionForm, Field, FormActions, SubmitButton, useFormState } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { MobileInput } from "@/components/ui/mobile-input";
import { Input } from "@/components/ui/inputs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { countryOptions, DEFAULT_COUNTRY, DEFAULT_STATE } from "@/lib/countries";
import { SuggestInput } from "@/components/ui/suggest-input";
import { StateSelect } from "@/components/state-select";
import { useToast } from "@/components/ui/toast";

function DuplicateWarning() {
  const { state } = useFormState();
  if (!state?.duplicates?.length) return null;
  return (
    <div role="alert" className="mb-5 rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-warning">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {state.error}
      </p>
      <ul className="mt-3 space-y-2">
        {state.duplicates.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">
              {[d.name, d.fatherName, d.surname].filter(Boolean).join(" ")}
            </span>
            <span className="text-muted">{[d.gam, d.jillo].filter(Boolean).join(", ")}</span>
            {d.sameMobile && <span className="rounded bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-warning">same mobile number</span>}
            <Link href={`/haribhagats/${d.id}`} target="_blank" className="text-primary underline">
              Open existing record
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-muted">
        If this is a different person, use <strong>Save anyway</strong>. People are never merged automatically.
      </p>
      <div className="mt-3">
        <SubmitButton name="confirmDuplicate" value="1" variant="secondary" size="sm">
          Save anyway
        </SubmitButton>
      </div>
    </div>
  );
}

/** Closes the dialog once the server says the Haribhagat was saved (dialog mode only). */
function CloseWhenSaved({ onDone }) {
  const { state } = useFormState();
  useEffect(() => {
    if (state?.ok && state.saved) onDone?.();
  }, [state, onDone]);
  return null;
}

/**
 * Create / edit form for a Haribhagat. Pass `person` to edit. `modal` is for the dialog on the Haribhagats list: it stays on the
 * page, calls `onDone` after saving and `onCancel` for Cancel (instead of redirecting / linking away).
 */
export function HaribhagatForm({ person, labels, returnTo, countries = [], modal = false, onDone, onCancel }) {
  const v = person ?? {};
  const toast = useToast();
  useEffect(() => {
    if (countries.length === 0) toast.error("The country list could not be loaded. Type the country instead.");
  }, [countries.length, toast]);
  // The state list follows the chosen country, so both are controlled here. A new person starts as India / Gujarat.
  const [country, setCountry] = useState(v.country ?? (person ? "" : DEFAULT_COUNTRY));
  const [state, setState] = useState(v.state ?? (person ? "" : DEFAULT_STATE));
  return (
    <ActionForm action={saveHaribhagatAction}>
      {person && <input type="hidden" name="id" value={person.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {modal && <input type="hidden" name="modal" value="1" />}
      {modal && <CloseWhenSaved onDone={onDone} />}
      <DuplicateWarning />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.surname} name="surname" required>
          <Input name="surname" defaultValue={v.surname ?? ""} required maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.name} name="name" required>
          <Input name="name" defaultValue={v.name ?? ""} required maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.fatherName} name="fatherName">
          <Input name="fatherName" defaultValue={v.fatherName ?? ""} maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.gam} name="gam">
          <SuggestInput name="gam" field="gam" defaultValue={v.gam ?? ""} maxLength={100} />
        </Field>
        <Field label={labels.taluko} name="taluko">
          <SuggestInput name="taluko" field="taluko" defaultValue={v.taluko ?? ""} maxLength={100} />
        </Field>
        <Field label={labels.jillo} name="jillo">
          <SuggestInput name="jillo" field="jillo" defaultValue={v.jillo ?? ""} maxLength={100} />
        </Field>
        <Field label={labels.state} name="state">
          <StateSelect country={country} countries={countries} value={state} onChange={setState} />
        </Field>
        <Field label={labels.country} name="country">
          {countries.length > 0 ? (
            <SearchableSelect
              name="country"
              value={country}
              onChange={(next) => {
                setCountry(next);
                setState(next === DEFAULT_COUNTRY ? DEFAULT_STATE : "");
              }}
              placeholder="Search or select a country"
              options={countryOptions(countries, country)}
            />
          ) : (
            <SuggestInput name="country" field="country" defaultValue={v.country ?? (person ? "" : DEFAULT_COUNTRY)} maxLength={100} />
          )}
        </Field>
        <Field label={labels.pincode} name="pincode" hint="6 digits">
          <Input name="pincode" defaultValue={v.pincode ?? ""} inputMode="numeric" maxLength={6} autoComplete="off" />
        </Field>
        {labels.mobileNo !== null && (
          <Field label={labels.mobileNo} name="mobileNo" hint={v.mobileMasked ? "Hidden for your role. Leave empty to keep the stored number." : "10 digit mobile number"}>
            <MobileInput
              name="mobileNo"
              defaultValue={v.mobileMasked ? "" : (v.mobileNo ?? "")}
              placeholder={v.mobileMasked ? v.mobileNo : undefined}
              disabled={Boolean(v.mobileMasked)}
            />
          </Field>
        )}
      </div>
      {modal ? (
        // In the dialog: Cancel then Save, on the right.
        <FormActions className="justify-end">
          <button type="button" onClick={onCancel} className={buttonClasses({ variant: "secondary" })}>
            {labels.cancel}
          </button>
          <SubmitButton>{labels.save}</SubmitButton>
        </FormActions>
      ) : (
        <FormActions>
          <SubmitButton>{labels.save}</SubmitButton>
          <Link href={person ? `/haribhagats/${person.id}` : "/haribhagats"} className={buttonClasses({ variant: "secondary" })}>
            {labels.cancel}
          </Link>
        </FormActions>
      )}
    </ActionForm>
  );
}

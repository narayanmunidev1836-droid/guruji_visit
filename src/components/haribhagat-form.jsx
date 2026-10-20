"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { saveHaribhagatAction } from "@/actions/haribhagats";
import { ActionForm, Field, FormActions, SubmitButton, useFormState } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { MobileInput } from "@/components/ui/mobile-input";
import { Input } from "@/components/ui/inputs";

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

/** Create / edit form for a Haribhagat. Pass `person` to edit. */
export function HaribhagatForm({ person, labels, returnTo }) {
  const v = person ?? {};
  return (
    <ActionForm action={saveHaribhagatAction}>
      {person && <input type="hidden" name="id" value={person.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <DuplicateWarning />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.name} name="name" required>
          <Input name="name" defaultValue={v.name ?? ""} required maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.fatherName} name="fatherName">
          <Input name="fatherName" defaultValue={v.fatherName ?? ""} maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.surname} name="surname" required>
          <Input name="surname" defaultValue={v.surname ?? ""} required maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.gam} name="gam">
          <Input name="gam" defaultValue={v.gam ?? ""} maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.taluko} name="taluko">
          <Input name="taluko" defaultValue={v.taluko ?? ""} maxLength={100} autoComplete="off" />
        </Field>
        <Field label={labels.jillo} name="jillo">
          <Input name="jillo" defaultValue={v.jillo ?? ""} maxLength={100} autoComplete="off" />
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
      <FormActions>
        <SubmitButton>{labels.save}</SubmitButton>
        <Link href={person ? `/haribhagats/${person.id}` : "/haribhagats"} className={buttonClasses({ variant: "secondary" })}>
          {labels.cancel}
        </Link>
      </FormActions>
    </ActionForm>
  );
}

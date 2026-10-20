"use client";

import { useState } from "react";
import Link from "next/link";
import { createVisitAction, updateVisitAction } from "@/actions/visits";
import { ActionForm, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Select, Textarea } from "@/components/ui/inputs";
import { HaribhagatPicker } from "@/components/haribhagat-picker";
import { SavedEntryDialog } from "@/components/saved-entry-dialog";
import { VisitPersonFields } from "@/components/visit-person-fields";

/**
 * Create / edit a visit: Haribhagat(s) + the hard disk and folder where their photos are kept.
 * Event, date and place are required; notes are optional.
 */
export function VisitForm(props) {
  // A new entry: after the "Entry saved" dialog is closed the whole form is replaced by a fresh, empty one.
  const [round, setRound] = useState(0);
  return (
    <VisitFormFields
      key={round}
      {...props}
      initialPerson={round === 0 ? props.initialPerson : null}
      onNewEntry={() => {
        setRound((value) => value + 1);
        window.scrollTo({ top: 0 });
      }}
    />
  );
}

function VisitFormFields({ visit, events, disks, placeTypes, selectedPeople, initialPerson, canSeeMobile = true, labels, onNewEntry }) {
  const editing = Boolean(visit);
  const action = editing ? updateVisitAction : createVisitAction;
  return (
    <ActionForm action={action}>
      {editing && <input type="hidden" name="id" value={visit.id} />}
      {!editing && <SavedEntryDialog onClose={onNewEntry} />}

      <div className="space-y-4">
        {editing ? (
          <HaribhagatPicker
            initial={selectedPeople}
            initialPrimaryId={visit?.primaryId ?? null}
            label={`1. ${labels.haribhagats}`}
            newPersonLabel="Add a new Haribhagat"
          />
        ) : (
          <VisitPersonFields initialPerson={initialPerson ?? null} canSeeMobile={canSeeMobile} labels={{ ...labels, haribhagats: `1. ${labels.haribhagats}` }} />
        )}

        <div className="grid gap-x-3 gap-y-3 sm:grid-cols-3">
          <Field label={labels.eventName} name="eventId" required>
            <Select
              name="eventId"
              required
              defaultValue={visit?.eventId ?? ""}
              placeholder="Select…"
              options={events.map((e) => ({ value: e.id, label: e.isActive ? e.name : `${e.name} (inactive)` }))}
            />
          </Field>
          <Field label={labels.date} name="visitDate" required>
            <DatePicker name="visitDate" required defaultValue={visit?.visitDate ?? ""} />
          </Field>
          <Field label={labels.placeType} name="placeType" required>
            <Select name="placeType" required defaultValue={visit?.placeType ?? ""} placeholder="Select…" options={placeTypes} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <Field label={`2. ${labels.hardDiskName}`} name="hardDiskId" required>
            <Select
              name="hardDiskId"
              required
              defaultValue={visit?.hardDiskId ?? ""}
              placeholder="Select…"
              options={disks.map((d) => ({ value: d.id, label: d.isActive === false ? `${d.labelName} (inactive)` : d.labelName }))}
            />
          </Field>
          <Field
            label={`3. ${labels.folder}`}
            name="folderPath"
            required
            hint="Path inside the disk; a pasted Windows path is fine (drive letter dropped)."
          >
            <Input name="folderPath" required defaultValue={visit?.folderPath ?? ""} autoComplete="off" placeholder="e.g. 2019/March/Patel Home" />
          </Field>
        </div>

        <Field label={labels.notes} name="notes">
          <Textarea name="notes" rows={2} defaultValue={visit?.notes ?? ""} maxLength={1000} />
        </Field>
      </div>

      <FormActions className="mt-4 justify-end">
        <Link href={editing ? `/visits/${visit.id}` : "/search"} className={buttonClasses({ variant: "secondary" })}>
          {labels.cancel}
        </Link>
        <SubmitButton>{labels.save}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

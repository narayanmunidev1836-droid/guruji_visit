"use client";

import Link from "next/link";
import { createVisitAction, updateVisitAction } from "@/actions/visits";
import { ActionForm, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/inputs";
import { HaribhagatPicker } from "@/components/haribhagat-picker";
import { VisitPersonFields } from "@/components/visit-person-fields";

/**
 * Create / edit a visit: Haribhagat(s) + the hard disk and folder where their photos are kept.
 * Event, date, place and notes are optional extras.
 */
export function VisitForm({ visit, events, disks, placeTypes, selectedPeople, initialPerson, canSeeMobile = true, labels }) {
  const editing = Boolean(visit);
  const action = editing ? updateVisitAction : createVisitAction;
  return (
    <ActionForm action={action}>
      {editing && <input type="hidden" name="id" value={visit.id} />}

      <div className="space-y-6">
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

        <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr]">
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
            hint="Folder inside the disk, e.g. MUKT SWAMI DATA/decstop. A pasted Windows path is fine (the drive letter is dropped). Leave empty for the disk root."
          >
            <Input name="folderPath" defaultValue={visit?.folderPath ?? ""} autoComplete="off" placeholder="e.g. 2019/March/Patel Home" />
          </Field>
        </div>

        <details className="group rounded-xl border border-border bg-slate-50/60 open:bg-transparent" open={editing && Boolean(visit.eventId || visit.visitDate || visit.placeType || visit.notes)}>
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-primary">More details (optional): event, date, place, notes</summary>
          <div className="space-y-4 px-4 pb-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={labels.eventName} name="eventId">
                <Select
                  name="eventId"
                  defaultValue={visit?.eventId ?? ""}
                  placeholder="Not specified"
                  options={events.map((e) => ({ value: e.id, label: e.isActive ? e.name : `${e.name} (inactive)` }))}
                />
              </Field>
              <Field label={labels.date} name="visitDate">
                <Input type="date" name="visitDate" defaultValue={visit?.visitDate ?? ""} />
              </Field>
              <Field label={labels.placeType} name="placeType">
                <Select name="placeType" defaultValue={visit?.placeType ?? ""} placeholder="Not specified" options={placeTypes} />
              </Field>
            </div>
            <Field label={labels.notes} name="notes">
              <Textarea name="notes" defaultValue={visit?.notes ?? ""} maxLength={1000} />
            </Field>
          </div>
        </details>
      </div>

      <FormActions>
        <SubmitButton>{labels.save}</SubmitButton>
        <Link href={editing ? `/visits/${visit.id}` : "/visits"} className={buttonClasses({ variant: "secondary" })}>
          {labels.cancel}
        </Link>
      </FormActions>
    </ActionForm>
  );
}

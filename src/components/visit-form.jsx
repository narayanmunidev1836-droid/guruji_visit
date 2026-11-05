"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { createVisitAction, updateVisitAction } from "@/actions/visits";
import { ActionForm, Field, FormActions, SubmitButton } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Textarea } from "@/components/ui/inputs";
import { withRecent } from "@/lib/recent";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { HaribhagatPicker } from "@/components/haribhagat-picker";
import { SavedEntryDialog } from "@/components/saved-entry-dialog";
import { VisitPersonFields } from "@/components/visit-person-fields";

// the form is two boxes: the Member, then where / what the entry is (date, event, place, disk, photo/video, path, notes)
const sectionBox = "rounded-2xl border border-border bg-surface-muted/50 p-3";

/**
 * Create / edit a visit: Haribhagat(s) + the hard disk, the kind of files (Photo or Video) and the path where they are kept.
 * Event, date, place, hard disk, Photo / Video and path are required; notes are optional. Photos and videos are kept in different
 * paths, so a visit that has both is entered twice (once as Photo, once as Video).
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

function VisitFormFields({ visit, events, disks, placeTypes, selectedPeople, initialPerson, canSeeMobile = true, countries, recentDiskIds = [], recentEventIds = [], mediaTypes, labels, onNewEntry }) {
  const editing = Boolean(visit);
  const action = editing ? updateVisitAction : createVisitAction;
  return (
    <ActionForm action={action}>
      {editing && <input type="hidden" name="id" value={visit.id} />}
      {!editing && <SavedEntryDialog onClose={onNewEntry} />}

      <div className="space-y-4">
        <div className={sectionBox}>
        {editing ? (
          <HaribhagatPicker
            initial={selectedPeople}
            initialPrimaryId={visit?.primaryId ?? null}
            label={`1. ${labels.haribhagats}`}
            newPersonLabel="Add a new Member"
          />
        ) : (
          <VisitPersonFields initialPerson={initialPerson ?? null} canSeeMobile={canSeeMobile} countries={countries} labels={{ ...labels, haribhagats: `1. ${labels.haribhagats}` }} />
        )}
        </div>

        <div className={clsx(sectionBox, "space-y-3")}>
        <div className="grid gap-x-3 gap-y-3 sm:grid-cols-3">
          <Field label={labels.date} name="visitDate" required>
            <DatePicker name="visitDate" required defaultValue={visit?.visitDate ?? ""} />
          </Field>
          <Field label={labels.eventName} name="eventId" required>
            <SearchableSelect
              name="eventId"
              required
              defaultValue={visit?.eventId ?? ""}
              placeholder="Search or select an event"
              clearable={false}
              options={withRecent(events.map((e) => ({ value: e.id, label: e.isActive ? e.name : `${e.name} (inactive)` })), recentEventIds)}
            />
          </Field>
          <Field label={labels.placeType} name="placeType" required>
            <SearchableSelect name="placeType" required defaultValue={visit?.placeType ?? ""} placeholder="Search or select a place" clearable={false} options={placeTypes} />
          </Field>
        </div>

        {/* the hard disk, then Photo or Video (they are kept in different paths) and the path of that kind */}
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr]">
          <Field label={`2. ${labels.hardDiskName}`} name="hardDiskId" required>
            <SearchableSelect
              name="hardDiskId"
              required
              defaultValue={visit?.hardDiskId ?? ""}
              placeholder="Search or select a hard disk"
              clearable={false}
              options={withRecent(disks.map((d) => ({ value: d.id, label: d.isActive === false ? `${d.labelName} (inactive)` : d.labelName })), recentDiskIds)}
            />
          </Field>
          <Field label={`3. ${labels.mediaType}`} name="mediaType" required>
            <SearchableSelect name="mediaType" required defaultValue={visit?.mediaType ?? ""} placeholder="Select photo or video" clearable={false} options={mediaTypes} />
          </Field>
          <Field label={`4. ${labels.folder}`} name="folderPath" required>
            <Input name="folderPath" required defaultValue={visit?.folderPath ?? ""} autoComplete="off" placeholder="e.g. 2019/March/Patel Home" />
          </Field>
        </div>

        <Field label={labels.notes} name="notes">
          <Textarea name="notes" rows={1} placeholder="Anything worth remembering (optional)" defaultValue={visit?.notes ?? ""} maxLength={1000} />
        </Field>
        </div>
      </div>

      <FormActions className="mt-3 justify-end">
        <Link href={editing ? `/visits/${visit.id}` : "/search"} className={buttonClasses({ variant: "secondary" })}>
          {labels.cancel}
        </Link>
        <SubmitButton>{labels.save}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

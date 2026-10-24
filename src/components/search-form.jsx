import { Search } from "lucide-react";
import { t } from "@/lib/labels";
import { placeTypeOptions } from "@/lib/ui-labels";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DebounceInput } from "@/components/ui/debounce-input";
import { GetForm } from "@/components/ui/get-form";
import { MobileInput } from "@/components/ui/mobile-input";
import { Input, Label, Select } from "@/components/ui/inputs";

function F({ label, children, className }) {
  return (
    <label className={className}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}

/**
 * Visit search form (GET form that navigates client-side without a page reload, searches while typing, keeps the URL shareable and works without JavaScript).
 * Event and hard disk options are passed in from database rows - nothing is hardcoded here.
 */
export function SearchForm({ values, events, disks, allowMobile }) {
  const eventOptions = events.map((e) => ({ value: e.id, label: e.isActive ? e.name : `${e.name} (${t("inactive")})` }));
  const diskOptions = disks.map((d) => ({ value: d.id, label: d.isActive ? d.labelName : `${d.labelName} (${t("inactive")})` }));
  const advanced = ["name", "fatherName", "surname", "gam", "taluko", "jillo", "pincode", "mobileNo", "dateFrom", "dateTo", "eventId", "hardDiskId", "placeType", "folder"].some(
    (k) => values[k] !== undefined && values[k] !== null && values[k] !== "",
  );

  return (
    <GetForm action="/search" role="search" className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      {values.haribhagatId && <input type="hidden" name="haribhagatId" value={values.haribhagatId} />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <DebounceInput
            name="q"
            type="search"
            submitOnChange
            defaultValue={values.q ?? ""}
            placeholder="Search a Member: name, surname, village, mobile, disk, path…"
            className="pl-10"
            aria-label={t("search")}
          />
        </div>
        <Button type="submit">{t("searchAction")}</Button>
        <Button type="reset" variant="secondary">
          {t("reset")}
        </Button>
      </div>

      <details className="mt-4 group" open={advanced}>
        <summary className="cursor-pointer select-none text-sm font-medium text-primary">Filters</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <F label={t("name")}>
            <Input name="name" defaultValue={values.name ?? ""} />
          </F>
          <F label={t("fatherName")}>
            <Input name="fatherName" defaultValue={values.fatherName ?? ""} />
          </F>
          <F label={t("surname")}>
            <Input name="surname" defaultValue={values.surname ?? ""} />
          </F>
          <F label={t("gam")}>
            <Input name="gam" defaultValue={values.gam ?? ""} />
          </F>
          <F label={t("taluko")}>
            <Input name="taluko" defaultValue={values.taluko ?? ""} />
          </F>
          <F label={t("jillo")}>
            <Input name="jillo" defaultValue={values.jillo ?? ""} />
          </F>
          <F label={t("pincode")}>
            <Input name="pincode" inputMode="numeric" defaultValue={values.pincode ?? ""} />
          </F>
          {allowMobile && (
            <F label={t("mobileNo")}>
              <MobileInput name="mobileNo" defaultValue={values.mobileNo ?? ""} />
            </F>
          )}
          <F label={t("dateFrom")}>
            <DatePicker name="dateFrom" defaultValue={values.dateFrom ?? ""} />
          </F>
          <F label={t("dateTo")}>
            <DatePicker name="dateTo" defaultValue={values.dateTo ?? ""} />
          </F>
          <F label={t("eventName")}>
            <Select name="eventId" defaultValue={values.eventId ?? ""} options={eventOptions} placeholder={t("all")} />
          </F>
          <F label={t("hardDiskName")}>
            <Select name="hardDiskId" defaultValue={values.hardDiskId ?? ""} options={diskOptions} placeholder={t("all")} />
          </F>
          <F label={t("placeType")}>
            <Select name="placeType" defaultValue={values.placeType ?? ""} options={placeTypeOptions()} placeholder={t("all")} />
          </F>
          <F label="Path (on disk)" className="sm:col-span-2">
            <Input name="folder" defaultValue={values.folder ?? ""} placeholder="e.g. 2019/March" />
          </F>
        </div>
      </details>
    </GetForm>
  );
}

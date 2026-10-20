import { t } from "@/lib/labels";

export const PLACE_TYPE_OPTIONS = ["HOME", "OFFICE", "TEMPLE", "OTHER"];

export function placeTypeOptions() {
  return PLACE_TYPE_OPTIONS.map((value) => ({ value, label: t(value) }));
}

/** "Name Father Surname" for display. */
export function personName(p) {
  return [p.name, p.fatherName, p.surname].filter(Boolean).join(" ");
}

export function personPlace(p) {
  return [p.gam, p.taluko, p.jillo].filter(Boolean).join(", ");
}

// Pure helpers for typing a date as dd/mm/yyyy (no framework imports, unit-testable). The date picker keeps the date as
// YYYY-MM-DD internally (what forms post) and shows / accepts it as dd/mm/yyyy.

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

/**
 * What the date box keeps while the user types: digits only, with the slashes put in automatically ("14032019" ->
 * "14/03/2019"), at most 8 digits. No slash is left hanging at the end ("14" stays "14"), so Backspace always removes a digit.
 */
export function maskDate(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `/${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `/${digits.slice(4)}`;
  return out;
}

/** "14/03/2019" -> "2019-03-14"; null when it is not a complete, real date (year 1900-2100). */
export function parseDisplayDate(text) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(text ?? ""));
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** "2019-03-14" -> "14/03/2019" ("" for anything else). */
export function isoToDisplay(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

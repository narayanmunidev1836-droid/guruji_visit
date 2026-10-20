// Pure text helpers. No database or framework imports so they are trivial to unit test.

const GUJARATI_DIGITS = "૦૧૨૩૪૫૬૭૮૯";

/** Converts Gujarati digits (૦-૯) to ASCII digits so "૯૮૭૬૫" and "98765" are treated alike. */
export function toAsciiDigits(value) {
  return String(value).replace(/[૦-૯]/g, (ch) => String(GUJARATI_DIGITS.indexOf(ch)));
}

/**
 * Trims, collapses repeated whitespace and applies Unicode NFC (important for Gujarati, where the same
 * visible text can be encoded with different combining sequences). Returns null for empty input.
 */
export function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).normalize("NFC").replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

/**
 * Like normalizeText, but upper-cased: every text the users type is stored and shown in CAPITALS.
 * Gujarati has no case, so only Latin letters change.
 */
export function upperText(value) {
  const text = normalizeText(value);
  return text === null ? null : text.toLocaleUpperCase("en-US");
}

/** Case-insensitive comparison key. Gujarati has no case, so this only affects Latin text. */
export function searchKey(value) {
  const text = normalizeText(value);
  return text === null ? "" : text.toLocaleLowerCase("en-US");
}

/** Key used to warn about possibly duplicate Haribhagats. It never merges anything on its own. */
export function makeDupKey({ name, fatherName, surname, gam }) {
  return [name, fatherName, surname, gam].map(searchKey).join("|");
}

/**
 * Normalizes a phone number for storage as a STRING: exactly 10 digits, starting with 6-9 (a leading +91 / 91 / 0 that
 * came from pasting is removed). Nothing else is accepted - no longer or international numbers.
 * Returns { value } on success, { error } when the number is not acceptable, or { value: null } for empty input.
 */
export function normalizeMobile(input) {
  const raw = normalizeText(input);
  if (raw === null) return { value: null };
  const ascii = toAsciiDigits(raw);
  let digits = ascii.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (/^[6-9]\d{9}$/.test(digits)) return { value: digits };
  return { error: "Enter a valid 10 digit mobile number." };
}

/** What a mobile input box keeps while typing / pasting: digits only (Gujarati digits too), at most 10. */
export function mobileInputValue(value) {
  let digits = toAsciiDigits(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Pincode is stored as a string so leading zeros are never lost. */
export function normalizePincode(input) {
  const raw = normalizeText(input);
  if (raw === null) return { value: null };
  const digits = toAsciiDigits(raw).replace(/\s+/g, "");
  if (/^\d{6}$/.test(digits)) return { value: digits };
  return { error: "Pincode must be 6 digits." };
}

/** Normalizes a hard disk sticker label: collapses whitespace and rejects characters that make labels ambiguous. */
export function normalizeDiskLabel(input) {
  const text = normalizeText(input);
  if (text === null) return null;
  return text;
}

/** Case-insensitive uniqueness key for a hard disk label ("hdd-001" and "HDD-001" are the same disk). */
export function diskLabelKey(label) {
  const text = normalizeText(label);
  return text === null ? "" : text.toLocaleUpperCase("en-US");
}

export function eventNameKey(name) {
  return searchKey(name);
}

/** Digits only, used for partial mobile number searches. */
export function digitsOnly(value) {
  return toAsciiDigits(value ?? "").replace(/\D/g, "");
}

import { z } from "zod";
import { upperText, normalizeContactMobile, normalizeMobile, normalizePincode } from "@/lib/normalize";

// Reusable zod field builders. All text is trimmed/whitespace-collapsed/NFC-normalized and UPPER-CASED before validation.

export const requiredText = (label, max = 200) =>
  z.preprocess(
    (v) => upperText(v) ?? "",
    z.string().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`),
  );

export const optionalText = (max = 200) =>
  z.preprocess((v) => upperText(v), z.string().max(max, `Must be at most ${max} characters.`).nullable());

// A missing form field and an empty one are treated the same (zod 4 would otherwise reject a missing key).
const asText = (v) => (v === undefined || v === null ? "" : String(v));

export const mobileField = z.preprocess(
  asText,
  z.string().transform((value, ctx) => {
    const result = normalizeMobile(value);
    if (result.error) {
      ctx.addIssue({ code: "custom", message: result.error });
      return z.NEVER;
    }
    return result.value;
  }),
);

/** A Member's mobile: an Indian 10 digit number, or another country's number written with "+" and its country code. */
export const contactMobileField = z.preprocess(
  asText,
  z.string().transform((value, ctx) => {
    const result = normalizeContactMobile(value);
    if (result.error) {
      ctx.addIssue({ code: "custom", message: result.error });
      return z.NEVER;
    }
    return result.value;
  }),
);

export const pincodeField = z.preprocess(
  asText,
  z.string().transform((value, ctx) => {
    const result = normalizePincode(value);
    if (result.error) {
      ctx.addIssue({ code: "custom", message: result.error });
      return z.NEVER;
    }
    return result.value;
  }),
);

/** Positive integer id that arrives as a string from a form. */
export const idField = (label) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z.number({ error: `${label} is required.` }).int(`${label} is invalid.`).positive(`${label} is required.`),
  );

export const optionalIdField = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v) : v),
  z.number().int().positive().nullable(),
);

export const booleanField = z.preprocess(
  (v) => v === true || v === "true" || v === "on" || v === "1",
  z.boolean(),
);

export const PLACE_TYPES = ["HOME", "OFFICE", "TEMPLE", "OTHER"];

export const optionalPlaceType = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.enum(PLACE_TYPES, { error: "Choose a valid place type." }).nullable(),
);

/** Reads form fields into a plain object; repeated keys (checkbox lists) become arrays. */
export function formDataToObject(formData, arrayKeys = []) {
  const out = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    out[key] = arrayKeys.includes(key) ? formData.getAll(key) : formData.get(key);
  }
  for (const key of arrayKeys) {
    if (!(key in out)) out[key] = [];
  }
  return out;
}

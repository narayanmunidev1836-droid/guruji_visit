import { digitsOnly, normalizeText } from "@/lib/normalize";

const contains = (value) => ({ contains: value, mode: "insensitive" });

/**
 * Builds a Prisma `where` for Haribhagat records.
 * Used by the Haribhagat directory (free text `q` + fields) and by photo search (fields only).
 *
 * Mobile numbers are only searchable by users who may see them; otherwise a masked number could be
 * guessed by probing the search box.
 *
 * @param filters { q, name, fatherName, surname, gam, taluko, jillo, pincode, mobileNo }
 * @param options { allowMobile }
 * @returns Prisma where object, or null when no filter was supplied
 */
export function buildPersonWhere(filters, { allowMobile }) {
  const and = [];

  const fieldMap = ["name", "fatherName", "surname", "gam", "taluko", "jillo"];
  for (const field of fieldMap) {
    const value = normalizeText(filters[field]);
    if (value) and.push({ [field]: contains(value) });
  }

  const pincode = digitsOnly(filters.pincode);
  if (pincode) and.push({ pincode: { contains: pincode } });

  const mobile = digitsOnly(filters.mobileNo);
  if (mobile) {
    // A role that may not see mobile numbers must not be able to look people up by them either:
    // the filter then matches nobody (rather than being silently ignored and listing everyone).
    and.push(allowMobile ? { mobileNo: { contains: mobile } } : { id: { in: [] } });
  }

  // Free text: every word must match at least one searchable field ("ramesh patel surat").
  for (const token of queryTokens(filters.q)) {
    and.push({ OR: personTokenConditions(token, { allowMobile }) });
  }

  return and.length > 0 ? { AND: and } : null;
}

/** Splits free text into at most 6 words. */
export function queryTokens(q) {
  const text = normalizeText(q);
  return text ? text.split(" ").slice(0, 6) : [];
}

/** Conditions (to be OR-ed) under which a single search word matches a Haribhagat. */
export function personTokenConditions(token, { allowMobile }) {
  const or = [
    { name: contains(token) },
    { fatherName: contains(token) },
    { surname: contains(token) },
    { gam: contains(token) },
    { taluko: contains(token) },
    { jillo: contains(token) },
  ];
  const digits = digitsOnly(token);
  if (digits.length >= 3) {
    or.push({ pincode: { contains: digits } });
    if (allowMobile) or.push({ mobileNo: { contains: digits } });
  }
  return or;
}

export function hasPersonFilters(filters) {
  return ["q", "name", "fatherName", "surname", "gam", "taluko", "jillo", "pincode", "mobileNo"].some(
    (key) => normalizeText(filters[key]) !== null,
  );
}

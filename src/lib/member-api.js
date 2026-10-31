import { makeDupKey, normalizeContactMobile, normalizeMobile, toAsciiDigits, upperText } from "@/lib/normalize";

const text = (value) => (upperText(value) ?? "").slice(0, 100);

/** The profile photo link of a directory entry, only when it is a real https address (it is used as an <img> source). */
function photoLink(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

/** A phone number for DISPLAY: Indian numbers as 10 digits, a number of another country with its dial code ("+1 5551234567"). */
function phoneText(value, dialCode) {
  const digits = toAsciiDigits(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const dial = String(dialCode ?? "").trim();
  if (dial && dial !== "+91") return `${dial} ${digits}`;
  return normalizeMobile(digits).value ?? digits;
}

/**
 * The mobile as the form stores it: a valid Indian 10 digit number, or "+" + country code + number when the dial code is another
 * country's ("+1" + "4164143653" -> "+14164143653"); "" when it cannot be used.
 */
function formMobile(value, dialCode) {
  const digits = toAsciiDigits(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const dial = String(dialCode ?? "").replace(/\s+/g, "");
  if (dial && dial !== "+91") return normalizeContactMobile(`${dial.replace(/^\+?/, "+")}${digits.replace(/^0+/, "")}`).value ?? "";
  return normalizeMobile(digits).value ?? "";
}

/** "YYYY-MM-DD" of a birthday such as "1981-06-29T00:00:00"; "" when it is missing, impossible, before 1900 or in the future. */
function birthdayText(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return "";
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real && year >= 1900 && date <= new Date() ? match[0] : "";
}

/**
 * Turns the answer of the Members directory (`GET /Member/GetSearchMembers`) into rows for the "Select Member" window.
 * Every entry is kept whatever its `memberType` ("Member", "LoginRequest" ...). Only the fields the window needs are passed on
 * (name, village, pincode, mobile, father's mobile, birthday, type, photo link): the API also sends Aadhaar / PAN numbers,
 * e-mail and much more, which must never reach the browser.
 * `memberId` is the directory's own number; `displayMemberId` is the number people know (shown in the window).
 * `mobileNo` is the number that fills the form (Indian 10 digits, or "+14164143653" for another country); `mobileText` /
 * `fatherMobile` are for display only. `dialCode` ("+91") of the member's mobile helps to pre-fill the country (`placeFromMember`).
 */
export function parseDirectoryMembers(body) {
  if (!Array.isArray(body)) return [];
  const rows = [];
  for (const item of body) {
    if (!item || typeof item !== "object") continue;
    const memberId = Number(item.memberId);
    const name = text(item.firstName);
    const surname = text(item.lastName);
    if (!Number.isInteger(memberId) || memberId <= 0 || (!name && !surname)) continue;
    const displayMemberId = Number(item.displayMemberId);
    const pincode = toAsciiDigits(item.pincode ?? "").replace(/\D/g, "");
    rows.push({
      source: "directory",
      key: `directory-${memberId}`,
      memberId,
      displayMemberId: Number.isInteger(displayMemberId) && displayMemberId > 0 ? displayMemberId : memberId,
      name,
      fatherName: text(item.fatherName),
      surname,
      gam: text(item.city),
      pincode: /^\d{6}$/.test(pincode) ? pincode : "",
      mobileNo: formMobile(item.mobile, item.mobileNoCountryCode),
      mobileText: phoneText(item.mobile, item.mobileNoCountryCode),
      dialCode: String(item.mobileNoCountryCode ?? "").trim().slice(0, 8),
      fatherMobile: phoneText(item.fatherMobile, item.fathersMobileCountryCode),
      birthday: birthdayText(item.birthday),
      memberType: String(item.memberType ?? "").trim().slice(0, 30),
      photoUrl: photoLink(item.profilePath),
    });
  }
  return rows;
}

/**
 * Saved Members first, then the directory ones that are not saved yet. A directory entry is dropped when a saved Member is
 * the same person (same mobile number, or same name + father name + surname + village), so nobody is listed twice.
 * Picking a saved Member keeps all of their entries together; picking a directory one starts a new Member.
 */
export function mergeMembers(saved, directory) {
  const savedRows = saved.map((row) => ({ ...row, source: "saved", key: `saved-${row.id}` }));
  const keys = new Set(savedRows.map((row) => makeDupKey(row)));
  const mobiles = new Set(savedRows.map((row) => row.mobileNo).filter(Boolean));
  const extra = directory.filter((row) => !keys.has(makeDupKey(row)) && !(row.mobileNo && mobiles.has(row.mobileNo)));
  return [...savedRows, ...extra];
}

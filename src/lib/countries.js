// Pure helpers for the country dropdown (no framework imports, unit-testable). The list itself comes from the free
// FIRST.org countries API, see src/lib/services/countries.js.

// Pre-filled when a NEW Haribhagat is typed in (stored values are CAPITALS); staff can change or clear them.
export const DEFAULT_COUNTRY = "INDIA";
export const DEFAULT_STATE = "GUJARAT";

// The country list (FIRST.org, ISO 3166 names) and the state lists (CountriesNow) are different services that spell some
// countries differently ("United States of America (the)" vs "United States"). So the list is built from FIRST.org by ISO
// code, using CountriesNow's spelling wherever it knows the code, plus the fixes below for the few it does not.

/** Nicer spelling for countries CountriesNow does not list by ISO code (these names also work for its state lists). */
const DISPLAY_FIXES = {
  "Korea (the Republic of)": "South Korea",
  "Korea (the Democratic People's Republic of)": "North Korea",
  "Tanzania, the United Republic of": "Tanzania",
  "Moldova (the Republic of)": "Moldova",
  "Bolivia (Plurinational State of)": "Bolivia",
};

/** Other spellings the state list API knows a country by, tried in this order after the name itself. */
const STATE_LOOKUP_ALIASES = {
  "Côte d'Ivoire": ["Ivory Coast"],
  "North Macedonia": ["Macedonia"],
  Eswatini: ["Swaziland"],
  "Cabo Verde": ["Cape Verde"],
  Czechia: ["Czech Republic"],
  Myanmar: ["Burma"],
};

/** Names to try, in order, when asking for the states of a country. */
export function stateLookupNames(country) {
  const name = String(country ?? "").trim();
  return name ? [name, ...(STATE_LOOKUP_ALIASES[name] ?? [])] : [];
}

/** "United States of America (the)" -> "United States of America"; "Western Sahara*" -> "Western Sahara". */
function cleanName(name) {
  const text = String(name).trim().replace(/\*+$/, "").replace(/\s*\(the\)$/i, "").trim();
  return DISPLAY_FIXES[text] ?? text;
}

/**
 * Country names for the dropdown from the FIRST.org body ({ data: { IN: { country } } }) and, optionally, the CountriesNow
 * ISO list body ({ data: [{ name, Iso2 }] }): CountriesNow's spelling wins when it knows the ISO code. Unique, A-Z.
 */
export function buildCountryList(firstBody, isoBody) {
  const data = firstBody && typeof firstBody === "object" ? firstBody.data : null;
  if (!data || typeof data !== "object") return [];
  const spelling = new Map();
  if (Array.isArray(isoBody?.data)) {
    for (const row of isoBody.data) if (row?.Iso2 && typeof row.name === "string") spelling.set(row.Iso2, row.name.trim());
  }
  const names = Object.entries(data)
    .map(([code, row]) => spelling.get(code) ?? (typeof row?.country === "string" ? cleanName(row.country) : ""))
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "en"));
}

/** Country names from the API response body ({ data: { IN: { country: "India" }, ... } }): trimmed, unique, A-Z. */
export function parseCountryNames(body) {
  const data = body && typeof body === "object" ? body.data : null;
  if (!data || typeof data !== "object") return [];
  const names = Object.values(data)
    .map((row) => row?.country)
    .filter((name) => typeof name === "string")
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "en"));
}

/** State names from the CountriesNow response ({ data: { states: [{ name }] } }): trimmed, unique, A-Z. */
export function parseStateNames(body) {
  const rows = body?.data?.states;
  if (!Array.isArray(rows)) return [];
  const names = rows.map((row) => row?.name).filter((name) => typeof name === "string").map((name) => name.trim()).filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * <option>s for the country <select>. Values are CAPITALS because that is how every typed text is stored; labels keep
 * the normal spelling. A value already saved on a Haribhagat that is not in the list is kept so editing never loses it.
 */
export function countryOptions(names, current) {
  const options = names.map((name) => ({ value: name.toLocaleUpperCase("en-US"), label: name }));
  const saved = String(current ?? "").trim();
  if (saved && !options.some((option) => option.value === saved.toLocaleUpperCase("en-US"))) {
    options.unshift({ value: saved, label: saved });
  }
  return options;
}

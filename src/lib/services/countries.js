import "server-only";
import { buildCountryList, parseStateNames, stateLookupNames } from "@/lib/countries";

// Free API, no key needed: https://api.first.org/data/v1/countries (all ~249 countries; REST Countries now requires a key).
const COUNTRIES_URL = "https://api.first.org/data/v1/countries?limit=300";
const ONE_WEEK = 60 * 60 * 24 * 7;
// Free API, no key needed: https://countriesnow.space (states / provinces of a country; ~220 countries).
const ISO_URL = "https://countriesnow.space/api/v0.1/countries/iso"; // same spelling as its state lists
const STATES_URL = "https://countriesnow.space/api/v0.1/countries/states";

/**
 * Every country name for the Country dropdown, A-Z. Cached for a week by Next, so the API is called rarely.
 * Returns [] when the API cannot be reached; the forms then fall back to a plain text box with suggestions.
 */
export async function listCountries() {
  try {
    const get = (url) => fetch(url, { next: { revalidate: ONE_WEEK }, signal: AbortSignal.timeout(6000) });
    const [first, iso] = await Promise.all([get(COUNTRIES_URL), get(ISO_URL).catch(() => null)]);
    if (!first.ok) return [];
    const isoBody = iso?.ok ? await iso.json().catch(() => null) : null; // optional: only improves the spelling
    return buildCountryList(await first.json(), isoBody);
  } catch (error) {
    console.warn("[countries] could not load the country list:", error.message);
    return [];
  }
}

const statesCache = new Map(); // country name -> { at, states }, so a country is fetched at most once a day per server

/**
 * State / province names of one country (e.g. "India" -> 37 states and union territories), A-Z, as { states, failed }.
 * `states` is [] when the country is unknown to the API (the form then uses a text box). `failed` is true only when the
 * API itself could not be reached or answered with a server error, so the form can tell the user.
 */
export async function listStates(country) {
  const name = String(country ?? "").trim().slice(0, 100);
  if (!name) return { states: [], failed: false };
  const cached = statesCache.get(name);
  if (cached && Date.now() - cached.at < 24 * 60 * 60 * 1000) return { states: cached.states, failed: false };
  let answered = false;
  for (const candidate of stateLookupNames(name)) {
    const result = await fetchStates(candidate);
    if (result.states.length > 0) {
      statesCache.set(name, { at: Date.now(), states: result.states });
      return { states: result.states, failed: false };
    }
    if (!result.failed) answered = true; // the API answered ("no such country" is an answer)
  }
  return { states: [], failed: !answered };
}

async function fetchStates(name) {
  try {
    const response = await fetch(STATES_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ country: name }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status >= 500) return { states: [], failed: true };
    return { states: parseStateNames(response.ok ? await response.json() : null), failed: false };
  } catch (error) {
    console.warn("[countries] could not load the states of " + name + ":", error.message);
    return { states: [], failed: true };
  }
}

import { describe, expect, it } from "vitest";
import { buildCountryList, countryOptions, parseCountryNames, parseStateNames, placeFromDialCode, placeFromMember, stateLookupNames } from "@/lib/countries";

describe("placeFromMember", () => {
  const list = ["Australia", "Canada", "India", "New Zealand", "United Kingdom", "United States"];
  const place = (city, dialCode) => placeFromMember({ city, dialCode }, list);

  it("takes the country from a city that names one, even when the number is a +91 one", () => {
    expect(place("CANADA", "+91")).toEqual({ country: "CANADA", state: "" });
    expect(place("Canada", "+1")).toEqual({ country: "CANADA", state: "" }); // +1 alone could be USA or Canada
    expect(place("AUCKLAND, NEW ZEALAND", "")).toEqual({ country: "NEW ZEALAND", state: "" });
  });

  it("understands the usual short spellings", () => {
    for (const city of ["USA", "U.S.A.", "AMERICA N.J", "new jersey, usa"]) expect(place(city, "+1")).toEqual({ country: "UNITED STATES", state: "" });
    for (const city of ["UK", "U.K.", "ENGLAND"]) expect(place(city, "+44")).toEqual({ country: "UNITED KINGDOM", state: "" });
  });

  it("falls back to the dial code when the city names no country", () => {
    expect(place("SURAT", "+91")).toEqual({ country: "INDIA", state: "GUJARAT" });
    expect(place("LONDON", "+44")).toEqual({ country: "UNITED KINGDOM", state: "" });
    expect(place("TORONTO", "+1")).toEqual({ country: "", state: "" });
  });

  it("keeps India / Gujarat when there is neither a country in the city nor a dial code", () => {
    expect(place("", "")).toEqual({ country: "INDIA", state: "GUJARAT" });
    expect(placeFromMember({}, list)).toEqual({ country: "INDIA", state: "GUJARAT" });
    expect(place("RAJKOT", undefined)).toEqual({ country: "INDIA", state: "GUJARAT" });
  });

  it("does not match a country name inside a longer word, and works without the country list", () => {
    expect(place("ROMANIA VILLAGE", "+91")).toEqual({ country: "INDIA", state: "GUJARAT" });
    expect(placeFromMember({ city: "CANADA", dialCode: "+1" })).toEqual({ country: "", state: "" }); // list not loaded: only aliases / dial codes
    expect(placeFromMember({ city: "USA", dialCode: "+1" })).toEqual({ country: "UNITED STATES", state: "" });
  });

  it("India named as the city gives Gujarat as the state", () => {
    expect(place("INDIA", "+91")).toEqual({ country: "INDIA", state: "GUJARAT" });
  });
});

describe("placeFromDialCode", () => {
  const india = { country: "INDIA", state: "GUJARAT" };

  it("keeps the default India / Gujarat when there is no dial code, or it is +91", () => {
    for (const code of [undefined, null, "", "   ", "+91", " + 91 "]) expect(placeFromDialCode(code)).toEqual(india);
  });

  it("picks the country of a dial code that belongs to one country, with the state left empty", () => {
    expect(placeFromDialCode("+44")).toEqual({ country: "UNITED KINGDOM", state: "" });
    expect(placeFromDialCode("+61")).toEqual({ country: "AUSTRALIA", state: "" });
    expect(placeFromDialCode("+971")).toEqual({ country: "UNITED ARAB EMIRATES", state: "" });
  });

  it("leaves country and state empty for a shared (+1) or unknown code instead of guessing", () => {
    for (const code of ["+1", "+7", "+99999"]) expect(placeFromDialCode(code)).toEqual({ country: "", state: "" });
  });
});

describe("parseCountryNames", () => {
  it("returns trimmed, unique, sorted names from the API response", () => {
    const body = { status: "OK", data: { IN: { country: "India" }, AL: { country: " Albania " }, XX: { country: "India" }, YY: {}, AX: { country: "Åland Islands" } } };
    expect(parseCountryNames(body)).toEqual(["Åland Islands", "Albania", "India"]);
  });

  it("returns [] for anything that is not a list", () => {
    expect(parseCountryNames(undefined)).toEqual([]);
    expect(parseCountryNames([{ name: { common: "India" } }])).toEqual([]);
    expect(parseCountryNames({ status: "error" })).toEqual([]);
  });
});

describe("buildCountryList", () => {
  const first = { data: { US: { country: "United States of America (the)" }, IN: { country: "India" }, CI: { country: "Côte d'Ivoire" }, KR: { country: "Korea (the Republic of)" }, EH: { country: "Western Sahara*" } } };
  const iso = { data: [{ name: "United States", Iso2: "US" }, { name: "India", Iso2: "IN" }] };

  it("uses the state API's spelling when it knows the ISO code, and tidies the rest", () => {
    expect(buildCountryList(first, iso)).toEqual(["Côte d'Ivoire", "India", "South Korea", "United States", "Western Sahara"]);
  });

  it("still works without the second list", () => {
    expect(buildCountryList(first, null)).toContain("United States of America");
    expect(buildCountryList(null, iso)).toEqual([]);
  });
});

describe("stateLookupNames", () => {
  it("tries the name itself, then known other spellings", () => {
    expect(stateLookupNames("India")).toEqual(["India"]);
    expect(stateLookupNames("Côte d'Ivoire")).toEqual(["Côte d'Ivoire", "Ivory Coast"]);
    expect(stateLookupNames("  ")).toEqual([]);
  });
});

describe("parseStateNames", () => {
  it("returns trimmed, unique, sorted state names", () => {
    const body = { error: false, data: { name: "India", states: [{ name: "Gujarat" }, { name: " Assam " }, { name: "Gujarat" }, {}] } };
    expect(parseStateNames(body)).toEqual(["Assam", "Gujarat"]);
  });

  it("returns [] when the country is unknown or the response is odd", () => {
    expect(parseStateNames({ error: true, msg: "country not found" })).toEqual([]);
    expect(parseStateNames(null)).toEqual([]);
  });
});

describe("countryOptions", () => {
  it("uses CAPITAL values and keeps the normal spelling as label", () => {
    expect(countryOptions(["India", "Kenya"])).toEqual([
      { value: "INDIA", label: "India" },
      { value: "KENYA", label: "Kenya" },
    ]);
  });

  it("keeps a saved value that is not in the list", () => {
    expect(countryOptions(["India"], "INDIA")).toHaveLength(1);
    expect(countryOptions(["India"], "BHARAT")[0]).toEqual({ value: "BHARAT", label: "BHARAT" });
  });
});

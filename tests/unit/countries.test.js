import { describe, expect, it } from "vitest";
import { buildCountryList, countryOptions, parseCountryNames, parseStateNames, stateLookupNames } from "@/lib/countries";

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

import { describe, expect, it } from "vitest";
import { buildVisitWhere, filtersToParams, hasSearchFilters, parseSearchParams } from "@/lib/services/search";
import { buildPersonWhere, personTokenConditions, queryTokens } from "@/lib/services/person-filters";

const allow = { allowMobile: true };
const deny = { allowMobile: false };

describe("parseSearchParams", () => {
  it("keeps valid values and drops invalid ones", () => {
    const f = parseSearchParams({
      q: "  patel   surat ",
      eventId: "5",
      hardDiskId: "abc",
      placeType: "TEMPLE",
      dateFrom: "2019-03-01",
      dateTo: "2019-02-30",
      page: "-4",
    });
    expect(f.q).toBe("patel surat");
    expect(f.eventId).toBe(5);
    expect(f.hardDiskId).toBeNull();
    expect(f.placeType).toBe("TEMPLE");
    expect(f.dateFrom?.toISOString()).toBe("2019-03-01T00:00:00.000Z");
    expect(f.dateTo).toBeNull();
    expect(f.page).toBe(1);
  });

  it("caps the page number so a crafted URL cannot request an absurd offset", () => {
    expect(parseSearchParams({ page: "99999999" }).page).toBeLessThanOrEqual(5000);
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseSearchParams({ surname: ["Patel", "Shah"] }).surname).toBe("Patel");
  });

  it("round-trips through filtersToParams for pagination links", () => {
    const params = filtersToParams(parseSearchParams({ surname: "Patel", eventId: "2", dateFrom: "2019-01-01" }));
    expect(params).toMatchObject({ surname: "Patel", eventId: 2, dateFrom: "2019-01-01" });
    expect(params.name).toBeUndefined();
  });
});

describe("buildPersonWhere", () => {
  it("returns null without filters", () => {
    expect(buildPersonWhere({}, allow)).toBeNull();
  });

  it("matches partial, case-insensitive text per field", () => {
    expect(buildPersonWhere({ surname: "pat" }, allow)).toEqual({
      AND: [{ surname: { contains: "pat", mode: "insensitive" } }],
    });
  });

  it("searches mobile numbers by digits only when allowed", () => {
    expect(buildPersonWhere({ mobileNo: "98765" }, allow)).toEqual({ AND: [{ mobileNo: { contains: "98765" } }] });
    // not allowed => matches nobody (never ignored, which would list everyone)
    expect(buildPersonWhere({ mobileNo: "98765" }, deny)).toEqual({ AND: [{ id: { in: [] } }] });
  });

  it("does not let masked-role users probe mobile numbers through the quick search box", () => {
    const where = JSON.stringify(buildPersonWhere({ q: "9876543210" }, deny));
    expect(where).not.toContain("mobileNo");
    const permitted = JSON.stringify(buildPersonWhere({ q: "9876543210" }, allow));
    expect(permitted).toContain("mobileNo");
  });

  it("requires every word of the quick search to match something", () => {
    const where = buildPersonWhere({ q: "ramesh surat" }, deny);
    expect(where.AND).toHaveLength(2);
  });

  it("limits the number of words", () => {
    expect(queryTokens("a b c d e f g h i")).toHaveLength(6);
    expect(personTokenConditions("x", deny).length).toBeGreaterThanOrEqual(6);
  });
});

describe("buildVisitWhere", () => {
  const base = parseSearchParams({});

  it("is empty without filters", () => {
    expect(buildVisitWhere(base, allow)).toEqual({});
    expect(hasSearchFilters(base)).toBe(false);
  });

  it("detects when something was searched for", () => {
    expect(hasSearchFilters(parseSearchParams({ q: "patel" }))).toBe(true);
    expect(hasSearchFilters(parseSearchParams({ haribhagatId: "7" }))).toBe(true);
    expect(hasSearchFilters(parseSearchParams({ page: "3" }))).toBe(false);
  });

  it("applies all person fields to the SAME Haribhagat of a visit", () => {
    const where = buildVisitWhere({ ...base, surname: "Patel", gam: "Surat" }, allow);
    const person = where.AND[0].haribhagats.some.haribhagat;
    expect(person.AND).toHaveLength(2);
  });

  it("filters by event, hard disk and place type", () => {
    const where = buildVisitWhere({ ...base, eventId: 4, hardDiskId: 2, placeType: "HOME" }, allow);
    expect(where.AND).toEqual(expect.arrayContaining([{ eventId: 4 }, { hardDiskId: 2 }, { placeType: "HOME" }]));
  });

  it("filters by visit date (inclusive)", () => {
    const from = new Date("2019-03-01T00:00:00Z");
    const to = new Date("2019-03-31T00:00:00Z");
    const where = buildVisitWhere({ ...base, dateFrom: from, dateTo: to }, allow);
    expect(where.AND[0]).toEqual({ visitDate: { gte: from, lte: to } });
  });

  it("supports a folder filter that includes sub-folders", () => {
    const where = buildVisitWhere({ ...base, folder: "2019/March" }, allow);
    expect(where.AND).toEqual([{ OR: [{ folderPath: "2019/March" }, { folderPath: { startsWith: "2019/March/" } }] }]);
  });

  it("quick search also matches the hard-disk label and the folder path", () => {
    const json = JSON.stringify(buildVisitWhere({ ...base, q: "HDD-001" }, allow));
    expect(json).toContain("folderPath");
    expect(json).toContain("labelName");
  });
});

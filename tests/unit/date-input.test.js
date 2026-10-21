import { describe, expect, it } from "vitest";
import { isoToDisplay, maskDate, parseDisplayDate } from "@/lib/date-input";

describe("maskDate", () => {
  it("puts the slashes in while typing and keeps only digits", () => {
    expect(maskDate("1")).toBe("1");
    expect(maskDate("14")).toBe("14");
    expect(maskDate("140")).toBe("14/0");
    expect(maskDate("14032")).toBe("14/03/2");
    expect(maskDate("14032019")).toBe("14/03/2019");
    expect(maskDate("14/03/2019")).toBe("14/03/2019");
    expect(maskDate("1a4-03.2019")).toBe("14/03/2019");
  });

  it("takes at most 8 digits", () => {
    expect(maskDate("140320191234")).toBe("14/03/2019");
  });

  it("never leaves a slash hanging at the end, so Backspace always removes a digit", () => {
    expect(maskDate("14/")).toBe("14");
    expect(maskDate("14/03/")).toBe("14/03");
    expect(maskDate("14/0")).toBe("14/0");
  });
});

describe("parseDisplayDate", () => {
  it("accepts a real dd/mm/yyyy date", () => {
    expect(parseDisplayDate("14/03/2019")).toBe("2019-03-14");
    expect(parseDisplayDate("29/02/2024")).toBe("2024-02-29");
  });

  it("rejects incomplete, impossible and out-of-range dates", () => {
    for (const bad of ["", "14/03", "14/03/19", "31/04/2020", "29/02/2023", "00/01/2020", "14/13/2020", "14-03-2019", "14/03/1850", "14/03/2300"]) {
      expect(parseDisplayDate(bad), bad).toBeNull();
    }
  });
});

describe("isoToDisplay", () => {
  it("shows YYYY-MM-DD as dd/mm/yyyy", () => {
    expect(isoToDisplay("2019-03-14")).toBe("14/03/2019");
    expect(isoToDisplay("")).toBe("");
    expect(isoToDisplay(null)).toBe("");
  });
});

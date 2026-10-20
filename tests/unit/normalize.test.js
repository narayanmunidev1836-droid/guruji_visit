import { describe, expect, it } from "vitest";
import {
  digitsOnly,
  diskLabelKey,
  eventNameKey,
  makeDupKey,
  normalizeMobile,
  normalizePincode,
  normalizeText,
  searchKey,
  toAsciiDigits,
} from "@/lib/normalize";

describe("normalizeText", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeText("  Ramesh   Kanji \n Patel ")).toBe("Ramesh Kanji Patel");
  });

  it("returns null for empty / whitespace / nullish input", () => {
    expect(normalizeText("")).toBeNull();
    expect(normalizeText("   ")).toBeNull();
    expect(normalizeText(null)).toBeNull();
    expect(normalizeText(undefined)).toBeNull();
  });

  it("applies Unicode NFC so differently encoded Gujarati compares equal", () => {
    const composed = "કૃષ્ણ";
    const decomposed = composed.normalize("NFD");
    expect(normalizeText(decomposed)).toBe(normalizeText(composed));
  });

  it("keeps Gujarati text intact", () => {
    expect(normalizeText("  રમેશ   પટેલ ")).toBe("રમેશ પટેલ");
  });
});

describe("searchKey / dup keys", () => {
  it("is case-insensitive for Latin text and whitespace-insensitive", () => {
    expect(searchKey("  RAMESH  Patel")).toBe(searchKey("ramesh patel"));
  });

  it("builds the same duplicate key regardless of case and spacing", () => {
    const a = makeDupKey({ name: "Ramesh", fatherName: "Kanji", surname: "Patel", gam: "Vadodara" });
    const b = makeDupKey({ name: " ramesh ", fatherName: "KANJI", surname: "patel", gam: " Vadodara" });
    expect(a).toBe(b);
  });

  it("does NOT treat different people as the same", () => {
    const a = makeDupKey({ name: "Ramesh", fatherName: "Kanji", surname: "Patel", gam: "Vadodara" });
    const b = makeDupKey({ name: "Ramesh", fatherName: "Kanji", surname: "Patel", gam: "Surat" });
    expect(a).not.toBe(b);
  });

  it("builds case-insensitive keys for events and disks", () => {
    expect(eventNameKey(" Pathramani ")).toBe(eventNameKey("pathramani"));
    expect(diskLabelKey("hdd-001")).toBe(diskLabelKey("HDD-001"));
    expect(diskLabelKey("HDD - 001")).not.toBe(diskLabelKey("HDD-001"));
  });
});

describe("normalizeMobile", () => {
  it("accepts a plain 10 digit Indian mobile and stores it as a string", () => {
    expect(normalizeMobile("9876543210")).toEqual({ value: "9876543210" });
  });

  it("strips spaces, dashes, +91, 91 and a leading 0", () => {
    expect(normalizeMobile("98765 43210").value).toBe("9876543210");
    expect(normalizeMobile("98765-43210").value).toBe("9876543210");
    expect(normalizeMobile("+91 98765 43210").value).toBe("9876543210");
    expect(normalizeMobile("919876543210").value).toBe("9876543210");
    expect(normalizeMobile("09876543210").value).toBe("9876543210");
  });

  it("understands Gujarati digits", () => {
    expect(normalizeMobile("૯૮૭૬૫૪૩૨૧૦").value).toBe("9876543210");
  });

  it("returns { value: null } for empty input", () => {
    expect(normalizeMobile("")).toEqual({ value: null });
    expect(normalizeMobile("   ")).toEqual({ value: null });
    expect(normalizeMobile(null)).toEqual({ value: null });
  });

  it("rejects too short, too long, wrong prefix and letters", () => {
    expect(normalizeMobile("12345").error).toBeTruthy();
    expect(normalizeMobile("98765432101234").error).toBeTruthy();
    expect(normalizeMobile("1234567890").error).toBeTruthy(); // Indian mobiles start with 6-9
    expect(normalizeMobile("abcdefghij").error).toBeTruthy();
  });

  it("keeps international numbers with a + prefix", () => {
    expect(normalizeMobile("+44 7911 123456")).toEqual({ value: "+447911123456" });
    expect(normalizeMobile("+1234").error).toBeTruthy();
  });
});

describe("normalizePincode", () => {
  it("keeps leading zeros (string, never a number)", () => {
    expect(normalizePincode("012345")).toEqual({ value: "012345" });
  });

  it("accepts Gujarati digits and rejects wrong lengths", () => {
    expect(normalizePincode("૩૯૦૦૦૧")).toEqual({ value: "390001" });
    expect(normalizePincode("39000").error).toBeTruthy();
    expect(normalizePincode("3900011").error).toBeTruthy();
    expect(normalizePincode("39000a").error).toBeTruthy();
  });

  it("treats empty as null", () => {
    expect(normalizePincode("")).toEqual({ value: null });
  });
});

describe("digit helpers", () => {
  it("converts Gujarati digits to ASCII", () => {
    expect(toAsciiDigits("૦૧૨૩૪૫૬૭૮૯")).toBe("0123456789");
  });
  it("extracts digits only", () => {
    expect(digitsOnly("+91 (98765) 43-210")).toBe("919876543210");
    expect(digitsOnly(null)).toBe("");
  });
});

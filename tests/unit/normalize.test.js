import { describe, expect, it } from "vitest";
import {
  contactMobileInputValue,
  digitsOnly,
  diskLabelKey,
  eventNameKey,
  makeDupKey,
  loginCandidates,
  looseKey,
  mobileInputValue,
  normalizeUsername,
  normalizeContactMobile,
  normalizeMobile,
  normalizePincode,
  normalizeText,
  searchKey,
  toAsciiDigits,
  upperText,
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

  it("does not accept international or longer numbers", () => {
    expect(normalizeMobile("+44 7911 123456").error).toBeTruthy();
    expect(normalizeMobile("+1234").error).toBeTruthy();
    expect(normalizeMobile("98765432101").error).toBeTruthy();
  });
});

describe("normalizeContactMobile (a Member's mobile)", () => {
  it("keeps accepting Indian numbers exactly as normalizeMobile does", () => {
    expect(normalizeContactMobile("+91 98765 43210")).toEqual({ value: "9876543210" });
    expect(normalizeContactMobile("")).toEqual({ value: null });
  });

  it("accepts a number of another country written with + and its country code, stored as +digits", () => {
    expect(normalizeContactMobile("+1 416 414 3653")).toEqual({ value: "+14164143653" });
    expect(normalizeContactMobile("+44 7911 123456").value).toBe("+447911123456");
    expect(normalizeContactMobile("+1-416-414-3653").value).toBe("+14164143653");
  });

  it("still refuses what is not a number: no + (unless Indian), too short / long, a bad +91 number", () => {
    for (const bad of ["4164143653", "+1234", "+1234567890123456", "+0123456789", "+91 41641 43653", "+abc", "12345"]) {
      expect(normalizeContactMobile(bad).error, bad).toBeTruthy();
    }
  });
});

describe("contactMobileInputValue", () => {
  it("keeps a leading + and up to 15 digits for another country, and treats +91 / plain numbers like mobileInputValue", () => {
    expect(contactMobileInputValue("+1 416 414 3653")).toBe("+14164143653");
    expect(contactMobileInputValue("+")).toBe("+");
    expect(contactMobileInputValue("+4479111234567890123")).toBe("+447911123456789");
    expect(contactMobileInputValue("+91 98765 43210")).toBe("9876543210");
    expect(contactMobileInputValue("98765 43210 99")).toBe("9876543210");
    expect(contactMobileInputValue("૯૮૭૬૫૪૩૨૧૦")).toBe("9876543210");
    expect(contactMobileInputValue(undefined)).toBe("");
  });
});

describe("looseKey", () => {
  it("gives the same key for spellings that sound alike", () => {
    const patel = looseKey("PATEL");
    expect(patel).toBe("ptl");
    for (const variant of ["Ptel", "Pattel", "pateil", " P A T E L "]) expect(looseKey(variant)).toBe(patel);
    expect(looseKey("Dhirajbhai")).toBe(looseKey("DHIRAJBAI"));
    expect(looseKey("Shah")).toBe(looseKey("Sah"));
  });

  it("keeps different names apart and leaves other scripts alone", () => {
    expect(looseKey("PATEL")).not.toBe(looseKey("SHAH"));
    expect(looseKey("RAMESH")).not.toBe(looseKey("RAJESH"));
    expect(looseKey("પટેલ")).toBe("પટેલ");
    expect(looseKey(null)).toBe("");
  });
});

describe("normalizeUsername", () => {
  it("accepts any text: lower-cased, trimmed, repeated spaces collapsed", () => {
    expect(normalizeUsername("  Ramesh.Patel_01 ")).toEqual({ value: "ramesh.patel_01" });
    expect(normalizeUsername("Brijesh  Vasoya")).toEqual({ value: "brijesh vasoya" });
    expect(normalizeUsername("9876543210")).toEqual({ value: "9876543210" });
    expect(normalizeUsername("a@b")).toEqual({ value: "a@b" });
    expect(normalizeUsername("ab")).toEqual({ value: "ab" });
    expect(normalizeUsername("")).toEqual({ value: null });
  });

  it("only limits the length", () => {
    expect(normalizeUsername("x".repeat(51)).error).toBeTruthy();
    expect(normalizeUsername("x".repeat(50)).value).toBe("x".repeat(50));
  });
});

describe("loginCandidates", () => {
  it("gives the typed text in lower case and a mobile number when it looks like one", () => {
    expect(loginCandidates("  Admin@Example.ORG ")).toEqual({ text: "admin@example.org", mobile: null });
    expect(loginCandidates("98765 43210")).toEqual({ text: "98765 43210", mobile: "9876543210" });
    expect(loginCandidates("+91 98765-43210")).toEqual({ text: "+91 98765-43210", mobile: "9876543210" });
    expect(loginCandidates("Ramesh.Patel")).toEqual({ text: "ramesh.patel", mobile: null });
    expect(loginCandidates("12345")).toEqual({ text: "12345", mobile: null }); // not a valid mobile, still a possible username
  });

  it("returns null for empty input", () => {
    expect(loginCandidates("  ")).toBeNull();
    expect(loginCandidates(null)).toBeNull();
  });
});

describe("mobileInputValue", () => {
  it("keeps digits only and at most 10", () => {
    expect(mobileInputValue("98765 43210")).toBe("9876543210");
    expect(mobileInputValue("98a76")).toBe("9876");
    expect(mobileInputValue("98765432109999")).toBe("9876543210");
    expect(mobileInputValue("૯૮૭૬૫")).toBe("98765");
    expect(mobileInputValue(null)).toBe("");
  });

  it("drops a pasted +91 / 91 / 0 prefix", () => {
    expect(mobileInputValue("+91 98765 43210")).toBe("9876543210");
    expect(mobileInputValue("919876543210")).toBe("9876543210");
    expect(mobileInputValue("09876543210")).toBe("9876543210");
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

describe("upperText", () => {
  it("upper-cases Latin text, trims and collapses spaces, leaves Gujarati alone", () => {
    expect(upperText("  ramesh   kanji ")).toBe("RAMESH KANJI");
    expect(upperText("રમેશ patel")).toBe("રમેશ PATEL");
    expect(upperText("   ")).toBeNull();
  });
});

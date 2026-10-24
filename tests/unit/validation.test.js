import { describe, expect, it } from "vitest";
import { haribhagatSchema } from "@/lib/services/haribhagats";
import { parseVisitFolder, visitSchema } from "@/lib/services/visits";
import { formDataToObject } from "@/lib/validation";
import { validate } from "@/lib/result";

describe("haribhagat validation", () => {
  const valid = { name: "Ramesh", surname: "Patel" };

  it("requires name and surname, everything else is optional", () => {
    const ok = validate(haribhagatSchema, valid);
    expect(ok.ok).toBe(true);
    expect(ok.data).toMatchObject({ name: "RAMESH", surname: "PATEL", fatherName: null, gam: null, pincode: null, mobileNo: null });

    const bad = validate(haribhagatSchema, { name: "  ", surname: "" });
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.fieldErrors)).toEqual(expect.arrayContaining(["name", "surname"]));
  });

  it("normalizes whitespace and keeps mobile / pincode as strings", () => {
    const result = validate(haribhagatSchema, { ...valid, name: "  Ramesh   Kumar ", pincode: "012345", mobileNo: "+91 98765 43210" });
    expect(result.ok).toBe(true);
    expect(result.data.name).toBe("RAMESH KUMAR");
    expect(result.data.pincode).toBe("012345");
    expect(typeof result.data.pincode).toBe("string");
    expect(result.data.mobileNo).toBe("9876543210");
    expect(typeof result.data.mobileNo).toBe("string");
  });

  it("reports field errors for a bad mobile number and pincode", () => {
    const result = validate(haribhagatSchema, { ...valid, mobileNo: "123", pincode: "12" });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.mobileNo).toBeTruthy();
    expect(result.fieldErrors.pincode).toBeTruthy();
  });

  it("accepts Gujarati names", () => {
    expect(validate(haribhagatSchema, { name: "રમેશ", surname: "પટેલ" }).ok).toBe(true);
  });
});

describe("visit validation", () => {
  const valid = { haribhagatIds: ["1", "2"], hardDiskId: "4", folderPath: "MUKT SWAMI DATA/decstop", eventId: "3", visitDate: "2019-03-14", placeType: "HOME" };

  it("coerces form strings to numbers; notes are optional", () => {
    const result = validate(visitSchema, valid);
    expect(result.ok).toBe(true);
    expect(result.data.hardDiskId).toBe(4);
    expect(result.data.haribhagatIds).toEqual([1, 2]);
    expect(result.data.eventId).toBe(3);
    expect(result.data.placeType).toBe("HOME");
  });

  it("requires a Haribhagat and a hard disk", () => {
    expect(validate(visitSchema, { ...valid, haribhagatIds: [] }).fieldErrors.haribhagatIds).toBe("Choose at least one Member.");
    expect(validate(visitSchema, { ...valid, hardDiskId: "" }).fieldErrors.hardDiskId).toBeTruthy();
  });

  it("requires event, date and place", () => {
    expect(validate(visitSchema, { ...valid, eventId: "" }).fieldErrors.eventId).toBe("Event is required.");
    expect(validate(visitSchema, { ...valid, visitDate: "" }).fieldErrors.visitDate).toBe("Date is required.");
    expect(validate(visitSchema, { ...valid, placeType: "" }).fieldErrors.placeType).toBe("Place is required.");
  });

  it("parses the visit date and rejects an impossible one", () => {
    const ok = validate(visitSchema, valid);
    expect(ok.data.visitDate.toISOString()).toBe("2019-03-14T00:00:00.000Z");
    expect(validate(visitSchema, { ...valid, visitDate: "2019-02-30" }).fieldErrors.visitDate).toBe("Enter a valid date.");
  });

  it("only accepts known place types", () => {
    expect(validate(visitSchema, { ...valid, placeType: "TEMPLE" }).ok).toBe(true);
    expect(validate(visitSchema, { ...valid, placeType: "GARDEN" }).ok).toBe(false);
  });

  it("rejects absurd list sizes", () => {
    const many = Array.from({ length: 51 }, (_, i) => String(i + 1));
    expect(validate(visitSchema, { ...valid, haribhagatIds: many }).ok).toBe(false);
  });
});

describe("visit folder", () => {
  it("keeps a relative folder and unifies separators", () => {
    expect(parseVisitFolder(String.raw`MUKT SWAMI DATA\decstop`)).toEqual({ ok: true, folder: "MUKT SWAMI DATA/DECSTOP" });
    expect(parseVisitFolder("  2019/March/ ")).toEqual({ ok: true, folder: "2019/MARCH" });
  });

  it("drops a pasted drive letter - it only says where the disk was mounted", () => {
    expect(parseVisitFolder(String.raw`F:\MUKT SWAMI DATA\decstop`)).toEqual({ ok: true, folder: "MUKT SWAMI DATA/DECSTOP" });
    expect(parseVisitFolder("d:/photos")).toEqual({ ok: true, folder: "PHOTOS" });
  });

  it("requires a folder and rejects '..'", () => {
    expect(parseVisitFolder("").fieldErrors.folderPath).toBe("Path is required.");
    expect(parseVisitFolder(String.raw`F:`).fieldErrors.folderPath).toBe("Path is required.");
    expect(parseVisitFolder("a/../b").ok).toBe(false);
  });
});

describe("formDataToObject", () => {
  it("turns repeated keys into arrays and ignores React action fields", () => {
    const form = new FormData();
    form.append("name", "x");
    form.append("haribhagatIds", "1");
    form.append("haribhagatIds", "2");
    form.append("$ACTION_ID_abc", "");
    const out = formDataToObject(form, ["haribhagatIds", "photoIds"]);
    expect(out).toEqual({ name: "x", haribhagatIds: ["1", "2"], photoIds: [] });
  });
});

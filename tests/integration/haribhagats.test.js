import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HAS_DB, getDb, makeDisk, makeUser, resetDb } from "./helpers.js";

describe.skipIf(!HAS_DB)("Haribhagat directory", () => {
  let db;
  let svc;
  let envModule;
  let staff;
  const original = process.env.MOBILE_VISIBLE_ROLES;

  beforeAll(async () => {
    db = await getDb();
    svc = await import("@/lib/services/haribhagats");
    envModule = await import("@/lib/env");
  });
  afterAll(() => db?.$disconnect());
  beforeEach(async () => {
    await resetDb(db);
    staff = await makeUser(db, "STAFF");
  });
  afterEach(() => {
    process.env.MOBILE_VISIBLE_ROLES = original;
    envModule._resetEnvForTests();
  });

  const person = (extra = {}) => ({ name: "Ramesh", fatherName: "Kanji", surname: "Patel", gam: "Vadodara", jillo: "Vadodara", ...extra });

  it("creates a record and stores mobile / pincode as strings (leading zeros survive)", async () => {
    const result = await svc.createHaribhagat(staff, person({ pincode: "012345", mobileNo: "98765 43210" }));
    expect(result.ok).toBe(true);
    const row = await db.haribhagat.findUnique({ where: { id: result.person.id } });
    expect(row.pincode).toBe("012345");
    expect(row.mobileNo).toBe("9876543210");
    expect(row.createdById).toBe(staff.id);
  });

  it("validates required fields and the mobile number", async () => {
    const missing = await svc.createHaribhagat(staff, { name: "", surname: "" });
    expect(missing.ok).toBe(false);
    expect(missing.fieldErrors.name).toBeTruthy();
    expect(missing.fieldErrors.surname).toBeTruthy();

    const badMobile = await svc.createHaribhagat(staff, person({ mobileNo: "12345" }));
    expect(badMobile.ok).toBe(false);
    expect(badMobile.fieldErrors.mobileNo).toBeTruthy();
    expect(await db.haribhagat.count()).toBe(0);
  });

  it("stores a Member's number of another country as +code and number, but not without the +", async () => {
    const noPlus = await svc.createHaribhagat(staff, person({ mobileNo: "4164143653" }));
    expect(noPlus.ok).toBe(false);
    const abroad = await svc.createHaribhagat(staff, person({ mobileNo: "+1 416 414 3653" }));
    expect(abroad.ok).toBe(true);
    expect(abroad.person.mobileNo).toBe("+14164143653");
  });

  it("warns about a possible duplicate instead of silently creating it", async () => {
    await svc.createHaribhagat(staff, person());
    const again = await svc.createHaribhagat(staff, person({ name: " ramesh ", surname: "PATEL" }));
    expect(again.ok).toBe(false);
    expect(again.duplicates).toHaveLength(1);
    expect(await db.haribhagat.count()).toBe(1);
  });

  it("lets the user create anyway after the warning (two people are never merged automatically)", async () => {
    await svc.createHaribhagat(staff, person());
    const forced = await svc.createHaribhagat(staff, person(), { confirmDuplicate: true });
    expect(forced.ok).toBe(true);
    expect(await db.haribhagat.count()).toBe(2);
  });

  it("flags the same mobile number without revealing it", async () => {
    await svc.createHaribhagat(staff, person({ mobileNo: "9876543210" }));
    const other = await svc.createHaribhagat(staff, { name: "Suresh", surname: "Shah", mobileNo: "9876543210" });
    expect(other.ok).toBe(false);
    expect(other.duplicates[0].sameMobile).toBe(true);
    expect(JSON.stringify(other.duplicates)).not.toContain("9876543210");
  });

  it("does not warn for clearly different people", async () => {
    await svc.createHaribhagat(staff, person());
    const different = await svc.createHaribhagat(staff, { name: "Hitesh", surname: "Desai", gam: "Navsari" });
    expect(different.ok).toBe(true);
  });

  it("editing does not warn about the record itself, but does about another similar one", async () => {
    const a = (await svc.createHaribhagat(staff, person())).person;
    expect((await svc.updateHaribhagat(staff, a.id, person({ taluko: "Vadodara" }))).ok).toBe(true);

    const b = (await svc.createHaribhagat(staff, { name: "Suresh", surname: "Shah" })).person;
    const clash = await svc.updateHaribhagat(staff, b.id, person());
    expect(clash.ok).toBe(false);
    expect(clash.duplicates.map((d) => d.id)).toEqual([a.id]);
  });

  it("searches by name, father name, surname, village, district, pincode and mobile (partial, any case)", async () => {
    await svc.createHaribhagat(staff, person({ pincode: "390001", mobileNo: "9876543210" }));
    await svc.createHaribhagat(staff, { name: "રમેશ", fatherName: "કાનજી", surname: "પટેલ", gam: "આણંદ", jillo: "આણંદ" });
    await svc.createHaribhagat(staff, { name: "Hitesh", surname: "Desai", gam: "Navsari", jillo: "Navsari" });

    const find = async (q) => (await svc.searchHaribhagats(staff, { q })).items.map((p) => p.name).sort();
    expect(await find("ramesh")).toEqual(["RAMESH"]);
    expect(await find("KANJI")).toEqual(["RAMESH"]);
    expect(await find("pat")).toEqual(["RAMESH"]);
    expect(await find("vadod")).toEqual(["RAMESH"]);
    expect(await find("390001")).toEqual(["RAMESH"]);
    expect(await find("98765")).toEqual(["RAMESH"]);
    expect(await find("ramesh vadodara")).toEqual(["RAMESH"]);
    expect(await find("ramesh navsari")).toEqual([]);
    expect(await find("રમેશ")).toEqual(["રમેશ"]);
    expect(await find("આણંદ")).toEqual(["રમેશ"]);
    expect(await find("")).toHaveLength(3);
  });

  it("masks mobile numbers for roles that may not see them and ignores mobile search for them", async () => {
    await svc.createHaribhagat(staff, person({ mobileNo: "9876543210" }));
    process.env.MOBILE_VISIBLE_ROLES = "ADMIN";
    envModule._resetEnvForTests();

    const result = await svc.searchHaribhagats(staff, { q: "ramesh" });
    expect(result.items[0].mobileNo).toBe("•••••••210");
    expect(result.items[0].mobileMasked).toBe(true);
    // probing for the number through search must not work
    expect((await svc.searchHaribhagats(staff, { q: "9876543210" })).items).toHaveLength(0);
    expect((await svc.searchHaribhagats(staff, { mobileNo: "98765" })).items).toHaveLength(0);
    const admin = await makeUser(db, "ADMIN");
    expect((await svc.searchHaribhagats(admin, { q: "ramesh" })).items[0].mobileNo).toBe("9876543210");
  });

  it("keeps the stored mobile number when a role without access edits the person", async () => {
    const created = (await svc.createHaribhagat(staff, person({ mobileNo: "9876543210" }))).person;
    const result = await svc.updateHaribhagat(staff, created.id, person({ gam: "Surat", mobileNo: "" }), { canEditMobile: false });
    expect(result.ok).toBe(true);
    const row = await db.haribhagat.findUnique({ where: { id: created.id } });
    expect(row.gam).toBe("SURAT");
    expect(row.mobileNo).toBe("9876543210");
  });

  it("the visit picker never returns mobile numbers", async () => {
    await svc.createHaribhagat(staff, person({ mobileNo: "9876543210" }));
    const rows = await svc.pickerSearch("ramesh");
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain("9876543210");
    expect(await svc.pickerSearch("   ")).toEqual([]);
  });

  it("suggests villages / talukas / districts from saved people, most used first, narrowed by context", async () => {
    await svc.createHaribhagat(staff, person({ name: "A", gam: "Anand", taluko: "Anand", jillo: "Anand" }));
    await svc.createHaribhagat(staff, person({ name: "B", gam: "Anand", taluko: "Anand", jillo: "Anand" }));
    await svc.createHaribhagat(staff, person({ name: "C", gam: "Borsad", taluko: "Borsad", jillo: "Anand" }));
    await svc.createHaribhagat(staff, person({ name: "D", gam: "Surat City", taluko: "Surat", jillo: "Surat" }));
    expect((await svc.suggestPlaces("gam", "")).slice(0, 2)).toEqual(["ANAND", expect.any(String)]);
    expect(await svc.suggestPlaces("gam", "bor")).toEqual(["BORSAD"]);
    expect((await svc.suggestPlaces("taluko", "", { jillo: "surat" }))).toEqual(["SURAT"]);
    expect(await svc.suggestPlaces("surname", "pat")).toEqual([]); // only place fields
  });

  it("deletes a Haribhagat only when no entry uses them", async () => {
    const free = (await svc.createHaribhagat(staff, person({ name: "Free" }))).person;
    const used = (await svc.createHaribhagat(staff, person({ name: "Used", fatherName: "Other" }))).person;
    const disk = await makeDisk(db, "HDD-001");
    await db.visit.create({ data: { hardDiskId: disk.id, folderPath: "A", haribhagats: { create: [{ haribhagatId: used.id, isPrimary: true }] } } });

    const refused = await svc.deleteHaribhagat(staff, used.id);
    expect(refused.ok).toBe(false);
    expect(refused.error).toContain("1 entry");
    expect(await db.haribhagat.count({ where: { id: used.id } })).toBe(1);

    expect((await svc.deleteHaribhagat(staff, free.id)).ok).toBe(true);
    expect(await db.haribhagat.count({ where: { id: free.id } })).toBe(0);
    expect((await svc.deleteHaribhagat(staff, free.id)).ok).toBe(false);
  });

  it("the visit picker finds people by mobile only for roles that may see mobile numbers", async () => {
    await svc.createHaribhagat(staff, person({ mobileNo: "9876543210" }));
    expect(await svc.pickerSearch("98765")).toHaveLength(0);
    const rows = await svc.pickerSearch("98765", { allowMobile: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].mobileNo).toBe("9876543210");
  });
});

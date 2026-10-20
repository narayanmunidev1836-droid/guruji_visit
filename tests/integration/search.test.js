import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HAS_DB, day, getDb, makeDisk, makeEvent, makePerson, makeUser, resetDb } from "./helpers.js";

describe.skipIf(!HAS_DB)("visit search", () => {
  let db;
  let search;
  let envModule;
  let user;
  let d1;
  let d2;
  let pathramani;
  let ramesh;
  let suresh;
  const original = process.env.MOBILE_VISIBLE_ROLES;

  beforeAll(async () => {
    db = await getDb();
    search = await import("@/lib/services/search");
    envModule = await import("@/lib/env");
  });
  afterAll(() => db?.$disconnect());
  afterEach(() => {
    process.env.MOBILE_VISIBLE_ROLES = original;
    envModule._resetEnvForTests();
  });

  beforeEach(async () => {
    await resetDb(db);
    user = await makeUser(db, "STAFF");
    d1 = await makeDisk(db, "HDD-001");
    d2 = await makeDisk(db, "HDD-002", { stableIdentifier: null });
    pathramani = await makeEvent(db, "Pathramani");
    ramesh = await makePerson(db, {
      name: "Ramesh",
      fatherName: "Kanji",
      surname: "Patel",
      gam: "Vadodara",
      taluko: "Vadodara",
      jillo: "Vadodara",
      pincode: "390001",
      mobileNo: "9876543210",
    });
    suresh = await makePerson(db, {
      name: "Suresh",
      fatherName: "Mohan",
      surname: "Shah",
      gam: "Surat",
      taluko: "Surat",
      jillo: "Surat",
      pincode: "395003",
      mobileNo: "9123456780",
    });

    await db.visit.create({
      data: {
        eventId: pathramani.id,
        visitDate: day("2019-03-14"),
        placeType: "HOME",
        hardDiskId: d1.id,
        folderPath: "2019/March/Patel Home",
        haribhagats: { create: [{ haribhagatId: ramesh.id, isPrimary: true }] },
      },
    });
    await db.visit.create({
      data: {
        visitDate: day("2019-07-02"),
        placeType: "TEMPLE",
        hardDiskId: d2.id,
        folderPath: "Vichran/July",
        haribhagats: { create: [{ haribhagatId: suresh.id, isPrimary: true }, { haribhagatId: ramesh.id }] },
      },
    });
    await db.visit.create({ data: { hardDiskId: d1.id, folderPath: "", haribhagats: { create: [{ haribhagatId: suresh.id, isPrimary: true }] } } });
  });

  const run = async (raw, who = user) => search.searchVisits(who, search.parseSearchParams(raw));
  const folders = (result) => result.items.map((v) => v.folderPath);

  it("shows every visit of a Haribhagat with disk and folder", async () => {
    const result = await run({ surname: "patel" });
    expect(result.total).toBe(2); // Ramesh is in two visits
    expect(result.items.map((v) => v.hardDisk.labelName).sort()).toEqual(["HDD-001", "HDD-002"]);
    expect(folders(await run({ name: "suresh" }))).toEqual(["Vichran/July", ""]); // dated first, undated last
  });

  it("with no filter lists the latest created entries first, 10 per page", async () => {
    const result = await run({});
    expect(result.latest).toBe(true);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(3);
    expect(folders(result)[0]).toBe(""); // created last in beforeEach, although it has no date
    expect((await run({ surname: "patel" })).latest).toBe(false);
  });

  it("finds visits by village, taluko, district, pincode and father name", async () => {
    expect((await run({ gam: "surat" })).total).toBe(2);
    expect((await run({ taluko: "vadodara" })).total).toBe(2);
    expect((await run({ jillo: "surat" })).total).toBe(2);
    expect((await run({ pincode: "395003" })).total).toBe(2);
    expect((await run({ fatherName: "kanji" })).total).toBe(2);
  });

  it("matches all person fields against the SAME Haribhagat of a visit", async () => {
    expect((await run({ name: "Ramesh", surname: "Patel" })).total).toBe(2);
    expect((await run({ name: "Ramesh", surname: "Shah" })).total).toBe(0);
  });

  it("quick search matches the person, the disk label and the folder", async () => {
    expect((await run({ q: "patel" })).total).toBe(2);
    expect((await run({ q: "hdd-002" })).total).toBe(1);
    expect(folders(await run({ q: "march home" }))).toEqual(["2019/March/Patel Home"]);
    expect((await run({ q: "ramesh vadodara" })).total).toBe(2);
    expect((await run({ q: "ramesh surat" })).total).toBe(0);
  });

  it("filters by event, hard disk, place type, date range and folder", async () => {
    expect((await run({ eventId: String(pathramani.id) })).total).toBe(1);
    expect((await run({ hardDiskId: String(d1.id) })).total).toBe(2);
    expect((await run({ placeType: "TEMPLE" })).total).toBe(1);
    expect((await run({ dateFrom: "2019-03-01", dateTo: "2019-03-31" })).total).toBe(1);
    expect((await run({ dateFrom: "2019-03-14", dateTo: "2019-03-14" })).total).toBe(1);
    expect((await run({ folder: "Vichran" })).total).toBe(1);
    expect((await run({ haribhagatId: String(suresh.id) })).total).toBe(2);
  });

  it("only users who may see mobile numbers can search by mobile", async () => {
    process.env.MOBILE_VISIBLE_ROLES = "ADMIN";
    envModule._resetEnvForTests();
    expect((await run({ mobileNo: "9876543210" })).total).toBe(0);
    expect((await run({ q: "9876543210" })).total).toBe(0);
    process.env.MOBILE_VISIBLE_ROLES = "ADMIN,STAFF";
    envModule._resetEnvForTests();
    expect((await run({ mobileNo: "9876543210" })).total).toBe(2);
  });

  it("is paginated and reports page information", async () => {
    const result = await run({ page: "1" });
    expect(result.total).toBe(3);
    expect(result.pageSize).toBe(search.SEARCH_PAGE_SIZE);
    expect(result.totalPages).toBe(1);
  });
});

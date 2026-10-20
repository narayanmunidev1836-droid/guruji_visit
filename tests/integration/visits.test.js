import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HAS_DB, getDb, makeDisk, makeEvent, makePerson, makeUser, resetDb } from "./helpers.js";

describe.skipIf(!HAS_DB)("visits (Haribhagat + hard disk + folder)", () => {
  let db;
  let svc;
  let staff;
  let disk;
  let ramesh;
  let suresh;

  beforeAll(async () => {
    db = await getDb();
    svc = await import("@/lib/services/visits");
  });
  afterAll(() => db?.$disconnect());
  beforeEach(async () => {
    await resetDb(db);
    staff = await makeUser(db, "STAFF");
    disk = await makeDisk(db, "HDD-001");
    ramesh = await makePerson(db);
    suresh = await makePerson(db, { name: "Suresh", surname: "Shah", fatherName: "Mohan", gam: "Surat" });
  });

  const base = (extra = {}) => ({ haribhagatIds: [String(ramesh.id)], hardDiskId: String(disk.id), folderPath: "MUKT SWAMI DATA/decstop", ...extra });

  it("creates a visit with only a Haribhagat, a disk and a folder", async () => {
    const result = await svc.createVisit(staff, base());
    expect(result.ok).toBe(true);
    const visit = await svc.getVisit(result.visit.id);
    expect(visit.hardDisk.labelName).toBe("HDD-001");
    expect(visit.folderPath).toBe("MUKT SWAMI DATA/decstop");
    expect(visit.eventId).toBeNull();
    expect(visit.visitDate).toBeNull();
    expect(visit.haribhagats.map((l) => [l.haribhagatId, l.isPrimary])).toEqual([[ramesh.id, true]]);
    expect(visit.createdBy.name).toBe(staff.name);
  });

  it("accepts a pasted Windows path: the drive letter is dropped and separators are unified", async () => {
    const result = await svc.createVisit(staff, base({ folderPath: String.raw`F:\MUKT SWAMI DATA\decstop` }));
    expect((await svc.getVisit(result.visit.id)).folderPath).toBe("MUKT SWAMI DATA/decstop");
  });

  it("allows an empty folder (disk root) and rejects '..'", async () => {
    const root = await svc.createVisit(staff, base({ folderPath: "" }));
    expect((await svc.getVisit(root.visit.id)).folderPath).toBe("");
    const bad = await svc.createVisit(staff, base({ folderPath: "../secret" }));
    expect(bad.ok).toBe(false);
    expect(bad.fieldErrors.folderPath).toBeTruthy();
  });

  it("requires at least one Haribhagat and an active hard disk", async () => {
    expect((await svc.createVisit(staff, base({ haribhagatIds: [] }))).fieldErrors.haribhagatIds).toBeTruthy();
    expect((await svc.createVisit(staff, base({ haribhagatIds: ["999999"] }))).ok).toBe(false);
    expect((await svc.createVisit(staff, base({ hardDiskId: "" }))).fieldErrors.hardDiskId).toBeTruthy();
    await db.hardDisk.update({ where: { id: disk.id }, data: { isActive: false } });
    expect((await svc.createVisit(staff, base())).fieldErrors.hardDiskId).toBeTruthy();
    expect(await db.visit.count()).toBe(0);
  });

  it("stores optional event, date, place and several people with a primary person", async () => {
    const event = await makeEvent(db, "Pathramani");
    const result = await svc.createVisit(
      staff,
      base({
        haribhagatIds: [String(ramesh.id), String(suresh.id)],
        primaryHaribhagatId: String(suresh.id),
        eventId: String(event.id),
        visitDate: "2019-03-14",
        placeType: "HOME",
        notes: "At home",
      }),
    );
    expect(result.ok).toBe(true);
    const visit = await svc.getVisit(result.visit.id);
    expect(visit.visitDate.toISOString().slice(0, 10)).toBe("2019-03-14");
    expect(visit.event.name).toBe("Pathramani");
    expect(visit.placeType).toBe("HOME");
    expect(visit.haribhagats.map((l) => [l.haribhagatId, l.isPrimary])).toEqual(expect.arrayContaining([[suresh.id, true], [ramesh.id, false]]));
  });

  it("only allows ACTIVE events for new visits", async () => {
    const event = await makeEvent(db, "Old", { isActive: false });
    const result = await svc.createVisit(staff, base({ eventId: String(event.id) }));
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.eventId).toBeTruthy();
  });

  it("updates a visit, replaces its people, and lets an old visit keep a deactivated disk", async () => {
    const created = (await svc.createVisit(staff, base())).visit;
    await db.hardDisk.update({ where: { id: disk.id }, data: { isActive: false } });
    const updated = await svc.updateVisit(staff, created.id, base({ haribhagatIds: [String(suresh.id)], folderPath: "other/folder", notes: "moved" }));
    expect(updated.ok).toBe(true);
    const visit = await svc.getVisit(created.id);
    expect(visit.folderPath).toBe("other/folder");
    expect(visit.haribhagats.map((l) => l.haribhagatId)).toEqual([suresh.id]);

    const other = await makeDisk(db, "HDD-002", { stableIdentifier: null, isActive: false });
    expect((await svc.updateVisit(staff, created.id, base({ hardDiskId: String(other.id) }))).ok).toBe(false);
  });

  it("lists visits newest first (undated last) with their disk and people", async () => {
    await svc.createVisit(staff, base({ visitDate: "2019-03-14", folderPath: "old" }));
    await svc.createVisit(staff, base({ haribhagatIds: [String(suresh.id)], visitDate: "2020-01-01", folderPath: "new" }));
    await svc.createVisit(staff, base({ folderPath: "undated" }));
    const list = await svc.listVisits({});
    expect(list.total).toBe(3);
    expect(list.items.map((v) => v.folderPath)).toEqual(["new", "old", "undated"]);
    expect(list.items[0].hardDisk.labelName).toBe("HDD-001");
    expect((await svc.listVisits({ hardDiskId: disk.id })).total).toBe(3);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HAS_DB, getDb, makeDisk, makePerson, makeUser, resetDb } from "./helpers.js";

describe.skipIf(!HAS_DB)("events master data", () => {
  let db;
  let events;
  let admin;

  beforeAll(async () => {
    db = await getDb();
    events = await import("@/lib/services/events");
  });
  afterAll(() => db?.$disconnect());
  beforeEach(async () => {
    await resetDb(db);
    admin = await makeUser(db, "ADMIN");
  });

  const activeNames = async () => (await events.listActiveEvents()).map((e) => e.name);

  it("the dropdown lists the events A-Z and every row carries isActive (forms use it)", async () => {
    await events.createEvent(admin, { name: "Vichran" });
    await events.createEvent(admin, { name: "Pathramani" });
    expect(await activeNames()).toEqual(["PATHRAMANI", "VICHRAN"]);
    expect((await events.listActiveEvents()).every((e) => e.isActive === true)).toBe(true);
  });

  it("rejects duplicate names regardless of case and spacing", async () => {
    expect((await events.createEvent(admin, { name: "Pathramani" })).ok).toBe(true);
    const dup = await events.createEvent(admin, { name: "  pathramani " });
    expect(dup.ok).toBe(false);
    expect(dup.fieldErrors.name).toBeTruthy();
    expect(await db.event.count()).toBe(1);
  });

  it("requires a name", async () => {
    const result = await events.createEvent(admin, { name: "   " });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.name).toBeTruthy();
  });

  it("rename cannot clash with another event but may keep its own name", async () => {
    const a = (await events.createEvent(admin, { name: "Alpha" })).event;
    await events.createEvent(admin, { name: "Beta" });
    expect((await events.updateEvent(admin, a.id, { name: "beta" })).ok).toBe(false);
    expect((await events.updateEvent(admin, a.id, { name: "Alpha", description: "now with text" })).ok).toBe(true);
  });

  it("deletes an event only when no entry uses it", async () => {
    const used = (await events.createEvent(admin, { name: "Used" })).event;
    const free = (await events.createEvent(admin, { name: "Free" })).event;
    const disk = await makeDisk(db, "HDD-X");
    await db.visit.create({ data: { eventId: used.id, hardDiskId: disk.id, folderPath: "A" } });

    const refused = await events.deleteEvent(admin, used.id);
    expect(refused.ok).toBe(false);
    expect(refused.error).toContain("another event first");
    expect(await db.event.count({ where: { id: used.id } })).toBe(1);

    expect((await events.deleteEvent(admin, free.id)).ok).toBe(true);
    expect(await db.event.count({ where: { id: free.id } })).toBe(0);
    expect((await events.deleteEvent(admin, free.id)).ok).toBe(false);
    expect(await db.auditLog.findFirst({ where: { action: "event.delete" } })).toBeTruthy();
  });

  it("writes an audit log entry for changes", async () => {
    await events.createEvent(admin, { name: "Audited" });
    const log = await db.auditLog.findFirst({ where: { action: "event.create" } });
    expect(log?.userId).toBe(admin.id);
  });
});

describe.skipIf(!HAS_DB)("hard disk master data", () => {
  let db;
  let disks;
  let admin;

  beforeAll(async () => {
    db = await getDb();
    disks = await import("@/lib/services/disks");
  });
  afterAll(() => db?.$disconnect());
  beforeEach(async () => {
    await resetDb(db);
    admin = await makeUser(db, "ADMIN");
  });

  const activeLabels = async () => (await disks.listActiveDisks()).map((d) => d.labelName);

  it("enforces a unique sticker label, ignoring case and extra spaces", async () => {
    expect((await disks.createDisk(admin, { labelName: "HDD-001" })).ok).toBe(true);
    for (const label of ["hdd-001", "  HDD-001  ", "Hdd-001"]) {
      const dup = await disks.createDisk(admin, { labelName: label });
      expect(dup.ok).toBe(false);
      expect(dup.fieldErrors.labelName).toBeTruthy();
    }
    expect(await db.hardDisk.count()).toBe(1);
  });

  it("the dropdown only contains active registered disks", async () => {
    await disks.createDisk(admin, { labelName: "HDD-001" });
    const second = (await disks.createDisk(admin, { labelName: "HDD-002" })).disk;
    expect(await activeLabels()).toEqual(["HDD-001", "HDD-002"]);

    await disks.setDiskActive(admin, second.id, false);
    expect(await activeLabels()).toEqual(["HDD-001"]);

    await disks.createDisk(admin, { labelName: "HDD-003" });
    expect(await activeLabels()).toEqual(["HDD-001", "HDD-003"]);
  });

  it("keeps a deactivated disk selectable for records that use it", async () => {
    const disk = (await disks.createDisk(admin, { labelName: "HDD-009" })).disk;
    await disks.createDisk(admin, { labelName: "HDD-010" });
    await disks.setDiskActive(admin, disk.id, false);
    expect((await disks.listDisksForSelect(disk.id)).map((d) => d.labelName)).toEqual(["HDD-009", "HDD-010"]);
  });

  it("renaming keeps the internal id and every visit link", async () => {
    const disk = (await disks.createDisk(admin, { labelName: "HDD-001" })).disk;
    const person = await makePerson(db);
    const visit = await db.visit.create({ data: { hardDiskId: disk.id, folderPath: "2019", haribhagats: { create: [{ haribhagatId: person.id, isPrimary: true }] } } });

    const renamed = await disks.updateDisk(admin, disk.id, { labelName: "HDD-001-NEW", description: "relabelled" });
    expect(renamed.ok).toBe(true);
    expect(renamed.disk.id).toBe(disk.id);
    const reloaded = await db.visit.findUnique({ where: { id: visit.id }, include: { hardDisk: true } });
    expect(reloaded.hardDisk.labelName).toBe("HDD-001-NEW");
  });

  it("refuses to rename onto another disk's label", async () => {
    const a = (await disks.createDisk(admin, { labelName: "HDD-001" })).disk;
    await disks.createDisk(admin, { labelName: "HDD-002" });
    const result = await disks.updateDisk(admin, a.id, { labelName: "hdd-002" });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.labelName).toBeTruthy();
  });

  it("never deletes: deactivation keeps the row and its visits", async () => {
    const disk = (await disks.createDisk(admin, { labelName: "HDD-001" })).disk;
    const person = await makePerson(db);
    await db.visit.create({ data: { hardDiskId: disk.id, folderPath: "a", haribhagats: { create: [{ haribhagatId: person.id, isPrimary: true }] } } });
    await disks.setDiskActive(admin, disk.id, false);
    expect(await db.hardDisk.count()).toBe(1);
    expect(await db.visit.count()).toBe(1);
  });
});

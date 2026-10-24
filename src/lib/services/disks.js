import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { diskLabelKey } from "@/lib/normalize";
import { fail, ok, validate, isUniqueViolation } from "@/lib/result";
import { optionalText, requiredText } from "@/lib/validation";
import { audit } from "@/lib/services/audit";

const diskSchema = z.object({
  labelName: requiredText("Sticker label", 60),
  description: optionalText(300),
  serialNumber: optionalText(100),
  notes: optionalText(1000),
});

/** Source of the "Hard Disk Name" dropdown. Only active, registered disks. */
export async function listActiveDisks() {
  return db.hardDisk.findMany({
    where: { isActive: true },
    orderBy: { labelName: "asc" },
    select: { id: true, labelName: true },
  });
}

/** Active disks plus the one a record already uses, even if it was deactivated later. */
export async function listDisksForSelect(currentDiskId) {
  return db.hardDisk.findMany({
    where: { OR: [{ isActive: true }, ...(currentDiskId ? [{ id: currentDiskId }] : [])] },
    orderBy: { labelName: "asc" },
    select: { id: true, labelName: true, isActive: true },
  });
}

/** All disks (active first); `q` keeps those whose label, description, serial number or notes contain the text. */
export async function listDisks(q) {
  const text = String(q ?? "").trim().slice(0, 100);
  const contains = { contains: text, mode: "insensitive" };
  return db.hardDisk.findMany({
    where: text ? { OR: [{ labelName: contains }, { description: contains }, { serialNumber: contains }, { notes: contains }] } : undefined,
    orderBy: [{ isActive: "desc" }, { labelName: "asc" }],
    include: { _count: { select: { visits: true } } },
  });
}

export async function getDisk(id) {
  return db.hardDisk.findUnique({ where: { id }, include: { _count: { select: { visits: true } } } });
}

export async function createDisk(actor, input) {
  const parsed = validate(diskSchema, input);
  if (!parsed.ok) return parsed;
  const { labelName, description, serialNumber, notes } = parsed.data;
  const labelKey = diskLabelKey(labelName);

  const existing = await db.hardDisk.findUnique({ where: { labelKey } });
  if (existing) {
    return fail("A hard disk with this sticker label already exists.", {
      labelName: `"${existing.labelName}" already exists${existing.isActive ? "" : " (inactive)"}.`,
    });
  }
  try {
    const disk = await db.hardDisk.create({ data: { labelName, labelKey, description, serialNumber, notes } });
    await audit(actor, "disk.create", "HardDisk", disk.id, { labelName });
    return ok({ disk });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("A hard disk with this sticker label already exists.", { labelName: "Already exists." });
    throw error;
  }
}

/** Renaming keeps the internal id, so every visit stays linked. */
export async function updateDisk(actor, id, input) {
  const parsed = validate(diskSchema, input);
  if (!parsed.ok) return parsed;
  const { labelName, description, serialNumber, notes } = parsed.data;
  const labelKey = diskLabelKey(labelName);

  const current = await db.hardDisk.findUnique({ where: { id } });
  if (!current) return fail("Hard disk not found.");
  const clash = await db.hardDisk.findFirst({ where: { labelKey, NOT: { id } } });
  if (clash) return fail("Another hard disk already uses this label.", { labelName: "Another disk already uses this label." });

  try {
    const disk = await db.hardDisk.update({ where: { id }, data: { labelName, labelKey, description, serialNumber, notes } });
    await audit(actor, "disk.update", "HardDisk", id, current.labelName !== labelName ? { from: current.labelName, to: labelName } : undefined);
    return ok({ disk });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("Another hard disk already uses this label.", { labelName: "Already exists." });
    throw error;
  }
}

/** Deletes a disk that no entry uses (a mistaken registration). A disk with entries can only be deactivated. */
export async function deleteDisk(actor, id) {
  const disk = await db.hardDisk.findUnique({ where: { id }, include: { _count: { select: { visits: true } } } });
  if (!disk) return fail("Hard disk not found.");
  const count = disk._count.visits;
  if (count > 0) {
    return fail(`"${disk.labelName}" is used in ${count} ${count === 1 ? "entry" : "entries"}, so it cannot be deleted. Deactivate it instead.`);
  }
  await db.hardDisk.delete({ where: { id } });
  await audit(actor, "disk.delete", "HardDisk", id, { labelName: disk.labelName });
  return ok();
}

/** Disks referenced by visits are deactivated, never deleted. */
export async function setDiskActive(actor, id, isActive) {
  const current = await db.hardDisk.findUnique({ where: { id } });
  if (!current) return fail("Hard disk not found.");
  if (current.isActive === isActive) return ok({ disk: current });
  const disk = await db.hardDisk.update({ where: { id }, data: { isActive } });
  await audit(actor, isActive ? "disk.activate" : "disk.deactivate", "HardDisk", id, { labelName: current.labelName });
  return ok({ disk });
}

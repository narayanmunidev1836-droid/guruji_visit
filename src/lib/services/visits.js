import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, ok, validate } from "@/lib/result";
import { parseDateInput } from "@/lib/format";
import { normalizeFolderPath, InvalidPathError } from "@/lib/paths";
import { idField, optionalIdField, optionalPlaceType, optionalText } from "@/lib/validation";
import { makeDupKey } from "@/lib/normalize";
import { audit } from "@/lib/services/audit";
import { findPossibleDuplicates, haribhagatSchema } from "@/lib/services/haribhagats";

const MAX_PEOPLE = 50;

const idList = z.preprocess(
  (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]),
  z
    .array(z.coerce.number().int().positive())
    .min(1, "Choose at least one Haribhagat.")
    .max(MAX_PEOPLE, `At most ${MAX_PEOPLE} Haribhagats per visit.`),
);

/** Optional date: empty -> null, invalid -> error. */
const optionalDate = z.preprocess(
  (v) => (v === undefined || v === null ? "" : String(v)),
  z.string().transform((value, ctx) => {
    const date = parseDateInput(value);
    if (date === undefined) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return date;
  }),
);

const visitFields = {
  primaryHaribhagatId: optionalIdField,
  hardDiskId: idField("Hard disk"),
  folderPath: z.any().optional(),
  eventId: optionalIdField,
  visitDate: optionalDate,
  placeType: optionalPlaceType,
  notes: optionalText(1000),
};

export const visitSchema = z.object({ haribhagatIds: idList, ...visitFields });

/** Same visit fields, but the Haribhagat is typed in (a new person) instead of chosen from existing ones. */
const visitWithNewPersonSchema = z.object({ haribhagatIds: z.any().optional(), ...visitFields });

/**
 * Folder typed by staff, relative to the disk root. A pasted Windows path such as "F:\MUKT SWAMI DATA\decstop" is accepted:
 * the drive letter only says where the disk happened to be mounted, so it is dropped and "\" becomes "/".
 * Returns { ok, folder } or an error result. "" means the disk root.
 */
export function parseVisitFolder(input) {
  const text = String(input ?? "").trim().replace(/^([A-Za-z]:)?[\\/]*/, "");
  try {
    return { ok: true, folder: normalizeFolderPath(text) };
  } catch (error) {
    if (error instanceof InvalidPathError) return fail(error.message, { folderPath: error.message });
    throw error;
  }
}

async function resolveHaribhagatLinks(data) {
  const ids = [...new Set(data.haribhagatIds)];
  const found = await db.haribhagat.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length !== ids.length) return fail("One of the selected Haribhagats no longer exists.", { haribhagatIds: "Invalid selection." });
  const primary = data.primaryHaribhagatId && ids.includes(data.primaryHaribhagatId) ? data.primaryHaribhagatId : ids[0];
  return { ok: true, links: ids.map((haribhagatId) => ({ haribhagatId, isPrimary: haribhagatId === primary })) };
}

/** An existing visit may keep a disk / event that was deactivated later, but cannot be moved to an inactive one. */
async function checkDiskAndEvent(data, current) {
  const disk = await db.hardDisk.findUnique({ where: { id: data.hardDiskId } });
  if (!disk || (!disk.isActive && disk.id !== current?.hardDiskId)) {
    return fail("Choose an active hard disk.", { hardDiskId: "Choose an active hard disk." });
  }
  if (data.eventId) {
    const event = await db.event.findUnique({ where: { id: data.eventId } });
    if (!event || (!event.isActive && event.id !== current?.eventId)) {
      return fail("Choose an active event.", { eventId: "Choose an active event." });
    }
  }
  return { ok: true, disk };
}

const hasIds = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((v) => String(v).trim() !== "").length > 0;

/**
 * Creates a visit: the Haribhagat + the hard disk and folder where the photos of that visit are kept.
 * The Haribhagat is either an existing person (`haribhagatIds`) or typed in with the visit (name, surname, ...): then a new
 * Haribhagat is created together with the visit. Similar existing people only produce a warning (`confirmDuplicate`).
 */
export async function createVisit(actor, input, { confirmDuplicate = false, canEditMobile = true } = {}) {
  const newPerson = !hasIds(input.haribhagatIds);

  const visitParsed = validate(newPerson ? visitWithNewPersonSchema : visitSchema, input);
  let personData = null;
  let personErrors = null;
  if (newPerson) {
    const personParsed = validate(haribhagatSchema, { ...input, mobileNo: canEditMobile ? input.mobileNo : "" });
    if (personParsed.ok) personData = personParsed.data;
    else personErrors = personParsed.fieldErrors;
  }
  if (!visitParsed.ok || personErrors) {
    return fail("Please correct the highlighted fields.", { ...(personErrors ?? {}), ...(visitParsed.ok ? {} : visitParsed.fieldErrors) });
  }
  const data = visitParsed.data;

  const folder = parseVisitFolder(input.folderPath);
  if (!folder.ok) return folder;
  const checked = await checkDiskAndEvent(data, null);
  if (!checked.ok) return checked;

  let links = [];
  if (newPerson) {
    if (!confirmDuplicate) {
      const duplicates = await findPossibleDuplicates(personData);
      if (duplicates.length > 0) return fail("A similar Haribhagat already exists. Choose that person, or save a new one anyway.", {}, { duplicates });
    }
  } else {
    const linked = await resolveHaribhagatLinks(data);
    if (!linked.ok) return linked;
    links = linked.links;
  }

  const visit = await db.$transaction(async (tx) => {
    if (newPerson) {
      const person = await tx.haribhagat.create({ data: { ...personData, dupKey: makeDupKey(personData), createdById: actor.id } });
      links = [{ haribhagatId: person.id, isPrimary: true }];
      await audit(actor, "haribhagat.create", "Haribhagat", person.id, { name: `${person.name} ${person.surname}`, via: "visit" });
    }
    return tx.visit.create({
      data: {
        eventId: data.eventId,
        visitDate: data.visitDate,
        hardDiskId: data.hardDiskId,
        folderPath: folder.folder,
        placeType: data.placeType,
        notes: data.notes,
        createdById: actor.id,
        haribhagats: { create: links },
      },
    });
  });
  await audit(actor, "visit.create", "Visit", visit.id, { disk: checked.disk.labelName, folder: folder.folder });
  return ok({ visit });
}

export async function updateVisit(actor, id, input) {
  const parsed = validate(visitSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  const current = await db.visit.findUnique({ where: { id } });
  if (!current) return fail("Visit not found.");
  const folder = parseVisitFolder(input.folderPath);
  if (!folder.ok) return folder;
  const checked = await checkDiskAndEvent(data, current);
  if (!checked.ok) return checked;
  const linked = await resolveHaribhagatLinks(data);
  if (!linked.ok) return linked;

  await db.$transaction(async (tx) => {
    await tx.visit.update({
      where: { id },
      data: {
        eventId: data.eventId,
        visitDate: data.visitDate,
        hardDiskId: data.hardDiskId,
        folderPath: folder.folder,
        placeType: data.placeType,
        notes: data.notes,
      },
    });
    await tx.visitHaribhagat.deleteMany({ where: { visitId: id } });
    await tx.visitHaribhagat.createMany({ data: linked.links.map((l) => ({ ...l, visitId: id })) });
  });
  await audit(actor, "visit.update", "Visit", id);
  return ok();
}

const PERSON_SELECT = { id: true, name: true, fatherName: true, surname: true, gam: true, jillo: true };

/** Includes shared by every place that renders a visit together with its people and its disk + folder. */
export const VISIT_CARD_INCLUDE = {
  event: { select: { id: true, name: true } },
  hardDisk: { select: { id: true, labelName: true, isActive: true } },
  haribhagats: { orderBy: { isPrimary: "desc" }, include: { haribhagat: { select: PERSON_SELECT } } },
};

export async function getVisit(id) {
  return db.visit.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, name: true, isActive: true } },
      hardDisk: { select: { id: true, labelName: true, isActive: true } },
      createdBy: { select: { name: true } },
      haribhagats: {
        orderBy: { isPrimary: "desc" },
        include: { haribhagat: { select: { ...PERSON_SELECT, jillo: true } } },
      },
    },
  });
}

export async function listVisits({ page = 1, pageSize = 25, eventId, hardDiskId } = {}) {
  const where = { ...(eventId ? { eventId } : {}), ...(hardDiskId ? { hardDiskId } : {}) };
  const [items, total] = await Promise.all([
    db.visit.findMany({
      where,
      orderBy: [{ visitDate: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: VISIT_CARD_INCLUDE,
    }),
    db.visit.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

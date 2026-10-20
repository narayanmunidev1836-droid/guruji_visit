import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { makeDupKey } from "@/lib/normalize";
import { canViewMobile, mobileForUser } from "@/lib/permissions";
import { fail, ok, validate } from "@/lib/result";
import { mobileField, optionalText, pincodeField, requiredText } from "@/lib/validation";
import { audit } from "@/lib/services/audit";
import { buildPersonWhere } from "@/lib/services/person-filters";

export const haribhagatSchema = z.object({
  name: requiredText("Name", 100),
  fatherName: optionalText(100),
  surname: requiredText("Surname", 100),
  gam: optionalText(100),
  taluko: optionalText(100),
  jillo: optionalText(100),
  pincode: pincodeField,
  mobileNo: mobileField,
});

const PAGE_SIZE = 20;

function viewModel(person, user) {
  const { mobileVisibleRoles } = getEnv();
  return {
    ...person,
    mobileNo: mobileForUser(person.mobileNo, user, mobileVisibleRoles),
    mobileMasked: Boolean(person.mobileNo) && !canViewMobile(user, mobileVisibleRoles),
  };
}

/**
 * Finds records that may be the same person. This only produces a WARNING; two people are never merged
 * automatically and a user can always choose "create anyway".
 */
export async function findPossibleDuplicates(data, { excludeId } = {}) {
  const dupKey = makeDupKey(data);
  const or = [
    { dupKey },
    {
      name: { equals: data.name, mode: "insensitive" },
      surname: { equals: data.surname, mode: "insensitive" },
      ...(data.fatherName ? { fatherName: { equals: data.fatherName, mode: "insensitive" } } : {}),
    },
  ];
  if (data.mobileNo) or.push({ mobileNo: data.mobileNo });

  const matches = await db.haribhagat.findMany({
    where: { OR: or, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    orderBy: { id: "asc" },
    take: 8,
    select: { id: true, name: true, fatherName: true, surname: true, gam: true, jillo: true, mobileNo: true },
  });
  return matches.map((m) => ({
    ...m,
    // Never reveal a full mobile number inside a warning; just say whether it matched.
    sameMobile: Boolean(data.mobileNo) && m.mobileNo === data.mobileNo,
    mobileNo: undefined,
  }));
}

export async function createHaribhagat(actor, input, { confirmDuplicate = false } = {}) {
  const parsed = validate(haribhagatSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  if (!confirmDuplicate) {
    const duplicates = await findPossibleDuplicates(data);
    if (duplicates.length > 0) {
      return fail("A similar Haribhagat already exists. Check before creating a new record.", {}, { duplicates });
    }
  }

  const person = await db.haribhagat.create({
    data: { ...data, dupKey: makeDupKey(data), createdById: actor.id },
  });
  await audit(actor, "haribhagat.create", "Haribhagat", person.id, { name: `${person.name} ${person.surname}` });
  return ok({ person });
}

/**
 * `canEditMobile` is false for roles that may not see mobile numbers: they cannot change the stored
 * number either (the form does not even send it), so it is carried over unchanged.
 */
export async function updateHaribhagat(actor, id, input, { confirmDuplicate = false, canEditMobile = true } = {}) {
  const parsed = validate(haribhagatSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  const current = await db.haribhagat.findUnique({ where: { id } });
  if (!current) return fail("Haribhagat not found.");
  if (!canEditMobile) data.mobileNo = current.mobileNo;

  if (!confirmDuplicate) {
    const duplicates = await findPossibleDuplicates(data, { excludeId: id });
    if (duplicates.length > 0) {
      return fail("Another similar Haribhagat already exists. Check before saving.", {}, { duplicates });
    }
  }

  const person = await db.haribhagat.update({ where: { id }, data: { ...data, dupKey: makeDupKey(data) } });
  await audit(actor, "haribhagat.update", "Haribhagat", id, { name: `${person.name} ${person.surname}` });
  return ok({ person });
}

/** Paginated directory search. `filters` come from the URL; mobile numbers are masked for unauthorized roles. */
export async function searchHaribhagats(user, filters, page = 1) {
  const { mobileVisibleRoles } = getEnv();
  const where = buildPersonWhere(filters, { allowMobile: canViewMobile(user, mobileVisibleRoles) }) ?? {};
  const [items, total] = await Promise.all([
    db.haribhagat.findMany({
      where,
      orderBy: [{ surname: "asc" }, { name: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { visits: true } } },
    }),
    db.haribhagat.count({ where }),
  ]);
  return {
    items: items.map((p) => ({ ...viewModel(p, user), visitCount: p._count.visits })),
    total,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getHaribhagat(user, id) {
  const person = await db.haribhagat.findUnique({ where: { id } });
  return person ? viewModel(person, user) : null;
}

/** Visits of one person (newest first) with the hard disk and folder where the photos are kept. */
export async function getHaribhagatVisits(id) {
  const rows = await db.visitHaribhagat.findMany({
    where: { haribhagatId: id },
    orderBy: [{ visit: { visitDate: { sort: "desc", nulls: "last" } } }, { visitId: "desc" }],
    take: 100,
    include: {
      visit: {
        include: {
          event: { select: { id: true, name: true } },
          hardDisk: { select: { id: true, labelName: true, isActive: true } },
          haribhagats: { orderBy: { isPrimary: "desc" }, include: { haribhagat: { select: { id: true, name: true, fatherName: true, surname: true, gam: true, jillo: true } } } },
        },
      },
    },
  });
  return rows.map((r) => r.visit);
}

/** Compact lookup used by the "choose Haribhagats" picker on the visit form. Mobile numbers are never returned. */
export async function pickerSearch(query, limit = 10) {
  const where = buildPersonWhere({ q: query }, { allowMobile: false });
  if (!where) return [];
  const rows = await db.haribhagat.findMany({
    where,
    orderBy: [{ surname: "asc" }, { name: "asc" }],
    take: limit,
    select: { id: true, name: true, fatherName: true, surname: true, gam: true, jillo: true },
  });
  return rows;
}

export async function getHaribhagatsByIds(ids) {
  if (ids.length === 0) return [];
  return db.haribhagat.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, fatherName: true, surname: true, gam: true, jillo: true },
  });
}

export function displayPerson(p) {
  const parts = [p.name, p.fatherName, p.surname].filter(Boolean).join(" ");
  const place = [p.gam, p.jillo].filter(Boolean).join(", ");
  return place ? `${parts} (${place})` : parts;
}

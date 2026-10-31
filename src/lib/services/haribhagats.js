import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { mergeMembers } from "@/lib/member-api";
import { digitsOnly, makeDupKey } from "@/lib/normalize";
import { canViewMobile, mobileForUser } from "@/lib/permissions";
import { fail, ok, validate } from "@/lib/result";
import { contactMobileField, optionalText, pincodeField, requiredText } from "@/lib/validation";
import { audit } from "@/lib/services/audit";
import { searchDirectory } from "@/lib/services/member-directory";
import { buildPersonWhere, queryTokens } from "@/lib/services/person-filters";

export const haribhagatSchema = z.object({
  name: requiredText("Name", 100),
  fatherName: optionalText(100),
  surname: requiredText("Surname", 100),
  gam: optionalText(100),
  taluko: optionalText(100),
  jillo: optionalText(100),
  state: optionalText(100),
  country: optionalText(100),
  pincode: pincodeField,
  mobileNo: contactMobileField,
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
      return fail("A similar Member already exists. Check before creating a new record.", {}, { duplicates });
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
  if (!current) return fail("Member not found.");
  if (!canEditMobile) data.mobileNo = current.mobileNo;

  if (!confirmDuplicate) {
    const duplicates = await findPossibleDuplicates(data, { excludeId: id });
    if (duplicates.length > 0) {
      return fail("Another similar Member already exists. Check before saving.", {}, { duplicates });
    }
  }

  const person = await db.haribhagat.update({ where: { id }, data: { ...data, dupKey: makeDupKey(data) } });
  await audit(actor, "haribhagat.update", "Haribhagat", id, { name: `${person.name} ${person.surname}` });
  return ok({ person });
}

/**
 * Deletes a Haribhagat. Refused while any entry (visit) still lists them, because those entries would lose their person:
 * delete or edit the entries first.
 */
export async function deleteHaribhagat(actor, id) {
  const person = await db.haribhagat.findUnique({ where: { id }, include: { _count: { select: { visits: true } } } });
  if (!person) return fail("Member not found.");
  const count = person._count.visits;
  if (count > 0) {
    return fail(`${person.name} ${person.surname} is used in ${count} ${count === 1 ? "entry" : "entries"}. Delete or change those entries first.`);
  }
  await db.haribhagat.delete({ where: { id } });
  await audit(actor, "haribhagat.delete", "Haribhagat", id, { name: `${person.name} ${person.surname}` });
  return ok();
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

/**
 * Compact lookup used by the Haribhagat search on the entry form. Only a role that may see mobile numbers (`allowMobile`)
 * can search by mobile, and only then is the number returned with the result.
 */
export async function pickerSearch(query, { limit = 10, allowMobile = false } = {}) {
  const rows = await findPickerRows(query, { limit, allowMobile });
  return rows.map((row) => ({ ...row, mobileNo: allowMobile ? row.mobileNo : undefined }));
}

/** Saved Haribhagats matching the search text, WITH their mobile number - callers must strip it for roles that may not see it. */
async function findPickerRows(query, { limit, allowMobile }) {
  const where = buildPersonWhere({ q: query }, { allowMobile });
  if (!where) return [];
  return db.haribhagat.findMany({
    where,
    orderBy: [{ surname: "asc" }, { name: "asc" }],
    take: limit,
    select: { id: true, name: true, fatherName: true, surname: true, gam: true, jillo: true, mobileNo: true },
  });
}

// Rows of the Members directory loaded at a time in the "Select Member" window (more load as the user scrolls down).
export const PICKER_PAGE_SIZE = 10;
// Most rows of one source the window ever lists; real name searches stay far below it ("patel" is about 4,600).
export const SEARCH_LIMIT = 5000;

// Mobile numbers of a search row (saved and directory ones); removed for roles that may not see mobile numbers.
const MOBILE_KEYS = ["mobileNo", "mobileText", "fatherMobile"];

/**
 * The "Select Member" search: saved Haribhagats AND the Members directory (member-directory.js), merged with the saved ones
 * first and nobody listed twice. A role that may not see mobile numbers cannot search the directory by number either (the
 * directory would match them without showing them) and gets no mobile numbers back.
 * Nothing is cut to "the first 10", but the directory is read one PAGE at a time (a broad word such as "a" matches 26,000
 * members and 18 MB): the first call (`offset` 0) answers the saved Members and the first PICKER_PAGE_SIZE directory rows, every later
 * call (`offset` = the `nextOffset` of the previous answer) only the next PICKER_PAGE_SIZE directory rows. The window asks for the next
 * page when the user scrolls to the end of the list, until `hasMore` is false.
 * Returns { rows, directoryFailed, hasMore, nextOffset, truncated, directoryRaw }; rows carry `source` ("saved" | "directory")
 * and a `key`. `truncated` means SEARCH_LIMIT rows were reached with more left (type more letters). `directoryRaw` is the
 * directory's untouched page, development only and only for roles that may see mobile numbers.
 */
export async function searchMembers(query, { offset = 0, allowMobile = false, signal } = {}) {
  const searchesNumber = !allowMobile && queryTokens(query).some((token) => digitsOnly(token).length >= 3);
  const pageLimit = Math.min(PICKER_PAGE_SIZE, SEARCH_LIMIT - offset);
  const [saved, directory] = await Promise.all([
    findPickerRows(query, { limit: SEARCH_LIMIT + 1, allowMobile }), // later pages need them only to hide directory duplicates
    searchesNumber || pageLimit <= 0 ? { rows: [], more: false, nextOffset: offset, failed: false } : searchDirectory(query, { limit: pageLimit, offset, signal }),
  ]);
  const merged = mergeMembers(saved.slice(0, SEARCH_LIMIT), directory.rows);
  const rows = offset === 0 ? merged : merged.filter((row) => row.source === "directory");
  const atCeiling = offset + pageLimit >= SEARCH_LIMIT;
  return {
    rows: allowMobile ? rows : rows.map((row) => ({ ...row, ...Object.fromEntries(MOBILE_KEYS.map((key) => [key, undefined])) })),
    directoryFailed: directory.failed,
    hasMore: directory.more && !atCeiling,
    nextOffset: directory.nextOffset,
    truncated: (offset === 0 && saved.length > SEARCH_LIMIT) || (directory.more && atCeiling),
    directoryRaw: allowMobile ? directory.raw : undefined,
  };
}

const PLACE_FIELDS = ["gam", "taluko", "jillo", "state", "country"];

/**
 * Suggestions for the village / taluko / district / state / country boxes: the values already used by saved Haribhagats, most used first.
 * `context` narrows them to people whose other place fields contain the given text (a taluko box typed after the district).
 */
export async function suggestPlaces(field, query, context = {}, limit = 8) {
  if (!PLACE_FIELDS.includes(field)) return [];
  const and = [{ [field]: { not: null } }];
  const text = String(query ?? "").trim().slice(0, 100);
  if (text) and.push({ [field]: { contains: text, mode: "insensitive" } });
  for (const other of PLACE_FIELDS) {
    const value = other === field ? "" : String(context?.[other] ?? "").trim().slice(0, 100);
    if (value) and.push({ [other]: { contains: value, mode: "insensitive" } });
  }
  const rows = await db.haribhagat.groupBy({
    by: [field],
    where: { AND: and },
    _count: { id: true },
    orderBy: [{ _count: { id: "desc" } }, { [field]: "asc" }],
    take: limit,
  });
  return rows.map((row) => row[field]).filter((value) => value && value.trim() !== "");
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

import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { canViewMobile } from "@/lib/permissions";
import { digitsOnly, looseKey, normalizeText } from "@/lib/normalize";
import { parseDateInput } from "@/lib/format";
import { buildPersonWhere, personTokenConditions, queryTokens } from "@/lib/services/person-filters";
import { VISIT_CARD_INCLUDE } from "@/lib/services/visits";

export const SEARCH_PAGE_SIZE = 20;
export const LATEST_PAGE_SIZE = 10;
const MAX_PAGE = 5000;

const PLACE_TYPES = ["HOME", "OFFICE", "TEMPLE", "OTHER"];

function positiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Cleans raw URL parameters into a typed filter object. Unknown / invalid values are dropped. */
export function parseSearchParams(raw) {
  const text = (key) => normalizeText(Array.isArray(raw[key]) ? raw[key][0] : raw[key]);
  const dateFrom = parseDateInput(text("dateFrom"));
  const dateTo = parseDateInput(text("dateTo"));
  const placeType = text("placeType");
  const page = Math.min(positiveInt(text("page")) ?? 1, MAX_PAGE);

  return {
    q: text("q"),
    name: text("name"),
    fatherName: text("fatherName"),
    surname: text("surname"),
    gam: text("gam"),
    taluko: text("taluko"),
    jillo: text("jillo"),
    pincode: text("pincode"),
    mobileNo: text("mobileNo"),
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    dateFromText: dateFrom ? text("dateFrom") : null,
    dateToText: dateTo ? text("dateTo") : null,
    eventId: positiveInt(text("eventId")),
    hardDiskId: positiveInt(text("hardDiskId")),
    haribhagatId: positiveInt(text("haribhagatId")),
    placeType: PLACE_TYPES.includes(placeType) ? placeType : null,
    folder: text("folder")?.toLocaleUpperCase("en-US") ?? null, // folders are stored in CAPITALS
    page,
  };
}

/** The active filters as plain strings, used to keep them in pagination links and form defaults. */
export function filtersToParams(filters) {
  return {
    q: filters.q ?? undefined,
    name: filters.name ?? undefined,
    fatherName: filters.fatherName ?? undefined,
    surname: filters.surname ?? undefined,
    gam: filters.gam ?? undefined,
    taluko: filters.taluko ?? undefined,
    jillo: filters.jillo ?? undefined,
    pincode: filters.pincode ?? undefined,
    mobileNo: filters.mobileNo ?? undefined,
    dateFrom: filters.dateFromText ?? undefined,
    dateTo: filters.dateToText ?? undefined,
    eventId: filters.eventId ?? undefined,
    hardDiskId: filters.hardDiskId ?? undefined,
    haribhagatId: filters.haribhagatId ?? undefined,
    placeType: filters.placeType ?? undefined,
    folder: filters.folder ?? undefined,
  };
}

function endOfDay(date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Translates filters into a Prisma where clause for Visit. */
export function buildVisitWhere(filters, { allowMobile }) {
  const and = [];

  // Field filters (name, surname, gam, ...) must all match the SAME Haribhagat of the visit.
  const { q, ...fieldFilters } = filters;
  const personWhere = buildPersonWhere(fieldFilters, { allowMobile });
  if (personWhere) and.push({ haribhagats: { some: { haribhagat: personWhere } } });

  // Quick search box: each word may match a person field OR the hard-disk label / folder path / notes.
  for (const token of queryTokens(q)) {
    and.push({
      OR: [
        { haribhagats: { some: { haribhagat: { OR: personTokenConditions(token, { allowMobile }) } } } },
        { folderPath: { contains: token, mode: "insensitive" } },
        { hardDisk: { labelName: { contains: token, mode: "insensitive" } } },
        { notes: { contains: token, mode: "insensitive" } },
      ],
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    and.push({
      visitDate: {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      },
    });
  }

  if (filters.haribhagatId) and.push({ haribhagats: { some: { haribhagatId: filters.haribhagatId } } });
  if (filters.eventId) and.push({ eventId: filters.eventId });
  if (filters.placeType) and.push({ placeType: filters.placeType });
  if (filters.hardDiskId) and.push({ hardDiskId: filters.hardDiskId });
  if (filters.folder) {
    and.push({ OR: [{ folderPath: filters.folder }, { folderPath: { startsWith: `${filters.folder}/` } }] });
  }

  return and.length > 0 ? { AND: and } : {};
}

/** True when at least one filter is set (otherwise the search page shows the latest entries). */
export function hasSearchFilters(filters) {
  const { page, ...rest } = filters;
  void page;
  return Object.entries(rest).some(([key, value]) => !key.endsWith("Text") && value !== null && value !== undefined && value !== "");
}

const LOOSE_COLUMNS = ["name", "fatherName", "surname", "gam", "taluko", "jillo"];
const LOOSE_FIELDS = [...LOOSE_COLUMNS, "q"];
const LOOSE_MAX_PEOPLE = 300;

const column = (name) => Prisma.raw(`"${name}"`); // only ever called with the fixed names above

/**
 * The SQL twin of looseKey() in normalize.js. One flat raw fragment on purpose: Prisma.sql inside Prisma.sql inside Prisma.sql
 * loses text, and the column name is one of the fixed names above, never user input.
 */
const looseSql = (name) =>
  Prisma.raw(String.raw`regexp_replace(regexp_replace(regexp_replace(lower("${name}"), '\s', '', 'g'), '[aeiouyh]', '', 'g'), '(.)\1+', '\1', 'g')`);

const likeText = (text) => text.replace(/[\\%_]/g, (ch) => `\\${ch}`);

/** One word against one name column: by sound when the key is long enough to mean something, else plain "contains". */
function looseCondition(name, word) {
  const key = looseKey(word);
  if (key.length >= 2) return Prisma.sql`${looseSql(name)} LIKE ${`%${likeText(key)}%`}`;
  return Prisma.sql`${column(name)} ILIKE ${`%${likeText(word)}%`}`;
}

/**
 * Ids of the people whose name / village / ... SOUNDS like what was typed (PTEL finds PATEL). Used only when the exact search
 * found nothing. Every typed field must match the same person; words of the quick box may match any of the name columns.
 */
async function looseHaribhagatIds(filters, { allowMobile }) {
  const conditions = [];
  for (const name of LOOSE_COLUMNS) {
    const word = normalizeText(filters[name]);
    if (word) conditions.push(looseCondition(name, word));
  }
  for (const token of queryTokens(filters.q)) {
    conditions.push(Prisma.join(LOOSE_COLUMNS.map((name) => looseCondition(name, token)), " OR ", "(", ")"));
  }
  if (conditions.length === 0) return [];
  const pincode = digitsOnly(filters.pincode);
  if (pincode) conditions.push(Prisma.sql`"pincode" LIKE ${`%${pincode}%`}`);
  const mobile = digitsOnly(filters.mobileNo);
  if (mobile) conditions.push(allowMobile ? Prisma.sql`"mobileNo" LIKE ${`%${mobile}%`}` : Prisma.sql`FALSE`);
  const rows = await db.$queryRaw`SELECT "id" FROM "Haribhagat" WHERE ${Prisma.join(conditions, " AND ")} LIMIT ${LOOSE_MAX_PEOPLE}`;
  return rows.map((row) => row.id);
}

/**
 * Main visit search, always paginated. Each visit carries its people, hard disk and folder.
 * With no filter set it returns the LATEST entries (newest created first, 10 per page, `latest: true`);
 * with filters it returns the matches, newest visit date first. When the typed names match nobody exactly, similar spellings
 * are tried (`loose: true` in the result): PTEL finds PATEL. That second try looks at the people only, not at disk / path / notes.
 */
export async function searchVisits(user, filters) {
  const allowMobile = canViewMobile(user, getEnv().mobileVisibleRoles);
  const latest = !hasSearchFilters(filters);
  const where = latest ? {} : buildVisitWhere(filters, { allowMobile });
  const pageSize = latest ? LATEST_PAGE_SIZE : SEARCH_PAGE_SIZE;
  const orderBy = latest ? [{ createdAt: "desc" }, { id: "desc" }] : [{ visitDate: { sort: "desc", nulls: "last" } }, { id: "desc" }];
  const page = filters.page ?? 1;
  const [items, total] = await Promise.all([
    db.visit.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: VISIT_CARD_INCLUDE }),
    db.visit.count({ where }),
  ]);
  const found = { items, total, page, pageSize, latest, loose: false, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  if (latest || total > 0 || !LOOSE_FIELDS.some((field) => normalizeText(filters[field]))) return found;

  const ids = await looseHaribhagatIds(filters, { allowMobile });
  if (ids.length === 0) return found;
  const others = buildVisitWhere({ ...filters, q: null, name: null, fatherName: null, surname: null, gam: null, taluko: null, jillo: null, pincode: null, mobileNo: null }, { allowMobile });
  const similar = { AND: [others, { haribhagats: { some: { haribhagatId: { in: ids } } } }] };
  const [similarItems, similarTotal] = await Promise.all([
    db.visit.findMany({ where: similar, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: VISIT_CARD_INCLUDE }),
    db.visit.count({ where: similar }),
  ]);
  if (similarTotal === 0) return found;
  return { ...found, items: similarItems, total: similarTotal, loose: true, totalPages: Math.max(1, Math.ceil(similarTotal / pageSize)) };
}

const GROUP_SCAN_LIMIT = 20000;

/**
 * Groups the visits matching `where` by Member and returns one page of GROUPS (not of visits): `groups` = [{ member, count }] with the
 * number of matching entries, `total` = number of members, `totalVisits` = number of distinct visits. Only ids / dates are scanned;
 * the entries themselves are shown on the Member's own page. `memberIds` (when given) limits which people of a visit form a group,
 * so "PATEL" does not also list the other people of a shared visit. Latest mode orders members by their newest created entry,
 * search mode by their newest visit date (empty dates last).
 */
async function groupVisits({ where, memberIds, latest, page }) {
  const pageSize = latest ? LATEST_PAGE_SIZE : SEARCH_PAGE_SIZE;
  const allowed = memberIds ? new Set(memberIds) : null;
  const rows = await db.visit.findMany({
    where,
    select: { id: true, visitDate: true, createdAt: true, haribhagats: { select: { haribhagatId: true } } },
    take: GROUP_SCAN_LIMIT,
  });

  const byMember = new Map();
  const visitIds = new Set();
  for (const row of rows) {
    const stamp = latest ? row.createdAt.getTime() : row.visitDate ? row.visitDate.getTime() : -Infinity;
    for (const { haribhagatId } of row.haribhagats) {
      if (allowed && !allowed.has(haribhagatId)) continue;
      const group = byMember.get(haribhagatId) ?? { memberId: haribhagatId, visitIds: [], newest: -Infinity, newestVisitId: 0 };
      group.visitIds.push(row.id);
      visitIds.add(row.id);
      if (stamp > group.newest || (stamp === group.newest && row.id > group.newestVisitId)) {
        group.newest = stamp;
        group.newestVisitId = row.id;
      }
      byMember.set(haribhagatId, group);
    }
  }

  const ordered = [...byMember.values()].sort((a, b) => b.newest - a.newest || b.newestVisitId - a.newestVisitId);
  const pageGroups = ordered.slice((page - 1) * pageSize, page * pageSize);
  const members = pageGroups.length
    ? await db.haribhagat.findMany({
        where: { id: { in: pageGroups.map((group) => group.memberId) } },
        select: { id: true, name: true, fatherName: true, surname: true, gam: true, taluko: true, jillo: true },
      })
    : [];
  const memberById = new Map(members.map((member) => [member.id, member]));
  const groups = pageGroups.map((group) => ({ member: memberById.get(group.memberId), count: group.visitIds.length })).filter((group) => group.member);

  return { groups, total: ordered.length, totalVisits: visitIds.size, page, pageSize, totalPages: Math.max(1, Math.ceil(ordered.length / pageSize)) };
}

/**
 * The search page: the same matching as searchVisits(), but grouped by Member - a Member with 10 entries is ONE result; clicking it
 * opens the Member's page with all entries. Pages count Members (latest mode 10, search 20). `latest` / `loose` mean the same as in searchVisits().
 */
export async function searchMemberGroups(user, filters) {
  const allowMobile = canViewMobile(user, getEnv().mobileVisibleRoles);
  const page = filters.page ?? 1;
  if (!hasSearchFilters(filters)) return { ...(await groupVisits({ where: {}, memberIds: null, latest: true, page })), latest: true, loose: false };

  // Typed person fields (and a chosen Member) decide which people of a visit form a group.
  const { q, ...fieldFilters } = filters;
  void q;
  const memberAnd = [];
  const personWhere = buildPersonWhere(fieldFilters, { allowMobile });
  if (personWhere) memberAnd.push(personWhere);
  if (filters.haribhagatId) memberAnd.push({ id: filters.haribhagatId });
  const memberIds = memberAnd.length ? (await db.haribhagat.findMany({ where: { AND: memberAnd }, select: { id: true } })).map((row) => row.id) : null;

  const found = { ...(await groupVisits({ where: buildVisitWhere(filters, { allowMobile }), memberIds, latest: false, page })), latest: false, loose: false };
  if (found.total > 0 || !LOOSE_FIELDS.some((field) => normalizeText(filters[field]))) return found;

  const ids = await looseHaribhagatIds(filters, { allowMobile });
  if (ids.length === 0) return found;
  const others = buildVisitWhere({ ...filters, q: null, name: null, fatherName: null, surname: null, gam: null, taluko: null, jillo: null, pincode: null, mobileNo: null }, { allowMobile });
  const similar = await groupVisits({ where: others, memberIds: ids, latest: false, page });
  return similar.total === 0 ? found : { ...similar, latest: false, loose: true };
}

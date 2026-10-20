import "server-only";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { canViewMobile } from "@/lib/permissions";
import { normalizeText } from "@/lib/normalize";
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

/**
 * Main visit search, always paginated. Each visit carries its people, hard disk and folder.
 * With no filter set it returns the LATEST entries (newest created first, 10 per page, `latest: true`);
 * with filters it returns the matches, newest visit date first.
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
  return { items, total, page, pageSize, latest, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

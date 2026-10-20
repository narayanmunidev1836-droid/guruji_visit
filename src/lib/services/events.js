import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { eventNameKey } from "@/lib/normalize";
import { fail, ok, validate, isUniqueViolation } from "@/lib/result";
import { optionalText, requiredText } from "@/lib/validation";
import { audit } from "@/lib/services/audit";

const eventSchema = z.object({
  name: requiredText("Event name", 100),
  description: optionalText(500),
});

/** Source of the "Event Name" dropdown. Only active events - never a hardcoded list. */
export async function listActiveEvents() {
  return db.event.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });
}

/** Active events plus the one a record already uses, even if it was deactivated later. */
export async function listEventsForSelect(currentEventId) {
  return db.event.findMany({
    where: { OR: [{ isActive: true }, ...(currentEventId ? [{ id: currentEventId }] : [])] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });
}

export async function listEvents() {
  return db.event.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { visits: true } } },
  });
}

export async function getEvent(id) {
  return db.event.findUnique({ where: { id } });
}

export async function createEvent(actor, input) {
  const parsed = validate(eventSchema, input);
  if (!parsed.ok) return parsed;
  const { name, description } = parsed.data;
  const nameKey = eventNameKey(name);

  const existing = await db.event.findUnique({ where: { nameKey } });
  if (existing) {
    return fail("An event with this name already exists.", {
      name: existing.isActive
        ? "An event with this name already exists."
        : "An event with this name exists but is inactive. Activate it instead.",
    });
  }
  try {
    const event = await db.event.create({ data: { name, nameKey, description } });
    await audit(actor, "event.create", "Event", event.id, { name });
    return ok({ event });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("An event with this name already exists.", { name: "Already exists." });
    throw error;
  }
}

export async function updateEvent(actor, id, input) {
  const parsed = validate(eventSchema, input);
  if (!parsed.ok) return parsed;
  const { name, description } = parsed.data;
  const nameKey = eventNameKey(name);

  const current = await db.event.findUnique({ where: { id } });
  if (!current) return fail("Event not found.");
  const clash = await db.event.findFirst({ where: { nameKey, NOT: { id } } });
  if (clash) return fail("Another event already uses this name.", { name: "Another event already uses this name." });

  try {
    const event = await db.event.update({ where: { id }, data: { name, nameKey, description } });
    await audit(actor, "event.update", "Event", id, { from: current.name, to: name });
    return ok({ event });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("Another event already uses this name.", { name: "Already exists." });
    throw error;
  }
}

/** Events referenced by old records are deactivated, never deleted. */
export async function setEventActive(actor, id, isActive) {
  const current = await db.event.findUnique({ where: { id } });
  if (!current) return fail("Event not found.");
  if (current.isActive === isActive) return ok({ event: current });
  const event = await db.event.update({ where: { id }, data: { isActive } });
  await audit(actor, isActive ? "event.activate" : "event.deactivate", "Event", id, { name: current.name });
  return ok({ event });
}

"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/dal";
import { ok } from "@/lib/result";
import { formDataToObject } from "@/lib/validation";
import { createEvent, setEventActive, updateEvent } from "@/lib/services/events";

export async function createEventAction(_prev, formData) {
  return runAction(async () => {
    const user = await requirePermission("event.create");
    const result = await createEvent(user, formDataToObject(formData));
    if (!result.ok) return result;
    revalidatePath("/events");
    return ok({ message: `Event "${result.event.name}" added.`, resetKey: Date.now() });
  });
}

export async function updateEventAction(_prev, formData) {
  return runAction(async () => {
    const user = await requirePermission("event.manage");
    const input = formDataToObject(formData);
    const result = await updateEvent(user, Number(input.id), input);
    if (!result.ok) return result;
    revalidatePath("/events");
    return ok({ message: "Event updated." });
  });
}

export async function toggleEventAction(formData) {
  const result = await runAction(async () => {
    const user = await requirePermission("event.manage");
    const id = Number(formData.get("id"));
    const isActive = formData.get("isActive") === "true";
    return setEventActive(user, id, isActive);
  });
  if (result && result.ok === false) console.warn("[toggleEvent]", result.error);
  revalidatePath("/events");
}

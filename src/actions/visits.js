"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { canViewMobile } from "@/lib/permissions";
import { ok } from "@/lib/result";
import { formDataToObject } from "@/lib/validation";
import { createVisit, deleteVisit, updateVisit } from "@/lib/services/visits";

const LIST_KEYS = ["haribhagatIds"];

export async function createVisitAction(_prev, formData) {
  return runAction(async () => {
    const user = await requirePermission("visit.write");
    const input = formDataToObject(formData, LIST_KEYS);
    const newPerson = !input.haribhagatIds || input.haribhagatIds.length === 0;
    if (newPerson) await requirePermission("haribhagat.write"); // a typed-in Haribhagat becomes a new record
    const result = await createVisit(user, input, {
      confirmDuplicate: input.confirmDuplicate === "1",
      canEditMobile: canViewMobile(user, getEnv().mobileVisibleRoles),
    });
    if (!result.ok) return { ...result, values: input };
    revalidatePath("/search");
    revalidatePath("/dashboard");
    redirect(result.haribhagatId ? `/search?haribhagatId=${result.haribhagatId}&saved=1` : "/search");
  });
}

export async function updateVisitAction(_prev, formData) {
  return runAction(async () => {
    const user = await requirePermission("visit.write");
    const input = formDataToObject(formData, LIST_KEYS);
    const result = await updateVisit(user, Number(input.id), input);
    if (!result.ok) return { ...result, values: input };
    revalidatePath(`/visits/${input.id}`);
    revalidatePath("/search");
    revalidatePath("/dashboard");
    redirect(`/visits/${input.id}?saved=1`);
  });
}

export async function deleteVisitAction(id) {
  return runAction(async () => {
    const user = await requirePermission("visit.write");
    const result = await deleteVisit(user, Number(id));
    if (!result.ok) return result;
    revalidatePath("/search");
    revalidatePath("/dashboard");
    revalidatePath("/haribhagats", "layout");
    return ok();
  });
}

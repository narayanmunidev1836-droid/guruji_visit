"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { canViewMobile } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/labels";
import { ok } from "@/lib/result";
import { formDataToObject } from "@/lib/validation";
import { getHaribhagat } from "@/lib/services/haribhagats";
import { createVisit, deleteVisit, getVisit, updateVisit } from "@/lib/services/visits";

const LIST_KEYS = ["haribhagatIds"];

/** What was just saved, as plain strings for the "Entry saved" dialog (mobile numbers are masked for roles without access). */
async function savedSummary(user, visitId) {
  const visit = await getVisit(visitId);
  const people = await Promise.all(visit.haribhagats.map((link) => getHaribhagat(user, link.haribhagatId)));
  return {
    id: visit.id,
    people: people.filter(Boolean).map((p) => ({
      id: p.id,
      name: p.name,
      fatherName: p.fatherName,
      surname: p.surname,
      gam: p.gam,
      taluko: p.taluko,
      jillo: p.jillo,
      pincode: p.pincode,
      mobileNo: p.mobileNo,
    })),
    event: visit.event?.name ?? null,
    visitDate: visit.visitDate ? formatDate(visit.visitDate) : null,
    place: visit.placeType ? t(visit.placeType) : null,
    disk: visit.hardDisk?.labelName ?? null,
    folder: visit.folderPath,
    notes: visit.notes,
  };
}

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
    return ok({ saved: await savedSummary(user, result.visit.id) });
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

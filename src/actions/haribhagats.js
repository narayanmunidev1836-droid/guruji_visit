"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { getCurrentUser, requirePermission } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { canViewMobile } from "@/lib/permissions";
import { formDataToObject } from "@/lib/validation";
import { createHaribhagat, getHaribhagat, pickerSearch, updateHaribhagat } from "@/lib/services/haribhagats";

/** Type-ahead for the Haribhagat picker on the visit form. Returns [] for anonymous callers. Never returns mobile numbers. */
export async function pickerSearchAction(query) {
  const user = await getCurrentUser();
  if (!user || typeof query !== "string") return [];
  const text = query.trim().slice(0, 100);
  if (text.length < 2) return [];
  return pickerSearch(text);
}

/** Full details of one Haribhagat to fill the visit form after the user picked a search result. Mobile is masked for roles without access. */
export async function haribhagatDetailsAction(id) {
  const user = await getCurrentUser();
  const number = Number(id);
  if (!user || !Number.isInteger(number) || number <= 0) return null;
  const person = await getHaribhagat(user, number);
  if (!person) return null;
  const { id: personId, name, fatherName, surname, gam, taluko, jillo, pincode, mobileNo, mobileMasked } = person;
  return { id: personId, name, fatherName, surname, gam, taluko, jillo, pincode, mobileNo, mobileMasked };
}

/**
 * Create (no `id` field) or edit (`id` field) a Haribhagat.
 * When similar people already exist the action returns them as `duplicates`; the form then offers
 * "Save anyway", which resubmits with confirmDuplicate=1.
 */
export async function saveHaribhagatAction(_prev, formData) {
  return runAction(async () => {
    const user = await requirePermission("haribhagat.write");
    const input = formDataToObject(formData);
    const confirmDuplicate = input.confirmDuplicate === "1";
    const id = input.id ? Number(input.id) : null;

    const canEditMobile = canViewMobile(user, getEnv().mobileVisibleRoles);

    const result = id
      ? await updateHaribhagat(user, id, input, { confirmDuplicate, canEditMobile })
      : await createHaribhagat(user, input, { confirmDuplicate });
    if (!result.ok) return { ...result, values: input };

    revalidatePath("/haribhagats");
    const returnTo = typeof input.returnTo === "string" && input.returnTo.startsWith("/") && !input.returnTo.startsWith("//") ? input.returnTo : null;
    redirect(returnTo ?? `/haribhagats/${result.person.id}`);
  });
}

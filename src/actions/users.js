"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/dal";
import { ok } from "@/lib/result";
import { formDataToObject } from "@/lib/validation";
import { createUser, resetPassword, updateUser } from "@/lib/services/users";

export async function createUserAction(_prev, formData) {
  return runAction(async () => {
    const actor = await requirePermission("user.manage");
    const result = await createUser(actor, formDataToObject(formData));
    if (!result.ok) return result;
    revalidatePath("/users");
    return ok({ message: `User ${result.user.email} created.`, resetKey: Date.now() });
  });
}

export async function updateUserAction(_prev, formData) {
  return runAction(async () => {
    const actor = await requirePermission("user.manage");
    const input = formDataToObject(formData);
    const result = await updateUser(actor, Number(input.id), input);
    if (!result.ok) return result;
    revalidatePath("/users");
    return ok({ message: "User updated." });
  });
}

export async function resetPasswordAction(_prev, formData) {
  return runAction(async () => {
    const actor = await requirePermission("user.manage");
    const result = await resetPassword(actor, Number(formData.get("id")), formData.get("password"));
    if (!result.ok) return { ...result, fieldErrors: { password: result.fieldErrors?.password } };
    return ok({ message: "Password reset.", resetKey: Date.now() });
  });
}

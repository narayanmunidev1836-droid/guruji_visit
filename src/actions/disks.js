"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/dal";
import { ok } from "@/lib/result";
import { formDataToObject } from "@/lib/validation";
import { createDisk, deleteDisk, setDiskActive, updateDisk } from "@/lib/services/disks";

export async function createDiskAction(_prev, formData) {
  return runAction(async () => {
    const user = await requirePermission("disk.create");
    const result = await createDisk(user, formDataToObject(formData));
    if (!result.ok) return result;
    revalidatePath("/hard-disks");
    return ok({ message: `Hard disk "${result.disk.labelName}" registered.`, resetKey: Date.now() });
  });
}

export async function updateDiskAction(_prev, formData) {
  return runAction(async () => {
    const user = await requirePermission("disk.manage");
    const input = formDataToObject(formData);
    const result = await updateDisk(user, Number(input.id), input);
    if (!result.ok) return result;
    revalidatePath("/hard-disks");
    revalidatePath(`/hard-disks/${input.id}`);
    return ok({ message: "Hard disk updated." });
  });
}

export async function deleteDiskAction(id) {
  return runAction(async () => {
    const user = await requirePermission("disk.manage");
    const result = await deleteDisk(user, Number(id));
    if (!result.ok) return result;
    revalidatePath("/hard-disks");
    return ok();
  });
}

export async function toggleDiskAction(formData) {
  await runAction(async () => {
    const user = await requirePermission("disk.manage");
    return setDiskActive(user, Number(formData.get("id")), formData.get("isActive") === "true");
  });
  revalidatePath("/hard-disks");
}

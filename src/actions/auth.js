"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/lib/action";
import { createSession, destroySession } from "@/lib/auth/session";
import { getCurrentUser, requireUser } from "@/lib/auth/dal";
import { fail, ok } from "@/lib/result";
import { hit, peek, reset } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { audit } from "@/lib/services/audit";
import { authenticate, changeOwnPassword } from "@/lib/services/users";

const PER_ACCOUNT = { limit: 5, windowMs: 15 * 60 * 1000 };
const PER_IP = { limit: 30, windowMs: 15 * 60 * 1000 };

export async function loginAction(_prev, formData) {
  return runAction(async () => {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const ip = await getClientIp();
    const accountKey = `login:${ip}:${email}`;
    const ipKey = `login-ip:${ip}`;

    const blocked = [peek(accountKey, PER_ACCOUNT), peek(ipKey, PER_IP)].find((r) => !r.allowed);
    if (blocked) {
      const minutes = Math.ceil(blocked.retryAfterSeconds / 60);
      return fail(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
    }

    const result = await authenticate(email, password);
    if (!result.ok) {
      hit(accountKey, PER_ACCOUNT);
      hit(ipKey, PER_IP);
      return fail("Invalid email or password.");
    }

    reset(accountKey);
    await createSession(result.user);
    await audit({ id: result.user.id }, "auth.login", "User", result.user.id);
    redirect("/dashboard");
  });
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user, "auth.logout", "User", user.id);
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(_prev, formData) {
  return runAction(async () => {
    const user = await requireUser();
    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword !== String(formData.get("confirmPassword") ?? "")) {
      return fail("Passwords do not match.", { confirmPassword: "Passwords do not match." });
    }
    const result = await changeOwnPassword(user, formData.get("currentPassword"), newPassword);
    if (!result.ok) return result;
    // The old session stops working (password fingerprint changed) - start a new one.
    await createSession(result.user);
    return ok({ message: "Password changed." });
  });
}

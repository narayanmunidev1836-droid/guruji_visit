import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession, passwordFingerprint } from "@/lib/auth/session";
import { can, isAdmin } from "@/lib/permissions";

/** Thrown by requirePermission / assertAdmin; server actions turn it into a friendly error. */
export class ForbiddenError extends Error {
  constructor(message = "You are not allowed to do this.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Data Access Layer: the single place that turns a session cookie into a user.
 * The user is always re-read from the database so deactivation, role changes and password changes
 * take effect immediately. Cached per request.
 */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, passwordHash: true, canCreateDisks: true, canCreateEvents: true },
  });
  if (!user || !user.isActive) return null;
  if (session.pv !== passwordFingerprint(user.passwordHash)) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, canCreateDisks: user.canCreateDisks, canCreateEvents: user.canCreateEvents };
});

/** For pages / layouts: redirects to the login page when there is no valid session. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For admin-only pages: staff are sent back to the dashboard. */
export async function requireAdminPage() {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function requirePermission(permission) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("Your session has expired. Please log in again.");
  if (!can(user, permission)) throw new ForbiddenError();
  return user;
}

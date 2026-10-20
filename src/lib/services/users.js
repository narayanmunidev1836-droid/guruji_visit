import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, verifyAgainstDummy, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { fail, ok, validate, isUniqueViolation } from "@/lib/result";
import { booleanField, requiredText } from "@/lib/validation";
import { audit } from "@/lib/services/audit";

const emailField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.string().min(1, "Email is required.").max(200).pipe(z.email("Enter a valid email address.")),
);

const passwordField = z
  .string({ error: "Password is required." })
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(200, "Password is too long.");

const roleField = z.enum(["ADMIN", "STAFF"], { error: "Choose a role." });

const createUserSchema = z.object({
  name: requiredText("Name", 100),
  email: emailField,
  role: roleField,
  password: passwordField,
});

const updateUserSchema = z.object({
  name: requiredText("Name", 100),
  role: roleField,
  isActive: booleanField,
});

const publicSelect = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

/** Checks credentials. The same message is returned for unknown e-mail, wrong password and inactive users. */
export async function authenticate(emailInput, password) {
  const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
  const generic = fail("Invalid email or password.");
  if (!email || typeof password !== "string" || password.length === 0 || password.length > 200) return generic;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await verifyAgainstDummy(password);
    return generic;
  }
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid || !user.isActive) return generic;
  return ok({ user });
}

export async function listUsers() {
  return db.user.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], select: publicSelect });
}

export async function getUser(id) {
  return db.user.findUnique({ where: { id }, select: publicSelect });
}

export async function createUser(actor, input) {
  const parsed = validate(createUserSchema, input);
  if (!parsed.ok) return parsed;
  const { name, email, role, password } = parsed.data;
  try {
    const user = await db.user.create({
      data: { name, email, role, passwordHash: await hashPassword(password) },
      select: publicSelect,
    });
    await audit(actor, "user.create", "User", user.id, { email, role });
    return ok({ user });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("A user with this email already exists.", { email: "Already registered." });
    throw error;
  }
}

async function wouldRemoveLastAdmin(userId, nextRole, nextActive) {
  const current = await db.user.findUnique({ where: { id: userId } });
  if (!current || current.role !== "ADMIN" || !current.isActive) return false;
  if (nextRole === "ADMIN" && nextActive) return false;
  const otherAdmins = await db.user.count({ where: { role: "ADMIN", isActive: true, NOT: { id: userId } } });
  return otherAdmins === 0;
}

export async function updateUser(actor, id, input) {
  const parsed = validate(updateUserSchema, input);
  if (!parsed.ok) return parsed;
  const { name, role, isActive } = parsed.data;

  const current = await db.user.findUnique({ where: { id } });
  if (!current) return fail("User not found.");
  if (actor.id === id && !isActive) return fail("You cannot deactivate your own account.");
  if (await wouldRemoveLastAdmin(id, role, isActive)) {
    return fail("At least one active administrator is required.");
  }

  const user = await db.user.update({ where: { id }, data: { name, role, isActive }, select: publicSelect });
  await audit(actor, "user.update", "User", id, {
    email: current.email,
    ...(current.role !== role ? { role: { from: current.role, to: role } } : {}),
    ...(current.isActive !== isActive ? { isActive } : {}),
  });
  return ok({ user });
}

/** Admin sets a new password for another user. */
export async function resetPassword(actor, id, newPassword) {
  const parsed = validate(z.object({ password: passwordField }), { password: newPassword });
  if (!parsed.ok) return parsed;
  const current = await db.user.findUnique({ where: { id } });
  if (!current) return fail("User not found.");
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await audit(actor, "user.reset-password", "User", id, { email: current.email });
  return ok();
}

/** Users change their own password; all older sessions stop working because the password fingerprint changes. */
export async function changeOwnPassword(actor, currentPassword, newPassword) {
  const parsed = validate(z.object({ password: passwordField }), { password: newPassword });
  if (!parsed.ok) return { ...parsed, fieldErrors: { newPassword: parsed.fieldErrors.password } };
  const user = await db.user.findUnique({ where: { id: actor.id } });
  if (!user || !(await verifyPassword(user.passwordHash, String(currentPassword ?? "")))) {
    return fail("Current password is incorrect.", { currentPassword: "Incorrect password." });
  }
  const updated = await db.user.update({
    where: { id: actor.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  await audit(actor, "user.change-password", "User", actor.id);
  return ok({ user: updated });
}

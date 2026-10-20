import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, verifyAgainstDummy, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { fail, ok, validate, isUniqueViolation } from "@/lib/result";
import { booleanField, mobileField, requiredText } from "@/lib/validation";
import { loginCandidates, normalizeUsername } from "@/lib/normalize";
import { audit } from "@/lib/services/audit";

const emailField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.string().min(1, "Email is required.").max(200).pipe(z.email("Enter a valid email address.")),
);

const passwordField = z
  .string({ error: "Password is required." })
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(200, "Password is too long.");

/** Username: required when a user is created. */
const usernameRequired = z.preprocess(
  (v) => (v === undefined || v === null ? "" : String(v)),
  z.string().transform((value, ctx) => {
    const result = normalizeUsername(value);
    if (result.error || result.value === null) {
      ctx.addIssue({ code: "custom", message: result.error ?? "Username is required." });
      return z.NEVER;
    }
    return result.value;
  }),
);

/** Username when editing: empty is allowed (users created before usernames existed). */
const usernameOptional = z.preprocess(
  (v) => (v === undefined || v === null ? "" : String(v)),
  z.string().transform((value, ctx) => {
    const result = normalizeUsername(value);
    if (result.error) {
      ctx.addIssue({ code: "custom", message: result.error });
      return z.NEVER;
    }
    return result.value;
  }),
);

const roleField = z.enum(["ADMIN", "STAFF"], { error: "Choose a role." });

const createUserSchema = z.object({
  name: requiredText("Name", 100),
  email: emailField,
  username: usernameRequired,
  mobileNo: mobileField,
  role: roleField,
  password: passwordField,
  canCreateDisks: booleanField,
  canCreateEvents: booleanField,
});

const updateUserSchema = z.object({
  name: requiredText("Name", 100),
  username: usernameOptional,
  mobileNo: mobileField,
  role: roleField,
  isActive: booleanField,
  canCreateDisks: booleanField,
  canCreateEvents: booleanField,
});

const publicSelect = { id: true, name: true, email: true, username: true, mobileNo: true, role: true, isActive: true, canCreateDisks: true, canCreateEvents: true, createdAt: true };

/**
 * The user a login belongs to. Usernames have no special format, so what was typed is tried as a username, as an e-mail and
 * (when it looks like a phone number) as a mobile number. If it matches several users the username wins, then the e-mail.
 */
async function findUserByLogin(login) {
  const or = [{ username: login.text }, { email: login.text }, ...(login.mobile ? [{ mobileNo: login.mobile }] : [])];
  const found = await db.user.findMany({ where: { OR: or }, take: 3 });
  return found.find((u) => u.username === login.text) ?? found.find((u) => u.email === login.text) ?? found[0] ?? null;
}

/**
 * Checks credentials. `loginInput` is a username (any text), an e-mail address or a 10-digit mobile number. The same message is
 * returned for an unknown login, a wrong password and an inactive user.
 */
export async function authenticate(loginInput, password) {
  const login = typeof loginInput === "string" ? loginCandidates(loginInput) : null;
  const generic = fail("Invalid login or password.");
  if (!login || typeof password !== "string" || password.length === 0 || password.length > 200) return generic;

  const user = await findUserByLogin(login);
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

/** Username, mobile number or e-mail already used by ANOTHER user? Returns field errors or null. */
async function findLoginConflict({ email, username, mobileNo }, excludeId) {
  const or = [email && { email }, username && { username }, mobileNo && { mobileNo }].filter(Boolean);
  if (or.length === 0) return null;
  const hit = await db.user.findFirst({ where: { OR: or, ...(excludeId ? { NOT: { id: excludeId } } : {}) } });
  if (!hit) return null;
  if (username && hit.username === username) return { username: "This username is already taken." };
  if (mobileNo && hit.mobileNo === mobileNo) return { mobileNo: "This mobile number is already used by another user." };
  return { email: "Already registered." };
}

export async function createUser(actor, input) {
  const parsed = validate(createUserSchema, input);
  if (!parsed.ok) return parsed;
  const { name, email, username, mobileNo, role, password, canCreateDisks, canCreateEvents } = parsed.data;
  const conflict = await findLoginConflict({ email, username, mobileNo });
  if (conflict) return fail("A user with these login details already exists.", conflict);
  try {
    const user = await db.user.create({
      data: { name, email, username, mobileNo, role, canCreateDisks, canCreateEvents, passwordHash: await hashPassword(password) },
      select: publicSelect,
    });
    await audit(actor, "user.create", "User", user.id, { email, username, role, canCreateDisks, canCreateEvents });
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
  const { name, username, mobileNo, role, isActive, canCreateDisks, canCreateEvents } = parsed.data;

  const current = await db.user.findUnique({ where: { id } });
  if (!current) return fail("User not found.");
  const conflict = await findLoginConflict({ username, mobileNo }, id);
  if (conflict) return fail("These login details belong to another user.", conflict);
  if (actor.id === id && !isActive) return fail("You cannot deactivate your own account.");
  if (await wouldRemoveLastAdmin(id, role, isActive)) {
    return fail("At least one active administrator is required.");
  }

  const user = await db.user.update({ where: { id }, data: { name, username, mobileNo, role, isActive, canCreateDisks, canCreateEvents }, select: publicSelect });
  await audit(actor, "user.update", "User", id, {
    email: current.email,
    ...(current.role !== role ? { role: { from: current.role, to: role } } : {}),
    ...(current.isActive !== isActive ? { isActive } : {}),
    ...(current.username !== username ? { username: { from: current.username, to: username } } : {}),
    ...(current.mobileNo !== mobileNo ? { mobileChanged: true } : {}),
    ...(current.canCreateDisks !== canCreateDisks ? { canCreateDisks } : {}),
    ...(current.canCreateEvents !== canCreateEvents ? { canCreateEvents } : {}),
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

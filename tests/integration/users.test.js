import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HAS_DB, getDb, makeUser, resetDb } from "./helpers.js";

describe.skipIf(!HAS_DB)("users and authentication", () => {
  let db;
  let users;
  let admin;

  beforeAll(async () => {
    db = await getDb();
    users = await import("@/lib/services/users");
  });
  afterAll(() => db?.$disconnect());
  beforeEach(async () => {
    await resetDb(db);
    const result = await users.createUser({ id: null }, { name: "Admin", email: "Admin@Example.org", role: "ADMIN", password: "correct-horse-1" });
    admin = result.user;
  });

  it("stores a lower-cased e-mail and an argon2 hash, never the password", async () => {
    const row = await db.user.findUnique({ where: { id: admin.id } });
    expect(row.email).toBe("admin@example.org");
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row.passwordHash).not.toContain("correct-horse-1");
  });

  it("rejects duplicate e-mails, weak passwords, bad roles and invalid e-mails", async () => {
    expect((await users.createUser(admin, { name: "X", email: "ADMIN@example.org", role: "STAFF", password: "long-enough-pw" })).fieldErrors.email).toBeTruthy();
    expect((await users.createUser(admin, { name: "X", email: "x@example.org", role: "STAFF", password: "short" })).fieldErrors.password).toBeTruthy();
    expect((await users.createUser(admin, { name: "X", email: "x@example.org", role: "ROOT", password: "long-enough-pw" })).fieldErrors.role).toBeTruthy();
    expect((await users.createUser(admin, { name: "X", email: "not-an-email", role: "STAFF", password: "long-enough-pw" })).fieldErrors.email).toBeTruthy();
  });

  it("authenticates with the right password, ignoring e-mail case and padding", async () => {
    const ok = await users.authenticate("  ADMIN@example.org ", "correct-horse-1");
    expect(ok.ok).toBe(true);
    expect(ok.user.id).toBe(admin.id);
  });

  it("gives the same generic error for unknown e-mail, wrong password and inactive users", async () => {
    const staff = (await users.createUser(admin, { name: "S", email: "s@example.org", role: "STAFF", password: "staff-password-1" })).user;
    await users.updateUser(admin, staff.id, { name: "S", role: "STAFF", isActive: "" });
    const results = await Promise.all([
      users.authenticate("nobody@example.org", "whatever-1234"),
      users.authenticate("admin@example.org", "wrong-password"),
      users.authenticate("s@example.org", "staff-password-1"),
      users.authenticate("", ""),
    ]);
    for (const r of results) {
      expect(r.ok).toBe(false);
      expect(r.error).toBe("Invalid email or password.");
    }
  });

  it("always keeps at least one active administrator", async () => {
    const demote = await users.updateUser({ id: 999 }, admin.id, { name: "Admin", role: "STAFF", isActive: "true" });
    expect(demote.ok).toBe(false);
    const deactivate = await users.updateUser({ id: 999 }, admin.id, { name: "Admin", role: "ADMIN", isActive: "" });
    expect(deactivate.ok).toBe(false);

    const second = (await users.createUser(admin, { name: "A2", email: "a2@example.org", role: "ADMIN", password: "another-password" })).user;
    expect((await users.updateUser({ id: second.id }, admin.id, { name: "Admin", role: "STAFF", isActive: "true" })).ok).toBe(true);
  });

  it("an administrator cannot deactivate their own account", async () => {
    await users.createUser(admin, { name: "A2", email: "a2@example.org", role: "ADMIN", password: "another-password" });
    const result = await users.updateUser(admin, admin.id, { name: "Admin", role: "ADMIN", isActive: "" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/own account/);
  });

  it("changing the password requires the current one and invalidates the old hash fingerprint", async () => {
    const { passwordFingerprint } = await import("@/lib/auth/session");
    const before = (await db.user.findUnique({ where: { id: admin.id } })).passwordHash;
    expect((await users.changeOwnPassword(admin, "wrong", "brand-new-password")).fieldErrors.currentPassword).toBeTruthy();
    expect((await users.changeOwnPassword(admin, "correct-horse-1", "short")).fieldErrors.newPassword).toBeTruthy();
    expect((await users.changeOwnPassword(admin, "correct-horse-1", "brand-new-password")).ok).toBe(true);
    const after = (await db.user.findUnique({ where: { id: admin.id } })).passwordHash;
    expect(passwordFingerprint(after)).not.toBe(passwordFingerprint(before));
    expect((await users.authenticate("admin@example.org", "brand-new-password")).ok).toBe(true);
    expect((await users.authenticate("admin@example.org", "correct-horse-1")).ok).toBe(false);
  });

  it("an administrator can reset another user's password", async () => {
    const staff = (await users.createUser(admin, { name: "S", email: "s@example.org", role: "STAFF", password: "staff-password-1" })).user;
    expect((await users.resetPassword(admin, staff.id, "short")).ok).toBe(false);
    expect((await users.resetPassword(admin, staff.id, "a-new-password-2")).ok).toBe(true);
    expect((await users.authenticate("s@example.org", "a-new-password-2")).ok).toBe(true);
  });

  it("audits user management without logging passwords", async () => {
    await users.resetPassword(admin, admin.id, "a-new-password-2");
    const logs = await db.auditLog.findMany();
    expect(logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs)).not.toMatch(/password-2|correct-horse/);
  });
});

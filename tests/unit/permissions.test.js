import { describe, expect, it } from "vitest";
import { can, canViewMobile, isAdmin, maskMobile, mobileForUser } from "@/lib/permissions";

const admin = { id: 1, role: "ADMIN" };
const staff = { id: 2, role: "STAFF" };

describe("roles", () => {
  it("only admins are admins", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(staff)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("staff can manage people, visits and photo metadata", () => {
    for (const p of ["haribhagat.write", "visit.write", "photo.write", "disk.create"]) expect(can(staff, p)).toBe(true);
  });

  it("only admins manage events, edit/deactivate disks, manage users and see the audit log", () => {
    for (const p of ["event.manage", "disk.manage", "user.manage", "audit.view"]) {
      expect(can(admin, p)).toBe(true);
      expect(can(staff, p)).toBe(false);
    }
  });

  it("anonymous users and unknown permissions are denied", () => {
    expect(can(null, "haribhagat.write")).toBe(false);
    expect(can(admin, "something.unknown")).toBe(false);
  });
});

describe("mobile number visibility", () => {
  it("follows the configured roles", () => {
    expect(canViewMobile(staff, ["ADMIN", "STAFF"])).toBe(true);
    expect(canViewMobile(staff, ["ADMIN"])).toBe(false);
    expect(canViewMobile(admin, ["ADMIN"])).toBe(true);
    expect(canViewMobile(null, ["ADMIN"])).toBe(false);
  });

  it("masks all but the last three digits", () => {
    expect(maskMobile("9876543210")).toBe("•••••••210");
    expect(maskMobile(null)).toBeNull();
  });

  it("returns the full number only to permitted roles", () => {
    expect(mobileForUser("9876543210", admin, ["ADMIN"])).toBe("9876543210");
    expect(mobileForUser("9876543210", staff, ["ADMIN"])).toBe("•••••••210");
    expect(mobileForUser(null, staff, ["ADMIN"])).toBeNull();
  });
});

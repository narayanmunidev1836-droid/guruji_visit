// Central place for "who may do what". Server code must call these - hiding a button is not authorization.
// This file has no framework imports so it can be unit tested.

export const ROLES = { ADMIN: "ADMIN", STAFF: "STAFF" };

export function isAdmin(user) {
  return Boolean(user) && user.role === ROLES.ADMIN;
}

/** @param mobileVisibleRoles array such as ["ADMIN","STAFF"] from MOBILE_VISIBLE_ROLES */
export function canViewMobile(user, mobileVisibleRoles) {
  return Boolean(user) && mobileVisibleRoles.includes(user.role);
}

/** Shows only the last 3 digits of a stored number. */
export function maskMobile(mobileNo) {
  if (!mobileNo) return null;
  const visible = mobileNo.slice(-3);
  return `${"•".repeat(Math.max(mobileNo.length - 3, 0))}${visible}`;
}

export function mobileForUser(mobileNo, user, mobileVisibleRoles) {
  if (!mobileNo) return null;
  return canViewMobile(user, mobileVisibleRoles) ? mobileNo : maskMobile(mobileNo);
}

/** Staff may manage people, visits and photo metadata. Adding hard disks / events needs a grant from an admin, per user. Only admins edit/deactivate master data and manage users and tokens. */
export const PERMISSIONS = {
  "haribhagat.write": [ROLES.ADMIN, ROLES.STAFF],
  "visit.write": [ROLES.ADMIN, ROLES.STAFF],
  "photo.write": [ROLES.ADMIN, ROLES.STAFF],
  "event.create": [ROLES.ADMIN], // staff only when an administrator granted it (GRANTS below)
  "event.manage": [ROLES.ADMIN], // edit / deactivate / delete an event: same people as event.create (GRANTS below)
  "disk.create": [ROLES.ADMIN], // staff only when an administrator granted it (GRANTS below)
  "disk.manage": [ROLES.ADMIN],
  "user.manage": [ROLES.ADMIN],
  "audit.view": [ROLES.ADMIN],
};

/** Permissions an administrator can give to a single user: permission -> the flag on the user record. */
export const GRANTS = {
  "disk.create": "canCreateDisks",
  "event.create": "canCreateEvents",
  "event.manage": "canCreateEvents", // whoever may add events may also edit, deactivate and delete them
};

export function can(user, permission) {
  if (!user) return false;
  const roles = PERMISSIONS[permission];
  if (!roles) return false;
  if (roles.includes(user.role)) return true;
  const flag = GRANTS[permission];
  return Boolean(flag) && user[flag] === true;
}

import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { AUDIENCE, signToken, verifyToken } from "@/lib/auth/jwt";

export const SESSION_COOKIE = "gpa_session";
const SESSION_SECONDS = 60 * 60 * 8; // 8 hours

/** Short fingerprint of the password hash: changing a password invalidates every older session. */
export function passwordFingerprint(passwordHash) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export async function createSession(user) {
  const token = await signToken(
    { sub: String(user.id), pv: passwordFingerprint(user.passwordHash) },
    { audience: AUDIENCE.SESSION, expiresInSeconds: SESSION_SECONDS },
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns { userId, pv } for a valid session cookie, otherwise null. Does not touch the database. */
export async function readSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = await verifyToken(token, AUDIENCE.SESSION);
  if (!payload?.sub) return null;
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) return null;
  return { userId, pv: payload.pv };
}

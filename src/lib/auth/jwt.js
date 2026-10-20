import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";

// Every token carries an audience so a token minted for one purpose can never be used for another.
export const AUDIENCE = {
  SESSION: "gpa:session",
};

function key() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function signToken(payload, { audience, expiresInSeconds }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(key());
}

/** Returns the payload, or null if the token is missing, expired, tampered with or has the wrong audience. */
export async function verifyToken(token, audience) {
  if (!token || typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience, algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

import "server-only";
import { hash, verify } from "@node-rs/argon2";

export const MIN_PASSWORD_LENGTH = 10;

// argon2id with library defaults (memory-hard). Parameters are embedded in the hash, so they can be raised later.
export async function hashPassword(password) {
  return hash(password);
}

export async function verifyPassword(passwordHash, password) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Verified when the e-mail does not exist so the response time does not reveal which e-mails are registered.
let dummyHashPromise;
export function verifyAgainstDummy(password) {
  dummyHashPromise ??= hash("not-a-real-password");
  return dummyHashPromise.then((h) => verifyPassword(h, password));
}

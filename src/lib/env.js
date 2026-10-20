import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_URL: z.string().default("http://localhost:3000"),
  // Comma separated roles allowed to see mobile numbers.
  MOBILE_VISIBLE_ROLES: z.string().default("ADMIN,STAFF"),
});

let cached;

/** Validated, typed access to server-side environment variables. Throws a readable error when misconfigured. */
export function getEnv() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  const env = parsed.data;
  cached = {
    ...env,
    mobileVisibleRoles: env.MOBILE_VISIBLE_ROLES.split(",")
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean),
  };
  return cached;
}

/** Test hook: forget the cached configuration so a test can change process.env. */
export function _resetEnvForTests() {
  cached = undefined;
}

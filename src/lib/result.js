// Uniform result objects returned by services and server actions: { ok: true, ... } or { ok: false, error, fieldErrors }.

export function ok(extra = {}) {
  return { ok: true, ...extra };
}

export function fail(error, fieldErrors = {}, extra = {}) {
  return { ok: false, error, fieldErrors, ...extra };
}

/** Converts a zod error into { fieldName: firstMessage }. */
export function zodFieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!(field in out)) out[field] = issue.message;
  }
  return out;
}

/** Validates with a zod schema and returns either { ok: true, data } or a failure result. */
export function validate(schema, input) {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors = zodFieldErrors(parsed.error);
  return fail("Please correct the highlighted fields.", fieldErrors);
}

/** Prisma unique constraint violation (P2002). */
export function isUniqueViolation(error) {
  return Boolean(error) && error.code === "P2002";
}

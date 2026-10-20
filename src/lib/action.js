import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ForbiddenError } from "@/lib/auth/dal";
import { fail } from "@/lib/result";

/**
 * Wraps a server action body so that:
 *  - permission failures become a friendly { ok: false } result instead of a crash page
 *  - unexpected errors are logged on the server and shown as a generic message (no stack traces to the browser)
 *  - redirect() / notFound() keep working (Next implements them by throwing)
 */
export async function runAction(body) {
  try {
    return await body();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ForbiddenError) return fail(error.message);
    console.error("[action] unexpected error", error);
    return fail("Something went wrong. Please try again.");
  }
}

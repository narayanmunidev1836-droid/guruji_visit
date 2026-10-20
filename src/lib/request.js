import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Behind nginx/Caddy the first x-forwarded-for entry is the client.
 * Make sure the reverse proxy overwrites this header (docs/DEPLOYMENT.md), otherwise it can be spoofed.
 */
export async function getClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

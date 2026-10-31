import { connection, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { canViewMobile } from "@/lib/permissions";
import { searchMembers, SEARCH_LIMIT } from "@/lib/services/haribhagats";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/members/search?q=text&offset=0 - the "Select Member" search on the entry form: saved Members + the Members directory,
 * one page at a time (see `searchMembers`: the first call, offset 0, also answers the saved Members; the window asks for the next
 * page with the `nextOffset` it got, while `hasMore`). Answers { rows, directoryFailed, hasMore, nextOffset, truncated, directoryRaw }.
 * A route handler and not a server action on purpose: server actions are queued one after the other, so a slow search (a broad
 * word) would hold back every search typed after it, while the browser can cancel a fetch (and `request.signal` then cancels the
 * call to the directory) as soon as the user types on.
 * Needs a signed-in user (checked here, `proxy.js` only looks for the cookie).
 */
export async function GET(request) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: NO_STORE });
    const params = new URL(request.url).searchParams;
    const text = (params.get("q") ?? "").trim().slice(0, 100);
    const offset = Math.min(Math.max(Number.parseInt(params.get("offset") ?? "0", 10) || 0, 0), SEARCH_LIMIT);
    if (text.length < 1) return NextResponse.json({ rows: [], directoryFailed: false, hasMore: false, nextOffset: 0, truncated: false }, { headers: NO_STORE });
    const result = await searchMembers(text, { offset, allowMobile: canViewMobile(user, getEnv().mobileVisibleRoles), signal: request.signal });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[members] search failed:", error.message);
    return NextResponse.json({ error: "SEARCH_FAILED" }, { status: 500, headers: NO_STORE });
  }
}

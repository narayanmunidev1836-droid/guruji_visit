import "server-only";
import { getEnv } from "@/lib/env";
import { parseDirectoryMembers } from "@/lib/member-api";

// Sent with every call, as the Members app does.
const APP_HEADERS = { appname: "GVHApp", apptype: "GVHWebApp", appversion: "1.0" };
// Even the biggest page asked for (the ceiling, 5000 rows) comes back in a few seconds; the whole directory ("a": 26,000 rows) would take 15-30.
const TIMEOUT_MS = 25_000;

/** `Origin` + `Referer` headers for the whitelisted domain from MEMBER_API_ORIGIN (a server call sends neither by itself). Invalid / empty = none. */
function originHeaders(value) {
  try {
    const { origin } = new URL(value.trim());
    return origin === "null" ? {} : { origin, referer: `${origin}/` };
  } catch {
    return {};
  }
}

/**
 * Searches the Members directory (`GET {MEMBER_API_URL}/Member/GetSearchMembers?keyword=&topLimit=`) from the SERVER, so the
 * API key never reaches the browser (and the browser's CORS rules do not apply).
 * The API has NO paging (it only knows `topLimit`, every other parameter is ignored) but its order is stable and a smaller
 * `topLimit` is always the start of a bigger one. So one PAGE is rows `offset` .. `offset + limit` of the answer, got by asking for
 * `topLimit = offset + limit + 1` (the extra row tells whether there is more). Without a `topLimit` the API gives only 100 rows.
 * Returns { rows, more, nextOffset, failed, raw }: `rows` are the entries of this page (any memberType); `more` is true when the
 * API has rows after it; `nextOffset` is where the next page starts; `failed` is true when the directory could not be reached or
 * refused the call, so the caller can say that only saved Members were searched. Without MEMBER_API_KEY nothing is searched and
 * nothing is a failure. `signal` (the browser gave up on this search, e.g. the user typed on) cancels the call; that is not a failure.
 * `raw` (development only, `next dev`) is the API's rows of this page as they came - { offset, rows } - for the browser console;
 * they hold Aadhaar / PAN / e-mail, so `raw` never exists in production.
 */
export async function searchDirectory(keyword, { limit, offset = 0, signal }) {
  const { MEMBER_API_URL, MEMBER_API_KEY, MEMBER_API_ORIGIN } = getEnv();
  const apiKey = MEMBER_API_KEY.trim();
  const nothing = { rows: [], more: false, nextOffset: offset };
  if (!apiKey) return { ...nothing, failed: false };
  try {
    const url = new URL("/Member/GetSearchMembers", MEMBER_API_URL);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("topLimit", String(offset + limit + 1));
    const response = await fetch(url, {
      headers: { ...APP_HEADERS, ...originHeaders(MEMBER_API_ORIGIN), apitokenkey: apiKey },
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`[members] directory search answered ${response.status}`);
      return { ...nothing, failed: true };
    }
    const list = await response.json();
    const page = Array.isArray(list) ? list.slice(offset, offset + limit) : [];
    return {
      rows: parseDirectoryMembers(page),
      more: Array.isArray(list) && list.length > offset + limit,
      nextOffset: offset + page.length,
      failed: false,
      raw: process.env.NODE_ENV === "development" ? { offset, rows: page } : undefined,
    };
  } catch (error) {
    if (signal?.aborted) return { ...nothing, failed: false }; // cancelled on purpose, nobody is waiting for the answer
    console.warn("[members] directory search failed:", error.message);
    return { ...nothing, failed: true };
  }
}

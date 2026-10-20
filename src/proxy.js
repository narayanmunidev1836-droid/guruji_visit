import { NextResponse } from "next/server";

const SESSION_COOKIE = "gpa_session";

// Optimistic gate only: it checks that a session cookie EXISTS so anonymous visitors are bounced early.
// Real authorization (valid token, active user, role) happens in the Data Access Layer (src/lib/auth/dal.js),
// in every page, server action and route handler.
export function proxy(request) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname === "/api/health";

  if (isPublic) return NextResponse.next();

  if (!request.cookies.has(SESSION_COOKIE)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

import { connection } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/health - used by uptime monitors. Reveals nothing beyond "ok" / "database unreachable".
export async function GET() {
  await connection();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[health] database check failed", error.message);
    return NextResponse.json({ status: "database_unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

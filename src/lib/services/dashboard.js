import "server-only";
import { db } from "@/lib/db";
import { VISIT_CARD_INCLUDE } from "@/lib/services/visits";

const CHART_DAYS = 30;

/** Visits added per day (UTC) for the last CHART_DAYS days, oldest first, zero-filled: [{ date: "YYYY-MM-DD", count }]. */
async function getDailyVisits(now) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (CHART_DAYS - 1)));
  const rows = await db.$queryRaw`
    SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM "Visit"
    WHERE "createdAt" >= ${start}
    GROUP BY 1`;
  const byDay = new Map(rows.map((r) => [r.day, Number(r.count)]));
  return Array.from({ length: CHART_DAYS }, (_, i) => {
    const date = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
    return { date, count: byDay.get(date) ?? 0 };
  });
}

export async function getDashboardData() {
  const [haribhagatCount, visitCount, eventCount, diskCount, disks, recentVisits, dailyVisits] = await Promise.all([
    db.haribhagat.count(),
    db.visit.count(),
    db.event.count({ where: { isActive: true } }),
    db.hardDisk.count({ where: { isActive: true } }),
    db.hardDisk.findMany({
      where: { isActive: true },
      orderBy: { labelName: "asc" },
      include: { _count: { select: { visits: true } } },
    }),
    db.visit.findMany({ orderBy: { id: "desc" }, take: 6, include: VISIT_CARD_INCLUDE }),
    getDailyVisits(new Date()),
  ]);

  return {
    haribhagatCount,
    visitCount,
    eventCount,
    diskCount,
    disks: disks.map((d) => ({ id: d.id, labelName: d.labelName, visitCount: d._count.visits })),
    recentVisits,
    dailyVisits,
  };
}

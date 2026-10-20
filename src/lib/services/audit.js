import "server-only";
import { db } from "@/lib/db";

/**
 * Records an administrative / sensitive action. Never include passwords, tokens or other secrets in `meta`.
 * Failures are logged but never block the action that triggered the entry.
 */
export async function audit(actor, action, entity, entityId, meta) {
  try {
    await db.auditLog.create({
      data: {
        userId: actor?.id ?? null,
        action,
        entity,
        entityId: entityId === undefined || entityId === null ? null : String(entityId),
        meta: meta ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", { action, entity, message: error.message });
  }
}

export async function listAuditLogs({ page = 1, pageSize = 50 } = {}) {
  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.auditLog.count(),
  ]);
  return { items, total, page, pageSize };
}

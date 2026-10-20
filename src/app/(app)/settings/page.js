import { requireAdminPage } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { t } from "@/lib/labels";
import { formatInstant } from "@/lib/format";
import { listAuditLogs } from "@/lib/services/audit";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th } from "@/components/ui/table";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }) {
  await requireAdminPage();
  const raw = await searchParams;
  const page = Math.max(1, Math.min(Number(Array.isArray(raw.page) ? raw.page[0] : raw.page) || 1, 5000));
  const audit = await listAuditLogs({ page, pageSize: 25 });
  const env = getEnv();

  return (
    <>
      <PageHeader title={t("settings")} description="Audit log and the current configuration." />

      <Card className="mb-6">
        <CardHeader title="Configuration" description="Set through environment variables (see docs/SETUP.md). Secrets are never shown." />
        <CardBody>
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-muted">Mobile numbers visible to</dt>
              <dd>{env.mobileVisibleRoles.join(", ") || "nobody"}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Audit log" description="Administrative and sensitive actions. Passwords and tokens are never recorded." />
        {audit.items.length === 0 ? (
          <CardBody>
            <EmptyState title="Nothing logged yet" />
          </CardBody>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Who</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody>
                {audit.items.map((log) => (
                  <tr key={log.id}>
                    <Td className="whitespace-nowrap text-muted">{formatInstant(log.createdAt)}</Td>
                    <Td>{log.user?.name ?? <span className="text-muted">system</span>}</Td>
                    <Td className="font-mono text-xs">{log.action}</Td>
                    <Td className="text-xs">
                      {log.entity}
                      {log.entityId && ` #${log.entityId}`}
                    </Td>
                    <Td className="max-w-xs break-words font-mono text-xs text-muted">{log.meta ? JSON.stringify(log.meta) : ""}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="border-t border-border px-4 py-3">
              <Pagination basePath="/settings" params={{}} page={audit.page} pageSize={audit.pageSize} total={audit.total} />
            </div>
          </>
        )}
      </Card>
    </>
  );
}

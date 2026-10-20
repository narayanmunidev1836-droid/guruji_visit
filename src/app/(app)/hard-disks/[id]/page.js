import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { getDisk } from "@/lib/services/disks";
import { listVisits } from "@/lib/services/visits";
import { personName } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { EditDiskForm } from "@/app/(app)/hard-disks/disk-forms";

export const metadata = { title: "Hard Disk" };

export default async function HardDiskPage({ params }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const disk = await getDisk(id);
  if (!disk) notFound();
  const visits = await listVisits({ hardDiskId: id, pageSize: 100 });
  const canManage = can(user, "disk.manage");

  return (
    <>
      <PageHeader
        backHref="/hard-disks"
        backLabel={t("hardDisks")}
        title={disk.labelName}
        description={disk.description ?? undefined}
        actions={<Badge tone={disk.isActive ? "success" : "neutral"}>{disk.isActive ? t("active") : t("inactive")}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-2 text-sm">
            <p>
              <span className="text-muted">{t("visits")}:</span> {disk._count.visits}
            </p>
            {disk.serialNumber && (
              <p>
                <span className="text-muted">Serial number:</span> {disk.serialNumber}
              </p>
            )}
            {disk.notes && (
              <p>
                <span className="text-muted">{t("notes")}:</span> {disk.notes}
              </p>
            )}
          </CardBody>
        </Card>

        {canManage && (
          <Card>
            <CardHeader title={t("edit")} />
            <CardBody>
              <EditDiskForm disk={disk} labels={{ label: t("label"), description: t("description"), notes: t("notes"), save: t("save") }} />
            </CardBody>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader title="Visits stored on this disk" description="Folder and Haribhagat of every visit that uses this disk." />
        {visits.items.length === 0 ? (
          <CardBody>
            <EmptyState title="No visits use this disk yet" />
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("folder")}</Th>
                <Th>{t("haribhagats")}</Th>
                <Th>{t("date")}</Th>
              </tr>
            </thead>
            <tbody>
              {visits.items.map((visit) => (
                <tr key={visit.id}>
                  <Td className="font-mono text-xs">
                    <Link href={`/visits/${visit.id}`} className="text-primary hover:underline">
                      {visit.folderPath || "(disk root)"}
                    </Link>
                  </Td>
                  <Td>{visit.haribhagats.map(({ haribhagat }) => personName(haribhagat)).join(", ")}</Td>
                  <Td className="whitespace-nowrap">{formatDate(visit.visitDate)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

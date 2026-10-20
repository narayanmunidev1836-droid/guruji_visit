import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { listDisks } from "@/lib/services/disks";
import { toggleDiskAction } from "@/actions/disks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { AddDiskForm } from "@/app/(app)/hard-disks/disk-forms";

export const metadata = { title: "Hard Disks" };

export default async function HardDisksPage() {
  const user = await requireUser();
  const canManage = can(user, "disk.manage");
  const canCreate = can(user, "disk.create");
  const disks = await listDisks();
  const labels = { label: t("label"), description: t("description"), notes: t("notes"), add: t("add"), save: t("save") };

  return (
    <>
      <PageHeader
        title={t("hardDisks")}
        description="Every hard disk is registered with the unique label on its sticker. When you add a visit you choose the disk here and type the path."
      />

      {canCreate && (
        <Card className="mb-6">
          <CardHeader title="Register a hard disk" description="Use exactly the label written on the sticker, e.g. HDD-001." />
          <CardBody>
            <AddDiskForm labels={labels} />
          </CardBody>
        </Card>
      )}

      {disks.length === 0 ? (
        <EmptyState title="No hard disks registered" description={canCreate ? "Register each disk with the label printed on its sticker." : "An administrator needs to register the hard disks, or give you the right to."} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("label")}</Th>
                <Th>{t("description")}</Th>
                <Th className="text-right">{t("visits")}</Th>
                <Th>Status</Th>
                {canManage && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {disks.map((disk) => (
                <tr key={disk.id} className={disk.isActive ? "" : "opacity-70"}>
                  <Td>
                    <Link href={`/hard-disks/${disk.id}`} className="font-semibold hover:underline">
                      {disk.labelName}
                    </Link>
                  </Td>
                  <Td className="max-w-xs text-muted">{disk.description ?? "-"}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(disk._count.visits)}</Td>
                  <Td>
                    <Badge tone={disk.isActive ? "success" : "neutral"}>{disk.isActive ? t("active") : t("inactive")}</Badge>
                  </Td>
                  {canManage && (
                    <Td className="text-right">
                      <form action={toggleDiskAction}>
                        <input type="hidden" name="id" value={disk.id} />
                        <input type="hidden" name="isActive" value={String(!disk.isActive)} />
                        <Button type="submit" variant="secondary" size="sm">
                          {disk.isActive ? t("deactivate") : t("activate")}
                        </Button>
                      </form>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}

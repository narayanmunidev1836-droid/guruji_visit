import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { normalizeText } from "@/lib/normalize";
import { listDisks } from "@/lib/services/disks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { DebounceInput } from "@/components/ui/debounce-input";
import { GetForm } from "@/components/ui/get-form";
import { Table, Td, Th } from "@/components/ui/table";
import { AddDiskForm, DiskRowActions } from "@/app/(app)/hard-disks/disk-forms";

export const metadata = { title: "Hard Disks" };

export default async function HardDisksPage({ searchParams }) {
  const user = await requireUser();
  const canManage = can(user, "disk.manage");
  const canCreate = can(user, "disk.create");
  const raw = await searchParams;
  const q = normalizeText(Array.isArray(raw.q) ? raw.q[0] : raw.q);
  const disks = await listDisks(q);
  const labels = { label: t("label"), description: t("description"), notes: t("notes"), add: t("add"), save: t("save"), edit: t("edit"), view: t("view"), activate: t("activate"), deactivate: t("deactivate") };

  return (
    // the page itself does not scroll: heading, add card and search stay on top, only the table scrolls (see the Haribhagats page for the heights)
    <div className="flex h-[calc(100dvh-11rem)] min-h-96 flex-col lg:h-[calc(100dvh-3rem)]">
      <PageHeader
        title={t("hardDisks")}
        description="Every hard disk is registered with the unique label on its sticker. When you add a visit you choose the disk here and type the path."
      />

      {canCreate && (
        <Card className="mb-4 shrink-0">
          <CardHeader className="py-3" title="Register a hard disk" description="Use exactly the label written on the sticker, e.g. HDD-001." />
          <CardBody className="p-4">
            <AddDiskForm labels={labels} />
          </CardBody>
        </Card>
      )}

      <GetForm action="/hard-disks" role="search" className="mb-4 flex shrink-0 gap-2">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <DebounceInput name="q" type="search" submitOnChange defaultValue={q ?? ""} className="pl-10" placeholder="Label, description, serial number or notes…" aria-label={t("search")} />
        </div>
        <Button type="submit">{t("searchAction")}</Button>
      </GetForm>

      {disks.length === 0 ? (
        q ? (
          <EmptyState title={t("noResults")} description="Check the spelling or search with fewer words." />
        ) : (
          <EmptyState title="No hard disks registered" description={canCreate ? "Register each disk with the label printed on its sticker." : "An administrator needs to register the hard disks, or give you the right to."} />
        )
      ) : (
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Table scroll>
            <thead>
              <tr>
                <Th>{t("label")}</Th>
                <Th>{t("description")}</Th>
                <Th className="text-right">{t("visits")}</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {disks.map((disk) => (
                <tr key={disk.id} className={disk.isActive ? "" : "opacity-70"}>
                  <Td>
                    <span className="font-semibold">{disk.labelName}</span>
                  </Td>
                  <Td className="max-w-xs text-muted">{disk.description ?? "-"}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(disk._count.visits)}</Td>
                  <Td>
                    <Badge tone={disk.isActive ? "success" : "neutral"}>{disk.isActive ? t("active") : t("inactive")}</Badge>
                  </Td>
                  <Td className="text-right">
                    <DiskRowActions
                      disk={{ id: disk.id, labelName: disk.labelName, description: disk.description, serialNumber: disk.serialNumber, notes: disk.notes, isActive: disk.isActive }}
                      labels={labels}
                      canManage={canManage}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

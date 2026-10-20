import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { listVisits } from "@/lib/services/visits";
import { personName } from "@/lib/ui-labels";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th } from "@/components/ui/table";
import { VisitLocation } from "@/components/visit-card";

export const metadata = { title: "Visits" };

export default async function VisitsPage({ searchParams }) {
  const user = await requireUser();
  const raw = await searchParams;
  const page = Math.max(1, Math.min(Number(Array.isArray(raw.page) ? raw.page[0] : raw.page) || 1, 5000));
  const result = await listVisits({ page });

  return (
    <>
      <PageHeader
        title={t("visits")}
        description="Each visit records the Haribhagat(s) and the hard disk and folder where the photos of that visit are kept."
        actions={
          can(user, "visit.write") && (
            <ButtonLink href="/visits/new">
              <Plus className="h-4 w-4" aria-hidden />
              New visit
            </ButtonLink>
          )
        }
      />
      {raw.saved && (
        <Alert tone="success" className="mb-6">
          Visit saved.
        </Alert>
      )}
      {result.items.length === 0 ? (
        <EmptyState title="No visits yet" description="Create a visit to record which hard disk and folder hold a Haribhagat's photos." />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>{t("haribhagats")}</Th>
                <Th>Hard disk / folder</Th>
                <Th>{t("eventName")}</Th>
                <Th>{t("date")}</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((visit) => (
                <tr key={visit.id} className="hover:bg-surface-muted/60">
                  <Td>
                    <Link href={`/visits/${visit.id}`} className="font-mono text-xs text-primary hover:underline">
                      #{visit.id}
                    </Link>
                  </Td>
                  <Td>
                    {visit.haribhagats.map(({ haribhagat }) => (
                      <Link key={haribhagat.id} href={`/haribhagats/${haribhagat.id}`} className="mr-3 inline-block hover:underline">
                        {personName(haribhagat)}
                        {haribhagat.gam && <span className="text-muted"> ({haribhagat.gam})</span>}
                      </Link>
                    ))}
                  </Td>
                  <Td>
                    <VisitLocation visit={visit} copy={false} />
                  </Td>
                  <Td>{visit.event ? <Badge tone="primary">{visit.event.name}</Badge> : <span className="text-muted">-</span>}</Td>
                  <Td className="whitespace-nowrap">{formatDate(visit.visitDate)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="border-t border-border px-4 py-3">
            <Pagination basePath="/visits" params={{}} page={result.page} pageSize={result.pageSize} total={result.total} />
          </div>
        </Card>
      )}
    </>
  );
}

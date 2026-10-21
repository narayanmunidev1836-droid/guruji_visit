import Link from "next/link";
import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { getVisit } from "@/lib/services/visits";
import { personName, personPlace } from "@/lib/ui-labels";
import { FlashToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { DeleteVisitButton } from "@/components/delete-visit-button";
import { VisitLocation } from "@/components/visit-card";

export const metadata = { title: "Entry" };

export default async function VisitPage({ params, searchParams }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const raw = await searchParams;
  const visit = await getVisit(id);
  if (!visit) notFound();

  const canEdit = can(user, "visit.write");
  const people = visit.haribhagats.map((l) => l.haribhagat);
  const primaryId = visit.haribhagats.find((l) => l.isPrimary)?.haribhagatId ?? null;
  const title = people.length > 0 ? people.map(personName).join(", ") : `Entry #${visit.id}`;
  const subtitle = [visit.event?.name, visit.visitDate && formatDate(visit.visitDate), visit.placeType && t(visit.placeType)].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        backHref="/search"
        backLabel={t("search")}
        title={title}
        description={`Entry #${visit.id}${subtitle ? ` · ${subtitle}` : ""}`}
        actions={
          canEdit && (
            <>
              <ButtonLink href={`/visits/${visit.id}/edit`} variant="secondary">
                <Pencil className="h-4 w-4" aria-hidden />
                {t("edit")}
              </ButtonLink>
              <DeleteVisitButton id={visit.id} redirectTo="/search" />
            </>
          )
        }
      />

      {raw.saved && <FlashToast message="Entry saved." />}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Where the photos are" description="Connect this hard disk and open this path." />
            <CardBody>
              <VisitLocation visit={visit} />
              {visit.hardDisk && !visit.hardDisk.isActive && <p className="mt-2 text-xs text-warning">This hard disk is marked inactive.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("haribhagats")} />
            <ul className="divide-y divide-border">
              {people.map((p) => (
                <li key={p.id} className="px-5 py-3 text-sm">
                  <Link href={`/haribhagats/${p.id}`} className="font-medium hover:underline">
                    {personName(p)}
                  </Link>
                  {p.id === primaryId && people.length > 1 && <Badge className="ml-2">primary</Badge>}
                  {personPlace(p) && <p className="text-xs text-muted">{personPlace(p)}</p>}
                </li>
              ))}
            </ul>
            {visit.notes && (
              <CardBody className="border-t border-border text-sm">
                <p className="text-muted">{t("notes")}</p>
                <p>{visit.notes}</p>
              </CardBody>
            )}
          </Card>
        </div>

      </div>
    </>
  );
}

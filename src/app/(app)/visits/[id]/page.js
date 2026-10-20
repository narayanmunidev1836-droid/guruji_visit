import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { getVisit } from "@/lib/services/visits";
import { listDisksForSelect } from "@/lib/services/disks";
import { listEventsForSelect } from "@/lib/services/events";
import { personName, personPlace, placeTypeOptions } from "@/lib/ui-labels";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { VisitForm } from "@/components/visit-form";
import { VisitLocation } from "@/components/visit-card";

export const metadata = { title: "Visit" };

export default async function VisitPage({ params, searchParams }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const raw = await searchParams;
  const visit = await getVisit(id);
  if (!visit) notFound();

  const canEdit = can(user, "visit.write");
  const [events, disks] = await Promise.all([listEventsForSelect(visit.eventId), listDisksForSelect(visit.hardDiskId)]);
  const people = visit.haribhagats.map((l) => l.haribhagat);
  const primaryId = visit.haribhagats.find((l) => l.isPrimary)?.haribhagatId ?? null;
  const title = people.length > 0 ? people.map(personName).join(", ") : `Visit #${visit.id}`;
  const subtitle = [visit.event?.name, visit.visitDate && formatDate(visit.visitDate), visit.placeType && t(visit.placeType)].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader backHref="/visits" backLabel={t("visits")} title={title} description={`Visit #${visit.id}${subtitle ? ` · ${subtitle}` : ""}`} />

      {raw.saved && (
        <Alert tone="success" className="mb-6">
          Visit saved.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Where the photos are" description="Connect this hard disk and open this folder." />
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

        {canEdit && (
          <Card>
            <CardHeader title={t("edit")} />
            <CardBody>
              <VisitForm
                visit={{
                  id: visit.id,
                  eventId: visit.eventId,
                  hardDiskId: visit.hardDiskId,
                  folderPath: visit.folderPath,
                  visitDate: visit.visitDate ? visit.visitDate.toISOString().slice(0, 10) : "",
                  placeType: visit.placeType,
                  notes: visit.notes,
                  primaryId,
                }}
                events={events}
                disks={disks}
                placeTypes={placeTypeOptions()}
                selectedPeople={people}
                labels={{
                  haribhagats: t("haribhagats"),
                  hardDiskName: t("hardDiskName"),
                  folder: t("folder"),
                  eventName: t("eventName"),
                  date: t("date"),
                  placeType: t("placeType"),
                  notes: t("notes"),
                  save: t("save"),
                  cancel: t("cancel"),
                }}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { getVisit } from "@/lib/services/visits";
import { listDisksForSelect } from "@/lib/services/disks";
import { listEventsForSelect } from "@/lib/services/events";
import { personName, placeTypeOptions } from "@/lib/ui-labels";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { VisitForm } from "@/components/visit-form";

export const metadata = { title: "Edit entry" };

export default async function EditVisitPage({ params }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  if (!can(user, "visit.write")) notFound();
  const visit = await getVisit(id);
  if (!visit) notFound();

  const [events, disks] = await Promise.all([listEventsForSelect(visit.eventId), listDisksForSelect(visit.hardDiskId)]);
  const people = visit.haribhagats.map((l) => l.haribhagat);
  const primaryId = visit.haribhagats.find((l) => l.isPrimary)?.haribhagatId ?? null;

  return (
    <>
      <PageHeader backHref={`/visits/${visit.id}`} backLabel="Entry" title="Edit entry" description={people.map(personName).join(", ")} />
      <Card className="max-w-6xl">
        <CardBody className="p-4 sm:p-5">
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
    </>
  );
}

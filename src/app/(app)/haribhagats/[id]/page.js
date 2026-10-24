import { notFound } from "next/navigation";
import { MapPin, Pencil, Phone, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { getHaribhagat, getHaribhagatVisits } from "@/lib/services/haribhagats";
import { personName, personPlace } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { VisitCard } from "@/components/visit-card";

export const metadata = { title: "Member" };

export default async function HaribhagatPage({ params }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const person = await getHaribhagat(user, id);
  if (!person) notFound();
  const visits = await getHaribhagatVisits(id);
  const canWrite = can(user, "visit.write");
  const place = personPlace(person);

  return (
    // the page itself does not scroll: heading stays on top, only the entries scroll (see the Haribhagats list page for the heights)
    <div className="flex h-[calc(100dvh-11rem)] min-h-96 flex-col lg:h-[calc(100dvh-3rem)]">
      <PageHeader
        backHref="/haribhagats"
        backLabel={t("haribhagats")}
        title={personName(person)}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {place && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {place}
                {person.pincode && <span className="font-mono">· {person.pincode}</span>}
              </span>
            )}
            {(person.mobileNo || person.mobileMasked) && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                {person.mobileNo && <span className="font-mono">{person.mobileNo}</span>}
                {person.mobileMasked && <Badge>hidden for your role</Badge>}
              </span>
            )}
          </span>
        }
        actions={
          <>
            {canWrite && (
              <ButtonLink href={`/visits/new?haribhagat=${person.id}`} variant="secondary">
                <Plus className="h-4 w-4" aria-hidden />
                New entry
              </ButtonLink>
            )}
            {can(user, "haribhagat.write") && (
              <ButtonLink href={`/haribhagats/${person.id}/edit`}>
                <Pencil className="h-4 w-4" aria-hidden />
                {t("edit")}
              </ButtonLink>
            )}
          </>
        }
      />

      <h2 className="mb-3 shrink-0 text-base font-semibold">
        {t("visits")} ({visits.length})
      </h2>
      {visits.length === 0 ? (
        <EmptyState title="No visits recorded" description="Add a visit to record which hard disk and path hold this Member's photos." />
      ) : (
        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto pr-1 lg:grid-cols-2 xl:grid-cols-3">
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} canEdit={canWrite} hidePersonId={person.id} />
          ))}
        </div>
      )}
    </div>
  );
}

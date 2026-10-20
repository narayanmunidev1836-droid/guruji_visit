import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { getHaribhagat, getHaribhagatVisits } from "@/lib/services/haribhagats";
import { personName } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { VisitCard } from "@/components/visit-card";

export const metadata = { title: "Haribhagat" };

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-border py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd>{children || "-"}</dd>
    </div>
  );
}

export default async function HaribhagatPage({ params }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const person = await getHaribhagat(user, id);
  if (!person) notFound();
  const visits = await getHaribhagatVisits(id);

  return (
    <>
      <PageHeader
        backHref="/haribhagats"
        backLabel={t("haribhagats")}
        title={personName(person)}
        description={[person.gam, person.jillo].filter(Boolean).join(", ")}
        actions={
          <>
            {can(user, "visit.write") && (
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader title="Details" />
          <CardBody>
            <dl>
              <Row label={t("name")}>{person.name}</Row>
              <Row label={t("fatherName")}>{person.fatherName}</Row>
              <Row label={t("surname")}>{person.surname}</Row>
              <Row label={t("gam")}>{person.gam}</Row>
              <Row label={t("taluko")}>{person.taluko}</Row>
              <Row label={t("jillo")}>{person.jillo}</Row>
              <Row label={t("pincode")}>{person.pincode && <span className="font-mono">{person.pincode}</span>}</Row>
              <Row label={t("mobileNo")}>
                {person.mobileNo && <span className="font-mono">{person.mobileNo}</span>}
                {person.mobileMasked && <Badge className="ml-2">hidden for your role</Badge>}
              </Row>
            </dl>
          </CardBody>
        </Card>

        <section>
          <h2 className="mb-3 text-base font-semibold">{t("visits")} ({visits.length})</h2>
          {visits.length === 0 ? (
            <EmptyState title="No visits recorded" description="Add a visit to record which hard disk and path hold this Haribhagat's photos." />
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => (
                <VisitCard key={visit.id} visit={visit} canEdit={can(user, "visit.write")} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

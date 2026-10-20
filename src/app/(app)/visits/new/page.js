import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { t } from "@/lib/labels";
import { can, canViewMobile } from "@/lib/permissions";
import { placeTypeOptions } from "@/lib/ui-labels";
import { listActiveDisks } from "@/lib/services/disks";
import { listActiveEvents } from "@/lib/services/events";
import { getHaribhagat } from "@/lib/services/haribhagats";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { VisitForm } from "@/components/visit-form";

export const metadata = { title: "New visit" };

const asId = (v) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export default async function NewVisitPage({ searchParams }) {
  const user = await requireUser();
  if (!can(user, "visit.write")) redirect("/visits");
  const raw = await searchParams;
  const preselectedId = asId(raw.haribhagat); // "New visit" button on a Haribhagat page

  const [events, disks, person] = await Promise.all([listActiveEvents(), listActiveDisks(), preselectedId ? getHaribhagat(user, preselectedId) : null]);

  return (
    <>
      <PageHeader
        backHref="/visits"
        backLabel={t("visits")}
        title="New visit"
        description="Search or enter the Haribhagat, then choose the hard disk and the folder where the photos of this visit are kept."
      />

      <Card className="max-w-4xl">
        <CardBody>
          <VisitForm
            events={events}
            disks={disks}
            placeTypes={placeTypeOptions()}
            initialPerson={
              person
                ? {
                    id: person.id,
                    name: person.name,
                    fatherName: person.fatherName,
                    surname: person.surname,
                    gam: person.gam,
                    taluko: person.taluko,
                    jillo: person.jillo,
                    pincode: person.pincode,
                    mobileNo: person.mobileNo,
                    mobileMasked: person.mobileMasked,
                  }
                : null
            }
            canSeeMobile={canViewMobile(user, getEnv().mobileVisibleRoles)}
            labels={{
              haribhagats: t("haribhagats"),
              name: t("name"),
              fatherName: t("fatherName"),
              surname: t("surname"),
              gam: t("gam"),
              taluko: t("taluko"),
              jillo: t("jillo"),
              pincode: t("pincode"),
              mobileNo: t("mobileNo"),
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

import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { listCountries } from "@/lib/services/countries";
import { getHaribhagat } from "@/lib/services/haribhagats";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { HaribhagatForm } from "@/components/haribhagat-form";

export const metadata = { title: "Edit Haribhagat" };

export default async function EditHaribhagatPage({ params }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  if (!can(user, "haribhagat.write")) redirect(`/haribhagats/${id}`);
  const person = await getHaribhagat(user, id);
  if (!person) notFound();
  const countries = await listCountries();

  return (
    <>
      <PageHeader backHref={`/haribhagats/${id}`} backLabel={person.name} title={`${t("edit")}: ${person.name} ${person.surname}`} />
      <Card className="max-w-3xl">
        <CardBody>
          <HaribhagatForm
            person={person}
            countries={countries}
            labels={{
              name: t("name"),
              fatherName: t("fatherName"),
              surname: t("surname"),
              gam: t("gam"),
              taluko: t("taluko"),
              jillo: t("jillo"),
              state: t("state"),
              country: t("country"),
              pincode: t("pincode"),
              mobileNo: t("mobileNo"),
              save: t("save"),
              cancel: t("cancel"),
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}

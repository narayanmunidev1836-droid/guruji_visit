import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { PageHeader, Card, CardBody } from "@/components/ui/card";
import { HaribhagatForm } from "@/components/haribhagat-form";

export const metadata = { title: "New Haribhagat" };

export default async function NewHaribhagatPage({ searchParams }) {
  const user = await requireUser();
  if (!can(user, "haribhagat.write")) redirect("/haribhagats");
  const raw = await searchParams;
  const returnTo = typeof raw.returnTo === "string" ? raw.returnTo : undefined;

  return (
    <>
      <PageHeader backHref="/haribhagats" backLabel={t("haribhagats")} title="New Haribhagat" description="Check the directory first - similar records are shown before a new one is created." />
      <Card className="max-w-3xl">
        <CardBody>
          <HaribhagatForm
            returnTo={returnTo}
            labels={{
              name: t("name"),
              fatherName: t("fatherName"),
              surname: t("surname"),
              gam: t("gam"),
              taluko: t("taluko"),
              jillo: t("jillo"),
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

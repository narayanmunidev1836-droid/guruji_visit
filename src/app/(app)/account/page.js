import { requireUser } from "@/lib/auth/dal";
import { t } from "@/lib/labels";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { ChangePasswordForm } from "@/app/(app)/account/change-password-form";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title={t("account")} description={`${user.name} · ${user.email}`} />
      <Card className="max-w-xl">
        <CardHeader title="Change password" description="Other devices you are signed in on will be logged out." />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </>
  );
}

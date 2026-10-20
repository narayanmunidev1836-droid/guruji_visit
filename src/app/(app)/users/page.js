import { requireAdminPage } from "@/lib/auth/dal";
import { t } from "@/lib/labels";
import { formatInstant } from "@/lib/format";
import { listUsers } from "@/lib/services/users";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { AddUserForm, EditUserForm } from "@/app/(app)/users/user-forms";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const admin = await requireAdminPage();
  const users = await listUsers();
  const labels = { name: t("name"), email: t("email"), role: t("role"), add: t("add"), save: t("save"), active: t("active") };

  return (
    <>
      <PageHeader title={t("users")} description="Administrators manage everything. Staff can search, add people and visits, and view scans." />

      <Card className="mb-6">
        <CardHeader title="Add a user" />
        <CardBody>
          <AddUserForm labels={labels} />
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("name")}</Th>
              <Th>{t("email")}</Th>
              <Th>{t("role")}</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? "" : "opacity-70"}>
                <Td className="font-medium">
                  {u.name}
                  {u.id === admin.id && <Badge className="ml-2">you</Badge>}
                </Td>
                <Td className="text-muted">{u.email}</Td>
                <Td>
                  <Badge tone={u.role === "ADMIN" ? "primary" : "neutral"}>{u.role === "ADMIN" ? "Admin" : "Staff"}</Badge>
                </Td>
                <Td>
                  <Badge tone={u.isActive ? "success" : "neutral"} dot>
                    {u.isActive ? t("active") : t("inactive")}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap text-muted">{formatInstant(u.createdAt)}</Td>
                <Td className="text-right">
                  <details className="text-left">
                    <summary className="cursor-pointer text-right text-sm text-primary">{t("edit")}</summary>
                    <div className="mt-3 min-w-[min(100%,34rem)]">
                      <EditUserForm user={u} labels={labels} />
                    </div>
                  </details>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

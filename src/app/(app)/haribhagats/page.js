import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { normalizeText } from "@/lib/normalize";
import { searchHaribhagats } from "@/lib/services/haribhagats";
import { personPlace } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/inputs";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th } from "@/components/ui/table";

export const metadata = { title: "Haribhagats" };

export default async function HaribhagatsPage({ searchParams }) {
  const user = await requireUser();
  const raw = await searchParams;
  const q = normalizeText(Array.isArray(raw.q) ? raw.q[0] : raw.q);
  const page = Math.max(1, Math.min(Number(Array.isArray(raw.page) ? raw.page[0] : raw.page) || 1, 5000));
  const result = await searchHaribhagats(user, { q }, page);

  return (
    <>
      <PageHeader
        title={t("haribhagats")}
        description="Directory of Haribhagats. Search by name, father name, surname, village, district, pincode or mobile number."
        actions={
          can(user, "haribhagat.write") && (
            <ButtonLink href="/haribhagats/new">
              <Plus className="h-4 w-4" aria-hidden />
              {t("add")}
            </ButtonLink>
          )
        }
      />

      <form action="/haribhagats" role="search" className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input name="q" type="search" defaultValue={q ?? ""} className="pl-10" placeholder="Name, surname, village, mobile…  /  નામ, અટક, ગામ…" aria-label={t("search")} />
        </div>
        <Button type="submit">{t("searchAction")}</Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title={t("noResults")}
          description={q ? "Check the spelling or search with fewer words." : "No Haribhagat has been added yet."}
          action={can(user, "haribhagat.write") ? <ButtonLink href="/haribhagats/new">{t("add")}</ButtonLink> : null}
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("name")}</Th>
                <Th>{t("gam")}</Th>
                <Th>{t("pincode")}</Th>
                <Th>{t("mobileNo")}</Th>
                <Th className="text-right">{t("visits")}</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((p) => (
                <tr key={p.id} className="hover:bg-surface-muted/60">
                  <Td>
                    <Link href={`/haribhagats/${p.id}`} className="font-medium hover:underline">
                      {[p.name, p.fatherName, p.surname].filter(Boolean).join(" ")}
                    </Link>
                  </Td>
                  <Td>{personPlace(p) || "-"}</Td>
                  <Td className="font-mono text-xs">{p.pincode ?? "-"}</Td>
                  <Td className="font-mono text-xs">
                    {p.mobileNo ?? "-"}
                    {p.mobileMasked && <Badge className="ml-2">hidden</Badge>}
                  </Td>
                  <Td className="text-right tabular-nums">{p.visitCount}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="border-t border-border px-4 py-3">
            <Pagination basePath="/haribhagats" params={{ q }} page={result.page} pageSize={result.pageSize} total={result.total} />
          </div>
        </Card>
      )}
    </>
  );
}

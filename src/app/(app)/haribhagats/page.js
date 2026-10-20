import Link from "next/link";
import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { normalizeText } from "@/lib/normalize";
import { listCountries } from "@/lib/services/countries";
import { searchHaribhagats } from "@/lib/services/haribhagats";
import { personPlace } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { DebounceInput } from "@/components/ui/debounce-input";
import { GetForm } from "@/components/ui/get-form";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th } from "@/components/ui/table";
import { AddHaribhagatButton, HaribhagatRowActions } from "@/components/haribhagat-actions";

export const metadata = { title: "Haribhagats" };

export default async function HaribhagatsPage({ searchParams }) {
  const user = await requireUser();
  const raw = await searchParams;
  const q = normalizeText(Array.isArray(raw.q) ? raw.q[0] : raw.q);
  const page = Math.max(1, Math.min(Number(Array.isArray(raw.page) ? raw.page[0] : raw.page) || 1, 5000));
  const result = await searchHaribhagats(user, { q }, page);
  const canWrite = can(user, "haribhagat.write");
  const countries = canWrite ? await listCountries() : [];
  const labels = {
    add: t("add"),
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
  };
  const editable = (p) => ({
    id: p.id,
    name: p.name,
    fatherName: p.fatherName,
    surname: p.surname,
    gam: p.gam,
    taluko: p.taluko,
    jillo: p.jillo,
    state: p.state,
    country: p.country,
    pincode: p.pincode,
    mobileNo: p.mobileNo,
    mobileMasked: p.mobileMasked,
  });

  return (
    <>
      <PageHeader
        title={t("haribhagats")}
        description="Directory of Haribhagats. Search by name, father name, surname, village, district, pincode or mobile number."
        actions={canWrite && <AddHaribhagatButton labels={labels} countries={countries} />}
      />

      <GetForm action="/haribhagats" role="search" className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <DebounceInput name="q" type="search" submitOnChange defaultValue={q ?? ""} className="pl-10" placeholder="Name, surname, village, mobile…" aria-label={t("search")} />
        </div>
        <Button type="submit">{t("searchAction")}</Button>
      </GetForm>

      {result.items.length === 0 ? (
        <EmptyState
          title={t("noResults")}
          description={q ? "Check the spelling or search with fewer words." : "No Haribhagat has been added yet."}
          action={canWrite ? <AddHaribhagatButton labels={labels} countries={countries} /> : null}
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
                <Th className="text-right">Actions</Th>
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
                  <Td className="text-right">
                    <HaribhagatRowActions person={editable(p)} canWrite={canWrite} labels={labels} countries={countries} />
                  </Td>
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

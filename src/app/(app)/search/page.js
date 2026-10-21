import { requireUser } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { can, canViewMobile } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { filtersToParams, parseSearchParams, searchVisits } from "@/lib/services/search";
import { listEvents } from "@/lib/services/events";
import { listDisks } from "@/lib/services/disks";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { SearchForm } from "@/components/search-form";
import { VisitCard } from "@/components/visit-card";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }) {
  const user = await requireUser();
  const raw = await searchParams;
  const filters = parseSearchParams(raw);
  const params = filtersToParams(filters);

  const [events, disks, result] = await Promise.all([listEvents(), listDisks(), searchVisits(user, filters)]);
  const allowMobile = canViewMobile(user, getEnv().mobileVisibleRoles);

  return (
    <>
      <PageHeader
        title={t("search")}
        description="Search a Haribhagat by name, surname, village or mobile. You see every visit of that Haribhagat with the hard disk and path where the photos are kept."
      />

      <SearchForm values={params} events={events} disks={disks} allowMobile={allowMobile} />

      <div className="mt-6">
        {result.items.length === 0 ? (
          result.latest ? (
            <EmptyState title="No entries yet" description="Add a new entry to record which hard disk and path hold a Haribhagat's photos." />
          ) : (
            <EmptyState title={t("noResults")} description="Try fewer filters or a different spelling. You can search in English and Gujarati." />
          )
        ) : (
          <>
            {result.latest ? (
              <h2 className="mb-3 text-base font-semibold">Latest entries</h2>
            ) : result.loose ? (
              <p className="mb-3 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning">
                Nothing matches exactly what you typed. Showing {result.total} visit(s) with a similar spelling (for example PATEL for PTEL).
              </p>
            ) : (
              <p className="mb-3 text-sm text-muted">{result.total} visit(s) found</p>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {result.items.map((visit) => (
                <VisitCard key={visit.id} visit={visit} canEdit={can(user, "visit.write")} />
              ))}
            </div>
            <div className="mt-6">
              <Pagination basePath="/search" params={params} page={result.page} pageSize={result.pageSize} total={result.total} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

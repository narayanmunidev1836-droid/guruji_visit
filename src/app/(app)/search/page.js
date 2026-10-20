import { requireUser } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { canViewMobile } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { filtersToParams, hasSearchFilters, parseSearchParams, searchVisits } from "@/lib/services/search";
import { listEvents } from "@/lib/services/events";
import { listDisks } from "@/lib/services/disks";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { SearchForm } from "@/components/search-form";
import { VisitCard } from "@/components/visit-card";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }) {
  const user = await requireUser();
  const filters = parseSearchParams(await searchParams);
  const params = filtersToParams(filters);
  const searched = hasSearchFilters(filters);

  const [events, disks, result] = await Promise.all([listEvents(), listDisks(), searched ? searchVisits(user, filters) : null]);
  const allowMobile = canViewMobile(user, getEnv().mobileVisibleRoles);

  return (
    <>
      <PageHeader
        title={t("search")}
        description="Search a Haribhagat by name, surname, village or mobile. You see every visit of that Haribhagat with the hard disk and folder where the photos are kept."
      />

      <SearchForm values={params} events={events} disks={disks} allowMobile={allowMobile} />

      <div className="mt-6">
        {!result ? (
          <EmptyState title="Search a Haribhagat" description="Type a name, surname or village above to see their visits and which hard disk and folder to open." />
        ) : result.items.length === 0 ? (
          <EmptyState title={t("noResults")} description="Try fewer filters or a different spelling. You can search in English and Gujarati." />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">{result.total} visit(s) found</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {result.items.map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
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

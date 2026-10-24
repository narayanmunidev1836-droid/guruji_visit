import { requireUser } from "@/lib/auth/dal";
import { getEnv } from "@/lib/env";
import { canViewMobile } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { filtersToParams, parseSearchParams, searchMemberGroups } from "@/lib/services/search";
import { listEvents } from "@/lib/services/events";
import { listDisks } from "@/lib/services/disks";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { SearchForm } from "@/components/search-form";
import { MemberResult } from "@/components/member-result";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }) {
  const user = await requireUser();
  const raw = await searchParams;
  const filters = parseSearchParams(raw);
  const params = filtersToParams(filters);

  const [events, disks, result] = await Promise.all([listEvents(), listDisks(), searchMemberGroups(user, filters)]);
  const allowMobile = canViewMobile(user, getEnv().mobileVisibleRoles);

  return (
    // the page itself does not scroll: heading + search form stay on top, only the list of Members scrolls and the pager stays at the bottom
    // (see the Haribhagats page for the heights)
    <div className="flex h-[calc(100dvh-11rem)] min-h-96 flex-col lg:h-[calc(100dvh-3rem)]">
      <PageHeader
        title={t("search")}
        description="Search a Member by name, surname, village or mobile. Each Member is one result: click it to see all entries of that Member with the hard disk and path where the photos are kept."
      />

      <div className="shrink-0">
        <SearchForm values={params} events={events} disks={disks} allowMobile={allowMobile} />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {result.groups.length === 0 ? (
          result.latest ? (
            <EmptyState title="No entries yet" description="Add a new entry to record which hard disk and path hold a Member's photos." />
          ) : (
            <EmptyState title={t("noResults")} description="Try fewer filters or a different spelling. You can search in English and Gujarati." />
          )
        ) : (
          <>
            {result.latest ? (
              <h2 className="mb-3 shrink-0 text-base font-semibold">Latest entries</h2>
            ) : result.loose ? (
              <p className="mb-3 shrink-0 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning">
                Nothing matches exactly what you typed. Showing {result.total} Member(s) with a similar spelling (for example PATEL for PTEL).
              </p>
            ) : (
              <p className="mb-3 shrink-0 text-sm text-muted">
                {result.total} Member(s), {result.totalVisits} entries found
              </p>
            )}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {result.groups.map((group) => (
                <MemberResult key={group.member.id} group={group} />
              ))}
            </div>
            <div className="mt-3 shrink-0">
              <Pagination basePath="/search" params={params} page={result.page} pageSize={result.pageSize} total={result.total} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

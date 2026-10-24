import Link from "next/link";
import { ChevronRight, MapPin, User } from "lucide-react";
import { personName, personPlace } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";

/** Search result for ONE Member (name, place, number of entries). Clicking it opens the Member's page, which lists all entries. */
export function MemberResult({ group }) {
  const { member, count } = group;
  const place = personPlace(member);
  return (
    <Link
      href={`/haribhagats/${member.id}`}
      className="card-hover flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary" aria-hidden>
        <User className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold leading-snug">{personName(member)}</span>
        {place && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{place}</span>
          </span>
        )}
      </span>
      <Badge tone="primary" className="shrink-0">
        {count} {count === 1 ? "entry" : "entries"}
      </Badge>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

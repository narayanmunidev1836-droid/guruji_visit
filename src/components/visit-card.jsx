import Link from "next/link";
import { CalendarDays, Eye, FolderOpen, HardDrive, MapPin, Pencil, StickyNote } from "lucide-react";
import { t } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { personName } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { DeleteVisitButton } from "@/components/delete-visit-button";

/**
 * Where the photos are: the hard disk (sticker label) and, below it, the path inside the disk. The copy button on the right
 * copies only the path.
 */
export function VisitLocation({ visit, copy = true }) {
  if (!visit.hardDisk) return <span className="text-sm text-muted">No hard disk recorded</span>;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted/70 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-primary-foreground shadow-brand" title="Hard disk" aria-hidden>
        <HardDrive className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-all text-sm font-bold tracking-wide text-primary">{visit.hardDisk.labelName}</p>
        {visit.folderPath ? (
          <p className="mt-0.5 flex items-start gap-1.5 text-sm text-foreground" title="Path">
            <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <span className="break-words">{visit.folderPath}</span>
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted">(disk root)</p>
        )}
      </div>
      {copy && visit.folderPath && <CopyButton iconOnly text={visit.folderPath} label={t("copyPath")} copiedLabel={t("copied")} />}
    </div>
  );
}

const iconLink = "inline-grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-primary-soft";

/** One entry: who, where the photos are kept (disk + path), event / date / place and notes; View / Edit / Delete when allowed. */
export function VisitCard({ visit, canEdit = false }) {
  const people = visit.haribhagats;
  const place = [people[0]?.haribhagat.gam, people[0]?.haribhagat.jillo].filter(Boolean).join(", ");
  return (
    <article className="card-hover flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold leading-snug">
            {people.map((link, index) => (
              <span key={link.haribhagat.id}>
                {index > 0 && ", "}
                <Link href={`/haribhagats/${link.haribhagat.id}`} className="hover:text-primary hover:underline">
                  {personName(link.haribhagat)}
                </Link>
              </span>
            ))}
          </p>
          {place && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              {place}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
          <Link href={`/visits/${visit.id}`} className={iconLink} title="View" aria-label="View">
            <Eye className="h-4 w-4" aria-hidden />
          </Link>
          {canEdit && (
            <>
              <Link href={`/visits/${visit.id}/edit`} className={iconLink} title="Edit" aria-label="Edit">
                <Pencil className="h-4 w-4" aria-hidden />
              </Link>
              <DeleteVisitButton id={visit.id} />
            </>
          )}
        </div>
      </div>

      <VisitLocation visit={visit} />

      {(visit.event || visit.visitDate || visit.placeType) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
          {visit.event && <Badge tone="primary">{visit.event.name}</Badge>}
          {visit.visitDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden /> {formatDate(visit.visitDate)}
            </span>
          )}
          {visit.placeType && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden /> {t(visit.placeType)}
            </span>
          )}
        </div>
      )}

      {visit.notes && (
        <p className="flex items-start gap-2 whitespace-pre-line border-t border-border pt-3 text-sm text-foreground/80">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <span>{visit.notes}</span>
        </p>
      )}
    </article>
  );
}

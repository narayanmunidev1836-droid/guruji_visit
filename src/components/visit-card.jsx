import Link from "next/link";
import { CalendarDays, Eye, FolderOpen, HardDrive, Pencil } from "lucide-react";
import { t } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { personName } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { DeleteVisitButton } from "@/components/delete-visit-button";

/** Hard disk and folder shown separately ("HDD-001" and "MUKT SWAMI DATA/decstop"); the copy button copies only the folder. */
export function VisitLocation({ visit, copy = true }) {
  if (!visit.hardDisk) return <span className="text-sm text-muted">No hard disk recorded</span>;
  const disk = visit.hardDisk.labelName;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1 text-sm font-semibold text-primary ring-1 ring-[#f0d0b8]" title="Hard disk">
        <HardDrive className="h-4 w-4 shrink-0" aria-hidden />
        <span className="break-all">{disk}</span>
      </span>
      {visit.folderPath ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border" title="Folder">
          <FolderOpen className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <span className="break-all">{visit.folderPath}</span>
        </span>
      ) : (
        <span className="text-sm text-muted">(disk root)</span>
      )}
      {copy && visit.folderPath && <CopyButton text={visit.folderPath} label={t("copyPath")} copiedLabel={t("copied")} />}
    </span>
  );
}

const iconLink = "inline-grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-primary-soft";

/** One entry: who, where the photos are kept (disk + folder), event / date / place and notes; View / Edit / Delete when allowed. */
export function VisitCard({ visit, canEdit = false }) {
  const people = visit.haribhagats;
  return (
    <article className="card-hover rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold">
            {people.map((link, index) => (
              <span key={link.haribhagat.id}>
                {index > 0 && ", "}
                <Link href={`/haribhagats/${link.haribhagat.id}`} className="hover:underline">
                  {personName(link.haribhagat)}
                </Link>
              </span>
            ))}
          </p>
          <p className="mt-0.5 text-xs text-muted">{[people[0]?.haribhagat.gam, people[0]?.haribhagat.jillo].filter(Boolean).join(", ")}</p>
        </div>
        <div className="flex items-center gap-0.5">
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

      <div className="mt-3">
        <VisitLocation visit={visit} />
      </div>

      {(visit.event || visit.visitDate || visit.placeType) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          {visit.event && <Badge tone="primary">{visit.event.name}</Badge>}
          {visit.visitDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatDate(visit.visitDate)}
            </span>
          )}
          {visit.placeType && <span>{t(visit.placeType)}</span>}
        </div>
      )}
      {visit.notes && (
        <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-sm text-foreground/80">
          <span className="font-medium text-muted">{t("notes")}: </span>
          {visit.notes}
        </p>
      )}
    </article>
  );
}

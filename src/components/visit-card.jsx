import Link from "next/link";
import { CalendarDays, FolderOpen, HardDrive } from "lucide-react";
import { t } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { displayLocation } from "@/lib/paths";
import { personName } from "@/lib/ui-labels";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";

/** Hard disk and folder shown separately ("HDD-001" and "MUKT SWAMI DATA/decstop"); Copy path copies "HDD-001 / folder". */
export function VisitLocation({ visit, copy = true }) {
  if (!visit.hardDisk) return <span className="text-sm text-muted">No hard disk recorded</span>;
  const disk = visit.hardDisk.labelName;
  const text = visit.folderPath ? displayLocation(disk, visit.folderPath) : `${disk} (disk root)`;
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
      {copy && <CopyButton text={text} label={t("copyPath")} copiedLabel={t("copied")} />}
    </span>
  );
}

/** One visit: who, where the photos are kept (disk + folder), and the optional event / date. */
export function VisitCard({ visit }) {
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
        <Link href={`/visits/${visit.id}`} className="text-sm font-medium text-primary hover:underline">
          Open →
        </Link>
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
    </article>
  );
}

import Link from "next/link";
import { CalendarDays, HardDrive, Plus, Search, Tags, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { getDashboardData } from "@/lib/services/dashboard";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/labels";
import { BarChart } from "@/components/bar-chart";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Input } from "@/components/ui/inputs";
import { VisitCard } from "@/components/visit-card";

export const metadata = { title: "Dashboard" };

const STATS = [
  { icon: Users, tint: "from-[#c4511f] to-[#8e1f0a]", label: () => t("haribhagats"), value: (d) => formatNumber(d.haribhagatCount) },
  { icon: CalendarDays, tint: "from-violet-500 to-purple-500", label: () => t("visits"), value: (d) => formatNumber(d.visitCount) },
  { icon: HardDrive, tint: "from-sky-500 to-blue-500", label: () => t("hardDisks"), value: (d) => formatNumber(d.diskCount) },
  { icon: Tags, tint: "from-amber-500 to-orange-500", label: () => t("events"), value: (d) => formatNumber(d.eventCount) },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData();
  const total30 = data.dailyVisits.reduce((sum, d) => sum + d.count, 0);
  const activeDays = data.dailyVisits.filter((d) => d.count > 0).length;

  return (
    <div className="space-y-6">
      <div className="fade-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#b0451a] via-[#8e1f0a] to-cyan-700 p-6 text-white shadow-xl shadow-[#c4511f]/25">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#fde8e0]/90">Welcome, {user.name}</p>
            <h1 className="mt-1 text-2xl font-bold lg:text-3xl">{t("dashboard")}</h1>
            <p className="mt-1 text-sm text-[#fff5f0]/80">
              {formatNumber(data.haribhagatCount)} Haribhagats · {formatNumber(data.visitCount)} visits · {formatNumber(data.diskCount)} hard disks
            </p>
          </div>
          {can(user, "visit.write") && (
            <Link href="/visits/new" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#b0451a] shadow-md transition hover:bg-[#fff5f0]">
              <Plus aria-hidden className="h-4 w-4" /> New visit
            </Link>
          )}
        </div>
      </div>

      <form action="/search" className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="q"
            type="search"
            placeholder="Search a Haribhagat: name, surname, village, mobile…  /  નામ, અટક, ગામ…"
            className="h-12 pl-10 text-base"
            aria-label={t("search")}
          />
        </div>
        <Button type="submit" size="lg">
          {t("searchAction")}
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={card.label()} className="card-hover fade-up overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.tint} text-white shadow-md`}>
                <Icon aria-hidden className="h-5 w-5" />
              </div>
              <div className="mt-3 text-3xl font-bold tabular-nums text-slate-800">{card.value(data)}</div>
              <div className="text-sm text-slate-500">{card.label()}</div>
            </div>
          );
        })}
      </div>

      <div className="fade-up rounded-2xl border border-border bg-surface p-5 shadow-card" style={{ animationDelay: "0.24s" }}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-800">Visits added — last 30 days</h2>
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-primary">{formatNumber(total30)}</span> visits on <span className="font-semibold text-primary">{activeDays}</span> active days
          </p>
        </div>
        <BarChart data={data.dailyVisits} label="Visits added per day, last 30 days" />
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          {data.dailyVisits
            .filter((_, i, a) => i % 5 === 0 || i === a.length - 1)
            .map((d) => (
              <span key={d.date}>{d.date.slice(5)}</span>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader
            title={t("hardDisks")}
            actions={
              <ButtonLink href="/hard-disks" variant="secondary" size="sm">
                Manage
              </ButtonLink>
            }
          />
          {data.disks.length === 0 ? (
            <CardBody>
              <EmptyState title="No hard disks registered yet" description="Register each disk with its sticker label, then add visits that point to it." />
            </CardBody>
          ) : (
            <ul className="divide-y divide-border">
              {data.disks.map((disk) => (
                <li key={disk.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={`/hard-disks/${disk.id}`} className="font-medium hover:underline">
                    {disk.labelName}
                  </Link>
                  <span className="text-xs text-muted">{formatNumber(disk.visitCount)} visits</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-slate-800">Recent visits</h2>
            <Link href="/visits" className="text-sm font-medium text-primary hover:underline">
              All visits →
            </Link>
          </div>
          {data.recentVisits.length === 0 ? (
            <EmptyState title="No visits yet" description="Add a visit to record which hard disk and folder hold a Haribhagat's photos." />
          ) : (
            <div className="space-y-4">
              {data.recentVisits.map((visit) => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

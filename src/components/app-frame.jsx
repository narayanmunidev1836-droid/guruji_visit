"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CirclePlus,
  ClipboardCheck,
  Ellipsis,
  HardDrive,
  Images,
  LayoutDashboard,
  LogOut,
  ScanSearch,
  Search,
  Settings,
  Tags,
  User,
  UserCog,
  Users,
} from "lucide-react";

const ICONS = { LayoutDashboard, Search, CirclePlus, ClipboardCheck, CalendarDays, Users, Tags, HardDrive, ScanSearch, UserCog, Settings };

const TAB_WIDTH = 76; // min px per bottom tab, incl. the More tab
const DEFAULT_TABS = 4;

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 whitespace-nowrap">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-primary-foreground shadow-brand">
        <Images className="h-[18px] w-[18px]" />
      </span>
      <span className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-base font-bold text-transparent">Guruji Photo Archive</span>
    </Link>
  );
}

function SidebarLinks({ nav, activeHref, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
      {nav.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href + item.primary}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-primary-soft text-primary ring-1 ring-[#f0d0b8]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-ring" : "text-slate-400"}`} aria-hidden />
            {item.primary}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({ user, labels, logoutAction }) {
  return (
    <div className="border-t border-slate-100 p-3">
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fde8e0] text-ring">
          <User className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-700">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.roleLabel}</span>
        </span>
      </div>
      <Link
        href="/account"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#f0d0b8] px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-soft hover:text-primary-hover"
      >
        <User className="h-4 w-4" aria-hidden /> {labels.account}
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" aria-hidden /> {labels.logout}
        </button>
      </form>
    </div>
  );
}

function BottomBar({ nav, activeHref, user, labels, logoutAction }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [prevActive, setPrevActive] = useState(activeHref);
  const [maxTabs, setMaxTabs] = useState(DEFAULT_TABS);
  const ref = useRef(null);
  const navRef = useRef(null);

  // Show as many tabs as fit in the bar (one slot is reserved for More); the rest go into the More menu.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => setMaxTabs(Math.max(1, Math.floor(el.clientWidth / TAB_WIDTH) - 1));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (prevActive !== activeHref) {
    setPrevActive(activeHref);
    if (moreOpen) setMoreOpen(false);
  }

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [moreOpen]);

  const tabs = nav.slice(0, maxTabs);
  const extra = nav.slice(maxTabs);
  const moreActive = extra.some((l) => l.href === activeHref);
  const tabClass = (active) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${active ? "text-ring" : "text-slate-500"}`;
  const pill = (active) => `flex h-7 w-12 items-center justify-center rounded-full transition ${active ? "bg-[#fde8e0]" : ""}`;

  return (
    <div ref={ref} className="lg:hidden">
      {moreOpen && (
        <div className="fixed bottom-[72px] right-3 z-50 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700">
            <User className="h-[18px] w-[18px] text-slate-500" aria-hidden />
            <span className="truncate">{user.name}</span>
          </div>
          {extra.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href + item.primary}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-primary-soft text-primary" : "text-slate-700"}`}
              >
                <Icon className="h-[18px] w-[18px] text-ring" aria-hidden />
                {item.primary}
              </Link>
            );
          })}
          <Link href="/account" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700">
            <User className="h-[18px] w-[18px] text-slate-500" aria-hidden /> {labels.account}
          </Link>
          <div className="my-1 border-t border-slate-100" />
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600">
              <LogOut className="h-[18px] w-[18px]" aria-hidden /> {labels.logout}
            </button>
          </form>
        </div>
      )}

      <nav
        ref={navRef}
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgba(15,23,42,0.15)] backdrop-blur-md"
      >
        {tabs.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = item.href === activeHref;
          return (
            <Link key={item.href + item.primary} href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              <span className={pill(active)}>
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="max-w-full truncate px-0.5">{item.primary}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-label={labels.more} aria-expanded={moreOpen} className={tabClass(moreOpen || moreActive)}>
          <span className={pill(moreOpen || moreActive)}>
            <Ellipsis className="h-[18px] w-[18px]" aria-hidden />
          </span>
          {labels.more}
        </button>
      </nav>
    </div>
  );
}

/**
 * Application frame, same look as Book Knowledge: fixed sidebar on desktop; top bar + bottom tab bar (with a More menu) on phones.
 * `nav` is plain data from the server: [{ href, icon, primary, secondary, match }].
 * `user` = { name, roleLabel }; `labels` = { account, logout, more }; `logoutAction` is a server action.
 */
export function AppFrame({ nav, user, labels, logoutAction, children }) {
  const pathname = usePathname();

  const activeHref = nav
    .filter((item) => (item.match === "exact" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
        <div className="flex items-center border-b border-slate-100 px-4 py-4">
          <Brand />
        </div>
        <SidebarLinks nav={nav} activeHref={activeHref} />
        <UserBlock user={user} labels={labels} logoutAction={logoutAction} />
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur-md lg:hidden">
        <Brand />
        <span className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-[#fde8e0] text-ring">
          <User className="h-4 w-4" aria-hidden />
        </span>
      </header>

      <BottomBar nav={nav} activeHref={activeHref} user={user} labels={labels} logoutAction={logoutAction} />

      <div className="min-w-0 lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}

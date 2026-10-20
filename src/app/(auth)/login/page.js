import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HardDrive, Images, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { t } from "@/lib/labels";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata = { title: "Log in" };

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}

const FEATURES = [
  { icon: Images, text: "Every event photo indexed in one place" },
  { icon: HardDrive, text: "Know which hard disk to connect, and the folder on it" },
  { icon: Search, text: "Search by Haribhagat, village, date or event" },
];

// Same layout as the Book Knowledge login: gradient hero on the left (desktop), form card on the right.
export default function LoginPage() {
  return (
    <main className="flex flex-1">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="grid w-full lg:grid-cols-2">
        <section className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-[#b0451a] via-[#8e1f0a] to-cyan-700 px-6 py-10 text-white lg:flex lg:px-16 lg:py-16">
          <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -right-16 -bottom-24 h-80 w-80 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute top-1/3 right-10 hidden h-40 w-40 rotate-12 rounded-3xl bg-white/5 lg:block" />

          <div className="fade-up relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-[#fff5f0] ring-1 ring-white/20">
              <Images aria-hidden className="h-3.5 w-3.5" /> Private Photo Archive
            </span>
            <h1 className="mt-4 text-4xl font-bold lg:text-5xl">
              Guruji <span className="text-[#f0d0b8]">Photo Archive</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#fff5f0]/90 lg:text-base">
              Search Guruji&apos;s event photographs — Pathramani, Vichran, Sabha, Utsav — and find out which USB hard disk holds the original.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {FEATURES.map((item) => (
                <li key={item.text} className="fade-up flex items-center gap-3 text-[#fff5f0]/95" style={{ animationDelay: "0.12s" }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                    <item.icon aria-hidden className="h-4 w-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-4 py-10">
          <div className="w-full max-w-md">
            <div className="fade-up mb-6 text-center">
              <span aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-xl shadow-[#c4511f]/40">
                <Images className="h-8 w-8" />
              </span>
              <h1 className="mt-4 bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-3xl font-bold text-transparent">Guruji Photo Archive</h1>
              <p className="mt-1 text-sm text-slate-500">Login for authorised staff</p>
            </div>
            <div className="fade-up rounded-2xl border border-border bg-surface p-6 shadow-lg" style={{ animationDelay: "0.08s" }}>
              <LoginForm labels={{ email: t("email"), password: t("password"), login: t("login") }} />
            </div>
            <p className="mt-6 text-center text-xs text-muted">Private organisation archive. Authorised staff only.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

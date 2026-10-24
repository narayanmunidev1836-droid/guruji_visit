import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { HardDrive, Images, Lock, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { t } from "@/lib/labels";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata = { title: "Log in" };

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}

const FEATURES = [
  { icon: Images, title: "Every visit recorded:", text: "who came, when, and for which event" },
  { icon: HardDrive, title: "Hard disk and path:", text: "know exactly which disk to connect and where to look" },
  { icon: Search, title: "Quick search:", text: "by Member name, village, mobile, date or event" },
];

// Centered card on a blurred temple photo: photo + branding on the left (desktop), sign-in form on the right.
export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-brand-to px-4 py-8">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>

      <Image src="/images/temple-night.png" alt="" fill priority sizes="100vw" className="scale-110 object-cover blur-2xl" aria-hidden />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-brand-to/90 via-brand-to/80 to-black/80" />

      <div className="fade-up relative grid w-full max-w-5xl overflow-hidden rounded-3xl bg-surface shadow-2xl shadow-black/40 lg:min-h-[34rem] lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden p-8 text-white lg:flex">
          <Image src="/images/temple-night.png" alt="" fill sizes="(min-width: 1024px) 560px, 0px" className="object-cover" aria-hidden />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-brand-to/55 to-brand-to/90" />

          <div className="relative">
            <span className="inline-block rounded-2xl bg-white/95 px-4 py-2.5 shadow-lg">
              <Image src="/images/gurukul-logo.png" alt="Sanskardham Gurukul, Dhrangadhra" width={632} height={90} className="h-9 w-auto" />
            </span>
            <h1 className="mt-6 text-3xl font-bold leading-tight lg:text-4xl">
              Sankardham
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#fff5f0]/90">
              Find out which hard disk and path hold the photos of every Member&apos;s visit: Pathramani, Vichran, Sabha, Utsav.
            </p>
          </div>

          <div className="relative">
            <ul className="space-y-3 text-sm">
              {FEATURES.map((item) => (
                <li key={item.title} className="flex items-start gap-3 text-[#fff5f0]/95">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
                    <item.icon aria-hidden className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="font-semibold text-white">{item.title}</span> {item.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-xs text-[#fff5f0]/80">
              <span>Sanskardham · Dhrangadhra</span>
              <span className="inline-flex items-center gap-1.5">
                <Lock aria-hidden className="h-3.5 w-3.5" /> Authorised staff only
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <div className="mx-auto w-full max-w-sm">
            <Image src="/images/gurukul-logo.png" alt="Sanskardham Gurukul, Dhrangadhra" width={632} height={90} className="mb-8 h-9 w-auto lg:hidden" />
            <h2 className="text-2xl font-bold tracking-tight">Staff sign in</h2>
            <p className="mt-1 text-sm text-muted">Use your username, email or mobile number and your password.</p>
            <div className="mt-6">
              <LoginForm labels={{ login: "Username, email or mobile", password: t("password"), submit: "Sign in" }} />
            </div>
            <p className="mt-6 text-center text-xs text-muted">Private organisation archive.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

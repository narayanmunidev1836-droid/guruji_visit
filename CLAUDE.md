# CLAUDE.md — Guruji Photo Archive (read this first)

Private web app that records **which hard disk and folder hold the photos of each Haribhagat's visit** (Pathramani, Vichran, Sabha, Utsav …).
**Photos stay on USB hard disks** (each with a unique sticker label such as `HDD-001`). Nothing is indexed or scanned: staff type the
**Haribhagat + hard disk + folder path** into a *Visit*; searching a Haribhagat lists all their visits with `HDD-001 / folder`.
Earlier versions had a local indexer, photo records, "Needs review" and scans — **removed on 2026-10-20** (backup: `D:\guruji-photo-archive_backup_2026-10-20`).
The `Photo`, `ScanJob`, `IndexerToken` tables and `HardDisk.stableIdentifier/lastSeenAt/lastScanAt` still exist in the schema but are **unused**
(dropping them needs an explicit OK); `docs/` (INDEXER, parts of ARCHITECTURE/API/DATABASE/PROJECT_STATUS/TESTING) still describe the old design.

> Next.js here is **v16 with changed APIs** — see `AGENTS.md`; docs are in `node_modules/next/dist/docs/`.

## Stack (JavaScript only — never convert to TypeScript)
Next.js 16.4 (App Router, Turbopack, **Cache Components on**, `proxy.js` not middleware) · React 19.3 · Tailwind 4 (`@tailwindcss/turbopack`) ·
PostgreSQL + **Prisma 7** (`prisma-client-js` generator, **driver adapter** `@prisma/adapter-pg`, config in `prisma.config.js`; migrations use `DIRECT_URL`) ·
zod 4 · jose (JWT) · @node-rs/argon2 · lucide-react · Vitest 5 · Playwright. Package type is `"type": "module"`.
**Node ≥ 22.13 required** (Prisma 7). The dev database is **Supabase (cloud)** — never point tests at it.

## Run / test
```
npm install && cp .env.example .env     # set DATABASE_URL (+ DIRECT_URL for migrations) + SESSION_SECRET
npm run db:deploy && npm run db:seed
npm run dev            # app          | npm run build && npm start   # production
npm run lint
npm test                                                         # unit (no DB)
TEST_DATABASE_URL=postgres://… npm run test:integration          # DB tests, TRUNCATEs the DB! (helpers refuse the .env database)
```
**After a Prisma schema change: `prisma generate` and restart `next dev`** (the running server keeps the old client in memory → "Expected SortOrder, provided Object" style errors).
Admin login = `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`. **Login accepts a username, an e-mail or a 10-digit mobile number** (a username is **any text**, only max 50 chars, stored lower-case; the typed login is tried as username, e-mail and mobile - `loginCandidates` in `normalize.js`; `User.username` / `User.mobileNo`, both unique, set by an admin on `/users`; the seeded admin has only an e-mail until a username is added). **Username and e-mail are not case sensitive, the PASSWORD is** (`src/lib/auth/password.js`: hashed and compared exactly as typed, no other spelling is ever tried). Seed once per database. E2E tests (`tests/e2e`) still target the OLD flows and need rewriting.

## Architecture in one picture
```
Browser ──► proxy.js (cookie exists? optimistic only)
        ──► page (server component) / server action ──► src/lib/services/*  ──► Prisma (src/lib/db.js) ──► PostgreSQL
                    │  requireUser()/requirePermission()  (src/lib/auth/dal.js — the REAL authorization)
```
Layers: **pages & `src/actions/*` (thin: auth + parse FormData + revalidate) → `src/lib/services/*` (all business rules, validation with
zod, audit log; return `{ok, …}` / `{ok:false, error, fieldErrors}`) → Prisma**. Pure helpers in `src/lib/*.js` (no framework imports → unit-testable).

## Where things are
| Need | File(s) |
|---|---|
| DB schema / migrations / seed | `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.mjs` |
| Env validation (all config) | `src/lib/env.js` (+ `.env.example`) |
| Login session, roles | `src/lib/auth/{session,jwt,password,dal}.js`, `src/lib/permissions.js`, `src/proxy.js`, `src/actions/auth.js` |
| Visits (Haribhagat, disk, folder, event, date and place all required; only notes optional) | `src/lib/services/visits.js`, `src/actions/visits.js`, form `src/components/visit-form.jsx`, page `src/app/(app)/visits/new/page.js` |
| "New entry" Haribhagat inputs (search → fills surname/name/father/mobile/village/taluko/district/**state/country**/pincode; or type a new one; village…state boxes suggest values already saved, `ui/suggest-input.jsx`; **Country is a dropdown** filled from the free keyless FIRST.org API via `lib/services/countries.js`, cached 1 week, falls back to a suggest box if the API is down; **State is a dropdown of the chosen country's states** (`components/state-select.jsx`, free keyless CountriesNow API, `listStates`), text box when the country is unknown to it; changing the country resets the state (India → Gujarat) — REST Countries now needs a key) | `src/components/visit-person-fields.jsx`; server creates the Haribhagat with the visit (`createVisit`) |
| Search visits by Haribhagat (filters, pagination) | `src/lib/services/search.js`, `person-filters.js`, page `src/app/(app)/search/page.js`, card `src/components/visit-card.jsx` |
| People / events / disks | `src/lib/services/{haribhagats,events,disks}.js` |
| Folder path rule | `src/lib/paths.js` (relative to the disk root, `/` separators); `parseVisitFolder` in `visits.js` drops a pasted drive letter (`F:\A\B` → `A/B`) |
| Text/phone/pincode normalisation | `src/lib/normalize.js`, `src/lib/validation.js` |
| UI labels (**English only** - no Gujarati text in the UI) | `src/lib/labels.js` (`t(key)`); Gujarati is still accepted/searchable in typed data (names, villages) |
| UI building blocks | `src/components/ui/*`, forms: `ui/form.jsx` (`ActionForm`, `Field`, `SubmitButton`); **every search box uses `ui/debounce-input.jsx` (`DebounceInput`, 350 ms)**, and GET search forms use `ui/get-form.jsx` (`GetForm`: client-side navigation, live search, no page reload); custom `ui/date-picker.jsx` |
| Theme (colours, gradients, radii) | `src/app/globals.css` tokens — **same design as the Book Knowledge app** (repo `D:\book-knowledge`, https://bk.ssgd.org/sant): terracotta `#c4511f → #8e1f0a`, off-white `#fdfaf8`, slate neutrals, **light only (no dark mode)**. Use `bg-brand` / `shadow-brand` / `shadow-card` / `fade-up` / `card-hover` utilities; never hard-code hex where a token exists. If `next dev` serves stale CSS after editing `globals.css`, change real content (a `touch` is not enough) or restart. |
| App shell / nav | `src/components/app-shell.jsx` (server), `app-frame.jsx` (client; desktop sidebar, phone top bar + bottom tabs with More menu) |

## Key flows
1. **Admin registers a disk** (`/hard-disks`, permission `disk.create`) → label unique (case-insens.). A **staff** user can only do this (and add events, `event.create`) when an admin ticked *Add hard disks / Add events* for them on `/users` (`User.canCreateDisks/canCreateEvents`, see `GRANTS` in `permissions.js`). Edit/deactivate = admin (`disk.manage` / `event.manage`).
2. **New entry** (the "Visit" record) is its own page `/visits/new` (sidebar item "New entry", plus buttons on the Dashboard and the Haribhagat page; `?haribhagat=ID` preselects): search an existing Haribhagat (details fill the inputs, read-only) or type
   a new one; choose the hard disk (dropdown of active disks) and type the path (the UI says **Path**; the DB column is `folderPath`). Similar existing people → warning with "Use this person" / "save as new".
3. **Search** `/search` is the only place that lists entries (there is no Visits page/sidebar item; `/visits` redirects to `/search`). Each `VisitCard` has View (`/visits/:id`), Edit (`/visits/:id/edit`) and Delete (hard delete, confirmed, audited as `visit.delete`; permission `visit.write`) and shows notes. Saving a new entry opens an **"Entry saved" dialog** (`saved-entry-dialog.jsx`: only the saved data, with Edit → `/visits/:id/edit`); closing it remounts `/visits/new` as a fresh empty form. Editing an entry redirects to its view page. Details: person filters match the *same* Haribhagat of a visit; with **no filter it shows "Latest entries"** (newest *created* first, 10 per page); with filters, matches newest visit date first, 20 per page, as `VisitCard`s with a Copy-path button.
4. Haribhagat detail page lists that person's visits the same way.
   The **Haribhagats list** (`/haribhagats`) adds / edits in a dialog (`haribhagat-actions.jsx` + `ui/modal.jsx`, form in `modal` mode) and has View / Edit / Delete icons per row; delete (`deleteHaribhagat`, permission `haribhagat.write`) is refused while any entry uses the person.

## Rules & gotchas (learned the hard way — keep them)
* **Never** store absolute/drive-letter paths; the app never touches the disks (no file access, no thumbnails, no "open original").
* Authorization lives in services/DAL (`requireUser`, `requirePermission`, `requireAdminPage`), **not** in hidden buttons or `proxy.js`. Every new page/action must call one.
* `"use server"` files may export **only async functions**. Server actions return result objects (see `src/lib/result.js`); wrap bodies in `runAction` (`src/lib/action.js`).
* Forms: use `ActionForm` (submits via `startTransition` so React 19 does **not** wipe the inputs after a validation error).
* **Cache Components**: private data (session/DB) is dynamic; `src/app/(app)/layout.js` wraps in `<Suspense>` and exports `instant = false`; `(app)/loading.js` gives skeletons.
  A layout's `instant = false` does **not** cover its child pages (each page is implicitly `instant = true`), so `next.config.mjs` sets `experimental.instantInsights.validationLevel: "manual-warning"`. Restart `next dev` after changing it.
  Route handlers that read no request data need `await connection()`; catch blocks must `unstable_rethrow(error)`.
* **zod 4**: `z.any()` rejects a *missing* key ("nonoptional") → use `z.preprocess(v => v ?? "", z.string()…)` (see `validation.js`).
* **Prisma 7**: relation `orderBy` has no `nulls` option (scalar nullable fields such as `Visit.visitDate` do: `{ sort, nulls: "last" }`); never spread two `OR`s into one `where` (use `AND:[{OR},{OR}]`).
* Dates: `Visit.visitDate` is a DATE (required in the form/service; the column is still nullable for old rows) (UTC midnight) — always format with `src/lib/format.js` (UTC).
* **All typed text is CAPITALS**: `requiredText`/`optionalText` (`validation.js`) use `upperText` (`normalize.js`) and `parseVisitFolder` upper-cases the folder, so the DB stores capitals (names, village, notes, event/disk/user names, folders); `ui/inputs.jsx` (`Input`, `Textarea`) show text in capitals while typing via the `uppercase` class (not email/password). Any new text field must go through those helpers. Migration `20261020170000_uppercase_text` converted old rows. Case-insensitive keys (`nameKey`, `dupKey`) stay lower-case; `labelKey` upper-case.
* Mobile numbers/pincodes are **strings**. A mobile is **exactly 10 digits** (6-9 first; `MobileInput` allows digits only, max 10; no international numbers). Roles without mobile access get masked numbers and **cannot search by mobile** (filter then matches nobody).
* Duplicate Haribhagats: warn (same normalised name+father+surname+gam, or same mobile), never auto-merge.
* Events/disks/users are **deactivated, never deleted**. Dropdown sources: `listActiveEvents`, `listActiveDisks` (+ `…ForSelect` to keep an inactive current value). Never hardcode options.
* Tests that touch the DB TRUNCATE all tables → only against a dedicated `TEST_DATABASE_URL`. On Supabase the transaction pooler (port 6543) ignores the database name — use a direct (5432) URL.
* Secrets only in `.env` (git-ignored). Never log passwords/tokens; audit log metadata must not contain secrets.
* Native `<select>` lists are styled with `appearance: base-select` (Chromium/Edge 135+) via the `ui-select` class; other browsers keep the native list.

## Keep the docs true
When behaviour changes, update `docs/` and this file in the same change.

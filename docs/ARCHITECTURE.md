# Architecture

## 1. The big idea

```
   USB disks (originals)            Staff computer                         VPS (organisation)
 ┌───────────────────────┐   ┌────────────────────────────┐        ┌───────────────────────────────┐
 │ HDD-001  HDD-002 …    │──►│ indexer/cli.mjs            │─HTTPS─►│ Next.js app  ──►  PostgreSQL  │
 │ 2019/March/IMG_1.jpg  │   │  scan · init-disk · agent  │ Bearer │  /api/indexer/*   metadata    │
 └───────────────────────┘   │  agent listens 127.0.0.1   │ token  │  pages, server actions        │
          ▲                  └─────────────▲──────────────┘        │  thumbnails folder            │
          │ streams file                   │ redirect + 60 s grant └───────────────▲───────────────┘
          └────────────────────────────────┘                                       │ browser (staff)
                          "Open original"                                           └── search, edit, review
```

* The **VPS can never read a USB disk** plugged into another computer. So a small **local indexer** runs where the disk is,
  reads the files, and *pushes metadata* to the server. The server's knowledge of "connected" comes only from the indexer's heartbeat.
* The database stores **metadata + `(hard disk, relative path)`**, never image bytes. Small JPEG thumbnails (≤256 KB) are uploaded by the indexer
  and cached in `THUMBNAIL_DIR` (never next to the originals).
* Photos are found by **Visit** (event + date + place + Haribhagats). Freshly indexed photos have no visit → they are **"Needs review"** until staff link them.

## 2. Layers (web app)

```
src/app/**          Pages (server components), route handlers, loading/not-found/layout
src/actions/*.js    Server actions: authorize → parse FormData → call a service → revalidate / redirect   ("use server")
src/lib/services/*  Business rules + Prisma queries + zod validation + audit log.  Return result objects.
src/lib/*.js        Pure helpers (normalize, paths, availability, permissions, format, labels, rate-limit …)
src/lib/auth/*      Session cookie (JWT), password hashing, Data Access Layer (who is the current user?)
src/components/*    React components. `ui/` = design primitives, others = feature components
src/proxy.js        Next 16 "proxy" (ex-middleware): cheap cookie-exists gate only
```

Rules of the layering:

1. **Pages/actions never talk to Prisma directly for writes** — they call a service. (Read-only dashboards may call services that read.)
2. **Services take the acting user explicitly** (`createEvent(actor, input)`) so they are testable without Next.js request context.
3. **Services return `{ ok: true, … }` or `{ ok: false, error, fieldErrors, … }`** (see `src/lib/result.js`). Only the indexer service throws `ApiError(status, code, message)`
   which `src/lib/indexer-api.js` converts to JSON.
4. **Authorization is enforced server-side** by `requireUser()`, `requireAdminPage()`, `requirePermission('x.y')` (DAL). The matrix is in `src/lib/permissions.js`.

## 3. Authentication & authorization

* Login (`src/actions/auth.js`) → `services/users.authenticate()` (argon2id; identical generic error for unknown e-mail / wrong password / inactive user;
  a dummy hash is verified for unknown e-mails to equalise timing) → `createSession()`.
* Session = HS256 JWT in cookie `gpa_session` (`HttpOnly`, `SameSite=Lax`, `Secure` in production, 8 h). Claims: `sub` (user id), `pv` (fingerprint of the password hash), audience `gpa:session`.
* **Every request** `getCurrentUser()` (DAL, `React.cache`-d per request) verifies the JWT **and reloads the user from the database**. It returns `null` if the user is inactive or if `pv` no longer matches
  ⇒ deactivating a user or changing a password logs the old sessions out immediately.
* Roles: `ADMIN` (everything), `STAFF` (search; create/edit people, visits, photo notes; view scans/disks/events). Admin-only: events, disks, users, indexer tokens, settings/audit log. Matrix: `PERMISSIONS` in `src/lib/permissions.js`.
* Login throttling: 5 failures / 15 min per (IP + e-mail) and 30 / 15 min per IP, in memory (`src/lib/rate-limit.js`; single-server assumption).
* "Open original" grants are separate JWTs (audience `gpa:open-original`, 60 s) — they can't be used as sessions and vice-versa.
* Indexer authentication: **bearer tokens** (`gpa_…`, 256-bit random). Only the SHA-256 hash is stored (`IndexerToken`); tokens are revocable and rate-limited (1200 req/min/token).
* `src/proxy.js` only redirects anonymous visitors early (and answers 401 JSON for `/api/*`); public: `/login`, `/api/health`, `/api/indexer/*` (they do their own bearer check).

## 4. Rendering model (Next.js 16 "Cache Components")

* `cacheComponents: true`. Everything private is **dynamic** and streams: `src/app/(app)/layout.js` renders `<Suspense fallback><AppShell>{children}</AppShell></Suspense>`
  where `AppShell` (async server component) calls `requireUser()`; `(app)/loading.js` provides per-navigation skeletons.
* The dev-time "instant navigation" validation is off for the private area (it can never be static): `next.config.mjs` sets `experimental.instantInsights.validationLevel: "manual-warning"`
  (only segments with an explicit `instant` export are validated; by default every page counts as `instant = true`), and `(app)/layout.js` exports `instant = false`
  (the layout's `false` does **not** cover its child pages — the config does).
* Pages read `params` / `searchParams` as Promises (`await`). Search state lives in the URL (shareable, back-button friendly).
* Route handlers: `/api/health` calls `await connection()`; handlers reading `request.headers` are automatically dynamic. Catch blocks call `unstable_rethrow(error)` so Next's control-flow errors aren't swallowed.
* Security headers are set globally in `next.config.mjs` (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy`); `poweredByHeader: false`.

## 5. Forms and server actions

* Client form wrapper: `src/components/ui/form.jsx` → `ActionForm` (uses `useActionState`, but submits via `startTransition(() => formAction(new FormData(form, submitter)))` so
  React 19 does **not** reset the inputs after a validation error). `Field` shows the label + `fieldErrors[name]`; `SubmitButton` shows a spinner while pending.
* Action results: `{ok:true, message?, …}` or `{ok:false, error, fieldErrors, duplicates?, values?}`. `redirect()` is used on success where a new page is shown.
* Toggle buttons (activate/deactivate) are plain `<form action={serverAction}>` with hidden inputs.
* `runAction()` (`src/lib/action.js`) converts `ForbiddenError` into a result and logs unexpected errors server-side only.

## 6. Search (`src/lib/services/search.js`)

* `parseSearchParams(raw)` → typed filters (invalid values dropped, page capped at 5000). `filtersToParams()` rebuilds URL params for pagination links.
* `buildPhotoWhere(filters, {allowMobile})`:
  * person fields (name, father, surname, gam, taluko, jillo, pincode, mobile) all apply to the **same** Haribhagat of the visit (`visit.haribhagats.some.haribhagat AND …`);
  * quick box `q`: every word must match *something* (any person of the visit, file name or relative path);
  * date range: `visit.visitDate`, **or** `exifDateTime` for photos that have no visit; end date inclusive;
  * event, place type, disk, person id, availability, "needs review" (`visitId = null`), folder (exact or sub-folders);
  * partial + case-insensitive (`contains`, `mode: insensitive`), Gujarati and English.
* `pagePhotos(where, skip, take)`: linked photos first (visit date desc), then needs-review photos (EXIF date desc) — implemented as two queries sliced like one list (Prisma can't `NULLS LAST` on relations). Page size 24.
* Each result gets `availabilityInfo = describeAvailability(photo, disk, TTL)` (`src/lib/availability.js`).

## 7. Availability rule (never claim what we don't know)

| Photo `availability` | Disk reported within TTL? | Result |
|---|---|---|
| `MISSING` | any | **MISSING** – "File not found on HDD-00X during the last scan" |
| any other | no | **DISCONNECTED** – "Connect HDD-00X to access the original file." |
| `UNKNOWN` | yes | **UNVERIFIED** (never confirmed by a scan) – cannot open |
| `AVAILABLE` | yes | **CONNECTED** – can open |

TTL = `HEARTBEAT_TTL_SECONDS` (default 180 s). A disk is "reported" by: agent heartbeat (every 30 s), scan start/progress/finish, `bind`.

## 8. The indexing protocol in one page (details: [INDEXER.md](INDEXER.md), [API.md](API.md))

```
init-disk   GET  /disks → POST /disks/bind {label, diskId}  (+ writes <disk>/.guruji-disk.json {label, diskId})
scan        POST /scans {label, diskId, isDryRun, scanPath}                      → scanId   (closes stalled RUNNING scans; refuses a 2nd concurrent real scan)
 per 200    POST /scans/:id/precheck {files:[{relativePath,size,mtimeMs}]}        → needed[] + counts   (unchanged files are stamped "seen" here; dry-run only counts)
 files      POST /scans/:id/files    {files:[{…,hash,format,exifDateTime}]}       → results[{id,thumbnailNeeded}]   (idempotent upsert by (disk, relativePath))
            PUT  /thumbnails/:photoId  (JPEG ≤ 256 KB)
 end        POST /scans/:id/finish {status, traversalComplete, errors…}           → files not seen ⇒ MISSING (only if the whole traversal was readable and ≥1 file was seen; only inside scanPath)
agent       POST /heartbeat {disks:[{label,diskId}]} every 30 s;  POST /grants/verify {grant} when the browser opens an original
```

Design properties: **idempotent** (re-run = no duplicates, cheap for unchanged files, also how an interrupted scan "resumes"); **non-destructive** (records are never deleted, only flagged);
**identity-checked** (label + marker id must match what the server has bound, so a wrong disk behind the right sticker is refused); **bounded** (200 files/request, body ≤ 2 MB, thumbnail ≤ 256 KB).

Fingerprint = `sha256("size:N;" + first 64 KB + last 64 KB)` (whole file if ≤128 KB). Fast on terabytes; detects edits/replacements; **not** a full-content hash. Same content on two disks = two legitimate records.

## 9. File map (what lives where)

### Web app — `src/`
```
proxy.js                                 cookie-exists gate (public: /login, /api/health, /api/indexer/*)
app/layout.js globals.css not-found.js page.js    root layout (fonts Geist + Noto Sans Gujarati), design tokens, 404, "/" → /dashboard
app/(auth)/login/                        login page + client form
app/(app)/layout.js loading.js           authenticated area: Suspense + AppShell, skeleton
app/(app)/dashboard|search|review|visits|haribhagats|events|hard-disks|scans|users|settings|account|photos/[id]
app/api/health                           GET public health (DB ping)
app/api/photos/[id]/thumbnail|open       session-protected thumbnail bytes / redirect to local agent with grant
app/api/indexer/**                       bearer-token protocol (see API.md)
actions/{auth,haribhagats,events,disks,visits,photos,users,tokens}.js
lib/services/{haribhagats,person-filters,events,disks,visits,photos,search,scans,dashboard,indexer,tokens,users,audit}.js
lib/auth/{session,jwt,password,dal}.js
lib/{env,db,result,validation,normalize,paths,format,availability,permissions,rate-limit,labels,ui-labels,
     thumbnails,indexer-api,request,action}.js
components/{app-shell,app-frame,page-skeleton,photo-card,search-form,haribhagat-form,haribhagat-picker,visit-form,
            copy-button,select-all,auto-refresh}.jsx   +   ui/{button,inputs,form,card,badge,alert,table,pagination}.jsx
```

### Other top-level
```
prisma/schema.prisma  migrations/  seed.mjs         database
indexer/cli.mjs  lib/{api,config,drives,exif,fingerprint,marker,paths,scan,thumbnail,util,walk,agent}.mjs     local indexer + agent (own package.json)
scripts/create-token.mjs  make-sample-disk.mjs      ops/dev helpers
tests/{unit,integration,e2e}  setup.js  stubs/      see TESTING.md
docs/                                                you are here
```

## 10. Error handling & logging

* User-facing errors are short messages in `fieldErrors` / `error`; unexpected exceptions are `console.error`-ed on the server and shown as "Something went wrong".
* The indexer API returns `{error: CODE, message}` with proper HTTP status (400/401/404/409/413/415/429/500).
* Audit log (`AuditLog`): login/logout, create/update/deactivate of people, events, disks, visits, users, tokens, disk bind/unbind, password changes. **Never** passwords/tokens/PII beyond names/e-mail.
* No secrets in logs; the health endpoint only says `ok` / `database_unreachable`.

## 11. Internationalisation

UI labels are English only. Add keys in `src/lib/labels.js`; use `t(key)`. Data (names, villages) is stored in whatever script users type (NFC-normalised); search is `ILIKE` so Gujarati and English both work.
Fonts: Geist (Latin) + Noto Sans Gujarati (via `next/font/google`, downloaded at build time).

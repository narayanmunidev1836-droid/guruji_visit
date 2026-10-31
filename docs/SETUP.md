# Setup (developer computer)

## 1. Requirements
| Tool | Version | Notes |
|---|---|---|
| Node.js | **≥ 22.13** (24 LTS recommended) | Prisma 7 refuses older Node (`Prisma only supports Node.js versions 20.19+, 22.12+, 24.0+` – and the toolchain wants ≥ 22.13). `engines` in `package.json` says `>=22.13.0`. |
| npm | 10+ | comes with Node |
| PostgreSQL | 15+ (tested with **18.4**) | local install, Docker, or the options in §3 |
| Git | any | |

**Upgrading Node on Windows** (the original dev machine had 22.11.0): `nvm install 24 && nvm use 24` (nvm-windows) or `winget install OpenJS.NodeJS.LTS`, or download from nodejs.org.
Without touching the global Node you can also unzip a portable Node 24 and put it first on `PATH` for the terminal session:
```powershell
$env:PATH = "C:\tools\node-v24.22.0-win-x64;$env:PATH"; node -v
```

## 2. Install
```bash
npm install                 # web app (also generates nothing yet)
npx prisma generate         # creates the Prisma client (run again after schema changes)
cd indexer && npm install   # only on the computer that will run the indexer / for E2E tests
```
> npm 11 prints `install-scripts … not yet covered by allowScripts` for `prisma`, `@prisma/engines`, `unrs-resolver`. The app still works; `prisma generate` / `migrate` download what they need on first use.

## 3. A PostgreSQL database (pick one)
* **Installed PostgreSQL / Docker (recommended):**
  ```sql
  CREATE ROLE guruji LOGIN PASSWORD '…';
  CREATE DATABASE guruji_archive OWNER guruji ENCODING 'UTF8';
  ```
  `DATABASE_URL="postgresql://guruji:…@localhost:5432/guruji_archive"`
* **No install available — Prisma's embedded server (quick, but NOT stable under load):**
  ```bash
  npx prisma dev -d -n guruji        # prints the TCP url, e.g. postgres://postgres:postgres@localhost:51214/template1?sslmode=disable
  ```
  Put that URL in `DATABASE_URL`. For `prisma migrate dev` it also needs `SHADOW_DATABASE_URL` pointing at the *shadow* port (db port + 1) — `migrate deploy` doesn't.
  During development we saw this server drop connections ("Server has closed the connection", Prisma `P1017`) under test load, so use a real PostgreSQL for E2E tests and production.
* **Real PostgreSQL without an installer (Windows/macOS/Linux, npm):** `npm i embedded-postgres` in a scratch folder runs genuine PostgreSQL binaries (`initdb`, `pg_ctl`); this is what the E2E run in this repo used (PostgreSQL 18.4, port 54329).

## 4. Configure
```bash
cp .env.example .env
```
Edit `.env` (all variables are documented in the file; validated by `src/lib/env.js`):
`DATABASE_URL`, `SESSION_SECRET` (≥32 random chars: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`), optional `THUMBNAIL_DIR`, `MOBILE_VISIBLE_ROLES`, `HEARTBEAT_TTL_SECONDS`, `LOCAL_AGENT_URL`, `MEMBER_API_URL` / `MEMBER_API_KEY` / `MEMBER_API_ORIGIN` (Members directory searched in "Select Member"; without the key only saved Members are searched; `MEMBER_API_ORIGIN` = the domain the API owner whitelisted for the site, change it when the site moves to a new domain / VPS; on Vercel add them under Environment Variables).
`.env` is git-ignored — never commit it.
**Hosted DB (e.g. Supabase):** use the transaction-mode pooler (port 6543, `?pgbouncer=true`) as `DATABASE_URL` for the app and the session-mode/direct URL (port 5432) as `DIRECT_URL` — the Prisma CLI (`prisma.config.js`) prefers `DIRECT_URL`, because migrations do not work through a transaction pooler. Special characters in the password must be URL-encoded (`@` → `%40`).

## 5. Create tables and first data
```bash
npm run db:deploy                                   # applies prisma/migrations (use this on every environment)
SEED_ADMIN_EMAIL=you@example.org SEED_ADMIN_PASSWORD='a long password' npm run db:seed
npm run db:seed -- --demo                           # optional: SYNTHETIC people/disks/photos for trying the UI (refuses in production)
```
The seed creates the administrator and the starter events. **Fixed login:** put `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` in `.env` — the admin is created with exactly those (login = the e-mail), and re-running the seed re-sets that admin's password to the `.env` value. Without `SEED_ADMIN_PASSWORD`, an admin is created only if none exists and a generated password is printed once. The seed needs to run **once per database** (users live in PostgreSQL); it is not part of `dev`/`start`. The starter events *Pathramani, Vichran, Sabha, Utsav* (confirm the real names with the organisation, then edit them under *Events*).
Safe to re-run.

## 6. Run
```bash
npm run dev                  # http://localhost:3000   (Turbopack; first page compile is slow, then fast)
npm run build && npm start   # production mode (what E2E tests use)
```
Log in with the seeded administrator, then:
1. *Settings* → create an indexer token. 2. *Hard Disks* → register a disk. 3. Use the indexer ([INDEXER.md](INDEXER.md)). 4. *Needs review* → create visits.

Try the indexer without real photos: `node scripts/make-sample-disk.mjs ./sample-disk 12` then `init-disk` / `scan` on that folder.

## 7. Common problems
| Problem | Fix |
|---|---|
| `Invalid environment configuration: …` | fill `.env` (message names the variable) |
| `Prisma only supports Node.js versions …` | upgrade Node (see §1) |
| `P1001 / ECONNREFUSED` | PostgreSQL not running / wrong `DATABASE_URL` |
| `P3006 … type "Role" already exists` with `migrate dev` on embedded server | shadow DB = main DB; set `SHADOW_DATABASE_URL` or use a real PostgreSQL |
| Gujarati shows as boxes | fonts load from Google at build time; ensure the build machine has internet, or self-host the font |
| Port 4599 busy | set `GURUJI_AGENT_PORT` for the indexer and `LOCAL_AGENT_URL` for the server |
| `next dev` shows red overlay / terminal error "uncached data … Suspense" (`blocking-prerender-dynamic`) | implicit per-page validation is disabled in `next.config.mjs` (`instantInsights.validationLevel: "manual-warning"`) — **restart `npm run dev`** after changing the config; keep new pages under `src/app/(app)/` |

## 8. Resetting a *development* database
Prefer creating a fresh database over dropping the old one. With a real PostgreSQL: `DROP DATABASE guruji_dev; CREATE DATABASE guruji_dev;` then `npm run db:deploy && npm run db:seed`.
(`prisma migrate reset` is blocked by Prisma when it detects an AI agent — that guard is intentional; never run it against data you care about.)

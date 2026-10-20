# Guruji Photo Archive

A private, searchable archive for Guruji's Pathramani, Vichran and other event photographs.
The **original photos stay on the USB hard disks**; this web app stores only searchable metadata and the exact
location of every photo (**hard disk sticker label + relative path**), so anyone can answer
*"which disk do I connect, and where is the photo on it?"* in seconds.

| | |
|---|---|
| Web app | Next.js 16 (App Router, Turbopack, Cache Components) · React 19 · Tailwind CSS 4 · JavaScript |
| Database | PostgreSQL via Prisma 7 (driver adapter `pg`) |
| Login | Email + password (argon2id), signed session cookie, roles `ADMIN` / `STAFF` |
| Local indexer | Separate Node tool in [`indexer/`](indexer) that runs on the computer where the disks are plugged in |
| Tests | Vitest (unit + DB integration) · Playwright (end-to-end, real browser + real indexer) |

## Start here

* **New to the project / an AI assistant?** Read [`CLAUDE.md`](CLAUDE.md) — one page with the map of the code, flows and rules — then the matching file in [`docs/`](docs/README.md). You should not need to read the whole code base.
* **Install and run it:** [`docs/SETUP.md`](docs/SETUP.md)
* **Daily use by staff:** [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
* **Index the USB disks:** [`docs/INDEXER.md`](docs/INDEXER.md)
* **Put it on the VPS:** [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
* **What is built / not built yet:** [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)

## Quick start (development)

```bash
# Node 22.13+ (24 LTS recommended) is required by Prisma 7
npm install
cp .env.example .env            # then set DATABASE_URL and SESSION_SECRET
npx prisma dev -d -n guruji     # optional: embedded local PostgreSQL, no install needed (see docs/SETUP.md)
npm run db:deploy               # create the tables
npm run db:seed -- --demo       # admin user, starter events and SYNTHETIC demo data
npm run dev                     # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (no database needed) |
| `npm run test:integration` | Database tests (needs `TEST_DATABASE_URL`, see [docs/TESTING.md](docs/TESTING.md)) |
| `npm run test:e2e` | Browser tests (needs a running app, see docs/TESTING.md) |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma helpers |
| `node scripts/create-token.mjs "Office PC"` | Create an indexer token from the command line |
| `node scripts/make-sample-disk.mjs <folder>` | Create a synthetic test "disk" |

## Safety principles

* The indexer **never moves, renames or deletes** original photos. The only file it writes to a disk is a tiny identity marker `.guruji-disk.json`.
* The website **never reads a USB disk itself**. It only knows what the indexer reported; if a disk is not connected the UI says *"Connect HDD-002 to access the original file"*.
* No absolute or drive-letter paths are stored — only paths relative to the disk root.
* No facial recognition or other biometric processing (needs organisational approval first).

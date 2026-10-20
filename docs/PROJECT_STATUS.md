# Project status

Last updated: 2026-10-18 · Version 0.1.0 (first usable release / MVP) · Tracks the original *Project Plan* (§ numbers refer to it).

**Summary:** all six phases of the plan are implemented and verified on a development machine with synthetic data. What is **not** done is operational: deploying on the real VPS, restoring a real backup there, running the pilot on a real disk,
and the organisation's answers to the open decisions ([DECISIONS.md](DECISIONS.md)).

## Requirement traceability

Legend: ✅ done & tested · 🟡 done with a stated limitation · ⬜ not done (out of MVP / needs a decision)

### §2 Acceptance criteria
| Criterion | Status | Where | Evidence |
|---|---|---|---|
| Search by name, surname, village, date range, event, hard disk | ✅ | `services/search.js`, `/search` | integration `search`, E2E `search` |
| Results show metadata, disk label, relative path, thumbnail | ✅ | `components/photo-card.jsx` | E2E `workflow`, `search` |
| Never claims "available" for a disconnected disk / missing file | ✅ | `lib/availability.js` | unit `availability`, integration `search`, E2E `search`/`workflow` |
| Event & disk dropdowns come from active DB records | ✅ | `listActiveEvents`, `listActiveDisks` | integration `catalog`, E2E `master-data` (this found and fixed an `isActive` bug) |
| Adding an event / registering a disk updates the dropdown | ✅ | | E2E `master-data` |
| Re-scan creates no duplicates | ✅ | unique `(hardDiskId, relativePath)`, idempotent upsert | integration `indexer` (+ retry of the same batch), E2E `workflow` |
| Originals never moved/renamed/deleted by indexing | ✅ | indexer is read-only; only `.guruji-disk.json` is written | E2E `workflow` compares every original's path/size/mtime before vs after; indexer unit tests |
| Contact info restricted to authorised users | ✅ | `MOBILE_VISIBLE_ROLES`, masking, no search by masked field | unit, integration `haribhagats`/`search` |

### §4 Modules
| Module | Status | Notes |
|---|---|---|
| 4.1 Auth & roles (login/logout, ADMIN/STAFF, server-side checks, hashing, sessions, login rate limit, audit log) | ✅ | argon2id, JWT cookie + DB check per request, immediate lock-out on deactivate/password change |
| 4.2 Dashboard (total photos, disks, connected status, last scan & errors, recent records, quick search) | ✅ | `/dashboard` |
| 4.3 Haribhagat directory (all 8 fields, CRUD, search, normalisation, validation, duplicate warning, strings for mobile/pincode, Gujarati) | ✅ | no delete by design (plan: create/view/edit/search) |
| 4.4 Event master (add/edit/activate/deactivate, DB-driven dropdown, never delete) | ✅ | starter names are seed data to confirm |
| 4.5 Hard disk master (unique label, description, stable identifier, active, last seen/scan, connection status, notes, rename keeps id) | ✅ | + optional serial number, "unlink physical disk" |
| 4.6 Photo/visit records (required + recommended fields; many photos per visit; many Haribhagats per visit) | ✅ | people are linked at **visit** level (decision documented) |
| 4.7 Search & results (all filters incl. pincode, mobile, place type; partial, Gujarati/English; pagination; indexes; actions: details / open / copy path / edit) | ✅ | page size 24, offset capped |
| 4.8 Local indexer (all 12 points; preview/confirm before first scan; batches + retries; heartbeat) | ✅ | "resumable" = idempotent re-run (no checkpoint file); HEIC indexed without thumbnail |
| VPS cannot read USB → local agent for opening originals | 🟡 | works on the staff computer running the agent; remote opening is an open decision (#4) |

### §5–§7 Model, pages, workflows
| Item | Status |
|---|---|
| §5 Prisma models (User, Haribhagat, Event, HardDisk, Visit, VisitHaribhagat, Photo, ScanJob, AuditLog) + `IndexerToken` | ✅ |
| §6 Pages: `/login /dashboard /search /photos/[id] /haribhagats /haribhagats/new /haribhagats/[id]/edit /events /hard-disks /scans /users /settings` | ✅ (+ `/review /visits /visits/new /visits/[id] /hard-disks/[id] /scans/[id] /haribhagats/[id] /account`) |
| §6 desktop-first + compact mobile layout; English-only labels | ✅ (Gujarati UI text removed 2026-10-20) |
| §7 Workflows A (register disk) · B (add event) · C (visit + photos) · D (find old photo, clear disconnected message) | ✅ E2E `workflow`, `master-data`, `search` |

### §8 Import & migration
| Item | Status |
|---|---|
| Read-only inventory, no renaming of folders, dry-run report, scan logs, retry/resume, relative paths preserved, no names from file names, EXIF as suggestion, "Needs review", duplicates via hash allowed across disks | ✅ |
| Advanced duplicate review / moved-file detection by fingerprint | ⬜ (explicitly later) |
| "Test a full restore of the PostgreSQL backup before production" | ⬜ procedure written ([OPERATIONS.md](OPERATIONS.md#restore-a-backup)); must be exercised on the real VPS |

### §9 Security / §11 Operations
| Item | Status |
|---|---|
| Login everywhere, server-side RBAC, validation, parameterised queries, secrets in env, no absolute paths exposed, rate limits, audit, no biometrics | ✅ ([SECURITY.md](SECURITY.md)) |
| HTTPS, firewall, DB not public, backups, monitoring, health check | 🟡 documented ([DEPLOYMENT.md](DEPLOYMENT.md)) + `/api/health`; **not yet performed on a VPS** |
| Structured error logs | 🟡 plain `console.error` lines (journald) rather than JSON |
| CSP header, 2-factor auth | ⬜ recommended later |

### §10 Testing plan
| Plan item | Status | Where |
|---|---|---|
| Unit: validation, active-only dropdowns, unique disk label, duplicate warning, path normalisation, search combinations, hash/duplicate handling | ✅ | unit + integration |
| Integration: CRUD, dropdown updates, visit/photo relationships, multi-disk search, indexer auth & batches, repeated scan, disconnected/missing handling, role restrictions | ✅ | integration + E2E `roles` |
| E2E: login → register disk → scan sample → search; add event → create record → find; search by surname/village/date; open when connected; disconnected messaging; responsive | ✅ | Playwright (Chromium only) |

### §12 Phases
1 Foundation ✅ · 2 Master data + people ✅ · 3 Visits/photos/search ✅ · 4 Local indexer ✅ · 5 Thumbnails + availability + secure local file access ✅ · 6 Tests, security review, responsive UI, docs ✅ (production deployment + pilot pending).

## Test evidence
Run on 2026-10-18, Windows 11, Node 24.22, PostgreSQL 18.4 (real), Chromium (Playwright 1.64).

| Suite | Result |
|---|---|
| `npm run lint` | clean |
| `npm run build` | OK (all routes compile; private pages are Partial-Prerender shells) |
| Unit (`npm test`) | 106 passed |
| Integration (`npm run test:integration`) | 116 passed |
| Indexer (`cd indexer && npm test`) | 11 passed |
| End-to-end (`npm run test:e2e`) | 38 passed, 2 skipped (the optional screenshot spec) — production build + real PostgreSQL + real indexer CLI/agent |

Defects found *by these tests* during development (all fixed, listed so the same mistakes are not repeated): relation `orderBy` with `nulls` unsupported (search crashed) · sub-folder missing-file detection overwrote an `OR` and flagged files outside the folder ·
zod 4 `z.any()` rejects missing keys (would have broken editing for masked-mobile roles) · event dropdown rows lacked `isActive` (all labelled "inactive") · form submit before hydration fell back to a native GET (would put the login password in the URL) — submit buttons now stay disabled until hydrated ·
duplicate warning text shown twice.

## Known limitations / ideas for the next iteration
* **Opening originals remotely** — only on the computer running the agent (decision #4).
* HEIC/HEIF: indexed (EXIF date) but no thumbnail; browsers can't display them (download instead).
* Visit page shows the first 60 photos; no per-photo person tagging; no CSV export; audit log has no filter; no "log out everywhere".
* Moved/renamed folders appear as new photos + old ones MISSING (no automatic re-linking by fingerprint).
* Fingerprint is partial (size + first/last 64 KB): an edit inside the middle of a large file with identical size is not detected (documented trade-off).
* Rate limiter is in-process memory (fine for one VPS).
* The indexer needs Node ≥ 20.19 and `npm install` on the staff PC; packaging as a single installer/exe is a future option.
* macOS/Linux drive discovery implemented but only Windows exercised; Firefox/Safari not tested.
* Search uses `ILIKE`; add `pg_trgm` indexes if the archive grows to millions of photos.
* Gujarati labels (`src/lib/labels.js`) were written by the developer — please have a Gujarati speaker review them.

## Development environment notes (this repository's history)
* The development machine had Node 22.11 (too old for Prisma 7) and no PostgreSQL/Docker; a portable Node 24 and the npm package `embedded-postgres` (real PostgreSQL 18 binaries) were used for verification. `.env` therefore pointed at a temporary local database — set your own `DATABASE_URL` ([SETUP.md](SETUP.md)).
* Prisma's embedded `prisma dev` server dropped connections under test load (`P1017`); do not use it for E2E/production.

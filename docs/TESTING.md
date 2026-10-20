# Testing

Three layers. All use **synthetic data only** — never real people or real photographs.

The local indexer package has its own small suite (`cd indexer && npm test`, Node's built-in runner): walking rules, fingerprint, EXIF, thumbnails, marker file, path safety.

| Layer | Tool | Needs | Command | What it covers |
|---|---|---|---|---|
| Unit | Vitest | nothing | `npm test` | pure logic: normalisation, paths (+ parity with the indexer), availability rule, permissions, rate limiter, formatting, zod validation, search filter builders, JWT/token/password helpers |
| Integration | Vitest + real PostgreSQL | `TEST_DATABASE_URL` | `TEST_DATABASE_URL=… npm run test:integration` | services against a real database: dropdowns, uniqueness, duplicates, search combinations, visits, indexer protocol (idempotency, missing files, dry run, identity), users, tokens, indexer HTTP routes |
| End-to-end | Playwright (Chromium) | running app + database + demo seed | `E2E_BASE_URL=http://localhost:3101 npm run test:e2e` | real browser, real indexer CLI and agent against a generated disk |

Run **lint** too: `npm run lint`. Build check: `npm run build`.

## Unit tests (`tests/unit/*.test.js`)
No database or Next.js runtime. `tests/setup.js` sets fake env values; `vitest.config.js` aliases `@` → `src` and stubs `server-only`.
`paths.test.js` also imports `indexer/lib/paths.mjs` and asserts both implementations give identical results for a corpus (traversal, absolute, drive letters, NUL, Gujarati …).

## Integration tests (`tests/integration/*.test.js`)
* They **TRUNCATE every table before each test**. They run only when `TEST_DATABASE_URL` is set and refuse to run if it equals the `DATABASE_URL` in `.env` (see `helpers.js`).
* Create a throw-away database and apply migrations to it:
  ```bash
  createdb guruji_test               # or CREATE DATABASE guruji_test; (UTF8)
  DATABASE_URL=postgres://…/guruji_test npx prisma migrate deploy
  TEST_DATABASE_URL=postgres://…/guruji_test npm run test:integration
  ```
* Files run sequentially (`fileParallelism: false`). With a real PostgreSQL the whole suite takes ≈ 40 s; the embedded `prisma dev` server works but is 3× slower and was flaky.
* Style: call services directly with an explicit `actor`; route handlers (`indexer-api.test.js`) are invoked with real `Request` objects — no HTTP server needed.
* Thumbnail tests write into a temp directory (`THUMBNAIL_DIR` is overridden per file).

## End-to-end tests (`tests/e2e/*.spec.js`)
Prerequisites: a **production build** is recommended (`npm run build && npm start -- -p 3101`), a real PostgreSQL, the seed with demo data (`npm run db:seed -- --demo`; admin from `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`, default `admin@example.org` / `ChangeMe-Dev-2026`), `cd indexer && npm install`, and Chromium (`npx playwright install chromium`).
The specs create uniquely named records (they leave harmless synthetic rows; the workflow test deactivates its disk at the end) — use a development database.

| Spec | Verifies |
|---|---|
| `auth` | anonymous redirects, 401 on private APIs, generic login errors, login/logout, cookie flags, rate limiting, password change logs out other sessions |
| `master-data` | event & disk dropdowns follow add / deactivate / re-activate; unique names/labels (case-insensitive); search filter dropdowns come from the DB |
| `haribhagat` | create with all fields, normalised mobile (stored as text), search by several fields, edit, duplicate warning + "Save anyway", validation messages, Gujarati |
| `workflow` | **login → register disk → create token → init disk → dry run → scan → re-scan (no duplicates) → review → create visit for a folder → search shows disk/path/thumbnail → agent makes disk "Connected" → open-original grant streams the JPEG → missing file flagged and recovered** (real CLI, real agent) |
| `search` | surname/Gujarati/event/disk/date filters on demo data, "Connect HDD-002…" message for a disconnected disk, empty state, needs-review, copy path, photo details |
| `roles` | staff can't see/open admin pages or admin forms; deactivated user locked out immediately |
| `responsive` | no horizontal overflow on 9 pages at 390 px; mobile menu opens/closes |
| `security` | security headers, public health, indexer API needs a token, thumbnails/open need session and valid ids, no secret/path leaks, friendly 404 |
| `visual` | (optional) screenshots of every page: `E2E_SCREENSHOTS_DIR=./tmp/shots npx playwright test visual` |

Tips: the production server must stay alive for the whole run (start it in the same shell as the tests, or as a service). Playwright test files share the database, so run with one worker (configured). Failures keep `test-results/` (screenshot + trace: `npx playwright show-trace <zip>`).

## Latest verified results (development machine, 2026-10-18)
* `npm run lint` — clean · `npm run build` — OK
* Unit: **106** passing · Integration: **116** passing on PostgreSQL 18.4 (together 222 via `npx vitest run` with `TEST_DATABASE_URL` set) · Indexer package: **11** passing (`cd indexer && npm test`)
* End-to-end: **38** passing, 2 skipped (the optional `visual` spec) against a production build, real PostgreSQL, real indexer CLI and agent (≈ 2–4 min). Table also in [PROJECT_STATUS.md](PROJECT_STATUS.md#test-evidence).
* E2E notes: wait for a server action to finish (e.g. the row shows "Active") before navigating away, otherwise the navigation cancels it; slow machines may need the 20 s expect timeout already set in `playwright.config.js`.
* Not covered by automated tests: the VPS deployment procedure, restore of a production backup, HEIC handling, macOS/Linux drive discovery (code paths exist, only Windows was exercised), real-browser testing on Firefox/Safari.

## Writing new tests — rules of thumb
* Business rule? → integration test through the service. Pure function? → unit test. User-visible journey or browser-only behaviour (hydration, dropdowns, responsive) → Playwright.
* Never add real names/numbers. Use `unique()` helpers in `tests/e2e/helpers.js` so reruns don't collide (e.g. duplicate-mobile warnings).
* In Playwright exclude Next's empty `role="alert"` route announcer: use `alertBox(page)`.
* After changing the schema: new migration + update `helpers.js` TRUNCATE list if you add tables.

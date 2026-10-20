# Decisions

## A. Questions from the plan (§14) — answers used so far and how to change them

The plan said: *if a decision is not yet known, document a safe default and keep it configurable.*

| # | Question | Default implemented | Where to change |
|---|---|---|---|
| 1 | UI labels: Gujarati, English or bilingual? | **English only** (changed 2026-10-20). Gujarati text typed as data (names, villages) is still accepted and searchable. | add/edit words in `src/lib/labels.js` |
| 2 | One visit with several Haribhagats and many photographs? | **Yes.** `Visit` ⇢ many `VisitHaribhagat` (one primary) and many `Photo`. | `prisma/schema.prisma` |
| 3 | Indexing computer: Windows, macOS or both? | **Both** (and Linux): drive discovery per OS; paths normalised to `/`. Tested on Windows. | `indexer/lib/drives.mjs` |
| 4 | Open originals remotely, or is "which disk + path" enough for v1? | v1 = **identify disk and path** everywhere; **opening** works on the staff computer that runs the agent (`127.0.0.1`). Remote opening is a later option. | see §C |
| 5 | Manual metadata only, or import EXIF automatically? | **EXIF date imported automatically** as a *suggestion* (suggested visit date, fallback date in search). Nothing else is guessed (no names from file names); photos stay "Needs review" until staff link them. | `indexer/lib/exif.mjs` |
| 6 | Who may view mobile numbers / edit personal records? | `ADMIN` and `STAFF` view numbers; both may create/edit people. Others (none today) would see masked numbers. | `MOBILE_VISIBLE_ROLES`, `src/lib/permissions.js` |
| 7 | Approved backup location and recovery procedure? | **Not decided.** Procedure documented (nightly `pg_dump -Fc`, off-site copy, restore test). | fill in `docs/DEPLOYMENT.md#backups`; **ask the organisation** |

Also to confirm with the organisation: final **event names** (seed: Pathramani, Vichran, Sabha, Utsav), the sticker-label convention (e.g. `HDD-001`), who administers the system.

## B. Design decisions (and why)

| Decision | Why |
|---|---|
| **Originals never move; DB holds metadata + (disk label, relative path)** | Plan's core principle; no cloud upload needed; works with the existing disks |
| **Local indexer pushes to the server** (server never reads USB) | A VPS cannot see a USB disk on another PC; heartbeat tells the server what is connected |
| **Disk identity = sticker label + marker file id** (not drive letters) | Drive letters change; labels are human; the marker prevents scanning the wrong disk under the right sticker |
| **People linked to a *visit*, not each photo** | One event has many photos; link a whole folder in one step; no duplicated relationships |
| **Photos arrive unlinked ("Needs review")** | The plan forbids guessing names/events from file names |
| **Partial fingerprint (size + first/last 64 KB)** | Reading every byte of terabytes is impractical; enough for change/duplicate detection; documented as non-cryptographic |
| **`MISSING` instead of deleting** | Plan: never delete records automatically; a re-scan restores them |
| **Missing check only after a complete, readable traversal that saw ≥1 file** | Avoids mass false "missing" from a half-mounted or empty disk |
| **Availability computed from heartbeat age, not stored as a boolean** | Plan: never show "available" from an old record |
| **Two-step upload (precheck → files)** | Hash/EXIF/thumbnail only for new/changed files ⇒ cheap, idempotent re-scans and natural resume |
| **Custom auth (jose + argon2) instead of a library** | Only two roles + email/password; full control of session invalidation; no external provider; documented, tested |
| **JWT + DB check per request** | Stateless cookie but immediate deactivation/password-change effect |
| **Next 16 Cache Components on, instant-navigation validation set to `manual-warning`** | Uses the current framework model; private per-user data can't be static; skeletons via `loading.js` |
| **JavaScript, not TypeScript** | Plan requirement; zod validates data at runtime instead of compile-time types |
| **Prisma 7 with `prisma-client-js` generator** | The new `prisma-client` generator emits TypeScript; the classic generator keeps a pure-JS project |
| **Service layer with explicit `actor`** | Testable without Next request context; one place for rules |
| **Search via ILIKE + indexes, two-query ordering** | Simple and fast enough for the expected size; `pg_trgm` is the documented upgrade |
| **In-memory rate limiter** | Single VPS; no extra infrastructure |
| **Thumbnails stored on the server disk, keyed by photo id** | Fast previews without access to the USB disk; path never user-controlled |
| **Bilingual labels as a dictionary** | No i18n framework needed for one UI; trivially switchable |

## C. Options for opening originals remotely (not built; decision #4)
1. **VPN/Tailscale to the office PC** that runs the agent (set `LOCAL_AGENT_URL` per user is not supported today; would need a per-user agent URL).
2. **Copy selected originals to the server** on demand (needs server storage and an approval workflow).
3. **Object storage later** (S3-compatible) — plan: "only after the basic archive is reliable".
Until then staff are told exactly which disk and path to open.

## D. Explicitly out of scope for the first release (per plan)
AI tagging, face recognition (needs approval), advanced duplicate review (e.g. auto-detecting moved files by fingerprint), cloud photo storage, per-photo people tagging, CSV export of results.

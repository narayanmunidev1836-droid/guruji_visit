# Database

PostgreSQL, managed with **Prisma 7** (`prisma/schema.prisma`, migrations in `prisma/migrations/`, applied with `npm run db:deploy`; create new ones with `npm run db:migrate`).
Connection: `DATABASE_URL`; the app uses the `pg` driver adapter (`src/lib/db.js`). **No image bytes are stored** — only metadata and file locations.

## Entity diagram

```
User ──< Haribhagat (createdBy)        Event ──< Visit >── User (createdBy)
User ──< IndexerToken ──< ScanJob >── HardDisk ──< Photo >── Visit
User ──< ScanJob (startedBy)                         ScanJob ──< Photo (lastScan)
User ──< AuditLog
Visit >──< Haribhagat   via VisitHaribhagat(visitId, haribhagatId, isPrimary)
```

## Models

### User
`id, name, email (unique, lower-cased), passwordHash (argon2id), role (ADMIN|STAFF), isActive, createdAt, updatedAt`.
Never deleted — deactivate (`isActive=false`). A session stops working as soon as the user is inactive or the password changes.

### Haribhagat (person)
`id, name, fatherName?, surname, gam? (village), taluko?, jillo? (district), pincode? (string), mobileNo? (string), dupKey, createdById?, timestamps`.
* `name` + `surname` required; everything else optional (real data is incomplete). Text is trimmed/whitespace-collapsed/NFC-normalised.
* `pincode` (6 digits) and `mobileNo` (exactly 10 digits, starting 6-9) are **strings** (leading zeros preserved).
* `dupKey` = lower-cased `name|father|surname|gam`; used **only to warn** about possible duplicates (also compares name+surname[+father] case-insensitively and the mobile number). Never merges.
* Indexes: name, surname, gam, jillo, mobileNo, dupKey.

### Event (master data)
`id, name, nameKey (unique: lower-cased name), description?, isActive, timestamps`. Seed: Pathramani, Vichran, Sabha, Utsav (**to be confirmed** with the organisation). Deactivate, never delete (visits reference it with `onDelete: Restrict`).

### HardDisk (master data)
`id, labelName (sticker label, e.g. HDD-001), labelKey (unique: upper-cased label ⇒ case-insensitive uniqueness), description?, stableIdentifier? (unique), serialNumber?, notes?, isActive, lastSeenAt?, lastScanAt?, timestamps`.
* `stableIdentifier` = random UUID written by `init-disk` into `<disk>/.guruji-disk.json`; it identifies the **physical disk** regardless of drive letter. `null` until initialised. Admin can "Unlink" it (disk reformatted/replaced).
* `lastSeenAt` is the **only** source of "connected" (see availability rule). Renaming the label keeps `id` ⇒ all photos stay linked.

### Visit
`id, eventId (→Event, Restrict), visitDate (DATE), placeType? (HOME|OFFICE|TEMPLE|OTHER), notes?, createdById?, timestamps`. Indexes: visitDate, eventId.
A visit = "Guruji's Pathramani at Patel family's home on 14 Mar 2019". It has **many Haribhagats** and **many photos**.

### VisitHaribhagat (join)
`(visitId, haribhagatId)` primary key, `isPrimary`. Cascade on visit delete; `Restrict` on person (a person with visits can't be deleted).
**Design choice:** people are linked at the *visit* level (not per photo). Rationale: one visit = one event with several photos; avoids repeating the same relationship per photo; matches how staff work (link a folder).

### Photo
`id, visitId? (null ⇒ "Needs review"), hardDiskId (Restrict), relativePath, folderPath, originalFileName, format?, fileSizeBytes?, fileHash?, fileMtime?, exifDateTime?, thumbnailKey?, availability (UNKNOWN|AVAILABLE|MISSING), lastSeenAt?, lastScanId?, notes?, timestamps`.
* **Unique `(hardDiskId, relativePath)`** ⇒ re-scanning cannot create duplicates. Identical content on another disk is a separate, legitimate record.
* `relativePath` always uses `/`, is relative to the disk root, never absolute / drive letter / `..` (validated in `src/lib/paths.js` on the server **and** in the indexer).
* `folderPath` = directory part (for fast folder queries and the review page).
* `fileHash` = partial fingerprint (size + first/last 64 KB, SHA-256 hex). Used to detect changes, not as proof of identity.
* `exifDateTime` = camera wall-clock time stored as UTC **without zone conversion** (EXIF has no time zone; may be wrong — staff correct the *visit* date).
* `availability`: `UNKNOWN` never verified · `AVAILABLE` seen in the latest scan that covered it · `MISSING` not found in a later complete scan (record kept!).
* Indexes: visitId, fileHash, exifDateTime, `(hardDiskId, folderPath)`, availability.

### IndexerToken
`id, name, tokenHash (unique SHA-256), tokenPrefix (first 8 chars, for humans), createdById, lastUsedAt?, revokedAt?, createdAt`. Raw token shown once at creation.

### ScanJob
`id, hardDiskId, indexerTokenId?, startedById?, isDryRun, scanPath ('' = whole disk), status (RUNNING|COMPLETED|FAILED|CANCELLED), startedAt, lastActivityAt, finishedAt?, filesScanned, recordsCreated, recordsUpdated, recordsUnchanged, missingCount, errorsCount, errorSummary?`.
For a dry run, `recordsCreated/Updated` mean "would create / would update". A RUNNING scan with no activity for 10 min is shown as **STALLED** and closed as CANCELLED when the next real scan starts.

### AuditLog
`id, userId?, action ("disk.create", "user.update", …), entity, entityId?, meta (JSON, no secrets), createdAt`. Indexes: createdAt, `(entity, entityId)`.

## Enums
`Role {ADMIN, STAFF}` · `PlaceType {HOME, OFFICE, TEMPLE, OTHER}` · `Availability {UNKNOWN, AVAILABLE, MISSING}` · `ScanStatus {RUNNING, COMPLETED, FAILED, CANCELLED}`

## Referential rules (what can and cannot be deleted)

| Parent → child | On delete |
|---|---|
| Event → Visit | **Restrict** (deactivate events instead) |
| HardDisk → Photo / ScanJob | **Restrict** (deactivate disks instead) |
| Visit → VisitHaribhagat | Cascade (membership rows only) |
| Visit → Photo | **SetNull** (photo returns to "Needs review") |
| Haribhagat → VisitHaribhagat | **Restrict** |
| User → created records | SetNull (history kept, author forgotten) / Restrict for `IndexerToken.createdBy` |

The application has **no delete actions** for these entities; the constraints are a second line of defence.

## Search performance notes
Search uses `ILIKE '%term%'` (Prisma `contains` + `insensitive`) on small text columns, always paginated (24/page, offset capped). This is fine for hundreds of thousands of photos.
If the archive grows into the millions, add `pg_trgm` GIN indexes on `Haribhagat(name, surname, gam)` and `Photo(relativePath)` in a new migration (`CREATE EXTENSION pg_trgm; CREATE INDEX … USING gin (col gin_trgm_ops)`).
Collation: any UTF-8 database works; Gujarati has no letter case. Create the production DB with `ENCODING 'UTF8'`.

## Migrations & backups
* Migrations are plain SQL under `prisma/migrations/*/migration.sql`, committed to git. Deploy with `npx prisma migrate deploy` (never `migrate dev` on production).
* Backups: `pg_dump -Fc` nightly + restore test — see [DEPLOYMENT.md](DEPLOYMENT.md#backups) and [OPERATIONS.md](OPERATIONS.md#restore-a-backup).
* Thumbnails are *not* in the database; they are re-creatable (`indexer thumbnails`), so backing them up is optional.

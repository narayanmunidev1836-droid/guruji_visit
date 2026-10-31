# HTTP API, routes and server actions

## 1. Indexer API (`/api/indexer/*`) — for `indexer/cli.mjs`

* **Auth:** `Authorization: Bearer gpa_…` (token created by an admin in *Settings → Indexer tokens* or `node scripts/create-token.mjs "name"`). 401 if missing/invalid/revoked.
* **Format:** JSON in/out (`Cache-Control: no-store`), body ≤ 2 MB. Errors: `{ "error": "CODE", "message": "…" }`.
* **Limits:** 1200 requests/min/token (429), ≤ 200 files per batch, thumbnails ≤ 256 KB. Failed-auth attempts are throttled per IP (30/min).
* Implementation: `src/app/api/indexer/**/route.js` → `indexerRoute()` (`src/lib/indexer-api.js`) → `src/lib/services/indexer.js`. Protocol version: **1**.

Identity object used by several calls: `{ "labelName": "HDD-001", "stableIdentifier": "<uuid from the disk's .guruji-disk.json>" }`.

| Method & path | Body | Response / notes |
|---|---|---|
| `GET /me` | – | `{ tokenName, serverTime, protocolVersion, supportedExtensions, limits:{maxBatchFiles,maxThumbnailBytes,heartbeatIntervalSeconds} }` |
| `GET /disks` | – | `{ disks:[{ id, labelName, description, bound, lastScanAt, photoCount }] }` (active disks; never exposes identifiers) |
| `POST /disks/bind` | identity | Links the physical disk to the label. Idempotent. 409 `DISK_IDENTITY_MISMATCH` (label already bound to another disk), `IDENTIFIER_IN_USE` (disk bound to another label), 404 `DISK_NOT_REGISTERED`, 409 `DISK_INACTIVE` |
| `POST /heartbeat` | `{ disks:[identity…] }` (≤50) | `{ recognized:[labels], unrecognized:[labels], serverTime }`; recognised disks get `lastSeenAt = now` |
| `POST /scans` | identity + `{ isDryRun?, scanPath? }` | `{ scanId, labelName, hardDiskId, isDryRun, scanPath }`. 409 `DISK_NOT_BOUND`, `DISK_IDENTITY_MISMATCH`, `DISK_INACTIVE`, `SCAN_RUNNING`; 400 `BAD_PATH`. Closes stalled scans (>10 min idle) of the same disk |
| `POST /scans/:id/precheck` | `{ files:[{relativePath,size,mtimeMs}] }` (1–200) | `{ needed:[relativePath…], counts:{new,changed,unchanged}, rejected:[{relativePath,reason}] }`. Unchanged files are stamped *seen* (non-dry-run). Unsupported extensions / unsafe paths are rejected |
| `POST /scans/:id/files` | `{ files:[{relativePath,size,mtimeMs,hash?,format?,exifDateTime?}] }` | `{ results:[{relativePath,id,created,thumbnailNeeded}], rejected:[…] }`. Idempotent upsert by (disk, path). 409 `DRY_RUN` for dry runs. Staff-set visit/notes are never touched; `thumbnailKey` is reset only if `hash` changed |
| `POST /scans/:id/finish` | `{ status: COMPLETED\|FAILED\|CANCELLED, traversalComplete, errorsCount, errorSummary? }` | `{ scanId, status, missingCount, notes[] }`. Marks unseen files `MISSING` **only if** COMPLETED, not dry-run, `traversalComplete`, ≥1 file seen (or disk empty in DB), and only inside `scanPath`. Idempotent (`alreadyFinished`) |
| `PUT /thumbnails/:photoId` | raw JPEG bytes | `{ thumbnailKey }`. 413 too large/empty, 415 not JPEG (magic bytes checked), 404 unknown photo |
| `POST /thumbnails/missing` | identity + `{ limit≤2000, afterId }` | `{ photos:[{id,relativePath}] }` photos of the disk without thumbnail (cursor by id) |
| `POST /grants/verify` | `{ grant }` | `{ photoId, labelName, stableIdentifier, relativePath, fileName }` for a valid 60 s open-original grant; 401 `INVALID_GRANT` |

Request validation uses zod; a bad body gives `400 BAD_REQUEST` with the first problem.

## 2. Session-protected routes

| Route | Behaviour |
|---|---|
| `GET /api/health` | Public. `{status:"ok"}` or 503 `{status:"database_unreachable"}`. For uptime monitors. |
| `GET /api/members/search?q=text&offset=0` | 401 without a (valid) session; else `{ rows, directoryFailed, hasMore, nextOffset, truncated }` (+ `directoryRaw` in `next dev` only): the "Select Member" search on the new entry - saved Members (only in the answer for `offset=0`) + the external Members directory, **100 directory rows per call**; the window asks again with `offset=nextOffset` while `hasMore` (when the user scrolls to the end of the list), up to 5000 rows (`truncated` then). Mobile numbers are removed for roles that may not see them. A route and not a server action because server actions are queued (a slow search would block the next one); the browser aborts the fetch when the user types on and `request.signal` cancels the call to the directory. |
| `GET /api/photos/:id/thumbnail` | 401 without session; 404 unknown/invalid id or no thumbnail; else `image/jpeg`, `Cache-Control: private, max-age=86400`. File path derived only from the numeric id. |
| `GET /api/photos/:id/open` | 401 without session; 404 unknown; **409 text** (`Connect HDD-002 to access the original file.` / missing / unverified) unless the disk is connected and the file verified; else **302** to `LOCAL_AGENT_URL/open?grant=<JWT 60 s>` |

## 3. Pages (all require login unless noted; admin-only marked ★)

`/login` (public) · `/` → `/dashboard` · `/dashboard` · `/search` · `/review` · `/photos/[id]` · `/visits` · `/visits/new` · `/visits/[id]` · `/haribhagats` · `/haribhagats/new` · `/haribhagats/[id]` · `/haribhagats/[id]/edit` ·
`/events` (manage ★) · `/hard-disks` (manage ★) · `/hard-disks/[id]` · `/scans` · `/scans/[id]` · `/users` ★ · `/settings` ★ · `/account`.

Search URL parameters (`/search`): `q, name, fatherName, surname, gam, taluko, jillo, pincode, mobileNo, dateFrom, dateTo, eventId, hardDiskId, haribhagatId, placeType, availability(AVAILABLE|MISSING|UNKNOWN), unassigned=1, folder, page`.
`/visits/new` parameters: `photo` (repeatable, ≤200 ids), `diskId`, `folder`, `sub=1` (include sub-folders), `haribhagat` (preselect person id).

## 4. Server actions (`src/actions/*`, all re-check permission server-side)

| File | Actions | Permission |
|---|---|---|
| `auth.js` | `loginAction`, `logoutAction`, `changePasswordAction` | public / login |
| `haribhagats.js` | `saveHaribhagatAction` (create/edit, duplicate warning, `confirmDuplicate=1`), `pickerSearchAction` (type-ahead of saved people, no mobile numbers; used by the visit edit form) | `haribhagat.write` / login |
| `events.js` | `createEventAction` (`event.create`), `updateEventAction`, `deleteEventAction` (`event.manage`; both need the admin role or the *Add events* grant) | see permission matrix |
| `disks.js` | `createDiskAction` (`disk.create`: ADMIN+STAFF); `updateDiskAction`, `toggleDiskAction`, `deleteDiskAction` (`disk.manage`: ADMIN, or STAFF with the *Add hard disks* grant) | see left |
| `visits.js` | `createVisitAction`, `updateVisitAction`, `attachPhotosAction`, `detachPhotosAction` | `visit.write` |
| `photos.js` | `updatePhotoNotesAction`, `linkPhotoToVisitAction`, `unlinkPhotoAction` | `photo.write` |
| `users.js` | `createUserAction`, `updateUserAction`, `resetPasswordAction` | `user.manage` |
| `tokens.js` | `createTokenAction` (returns raw token once), `revokeTokenAction` | `token.manage` |

Permission matrix: `src/lib/permissions.js` (`haribhagat.write`, `visit.write`, `photo.write`, `disk.create`, `event.create` → ADMIN+STAFF; `event.manage`, `disk.manage`, `user.manage`, `token.manage`, `audit.view` → ADMIN).

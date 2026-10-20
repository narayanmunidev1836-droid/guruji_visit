# Operations runbook

Who does what: **Admin** = manages master data, users, tokens. **Staff** = searches, adds people/visits. **Operator** = person at the computer with the USB disks (runs the indexer).

## Add a hard disk (Workflow A)
1. Admin: *Hard Disks → Register a hard disk* → sticker label exactly as printed (e.g. `HDD-012`), optional description/serial/notes. The label must be unique (case-insensitive). It appears at once in every Hard Disk dropdown.
2. Operator: plug in the disk, then follow [INDEXER.md](INDEXER.md#index-a-new-disk-workflow-a-in-the-plan): `init-disk` → `scan --dry-run` → `scan`.
3. Staff: *Needs review* → link folders to visits.

## Add or change an event name (Workflow B)
Admin: *Events → Add an event*. To retire a name click *Deactivate*: it disappears from new-entry dropdowns but old visits keep it. Re-activate any time. Names are never deleted.

## Index a disk again / new photos added later
Run `node cli.mjs scan --root <disk>` again. Only new/changed files are processed; existing records, visit links and notes are preserved. Files that vanished are flagged **MISSING** (not deleted).
For one folder only: `--folder 2021/January`.

## A disk was reformatted / replaced / its marker lost
1. Admin: *Hard Disks → HDD-0xx → Unlink physical disk*.
2. Operator: `node cli.mjs init-disk --label HDD-0xx --root <disk>` (it writes a new marker).
3. `scan` again (paths unchanged ⇒ records are reused; moved files appear as new + old ones MISSING).
Never copy `.guruji-disk.json` to another disk: two disks with the same marker would be treated as the same disk (the second would be refused/mismatch only if the server already knows another id).

## "Needs review" — linking photos to people (Workflow C/D)
*Needs review* lists folders with unlinked photos. *New visit* on a folder: choose Haribhagat(s) (search first; create only if missing), event, date (suggested from camera dates), place type → **Save** attaches every unlinked photo in that folder.
Photos already in another visit are skipped unless "move" is ticked. Select individual photos on *Search* → *New visit from selected*. To undo: open the visit → *Remove selected from visit* (photos return to Needs review).

## Find an old photo (Workflow D)
Search → filters (name, surname, village, date range, event, disk, place) → result card shows **disk sticker + relative path**.
* Badge **Connected** + *Open original*: the disk was reported recently by an agent → click opens it (agent must run on *your* computer).
* **Disconnected**: "Connect HDD-002 to access the original file." Fetch the disk, plug it in, wait ~30 s (agent heartbeat) and refresh.
* **File missing**: the last full scan did not find it → check the disk / folder; re-scan after fixing.
* **Not verified**: never confirmed by a scan; scan the disk.

## Users and passwords
*Users* (admin): add staff with a temporary password (≥10 chars); *Edit* to rename, change role, deactivate, or set a new password (the user's other sessions end immediately). Deactivated users are locked out at once; accounts are never deleted. At least one active admin always remains.
Users change their own password under *My account*.

## Indexer tokens
*Settings → Indexer tokens → Create*: give it the computer's name; copy the token **now** (it cannot be shown again). Lost/stolen computer → *Revoke* (effective on the next request). Rotating: create new, `login` on the computer, revoke old.
CLI alternative on the server: `node scripts/create-token.mjs "Office PC"`.

## Restore a backup
Prerequisite: a `pg_dump -Fc` file (see [DEPLOYMENT.md](DEPLOYMENT.md#backups)).
```bash
# 1. stop the app so nothing writes during the restore
sudo systemctl stop guruji
# 2. restore into a fresh database (safer than overwriting)
sudo -u postgres createdb -O guruji -E UTF8 -T template0 guruji_restore
sudo -u postgres pg_restore --no-owner --role=guruji -d guruji_restore /var/backups/guruji/guruji_2026-10-18.dump
# 3. sanity check
sudo -u postgres psql guruji_restore -c 'select count(*) from "Photo"; select count(*) from "Haribhagat"; select count(*) from "HardDisk";'
# 4. switch the app: set DATABASE_URL=…/guruji_restore in .env (or rename databases), then
sudo -u guruji npx prisma migrate deploy      # applies any newer migrations to the restored copy
sudo systemctl start guruji && curl -s http://127.0.0.1:3000/api/health
```
Do a **dry-run restore on a scratch server** before go-live and every few months; write down the date/result. After restoring, indexers keep working (tokens and disk identities are in the database). Thumbnails missing? `node cli.mjs thumbnails --root <disk>`.

## Troubleshooting
| Symptom | Likely cause → action |
|---|---|
| Everyone gets "Something went wrong" | check `journalctl -u guruji`; usually the database is down (`/api/health` → 503) |
| Login says "Too many failed attempts" | the in-app limiter (5 per 15 min per IP+e-mail) — wait or restart the service (memory is cleared) |
| Disk shows Disconnected though plugged in | agent not running / not seeing the marker (`node cli.mjs status` on that PC), or heartbeat older than `HEARTBEAT_TTL_SECONDS`; check `node cli.mjs agent` output for "not recognised" |
| Scan shows STALLED | indexer stopped; re-run (resumes) |
| Many files MISSING after a scan | the disk was partially mounted or folders reorganised; fix and re-scan (they return to AVAILABLE) |
| Duplicate person warning but it is a different person | choose *Save anyway* (never merged automatically) |
| Thumbnail missing | `node cli.mjs thumbnails --root <disk>` (HEIC cannot be previewed) |
| Date looks wrong | EXIF dates come from the camera clock; correct the **visit date** (Visit → Edit) |
| Mobile numbers shown as `•••••••123` | role not in `MOBILE_VISIBLE_ROLES` |

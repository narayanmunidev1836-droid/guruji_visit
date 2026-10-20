# Local indexer & access agent (`indexer/`)

A small Node.js tool that runs on **the computer where the USB disks are plugged in** (Windows, macOS or Linux). It *reads* photos and reports metadata to the server.
It is a separate package (`indexer/package.json`: `sharp` for thumbnails, `exifr` for EXIF dates). Needs Node ≥ 20.19.

> **Safety:** the indexer never moves, renames, edits or deletes a photo. The **only** file it ever writes to a disk is the identity marker `.guruji-disk.json` at the disk root
> (created once by `init-disk`, with confirmation). Thumbnails are uploaded to the server, not written beside the originals.

## One-time setup on the staff computer

```bash
cd indexer && npm install                      # once
# An administrator creates a token in the website: Settings → Indexer tokens (shown once)
node cli.mjs login --server https://archive.example.org --token gpa_xxxxxxxx
node cli.mjs status                            # shows registered disks and which are connected here
```
`login` stores `{server, token}` in `~/.guruji-indexer.json` (owner-only permissions where supported). Override with env `GURUJI_SERVER`, `GURUJI_TOKEN`, `GURUJI_INDEXER_CONFIG` (path), `GURUJI_AGENT_PORT`.

## Index a new disk (Workflow A in the plan)

1. **Admin** adds the disk on the website: *Hard Disks → Register* with the exact sticker label (e.g. `HDD-007`). The label must be unique (case-insensitive).
2. Plug the disk in. Find its root (e.g. `E:\` or `/Volumes/HDD-007`).
3. **Link the physical disk to the label** (once per disk):
   ```bash
   node cli.mjs init-disk --label HDD-007 --root E:\
   ```
   It asks *"Is the sticker on this disk really HDD-007?"*, writes `E:\.guruji-disk.json` (`{labelName, diskId:<random uuid>}`) and binds the id on the server.
   If the label is already linked to a different physical disk the command refuses (an admin must press *Unlink physical disk* on the disk's page first, e.g. after reformatting).
4. **Dry run first** (reads only; shows what *would* be created; nothing is stored):
   ```bash
   node cli.mjs scan --root E:\ --dry-run
   ```
5. **Real scan:**
   ```bash
   node cli.mjs scan --root E:\
   ```
   For the first scan it counts files and shows the biggest top-level folders and asks for confirmation (`--yes` skips the question). Progress lines show files / new / changed / unchanged / thumbnails / errors.
6. Open the website: **Scans** shows the run, **Hard Disks → HDD-007** shows folders, **Needs review** lists photos to link to visits.

Useful options: `--folder 2019/March` (scan only a sub-folder; missing-file detection then applies only inside it) · `--no-thumbnails` · `--concurrency 4` (1–16) · `--allow-system-drive` (the tool refuses roots that look like an OS drive).
`node cli.mjs thumbnails --root E:\` creates thumbnails later for photos that don't have one (e.g. after `--no-thumbnails`). HEIC/HEIF files are indexed but cannot get thumbnails (no decoder).

### What a scan does
1. Walks the disk (sorted, depth-first). Skips system folders (`System Volume Information`, `$RECYCLE.BIN`, `.Trashes`, `.Spotlight-V100`, `.fseventsd`, `@eaDir`, `__MACOSX`, `.git`, `node_modules`, `lost+found`, anything starting `$` or `.Trash`), symbolic links, `._*` resource-fork files and the marker file. Only `jpg, jpeg, png, webp, heic, heif` are indexed.
2. Every 200 files: **precheck** (path + size + mtime) → the server answers which are new/changed.
3. For new/changed files only: partial SHA-256 fingerprint, EXIF `DateTimeOriginal`/`CreateDate` (raw text, no time-zone conversion; implausible years rejected), thumbnail (≤480 px JPEG ≤256 KB, EXIF-rotated) → **files** upsert → thumbnail upload.
4. At the end: **finish** with `traversalComplete=true` only if no folder was unreadable. Photos indexed before but not seen are flagged `MISSING` (never deleted); a scan that saw zero files while the DB has photos skips this check ("wrong folder / empty mount").
5. Ctrl+C stops after the current batch (status CANCELLED, nothing marked missing). **Resuming** = running the same command again: unchanged files are skipped quickly and no duplicates are created.

Failures: network/5xx/429 are retried with back-off (up to 5×, 1→30 s); 4xx are fatal and shown. A crashed indexer leaves a RUNNING scan that the website shows as *stalled* after 10 min and the next scan closes it.

## The agent: "connected" status + "Open original"

```bash
node cli.mjs agent                 # keep it running while disks are plugged in (or:  agent --root E:\  to add a path)
```
* Every 30 s it looks for connected disks that carry a marker file (Windows: drive letters A–Z; macOS: `/Volumes/*`; Linux: `/media`, `/run/media`, `/mnt`; plus explicit `--root`s) and sends a **heartbeat**. The website then shows the disk as *Connected* (for `HEARTBEAT_TTL_SECONDS`, default 180 s after the last report).
  Drive letters are only used to *find* disks; identity is the marker id + sticker label.
* It also serves **`http://127.0.0.1:4599/open?grant=…`** (loopback only; `Host` header must be `127.0.0.1:<port>` or `localhost:<port>`; GET/HEAD only). When a user clicks *Open original* on the website
  (`/api/photos/:id/open`) the browser is redirected here with a 60-second signed grant. The agent verifies the grant with the server (`POST /grants/verify`), finds the disk by label + marker id,
  resolves the path **inside the disk root** (rejects `..` and symlink escapes), and streams the file (`inline` for jpg/png/webp, download for HEIC).
  If the disk is not plugged into *this* computer it shows "Connect HDD-00X…". It only works on the staff computer that runs the agent — that is the intended "secure local access agent" from the plan.
* To open originals from other computers/remotely you need a different mechanism (VPN to the office PC, copying selected files to the server, or object storage later). See [DECISIONS.md](DECISIONS.md).

## Files written/read by the tool
| What | Where |
|---|---|
| Connection settings | `~/.guruji-indexer.json` (or `GURUJI_INDEXER_CONFIG`) |
| Disk identity marker | `<disk root>/.guruji-disk.json` (only write to a disk; created with `wx` flag – never overwrites) |
| Everything else | read-only |

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `Not configured. Run: … login` | no token saved → `login` |
| `401 UNAUTHORIZED` | token revoked/typo → create a new token (Settings) |
| `DISK_NOT_REGISTERED` | register the label first (Hard Disks page; admin or staff) |
| `DISK_NOT_BOUND` / "Run init-disk first" | disk not linked yet |
| `DISK_IDENTITY_MISMATCH` | wrong disk behind that sticker, or the marker file was copied/replaced; check the sticker, or admin → *Unlink physical disk*, then `init-disk` |
| `No disk marker found in <root>` | wrong `--root` or `init-disk` not run |
| "looks like an operating system drive" | you pointed at `C:\`; use the USB disk root |
| Scan "stalled" in the UI | indexer stopped; run again (safe) |
| Photos marked MISSING unexpectedly | disk partially readable / folders moved. Fix the disk, re-scan; flagged files return to AVAILABLE automatically |
| No thumbnails for HEIC | expected; metadata is still searchable |
| "Open original" shows connection error | the agent isn't running on this computer (`node cli.mjs agent`) or port 4599 is busy (`GURUJI_AGENT_PORT` + server `LOCAL_AGENT_URL`) |

## Module map (`indexer/`)
`cli.mjs` commands · `lib/api.mjs` HTTP+retry · `lib/config.mjs` · `lib/marker.mjs` · `lib/drives.mjs` discovery + system-drive guard · `lib/walk.mjs` safe traversal · `lib/scan.mjs` scan orchestration ·
`lib/fingerprint.mjs` · `lib/exif.mjs` · `lib/thumbnail.mjs` (sharp) · `lib/agent.mjs` heartbeat + local file server · `lib/paths.mjs` (**identical rules to `src/lib/paths.js`**, enforced by a unit test) · `lib/util.mjs`.

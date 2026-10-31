# User guide (staff)

The archive tells you **which hard disk to connect and where the photo is on it**. The photos themselves stay on the USB disks.

## Signing in
Open the site, enter your e-mail and password. Change your password under **My account**. If you see *Too many failed attempts* wait a few minutes. Sessions last 8 hours.

## Finding a photo
1. Click **Search**. Type in the quick box (name, surname, village, mobile, even part of a file name) or open **Filters** for exact fields: Name, Father Name, Surname, Gam (village), Taluko, Jillo (district), Pincode, Mobile No, Date from/to, Event, Hard Disk, Place type, File status, Folder.
2. Results are cards: thumbnail, person and village, event, date, place, **hard-disk sticker + path**, and a status badge:
   * **Connected** — the disk is plugged into a computer running the agent. **Open original** opens the photo on *that* computer.
   * **Disconnected** — *"Connect HDD-002 to access the original file."* Fetch that disk, plug it in, wait half a minute.
   * **File missing** — the last scan could not find the file; check the disk or ask an administrator to re-scan.
   * **Not verified** — never confirmed by a scan yet.
3. **Copy path** copies e.g. `HDD-002/2019/March/Patel Home/IMG_0042.jpg`. **View** shows details, the people in the visit and the full location.
4. Search works in **Gujarati and English**, with partial words and any capitalisation. Several words mean *all of them must match*.
   Filters like Name + Surname must match **the same person**.

## Adding a Haribhagat
**Haribhagats → Add**. Name and Surname are required; the rest is optional. Mobile numbers are stored as text: 10 digits, or - for a number of another country - a `+`, the country code and the number (for example `+1 416 414 3653`). Pincode is 6 digits.
If a similar person already exists you get a **warning with a link to the existing record**. Use *Save anyway* only if it is really a different person — records are never merged automatically.

## Linking photos to people and events ("Needs review")
After a disk is indexed its photos are **not** attached to anyone (the system never guesses from file names).
1. **Needs review** lists folders that still have unlinked photos (disk, folder, count). Click **New visit** on a folder.
2. The page shows how many photos will be attached. Choose the Haribhagat(s) — start typing, pick from the list, click the ★ to mark the main person. If the person doesn't exist, use *Add a new Haribhagat* (opens a new tab), then search again.
3. Choose **Event** (list comes from the Events page), **Date** (suggested from the camera dates — correct it if needed) and **Place** (Home / Office / Temple / Other). **Save**.
4. You can also tick photos on **Search** and press **New visit from selected**, or open a visit and **Attach more photos** from another folder. **Remove selected from visit** sends photos back to Needs review.
5. Wrong date or event? Open the visit (**Visits**) → **Edit**.

## Administrators only
* **Events** — add names, rename, deactivate/re-activate (never deleted; old records keep them).
* **Hard Disks** — register each disk with its sticker label **before** indexing (admin or staff); rename; deactivate (admin only); *Unlink physical disk* if a disk was reformatted.
* **Users** — add staff, set role, reset password, deactivate. **Settings** — indexer tokens and the audit log.
* **Scans** (everyone can view) — history of indexing runs with counts and errors.

## Good habits
* Always write the **sticker label exactly** as on the disk; one label = one physical disk.
* Check the dashboard: *Needs review* and *File missing* should trend to zero; investigate disks that stay *Disconnected* unexpectedly.
* Never edit or rename folders on the original disks to "fix" the archive — ask for a re-scan instead (renamed folders appear as new photos and the old ones as missing).

---

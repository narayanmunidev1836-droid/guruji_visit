# Deployment on the organisation's VPS

> **Status:** these steps follow standard practice for Next.js + PostgreSQL on Ubuntu LTS. The application, migrations, build (`next build`) and production server (`next start`) were exercised on a development
> machine against real PostgreSQL 18; the VPS-specific parts below (systemd, nginx, certbot, cron backups) were **not executed in this repository's environment** — follow them once on a staging VPS first and tick the checklist at the end.

## Topology
```
Internet ──443──► nginx (TLS, rate limits, sets X-Forwarded-For) ──► 127.0.0.1:3000  Next.js (systemd service, user "guruji")
                                                                         │
                                                                         └─► 127.0.0.1:5432  PostgreSQL  (NOT exposed publicly)
Staff PC ── indexer ──HTTPS + Bearer token──► same site /api/indexer/*
```
Everything (app, PostgreSQL, thumbnails) fits on a small VPS (2 vCPU / 2–4 GB RAM / 20 GB disk is plenty; photos are **not** stored on the server, only thumbnails ≈ 15–60 KB each).

## 1. Server preparation (Ubuntu 24.04 LTS example)
```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx postgresql postgresql-contrib ufw git curl
# Node 24 LTS (NodeSource) – any Node >= 22.13 works
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt -y install nodejs

sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable      # 5432 and 3000 stay closed
sudo adduser --system --group --home /srv/guruji guruji
```
Optional hardening: `unattended-upgrades`, SSH keys only, `fail2ban`.

## 2. PostgreSQL
```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE guruji LOGIN PASSWORD 'CHOOSE-A-LONG-RANDOM-PASSWORD';
CREATE DATABASE guruji_archive OWNER guruji ENCODING 'UTF8' TEMPLATE template0;
SQL
```
Keep `listen_addresses = 'localhost'` (default) in `postgresql.conf`; do **not** open 5432 in the firewall.

## 3. Application
```bash
sudo -u guruji -H bash -c '
  cd /srv/guruji
  git clone <your-repo-url> app && cd app
  npm ci
  cp .env.example .env && chmod 600 .env
'
sudo -u guruji nano /srv/guruji/app/.env       # DATABASE_URL, SESSION_SECRET (new random!), APP_URL=https://archive.example.org, THUMBNAIL_DIR=/srv/guruji/thumbnails
sudo mkdir -p /srv/guruji/thumbnails && sudo chown guruji:guruji /srv/guruji/thumbnails
cd /srv/guruji/app
sudo -u guruji npx prisma generate
sudo -u guruji npx prisma migrate deploy                                   # never `migrate dev` in production
sudo -u guruji env SEED_ADMIN_EMAIL=admin@yourorg.org SEED_ADMIN_PASSWORD='long-password' npm run db:seed   # first administrator + starter events (NO --demo)
sudo -u guruji npm run build
```
`LOCAL_AGENT_URL` stays `http://127.0.0.1:4599` — it is the address **on the staff computer**, not the server.
The build downloads Google Fonts (Geist, Noto Sans Gujarati), so the VPS needs outbound internet during `npm run build`.

### systemd service `/etc/systemd/system/guruji.service`
```ini
[Unit]
Description=Guruji Photo Archive
After=network.target postgresql.service

[Service]
User=guruji
WorkingDirectory=/srv/guruji/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=3
# hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/srv/guruji

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now guruji
journalctl -u guruji -f            # structured logs: app errors, "[audit]" failures, indexer API errors
curl -s http://127.0.0.1:3000/api/health      # {"status":"ok"}
```

## 4. HTTPS reverse proxy (nginx) `/etc/nginx/sites-available/guruji`
```nginx
server {
  listen 80;
  server_name archive.example.org;
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl http2;
  server_name archive.example.org;
  # certificates are added by certbot
  client_max_body_size 3m;                       # indexer JSON batches ≤ 2 MB, thumbnails ≤ 256 KB

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;      # OVERWRITE (not append): the app trusts the first entry for rate limiting
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/guruji /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
sudo apt -y install certbot python3-certbot-nginx && sudo certbot --nginx -d archive.example.org    # HTTPS + auto-renew
```
HTTPS is mandatory: session cookies are `Secure` in production and the indexer sends bearer tokens. (Caddy works equally well: `reverse_proxy 127.0.0.1:3000` gives automatic HTTPS.)
Optional nginx rate limit for `/login` (`limit_req_zone`) on top of the in-app limiter.

## 5. First login checklist
1. Open `https://archive.example.org/login`, sign in with the seeded admin, **change the password** (*My account*).
2. *Users* → create staff accounts (temporary password, ≥10 chars). 3. *Events* → confirm/adjust event names. 4. *Hard Disks* → register every disk with its sticker label.
5. *Settings* → create an indexer token per indexing computer.

## Backups
**What to back up:** (1) the PostgreSQL database — essential; (2) `.env` (secrets) — keep in a password manager, not in git; (3) the thumbnails folder — optional (re-creatable with `node indexer/cli.mjs thumbnails`).
The **original photos are on the USB disks** — back those up by the organisation's own disk-copy process; this system only indexes them.

```bash
# /etc/cron.d/guruji-backup  (daily 02:30)
30 2 * * * postgres  pg_dump -Fc guruji_archive > /var/backups/guruji/guruji_$(date +\%F).dump && find /var/backups/guruji -name '*.dump' -mtime +30 -delete
```
```bash
sudo install -d -o postgres -g postgres -m 700 /var/backups/guruji
```
Copy `/var/backups/guruji` off the server (rsync/rclone to another machine or cloud bucket) — a backup on the same disk is not a backup.
**Test a restore before going live and then every few months** (procedure in [OPERATIONS.md](OPERATIONS.md#restore-a-backup)). Record the organisation-approved location and who may restore here: `__________` (decision #7 in [DECISIONS.md](DECISIONS.md)).

## Updating
```bash
cd /srv/guruji/app && sudo -u guruji git pull
sudo -u guruji npm ci && sudo -u guruji npx prisma generate && sudo -u guruji npx prisma migrate deploy
sudo -u guruji npm run build && sudo systemctl restart guruji
curl -s https://archive.example.org/api/health
```
Take a `pg_dump` immediately before any release that contains a migration. Rollback = restore previous git tag + (if the migration was destructive) restore the dump.

## Monitoring
* Uptime monitor on `https://archive.example.org/api/health` (200 `{"status":"ok"}`, 503 if the database is unreachable).
* `journalctl -u guruji` for errors; the **Scans** page for indexer problems; the dashboard shows disks connected/disconnected and files marked missing.
* Disk space: `/var/lib/postgresql`, `/srv/guruji/thumbnails`, `/var/backups/guruji`.

## Production checklist
- [ ] Node ≥ 22.13; `NODE_ENV=production` (set by the unit file / `npm start`)
- [ ] `.env` mode 600, new `SESSION_SECRET`, strong DB password, not committed
- [ ] PostgreSQL listening on localhost only; ports 5432/3000 closed in the firewall
- [ ] HTTPS valid, HTTP redirects; nginx overwrites `X-Forwarded-For`
- [ ] `prisma migrate deploy` applied; seed run **without** `--demo`
- [ ] Default/seed admin password changed; staff accounts created; no shared logins
- [ ] Indexer tokens: one per computer, revoked when a computer is lost
- [ ] Nightly `pg_dump` + off-site copy + **restore tested**
- [ ] `/api/health` monitored
- [ ] Pilot: one disk + a limited sample indexed and checked before scanning all disks

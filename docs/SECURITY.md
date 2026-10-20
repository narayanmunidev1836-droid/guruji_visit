# Security

The database holds names, family details, villages and mobile numbers: **treat it as private organisational data.**
Maps to section 9 of the project plan; each control names where it lives and how it is tested.

## Controls

| Requirement | Implementation | Verified by |
|---|---|---|
| Login required for all non-public pages/APIs | `proxy.js` (cookie gate) + `requireUser()` in every page/action/route; public only `/login`, `/api/health`, `/api/indexer/*` (bearer) | E2E `auth`, `security` |
| Server-side role authorization ("hiding a button is not authorization") | `requirePermission()`, `requireAdminPage()`, matrix in `src/lib/permissions.js`; services re-check; admin pages redirect staff | unit `permissions`, E2E `roles` |
| Password storage | argon2id (`@node-rs/argon2`), min 10 chars; hashes never leave the server | integration `users` |
| Session handling | HS256 JWT in `HttpOnly; SameSite=Lax; Secure(prod)` cookie, 8 h; user re-read from DB each request (deactivation/role/password change effective immediately; old sessions die on password change) | E2E `auth`, `roles` |
| Login rate limits | 5 failures/15 min per IP+e-mail, 30/15 min per IP; same generic error for unknown e-mail/wrong password/inactive; dummy hash to equalise timing | unit `rate-limit`, E2E `auth` |
| CSRF | Next.js Server Actions check Origin; cookie is SameSite=Lax; state-changing routes are POST server actions | framework + design |
| Input validation | zod schemas in services (server side); Prisma parameterised queries (no raw SQL except `SELECT 1` health check and test TRUNCATE) | unit `validation`, integration |
| Authorization of files | thumbnails and open-original need a session; thumbnail path derived from numeric id only (no user path joined); open-original uses 60 s grants (separate JWT audience) | integration `indexer`, E2E `security`, `workflow` |
| No absolute/internal paths exposed | DB stores only paths relative to the disk root; validated (`..`, absolute, drive letters, NUL rejected) on server **and** indexer; pages never print server paths | unit `paths`, integration `indexer`, E2E `security` |
| Path traversal in the local agent | `resolveInsideRoot()` normalises, checks prefix **and** `realpath` (symlink escape) | indexer code + E2E `workflow` |
| Indexer-to-server authentication | revocable bearer tokens, only SHA-256 stored, shown once; per-token rate limit; failed-auth throttle | integration `users-and-tokens`, `indexer-api` |
| Local agent exposure | binds `127.0.0.1` only; `Host` allow-list (DNS-rebinding); GET/HEAD only; no CORS; needs a server-signed grant | E2E `workflow` |
| Secrets | only in `.env` (git-ignored) / environment; `.env.example` has placeholders; env validated at runtime; nothing secret is logged or rendered | E2E `security` ("no page leaks secrets") |
| Mobile numbers restricted | `MOBILE_VISIBLE_ROLES`; others see `•••••••123`, cannot search by mobile (filter matches nobody), duplicate warnings never reveal numbers, picker never returns them, edits by such roles keep the stored number | unit `search-filters`, integration `haribhagats`, `search` |
| Audit trail | `AuditLog` for sensitive/admin actions; viewable in *Settings* (admin) | integration |
| Hardening headers | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy`, no `X-Powered-By` | E2E `security` |
| No face recognition / biometrics | not implemented (requires organisational approval) | – |
| Backups | `pg_dump` + restore test procedure | documented (DEPLOYMENT/OPERATIONS) — **restore not yet exercised on the production VPS** |

## Threat model (short)

| Threat | Mitigation | Residual risk |
|---|---|---|
| Stranger reaches the site | HTTPS, login, rate limits | Weak staff passwords → min length only; consider 2FA later |
| Staff account stolen | admin can deactivate/reset immediately; audit log | no per-session list yet |
| Lost indexing computer | revoke its token | files on that PC's disks are outside this system |
| Malicious file names / paths in a disk | server re-validates every path; names rendered as text (React escapes); no shell/DB interpolation | – |
| Someone tricks a staff browser into opening `127.0.0.1:4599/open?grant=…` | grant is signed, 60 s, bound to a photo; the response can't be read cross-origin | a valid grant opens that one photo *on the staff PC that runs the agent* |
| Another website probes the agent | loopback + Host check + no CORS headers | – |
| SQL injection | Prisma parameterised queries; zod validation | – |
| Dependency vulnerabilities | run `npm audit` regularly; lock file committed | the scaffold reported "5 high" advisories at install time in transitive dev tooling — review with `npm audit` before go-live |
| Database exposure | PostgreSQL on localhost, firewall; strong password | – |
| Brute-force limiter is per process | fine for single VPS | use Redis/nginx limits if scaled out |
| Reverse proxy not overwriting `X-Forwarded-For` | documented nginx config | spoofable rate-limit key if misconfigured |

## Known gaps / recommendations before production
1. Add 2-factor authentication or at least a password-strength policy beyond length, if the organisation requires.
2. Content-Security-Policy header (not set yet; Next.js inline scripts need a nonce setup — see `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`).
3. Run `npm audit` and update dependencies on a schedule.
4. Decide who may see mobile numbers (`MOBILE_VISIBLE_ROLES`, default ADMIN+STAFF) — decision #6.
5. Restore-test the backups on the real VPS and document the approved location (decision #7).
6. Optional: session list / "log out everywhere" button (today: change password).

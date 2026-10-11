# PULSE CMMS v0.3 — Workers Edition

## Included
- Premium split-screen sign-in, administrator setup, and outside maintenance request entry.
- Cloudflare Worker API with D1 `PULSE_DB` binding, existing work orders, Fiix CSV Migration Studio, and three workspace themes.
- Structured server-side incident logging for backend errors (no passwords or password hashes logged).
- Setup confirmation returns to staff sign-in; dashboard data errors are separated from login failures.

## Deploy
1. Extract this archive and copy its **contents** into the root of the existing `jmyall93/pulse` repository, replacing matching files. Commit.
2. Keep Cloudflare's GitHub deployment command as `npx wrangler deploy` with root `/`.
3. Keep the existing D1 database. **Do not rerun migrations if tables already exist.**
4. Visit `/api/health` and `/api/setup-status`, then create the initial administrator if `needsSetup` is true.
5. If setup fails, check Cloudflare Observability for `PULSE API failure` and report its incident ID and sanitized error message.

## Important
The root cause of the earlier 500 error cannot be proven without the underlying exception. This release improves observability but is **not verified against the live D1 database**. If the same failure occurs, use the new diagnostic log rather than deleting tables. Fiix migration remains CSV-only and should be tested with real exports before production use. Public ticket intake needs abuse prevention and rate limiting before a public launch. The first-admin endpoint is open until a user exists: initialize it promptly and restrict public access until then.

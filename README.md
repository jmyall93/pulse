# PULSE CMMS v0.2.1 — Cloudflare Workers fix

This build targets the **existing GitHub-connected Cloudflare Worker** named `pulse` (not Pages). It serves `public/` and routes `/api/*` through `src/worker.js` into the existing PULSE API, including administrator setup, login, work orders, public ticket intake, and Fiix CSV migration.

## Deployment

1. Upload **the contents** of this ZIP to the root of the existing `jmyall93/pulse` GitHub repository (replace previous files as needed). Ensure `wrangler.jsonc`, `src/`, and `public/` are at repository root.
2. In Cloudflare Workers & Pages → `pulse` → Settings → Build, confirm the Git integration deploys using **`npx wrangler deploy`** (or `npm run deploy`). Do not deploy just `public/` as static assets. Root directory should be repository root.
3. Redeploy from GitHub. Cloudflare should now show a Worker script and the `PULSE_DB` D1 binding.
4. Check `https://pulse.jeffmyall6.workers.dev/api/health` for `{"ok":true}`. Check `/api/setup-status` for `{"needsSetup":true}` if no users exist.
5. Reload the main site. The first-admin setup screen should appear when the users table is empty.

## Database

This build uses the existing D1 database `pulse-db` (ID in `wrangler.jsonc`). It **does not** automatically reset or migrate production data. Run `0001_init.sql` then `0002_migration.sql` only if their tables are missing; do not delete existing data. D1 binding is `PULSE_DB`.

## Security / pilot limits

Initial setup is open while no user exists: **do not share the public URL before claiming the administrator account**. For commercial production, add protected setup, abuse/rate limiting for public tickets and login, CSRF protection, tenant isolation, and a security audit. This release is for pilot testing.

# PULSE CMMS v0.3.2 — Company ID + Username Login

## Required database update (before deployment)

In Cloudflare D1 `pulse-db` Console, run `migrations/0003_company_username.sql` **once**. Do not rerun migrations 0001/0002. If you have already run 0003, do not run it again.

This adds `company_id` and `username` to existing users, preserving existing accounts and work orders. Any older accounts get their full email as their username. First-time setup requires Company ID `pulse-demo`.

## Deployment

Upload the ZIP contents to the root of `jmyall93/pulse`, commit, and allow Cloudflare to deploy with `npx wrangler deploy`. The existing D1 binding is retained.

## Login

Company ID + Username + Password. Initial setup also requests name and a recovery email. New staff accounts require a username and email. Passwords may be any **non-empty** length for this demo; they remain salted and hashed with the Cloudflare-compatible PBKDF2 iteration count (100000). Short passwords are insecure; do not use this policy for production.

## Limitations

Company ID is a login namespace **only**, not complete multi-tenant isolation. Work orders, PMs, migration records and assets are not yet company-scoped. Do not onboard multiple independent companies until tenant isolation and authorization are implemented and audited. The public outside-user ticket route remains public. No live Cloudflare deployment tests have been run.

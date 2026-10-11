# PULSE v0.6 — Experience Rebuild (deployment candidate)

A redesigned, data-connected PULSE CMMS built from the v0.5 Cloudflare Workers/D1 application. This is a **test candidate**, not a production-certified release.

## What's included

- New responsive enterprise interface: Command Center, Work Orders, PM, Planner, Assets, Maintenance Requests, Report Builder, Settings.
- Real D1-backed lists and detail panels (no fake dashboard metrics).
- Professional full-page-like creation workspace in a slide-out drawer, with technician assignment and site selection for work orders and PMs.
- Expanded PM calendar intervals: daily, weekly, monthly, quarterly (3 months), semiannual (6 months), annual, and custom multiples of days/weeks/months/years. PMs start paused and require activation. Cron Trigger generates WOs with inherited assignee.
- Per-user saved appearance, density, visible modules and dashboard widget settings.
- Live tabular Report Builder with saved report definitions and CSV export.
- Existing user auth, equipment library, asset registry, sites, audit, and migration endpoints retained.

## BEFORE DEPLOYMENT: DATABASE BACKUP AND SCHEMA REPAIR

**IMPORTANT:** Earlier v0.5 deployments had partially applied migrations. DO NOT run all ALTER TABLE migrations again or recreate the D1 database. The `scripts/repair_d1.mjs` utility checks remote D1 table/column presence before making additive changes.

1. In Cloudflare, make a D1 backup / Time Travel bookmark of `pulse-db`.
2. Extract the ZIP and open a terminal in the project directory. Run `npm install`.
3. Ensure you are authenticated with Wrangler (`npx wrangler whoami`).
4. Run `node scripts/repair_d1.mjs` to **preview** the exact schema additions against the remote database. No writes occur.
5. Review the output. When ready, run `node scripts/repair_d1.mjs --apply`. This adds only missing v0.5/v0.6 tables and columns and idempotent indexes. If an error occurs, stop and inspect before retrying.
6. Run `npm run deploy` to deploy the Worker and assets.
7. Verify `/api/health`, sign in, and test Assets, PM, Sites, Audit, Report Builder, Settings, and PM auto-generation.

The reconciliation utility assumes earlier migrations through v0.4 were applied. If the foundational `assets`, `pm_plans`, or `work_orders` tables are absent, it aborts rather than guessing. It does not attempt to repair unrelated schema changes. Back up first.

## Verification checklist

- [ ] Existing admin login works.
- [ ] All sidebar pages load without D1 errors.
- [ ] Company/site-specific data is not accessible to unauthorized accounts.
- [ ] Create an asset, work order, and PM; verify assignee persisted.
- [ ] Activate a PM due today; verify scheduled Worker generates one WO and inherits assignee. Confirm duplicate protection.
- [ ] Pause PM and verify future occurrences stop.
- [ ] Change theme, density, navigation, dashboard widgets; sign out/in and confirm persistence.
- [ ] Save a report, export CSV and confirm content.
- [ ] Check audit logs for create/update actions.
- [ ] Test phone-sized layout and keyboard navigation.

## Known gaps and limitations

- The Maintenance Planner is a chronological timeline, not yet a drag-and-drop technician calendar.
- Saved reports store the report definition; advanced charting, scheduled delivery and PDF export are not yet implemented.
- The Fiix Migration Studio UI is not recreated yet, although existing migration endpoints remain. Retain your previous migration workflow until the new interface is validated.
- The asset-detail drawer shows current record data, not yet a complete documentation/history workspace.
- Company/role/site security has not undergone a comprehensive external audit. Legacy v0.4 import endpoints need further tenant-isolation hardening before multi-customer production use.
- Request intake submission remains available at `/api/ticket`, but the dedicated public submission form is not included in this release.
- Automatic PM scheduler uses hourly UTC Cron. The system needs production tests for concurrency, due dates, timezone rules and high-volume catch-up.

**Do not onboard paying customers until these gaps and the security test plan are addressed.**

# PULSE CMMS v0.5 — Enterprise Foundation (pilot build)

## Deployment
1. Back up the **production** `pulse-db` D1 database using Cloudflare D1 Time Travel.
2. Ensure migrations 0001 through 0004 are already applied. Verify with `PRAGMA table_info(assets);` and check that `equipment_models` exists.
3. Apply **migrations/0005_enterprise_pm.sql once** in Cloudflare D1 Console. This migration uses `ALTER TABLE`; rerunning will produce duplicate-column errors.
4. Upload the extracted files to the root of existing GitHub repository `jmyall93/pulse` and commit.
5. Set Cloudflare Workers deployment command to `npx wrangler deploy`; the existing `wrangler.jsonc` references the existing `pulse-db` and configures an hourly cron (`0 * * * *`). Confirm the Cron Trigger is active in Cloudflare after deployment.
6. Sign in at the existing PULSE URL. Verify **Sites**, **Assets**, **Preventive Maintenance**, **Audit Trail**, and **Administration**.

## New capabilities
- Dedicated Assets navigation; equipment library remains in Assets.
- Create sites (company admin), site membership API, site-scoped reads for assets/work orders/PMs.
- Create recurring PM plans with calendar-based day/week/month/year intervals, initially paused; activate to schedule automatic work-order creation.
- Hourly scheduled Worker uses D1 batch transactions and a unique `(pm_id, due_date)` key to prevent duplicate work orders for the same occurrence.
- Audit events for key site, PM, and work-order actions.
- Expanded Administration navigation and retained appearance controls.

## Important pilot limitations
- This is **not** production-ready multi-tenant authorization. Existing endpoints (including Fiix migration, document access, some asset profile and team functions) require a complete permission and tenant isolation review. Some company/site fields remain legacy free text. Public ticket intake currently routes to `pulse-demo` only.
- Existing imported PMs remain disabled until explicitly configured with supported recurrence fields.
- Company-level appearance preference storage endpoint exists, but the interface still primarily uses browser-local preferences.
- Site membership management currently has a backend endpoint but not a full UI. Custom role editor is not implemented; five predefined roles remain.
- Audit logging covers selected actions, not every data mutation; audit records are not tamper-proof.
- Scheduler is hourly and handles up to 100 due plans per invocation; monitoring and backlog draining require further work. It is not yet end-to-end verified in Cloudflare.
- Creating a PM requires an existing asset; when using a site-specific PM, the asset must have a matching `site_id`. Existing assets can remain unassigned; a site assignment UI is still needed.
- Manual discovery remains an external search/review workflow, not autonomous manual verification.
- Before onboarding any real customer, implement complete tenant/site isolation, security tests, backups, role-permission matrix, user/site administration, rate limiting, CSRF protection and stronger password policy.

## Quick test
1. Create a site (Sites).
2. Create an asset (Assets); use an unassigned site for the first PM smoke test.
3. Create a PM due today (Preventive Maintenance), then Activate.
4. Verify the Cloudflare Cron Trigger is configured and let it execute. Confirm exactly one work order is created with source `Scheduled PM`.
5. Confirm the PM next due date advances. Run the scheduled handler again; it must not create a duplicate for the same occurrence.
6. Check Audit Trail for the PM create/activate events.

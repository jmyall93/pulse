# PULSE CMMS — JELIX portfolio MVP

Cloudflare Pages + Pages Functions + D1 database. Public maintenance requests automatically generate work orders. No build command needed.

## Deploy (GitHub + Cloudflare)
1. Create a new GitHub repository and upload the **contents** of this folder, preserving `public/`, `functions/` and `migrations/`.
2. In Cloudflare, create a D1 database named `pulse-db` under Storage & databases → D1.
3. Open D1's SQL console, paste and execute `migrations/0001_init.sql`.
4. Workers & Pages → Create → Pages → Connect to Git → select repository. Choose **no framework**, leave build command blank, set build output directory to `public`.
5. In the Pages project, Settings → Bindings → Add → D1 database. Set **variable name `PULSE_DB`** and select `pulse-db`. Add it to production (and preview if testing previews). **Redeploy** after binding.
6. Open your Cloudflare Pages URL. The first visitor is prompted to create the administrator. **Create the admin immediately before sharing the link**.
7. Test outside ticket submission from the login page, then log in and verify a work order appears under Request Intake and Work Orders.

## Important before commercial launch
This is an initial pilot, not a production-hardened commercial CMMS. Public intake has a honeypot but **needs Turnstile, rate limiting and abuse controls**. First-admin bootstrap is first-come-first-served: set it up immediately; restrict the site until complete. Add CSRF protections, password reset, MFA, granular authorization, audit trails, tenant/site separation, email notifications, backups, privacy/retention controls, attachments and more robust validation before deploying to real customers. Role labels exist, but work order authorization is not yet granular. Do not enter sensitive facility or personal information in this pilot.

## Scope
Implemented: first admin bootstrap, salted PBKDF2 password hashing, HttpOnly secure sessions, admin-created user accounts, outside ticket → work order, work order creation/status/assignment, priority queue, search/filter, mobile-friendly dashboard. Planned: asset registry, PM scheduling, inventory, technician mobile workflows, reporting, multi-tenancy, JWorks/TRACE integrations.


## v0.2 Migration Studio
After deploying, run `migrations/0002_migration.sql` in the SAME D1 database. Go to Migration Studio as administrator or manager. Upload separate Fiix CSV exports in order: assets, work orders, scheduled maintenance. Map fields, validate, preview and confirm import. Original Fiix IDs are used as source-scoped deduplication keys. Re-imports skip existing IDs (no update). PMs import disabled to avoid accidentally generating work orders. Imports run in batches of 100; each upload is limited to 5 MB / 10,000 parsed rows. Export reports vary by Fiix version; adjust field mapping accordingly. Only CSV is supported in this version. Theme choices are stored per browser, not yet synchronized to user profiles. Test on staging before production.

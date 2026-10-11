# PULSE v0.4 — Asset & Equipment Intelligence

Cloudflare Workers + D1; keeps existing `src/worker.js`, `src/api.js`, `public/index.html`, and `wrangler.jsonc`.

## Upgrade
1. Back up D1 using Cloudflare Time Travel/bookmark.
2. Confirm migrations 0001–0003 were applied.
3. Run `migrations/0004_asset_intelligence.sql` **once** in the existing `pulse-db` D1 console.
4. Upload the contents of this ZIP to the root of the existing `jmyall93/pulse` GitHub repository, replacing matching files.
5. Deploy with `npx wrangler deploy`, then sign in and open Asset Intelligence.

## Implemented
- Asset Registry: create/list/filter/view asset records, site/building/system hierarchy fields, condition, serial number.
- Equipment Library: reusable manufacturer/model profiles.
- Document approval: staff-entered HTTPS manufacturer manual links, shared with assets using the same equipment model.
- Discovery: opens a targeted web search for make/model manuals; **does not automatically crawl, verify, or attach manuals**. This requires a vetted search integration.
- Asset profile: approved documents, linked work order history, PM drafts.
- PM drafts: stored disabled, not auto-scheduled.
- Company-scoped access for new assets, equipment, documents and PM draft endpoints.

## Limitations and security
- The prior Fiix import endpoint is unchanged and currently needs company-scoping hardening before multitenant commercial use.
- Existing work orders are not company-isolated. Do not onboard unrelated customers until full tenancy isolation and access tests are complete.
- No file upload or R2 storage, OCR, automatic manual validation, or AI extraction yet.
- Password minimum remains disabled for the demo as previously requested; restore stronger password policies before launch.
- Migration 0004 is intended for the known v0.3.2 schema; don't rerun after success.
- Source syntax validated; production integration tests still required.

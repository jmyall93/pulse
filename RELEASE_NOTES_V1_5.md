# PULSE by REYLEX v1.5 — Maintenance Operations (development build)

Built from the v1.4 application. Includes existing one-click work-order creation, start and completion, and grouped navigation.

## Implemented

- **Inventory:** tenant-scoped part records, stock adjustment, reorder thresholds, suppliers, storage locations, and unit costs.
- **Work-order closeout:** findings, labor hours, downtime, failure code, and *one selected inventory part* in the frontend. The API supports multiple part lines. Stock is deducted in the same D1 batch as completion; negative stock is blocked by a database constraint.
- **Digital inspections:** reusable checklists, pass/fail submissions, linked work orders/assets, and inspection history. The API supports numeric/text answers, but the current template editor creates pass/fail questions.
- **Maintenance planner:** work-order scheduling with planned date, estimated hours, and notes. No drag-and-drop or capacity calculations yet.
- **Asset meters:** manual readings for hours/cycles/other measurements. Meter-triggered automatic PMs are NOT implemented.
- **Asset links:** deep links to asset details that can be encoded in QR labels. This release does NOT generate QR images or offer an in-app camera scanner.
- **Attachments:** tenant-scoped private R2 uploads/downloads for work orders, assets and inspection results, limited to JPG/PNG/WebP/PDF/TXT and 10 MB. R2 binding is OPTIONAL; uploads report a configuration error until it is connected.
- **Navigation:** adds Parts & Inventory and Inspections to the existing grouped sidebar.

## Not yet implemented

- Fully functional cross-vendor CMMS import: existing Migration Studio preview and legacy Fiix API remain, but are NOT a complete, tenant-safe multi-vendor migration solution. Do not use the legacy importer for production migrations.
- Camera-based QR scanning, QR image generation, multi-part selection in the closeout form, inspection-triggered corrective work orders, meter-based PM generation, drag-and-drop planning, and offline technician mode.
- Automated end-to-end testing against production Cloudflare services.

## Deployment

1. Back up D1 `pulse-db` and preserve the current GitHub commit.
2. Apply `migrations/0009_work_order_activity.sql` if not already applied. Then apply `migrations/0010_maintenance_operations.sql` **once** in Cloudflare D1 Console. The `ALTER TABLE` statements in 0010 are not idempotent; do not rerun them.
3. Optional file uploads: create a **private** Cloudflare R2 bucket and bind it to this Worker as `PULSE_FILES`. If deploying from wrangler configuration, add `r2_buckets` with `binding: PULSE_FILES` and the actual bucket name; do not use a made-up bucket name. Without this, all other modules still work, but uploads fail clearly.
4. Deploy application files from this ZIP to the existing GitHub/Cloudflare project. Hard refresh the browser.
5. Test with administrator, supervisor, technician, and viewer accounts before enabling for customers. Verify tenant boundaries, inventory deduction, checklist completion, and R2 permissions.

## Validation performed

- `node --check` on Worker API and extracted inline frontend script.
- All SQL migrations 0001–0010 applied sequentially to an in-memory SQLite test database.
- ZIP integrity checked.

**Not validated:** live Cloudflare Worker, D1, R2, browser UX, multi-user concurrency, security penetration tests. Development release only.

# PULSE by REYLEX — v1.3 Field Workflow Update

Built on the user-designated v1.2 support/dashboard release.

## Implemented
- New **My Work** navigation and mobile-friendly assigned-work list, with counts for active and completed assignments.
- Technician **Start** and **Complete** actions using the existing work-order PATCH API.
- Asset detail drawer now shows related work orders as maintenance history, using existing asset codes.
- Server-side work-order updates preserve existing technician assignments when only the status changes.
- Server-side restriction: technicians can update only work orders assigned to them, and cannot reassign work orders.
- No new database tables or migrations are required for these changes.

## Important limitations
- This is a v1.3 development increment, **not** implementation of every feature in the broader research roadmap.
- Offline synchronization, QR scanning, inventory, inspection templates, validated legacy CMMS imports, detailed labor/parts accounting, and full visual scheduling are **not implemented** here.
- Existing v1.2 database migrations must already be applied. This release does not repair incomplete schemas.
- JavaScript syntax and archive integrity were checked; live Cloudflare and browser end-to-end testing have not been performed.

## Deploy
1. Back up the existing D1 database and preserve the current GitHub commit.
2. Replace project files with this package; deploy through the existing GitHub/Cloudflare workflow.
3. Hard-refresh the browser and test **My Work** with a technician account assigned a work order.
4. Test Start/Complete, confirm the assigned technician is preserved, and verify that unassigned technicians cannot change someone else's work order.
5. Open an asset with a linked work order to verify Maintenance History.

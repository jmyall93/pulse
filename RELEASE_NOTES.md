# PULSE by REYLEX — Operations update (development build)

## Implemented
- Support tickets: create, list, administrator status updates, tenant filtering.
- Technical Knowledge Base: six starter articles with in-page search.
- Dashboard status bars, toggle under Settings (saved per user).
- Calendar: monthly view with work orders and PM due dates plus upcoming agenda.
- Migration Studio: source selector for 16 systems, CSV header and row-count preview. **Other vendor integrations are not implemented**; this is NOT a migration engine.
- Existing user creation functionality remains under Settings → Administration.

## Database deployment
1. Backup existing `pulse-db`.
2. Apply `migrations/0007_support.sql` to the existing D1 database.
3. Check PM schema contains `schedule_unit`, `schedule_interval`, `priority`, `assigned_to`; add missing columns individually, as previously discussed.
4. Deploy this package through your normal GitHub/Cloudflare workflow.
5. Hard refresh and test Support ticket creation, calendar, chart toggle, and existing Create PM/WO/Asset actions.

## Not complete
This is **not commercial-ready**. Vendor-specific import/mapping, site hero redesign, full admin user lifecycle, ticket attachments/replies, deep knowledge base, and enterprise testing remain open. Support articles are starter text, not illustrated guides. No live Cloudflare/D1 integration test has been performed.

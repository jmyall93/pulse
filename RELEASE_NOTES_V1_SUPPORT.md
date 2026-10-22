# PULSE by REYLEX — Support & Dashboard Update

## Included
- Navigation icon fallback and explicit icons for Calendar, Support Center, and Migration Studio.
- Redesigned Active Facility selector.
- Dashboard chart configuration: bar, line, area, pie, doughnut; work-order status, priority, site, PM state and asset state. Saves the current chart selection in workspace preferences.
- Searchable technical knowledge base with 25 step-by-step articles and honest availability notes.
- Ticket detail with status and threaded comments. Removed customer-side status controls. The old status endpoint now denies requests; a separate authenticated Reylex Support console remains future work.

## Deploy
1. Back up D1 `pulse-db`.
2. Apply `migrations/0008_support_knowledge.sql` using the D1 Console. It is safe to rerun and does not delete existing tickets.
3. Upload the files to the PULSE GitHub repository and deploy via Cloudflare.
4. Hard-refresh and test ticket opening, comments, knowledge articles, site filtering, and chart preferences.

## Limitations
- This is a development release. It is not certified commercially ready.
- A centrally authenticated Reylex technician/support portal is NOT implemented. Customer administrators cannot change support ticket status.
- Graph customization supports one saved chart at a time; full multi-widget drag-and-drop configuration is future work.
- Knowledge articles describe available workflows and disclose unavailable modules. No invented features are presented as functional.
- The application still needs comprehensive D1 schema validation and live browser tests.

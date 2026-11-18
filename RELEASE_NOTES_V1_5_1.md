# PULSE by REYLEX v1.5.1 — Migration Studio & Record Details

- Migration Studio navigation opens a full guided import page. The Settings shortcut now opens the same page.
- CSV parser supports quoted commas, escaped quotes and multiline fields. Maximum 4 MB and 1,000 rows per file; imported in batches.
- Select source platform, record type, map source columns to PULSE fields, preview, validate duplicate source IDs, import and review row-level errors.
- Server supports CSV-based imports from any selected source into assets, PMs and work orders, subject to the documented schema. This is **not** a vendor API connector or a guarantee that every proprietary export format works.
- Tenant-scoped inserts, source-specific duplicate keys and asset linkage checks. PMs import paused. Existing migration_keys table is reused; no new migration required.
- Record drawers show readable business fields, with internal UUIDs in a collapsed Technical record identifiers section. Existing IDs remain unchanged.

## Before deployment
Back up D1 and the current deployed GitHub revision. Deploy project files. Test with a small CSV of assets, then PMs, then work orders. Confirm tenant permissions and asset associations. Live Cloudflare integration tests have not been run.

-- New v1 operations tables. Apply once to your EXISTING pulse-db after taking a backup.
CREATE TABLE IF NOT EXISTS support_tickets(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,created_by TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,kind TEXT NOT NULL,priority TEXT NOT NULL DEFAULT 'Normal',status TEXT NOT NULL DEFAULT 'Open',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_support_tenant ON support_tickets(company_id,created_at);
CREATE TABLE IF NOT EXISTS support_articles(id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,body TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 1);
INSERT OR IGNORE INTO support_articles(id,title,category,body) VALUES
('kb-wo','Create a Work Order','Work Orders','Open Work Orders, select Create Work Order, complete the required fields, then save. Assign a technician and confirm the work order appears in the list.'),
('kb-pm','Create Preventive Maintenance','Preventive Maintenance','Register an asset first. Open Preventive Maintenance, choose Create PM, select the asset and frequency, and save. New schedules are paused until you activate them.'),
('kb-asset','Register an Asset','Assets','Open Assets, choose Create Asset, enter the equipment identification and location, select the facility, then save.'),
('kb-sites','Configure Facilities','Administration','An administrator can create sites from Settings. Site permissions determine which facility records technicians can access.'),
('kb-import','Prepare a CMMS Migration','Migration','Export source records as CSV with stable original IDs. Review the mapping and duplicates before importing. Only Fiix import is currently supported; other vendor profiles are planned.'),
('kb-troubleshoot','Troubleshoot a Save Error','Troubleshooting','If saving fails, check required fields and permissions. Administrators should inspect Cloudflare Worker logs and verify that D1 migrations have been applied.');

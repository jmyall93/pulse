-- PULSE v0.6, apply only after 0005 is complete.
ALTER TABLE pm_plans ADD COLUMN assigned_to TEXT NOT NULL DEFAULT '';
ALTER TABLE work_orders ADD COLUMN work_type TEXT NOT NULL DEFAULT 'Corrective';
CREATE TABLE IF NOT EXISTS pulse_settings(user_id TEXT PRIMARY KEY,company_id TEXT NOT NULL,layout_json TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS saved_reports(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,owner_id TEXT NOT NULL,name TEXT NOT NULL,source TEXT NOT NULL,config_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_reports_company ON saved_reports(company_id,owner_id);

-- Apply after 0004. Backup D1 first. Run ONCE.
CREATE TABLE IF NOT EXISTS sites(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,code TEXT NOT NULL,name TEXT NOT NULL,address TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(company_id,code));
CREATE TABLE IF NOT EXISTS site_memberships(site_id TEXT NOT NULL,user_id TEXT NOT NULL,PRIMARY KEY(site_id,user_id));
CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,site_id TEXT,actor_id TEXT,action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_events(company_id,created_at);
CREATE TABLE IF NOT EXISTS user_preferences(user_id TEXT PRIMARY KEY,company_id TEXT NOT NULL,theme TEXT NOT NULL DEFAULT 'hybrid',density TEXT NOT NULL DEFAULT 'comfortable',accent TEXT NOT NULL DEFAULT 'blue');
CREATE TABLE IF NOT EXISTS pm_occurrences(id TEXT PRIMARY KEY,pm_id TEXT NOT NULL,company_id TEXT NOT NULL,site_id TEXT,due_date TEXT NOT NULL,work_order_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(pm_id,due_date));
ALTER TABLE assets ADD COLUMN site_id TEXT;
ALTER TABLE work_orders ADD COLUMN company_id TEXT NOT NULL DEFAULT 'pulse-demo';
ALTER TABLE work_orders ADD COLUMN site_id TEXT;
ALTER TABLE work_orders ADD COLUMN pm_id TEXT;
ALTER TABLE work_orders ADD COLUMN pm_due_date TEXT;
ALTER TABLE pm_plans ADD COLUMN site_id TEXT;
ALTER TABLE pm_plans ADD COLUMN schedule_unit TEXT NOT NULL DEFAULT '';
ALTER TABLE pm_plans ADD COLUMN schedule_interval INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pm_plans ADD COLUMN priority TEXT NOT NULL DEFAULT 'Normal';
CREATE INDEX IF NOT EXISTS idx_wo_tenant ON work_orders(company_id,site_id);
CREATE INDEX IF NOT EXISTS idx_pm_due ON pm_plans(enabled,next_due);
CREATE INDEX IF NOT EXISTS idx_assets_site ON assets(company_id,site_id);

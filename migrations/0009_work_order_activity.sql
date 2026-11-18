-- PULSE v1.4: required for work order completion notes and labor tracking.
-- Apply once to the existing D1 database before deploying v1.4.
CREATE TABLE IF NOT EXISTS work_order_activity (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 work_order_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 action TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '',
 labor_hours REAL NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wo_activity_tenant_order ON work_order_activity(company_id,work_order_id,created_at);

-- v1.5: Apply after 0009; D1 backup first. Existing work_order_activity must exist.
ALTER TABLE work_order_activity ADD COLUMN down_time_hours REAL NOT NULL DEFAULT 0;
ALTER TABLE work_order_activity ADD COLUMN failure_code TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS inventory_parts (id TEXT PRIMARY KEY,company_id TEXT NOT NULL,sku TEXT NOT NULL,name TEXT NOT NULL,description TEXT DEFAULT '',location TEXT DEFAULT '',supplier TEXT DEFAULT '',quantity REAL NOT NULL DEFAULT 0 CHECK(quantity>=0),reorder_point REAL NOT NULL DEFAULT 0,unit_cost REAL NOT NULL DEFAULT 0,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(company_id,sku));
CREATE TABLE IF NOT EXISTS work_order_parts (id TEXT PRIMARY KEY,company_id TEXT NOT NULL,work_order_id TEXT NOT NULL,part_id TEXT NOT NULL,quantity REAL NOT NULL CHECK(quantity>0),unit_cost REAL NOT NULL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_wo_parts ON work_order_parts(company_id,work_order_id);
CREATE TABLE IF NOT EXISTS inspection_templates (id TEXT PRIMARY KEY,company_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT DEFAULT '',items_json TEXT NOT NULL,created_by TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS inspection_results (id TEXT PRIMARY KEY,company_id TEXT NOT NULL,template_id TEXT NOT NULL,work_order_id TEXT,asset_code TEXT,completed_by TEXT,answers_json TEXT NOT NULL,failed INTEGER NOT NULL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS maintenance_plans (company_id TEXT NOT NULL,work_order_id TEXT NOT NULL,planned_date TEXT NOT NULL,estimated_hours REAL NOT NULL DEFAULT 0,notes TEXT DEFAULT '',PRIMARY KEY(company_id,work_order_id));
CREATE TABLE IF NOT EXISTS asset_meter_readings (id TEXT PRIMARY KEY,company_id TEXT NOT NULL,asset_code TEXT NOT NULL,meter_name TEXT NOT NULL,value REAL NOT NULL,recorded_by TEXT,recorded_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS file_attachments (id TEXT PRIMARY KEY,company_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,storage_key TEXT NOT NULL,file_name TEXT NOT NULL,content_type TEXT NOT NULL,file_size INTEGER NOT NULL,uploaded_by TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_attachments ON file_attachments(company_id,entity_type,entity_id);

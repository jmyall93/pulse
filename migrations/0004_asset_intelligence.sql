-- PULSE v0.4. Apply once after migrations 0001, 0002, 0003.
CREATE TABLE IF NOT EXISTS equipment_models (id TEXT PRIMARY KEY,company_id TEXT NOT NULL,manufacturer TEXT NOT NULL,model TEXT NOT NULL,category TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment_models(company_id,manufacturer,model);
CREATE TABLE IF NOT EXISTS equipment_documents (id TEXT PRIMARY KEY,company_id TEXT NOT NULL,equipment_model_id TEXT NOT NULL,title TEXT NOT NULL,document_type TEXT NOT NULL DEFAULT 'Manual',url TEXT NOT NULL,revision TEXT NOT NULL DEFAULT '',verification_status TEXT NOT NULL DEFAULT 'Approved',added_by TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(equipment_model_id) REFERENCES equipment_models(id));
CREATE INDEX IF NOT EXISTS idx_equipment_docs ON equipment_documents(company_id,equipment_model_id);
ALTER TABLE assets ADD COLUMN company_id TEXT NOT NULL DEFAULT 'pulse-demo';
ALTER TABLE assets ADD COLUMN equipment_model_id TEXT;
ALTER TABLE assets ADD COLUMN site TEXT NOT NULL DEFAULT '';
ALTER TABLE assets ADD COLUMN building TEXT NOT NULL DEFAULT '';
ALTER TABLE assets ADD COLUMN system_name TEXT NOT NULL DEFAULT '';
ALTER TABLE assets ADD COLUMN serial_number TEXT NOT NULL DEFAULT '';
ALTER TABLE assets ADD COLUMN status TEXT NOT NULL DEFAULT 'Operational';
ALTER TABLE assets ADD COLUMN manufacturer TEXT NOT NULL DEFAULT '';
ALTER TABLE assets ADD COLUMN model TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_assets_company ON assets(company_id,code);
ALTER TABLE pm_plans ADD COLUMN company_id TEXT NOT NULL DEFAULT 'pulse-demo';
CREATE INDEX IF NOT EXISTS idx_pm_company ON pm_plans(company_id,asset_code);

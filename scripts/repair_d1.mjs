// Schema reconciliation for partially applied PULSE migrations. Requires Wrangler login.
// Default is read-only dry-run. Explicit --apply executes missing statements remotely.
import {execFileSync} from 'node:child_process';
const apply=process.argv.includes('--apply');
const db='pulse-db';
function query(sql){const out=execFileSync('npx',['wrangler','d1','execute',db,'--remote','--json','--command',sql],{encoding:'utf8',maxBuffer:1024*1024});const parsed=JSON.parse(out);return parsed[0]?.results||[]}
function execute(sql){execFileSync('npx',['wrangler','d1','execute',db,'--remote','--command',sql],{stdio:'inherit'})}
const tables={
 sites:`CREATE TABLE IF NOT EXISTS sites(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,code TEXT NOT NULL,name TEXT NOT NULL,address TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(company_id,code))`,
 site_memberships:`CREATE TABLE IF NOT EXISTS site_memberships(site_id TEXT NOT NULL,user_id TEXT NOT NULL,PRIMARY KEY(site_id,user_id))`,
 audit_events:`CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,site_id TEXT,actor_id TEXT,action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 user_preferences:`CREATE TABLE IF NOT EXISTS user_preferences(user_id TEXT PRIMARY KEY,company_id TEXT NOT NULL,theme TEXT NOT NULL DEFAULT 'hybrid',density TEXT NOT NULL DEFAULT 'comfortable',accent TEXT NOT NULL DEFAULT 'blue')`,
 pm_occurrences:`CREATE TABLE IF NOT EXISTS pm_occurrences(id TEXT PRIMARY KEY,pm_id TEXT NOT NULL,company_id TEXT NOT NULL,site_id TEXT,due_date TEXT NOT NULL,work_order_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(pm_id,due_date))`,
 pulse_settings:`CREATE TABLE IF NOT EXISTS pulse_settings(user_id TEXT PRIMARY KEY,company_id TEXT NOT NULL,layout_json TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 saved_reports:`CREATE TABLE IF NOT EXISTS saved_reports(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,owner_id TEXT NOT NULL,name TEXT NOT NULL,source TEXT NOT NULL,config_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
};
const columns={
 assets:{site_id:'TEXT'},
 work_orders:{company_id:"TEXT NOT NULL DEFAULT 'pulse-demo'",site_id:'TEXT',pm_id:'TEXT',pm_due_date:'TEXT',work_type:"TEXT NOT NULL DEFAULT 'Corrective'"},
 pm_plans:{site_id:'TEXT',schedule_unit:"TEXT NOT NULL DEFAULT ''",schedule_interval:'INTEGER NOT NULL DEFAULT 1',priority:"TEXT NOT NULL DEFAULT 'Normal'",assigned_to:"TEXT NOT NULL DEFAULT ''"}
};
const indexes=[
 'CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_events(company_id,created_at)',
 'CREATE INDEX IF NOT EXISTS idx_wo_tenant ON work_orders(company_id,site_id)',
 'CREATE INDEX IF NOT EXISTS idx_pm_due ON pm_plans(enabled,next_due)',
 'CREATE INDEX IF NOT EXISTS idx_assets_site ON assets(company_id,site_id)',
 'CREATE INDEX IF NOT EXISTS idx_reports_company ON saved_reports(company_id,owner_id)'
];
const existing=new Set(query("SELECT name FROM sqlite_master WHERE type='table'").map(r=>r.name));
const statements=[];
for(const [name,sql] of Object.entries(tables))if(!existing.has(name))statements.push(sql);
for(const [table,defs] of Object.entries(columns)){
 if(!existing.has(table))throw Error(`Missing foundational table ${table}; apply earlier migrations before repair.`);
 const cols=new Set(query(`PRAGMA table_info(${table})`).map(r=>r.name));
 for(const [name,def] of Object.entries(defs))if(!cols.has(name))statements.push(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
}
statements.push(...indexes);
console.log(`${statements.length} statements to check/apply. Mode: ${apply?'APPLY':'DRY RUN'}`);
for(const sql of statements){console.log(sql+';');if(apply)execute(sql)}
if(!apply)console.log('Review output and take a D1 backup before running: node scripts/repair_d1.mjs --apply');

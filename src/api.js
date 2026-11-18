const json=(v,s=200,headers={})=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json',...headers}});
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
async function sha(s){return hex(await crypto.subtle.digest('SHA-256',enc.encode(s)))}
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
const cookie=(token,maxAge)=>`pulse_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
const uid=()=>crypto.randomUUID();
async function current(request,db){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)pulse_session=([^;]+)/)?.[1];if(!token)return null;return await db.prepare('SELECT u.id,u.name,u.email,u.role,u.company_id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await sha(token),Date.now()).first()}
async function body(request){try{return await request.json()}catch{return {}}}
const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
const companyId=v=>clean(v,64).toLowerCase();
const usernameOf=v=>clean(v,80).toLowerCase();

const can=(u,action)=>({admin:['*'],manager:['sites.read','assets.read','assets.write','pm.read','pm.write','orders.read','orders.write','audit.read','settings.read'],supervisor:['sites.read','assets.read','assets.write','pm.read','pm.write','orders.read','orders.write'],technician:['sites.read','assets.read','pm.read','orders.read','orders.write'],viewer:['sites.read','assets.read','pm.read','orders.read']}[u.role]||[]).some(p=>p==='*'||p===action);
async function allowedSite(db,u,site){if(!site)return true;if(u.role==='admin'||u.role==='manager')return !!await db.prepare('SELECT id FROM sites WHERE id=? AND company_id=?').bind(site,u.company_id).first();return !!await db.prepare('SELECT 1 FROM site_memberships sm JOIN sites s ON s.id=sm.site_id WHERE sm.user_id=? AND s.id=? AND s.company_id=?').bind(u.id,site,u.company_id).first()}
async function audit(db,u,action,entity,entityId,details={},site=null){await db.prepare('INSERT INTO audit_events(id,company_id,site_id,actor_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?,?,?,?)').bind(uid(),u.company_id,site,u.id,action,entity,entityId,JSON.stringify(details)).run()}
function nextDue(date,unit,interval){let d=new Date(date+'T12:00:00Z');if(!Number.isFinite(d.getTime()))throw Error('Invalid due date');if(unit==='day')d.setUTCDate(d.getUTCDate()+interval);else if(unit==='week')d.setUTCDate(d.getUTCDate()+7*interval);else if(unit==='month'){let day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+interval);let last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last))}else if(unit==='year'){let month=d.getUTCMonth(),day=d.getUTCDate();d.setUTCDate(1);d.setUTCFullYear(d.getUTCFullYear()+interval);d.setUTCMonth(month);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),month+1,0)).getUTCDate()))}else throw Error('Invalid frequency');return d.toISOString().slice(0,10)}
export async function runPmScheduler(db){const today=new Date().toISOString().slice(0,10);let count=0;const due=await db.prepare("SELECT * FROM pm_plans WHERE enabled=1 AND next_due<>'' AND next_due<=? AND schedule_unit IN ('day','week','month','year') AND schedule_interval BETWEEN 1 AND 365 LIMIT 100").bind(today).all();for(const pm of due.results){try{const next=nextDue(pm.next_due,pm.schedule_unit,pm.schedule_interval),wo='WO-PM-'+uid().slice(0,20).toUpperCase();await db.batch([db.prepare('INSERT INTO pm_occurrences(id,pm_id,company_id,site_id,due_date,work_order_id) VALUES(?,?,?,?,?,?)').bind(uid(),pm.id,pm.company_id,pm.site_id,pm.next_due,wo),db.prepare('INSERT INTO work_orders(id,title,description,status,priority,location,asset,source,company_id,site_id,pm_id,pm_due_date,assigned_to,work_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(wo,pm.title,pm.description,'New',pm.priority,'',pm.asset_code,'Scheduled PM',pm.company_id,pm.site_id,pm.id,pm.next_due,pm.assigned_to||'','Preventive'),db.prepare('UPDATE pm_plans SET next_due=? WHERE id=? AND next_due=?').bind(next,pm.id,pm.next_due)]);count++}catch(e){console.error('PULSE PM scheduler',pm.id,e.name,e.message)}}return count}

export async function onRequest({request,env}){
 const db=env.PULSE_DB;if(!db)return json({error:'D1 binding PULSE_DB is missing. See README.'},503);
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'');const method=request.method;
 try{
 if(path==='health')return json({ok:true});
 if(path==='setup'&&method==='POST'){
  const existing=await db.prepare('SELECT COUNT(*) AS n FROM users').first();if(existing.n)return json({error:'Setup already completed'},403);
  const b=await body(request),name=clean(b.name,100),email=clean(b.email,180).toLowerCase(),username=usernameOf(b.username),company=companyId(b.company_id),password=String(b.password??'');
  if(!name||!/^\S+@\S+\.\S+$/.test(email)||!username||!/^[a-z0-9._-]+$/.test(username)||company!=='pulse-demo'||!password.length)return json({error:'Enter name, email, username, company ID pulse-demo and a non-empty password'},400);
  const salt=uid();await db.prepare('INSERT INTO users(id,name,email,password_hash,salt,role,company_id,username) VALUES(?,?,?,?,?,?,?,?)').bind(uid(),name,email,await passwordHash(password,salt),salt,'admin',company,username).run();return json({ok:true});
 }
 if(path==='setup-status'&&method==='GET'){const row=await db.prepare('SELECT COUNT(*) AS n FROM users').first();return json({needsSetup:row.n===0})}
 if(path==='login'&&method==='POST'){
  const b=await body(request),company=companyId(b.company_id),username=usernameOf(b.username);if(!company||!username)return json({error:'Company ID and username required'},400);const u=await db.prepare('SELECT * FROM users WHERE company_id=? AND username=?').bind(company,username).first();
  if(!u||await passwordHash(String(b.password||''),u.salt)!==u.password_hash)return json({error:'Invalid email or password'},401);
  const token=uid()+uid();await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await sha(token),u.id,Date.now()+7*86400000).run();return json({user:{id:u.id,name:u.name,email:u.email,role:u.role,company_id:u.company_id,username:u.username}},200,{'Set-Cookie':cookie(token,604800)});
 }
 if(path==='logout'&&method==='POST'){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)pulse_session=([^;]+)/)?.[1];if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(token)).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)})}
 if(path==='ticket'&&method==='POST'){
  const b=await body(request);if(clean(b.website))return json({ok:true});
  const title=clean(b.title,160),description=clean(b.description,4000),name=clean(b.name,100),email=clean(b.email,180),location=clean(b.location,180);
  if(!title||!description||!name||!/^\S+@\S+\.\S+$/.test(email)||!location)return json({error:'Complete all required fields'},400);
  const id='WO-'+Date.now().toString(36).toUpperCase()+'-'+uid().slice(0,4).toUpperCase();
  await db.prepare('INSERT INTO work_orders(id,title,description,location,requester_name,requester_email,source,priority,company_id) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,title,description,location,name,email,'Outside Request','Normal','pulse-demo').run();return json({ok:true,id},201);
 }
 const user=await current(request,db);if(!user)return json({error:'Please sign in'},401);



 // Customer support tickets are tenant-scoped; only creators and company administrators can read them.
 if(path==='support/tickets'&&method==='GET'){
  const r=await db.prepare("SELECT t.*,u.name AS created_by_name FROM support_tickets t LEFT JOIN users u ON u.id=t.created_by WHERE t.company_id=? AND (?='admin' OR t.created_by=?) ORDER BY t.created_at DESC LIMIT 200").bind(user.company_id,user.role,user.id).all();return json({tickets:r.results});
 }
 if(path==='support/tickets'&&method==='POST'){
  const b=await body(request),title=clean(b.title,180),description=clean(b.description,5000),kind=clean(b.kind,30),priority=clean(b.priority,20);
  if(!title||!description||!['Issue','Feature Request','Question'].includes(kind))return json({error:'Title, description, and valid category required'},400);
  const id='SUP-'+uid().slice(0,10).toUpperCase();await db.prepare('INSERT INTO support_tickets(id,company_id,created_by,title,description,kind,priority) VALUES(?,?,?,?,?,?,?)').bind(id,user.company_id,user.id,title,description,kind,['Low','Normal','High'].includes(priority)?priority:'Normal').run();return json({ok:true,id},201);
 }
 if(path==='support/tickets/status'&&method==='PATCH'){
  return json({error:'Ticket status is managed by Reylex Support; support administration is not enabled in this customer portal'},403);
  if(user.role!=='reylex_support')return json({error:'Reylex support access required'},403);
  const b=await body(request),status=clean(b.status,30),id=clean(b.id,80);
  if(!['Open','In Progress','Resolved','Closed'].includes(status))return json({error:'Invalid status'},400);
  const r=await db.prepare('UPDATE support_tickets SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?').bind(status,id,user.company_id).run();return json({ok:true,changed:r.meta.changes});
 }
 if(path.startsWith('support/tickets/') && method==='GET' && !path.endsWith('/comments')){const id=decodeURIComponent(path.slice('support/tickets/'.length));const t=await db.prepare("SELECT * FROM support_tickets WHERE id=? AND company_id=? AND (created_by=? OR ?='admin')").bind(id,user.company_id,user.id,user.role).first();if(!t)return json({error:'Ticket not found'},404);const c=await db.prepare('SELECT c.*,u.name AS author_name FROM support_comments c LEFT JOIN users u ON u.id=c.author_id WHERE c.ticket_id=? AND c.company_id=? ORDER BY c.created_at ASC').bind(id,user.company_id).all();return json({ticket:t,comments:c.results})}
 if(path.startsWith('support/tickets/') && path.endsWith('/comments') && method==='POST'){const id=decodeURIComponent(path.slice('support/tickets/'.length,-'/comments'.length));const t=await db.prepare("SELECT id FROM support_tickets WHERE id=? AND company_id=? AND (created_by=? OR ?='admin')").bind(id,user.company_id,user.id,user.role).first();if(!t)return json({error:'Ticket not found'},404);const b=await body(request),message=clean(b.message,5000);if(!message)return json({error:'Comment required'},400);await db.prepare('INSERT INTO support_comments(id,ticket_id,company_id,author_id,message) VALUES(?,?,?,?,?)').bind(uid(),id,user.company_id,user.id,message).run();return json({ok:true},201)}
 if(path==='support/articles'&&method==='GET'){
  const r=await db.prepare('SELECT id,title,category,body FROM support_articles WHERE published=1 ORDER BY category,title').all();return json({articles:r.results});
 }
 if(path==='sites'&&method==='GET'){if(!can(user,'sites.read'))return json({error:'Forbidden'},403);const rows=await db.prepare("SELECT s.* FROM sites s WHERE s.company_id=? AND (? IN ('admin','manager') OR EXISTS (SELECT 1 FROM site_memberships sm WHERE sm.site_id=s.id AND sm.user_id=?)) ORDER BY s.name").bind(user.company_id,user.role,user.id).all();return json({sites:rows.results})}
 if(path==='sites'&&method==='POST'){if(user.role!=='admin')return json({error:'Administrator required'},403);const b=await body(request),name=clean(b.name,150),code=clean(b.code,40).toUpperCase();if(!name||!code||!/^[A-Z0-9_-]+$/.test(code))return json({error:'Name and alphanumeric site code required'},400);const id=uid();await db.prepare('INSERT INTO sites(id,company_id,code,name,address) VALUES(?,?,?,?,?)').bind(id,user.company_id,code,name,clean(b.address,250)).run();await audit(db,user,'site.created','site',id,{name,code},id);return json({ok:true,id},201)}
 if(path==='sites/members'&&method==='POST'){if(user.role!=='admin')return json({error:'Administrator required'},403);const b=await body(request),site=clean(b.site_id,80),member=clean(b.user_id,80);const match=await db.prepare('SELECT s.id FROM sites s JOIN users u ON u.company_id=s.company_id WHERE s.id=? AND u.id=? AND s.company_id=?').bind(site,member,user.company_id).first();if(!match)return json({error:'Invalid site or user'},400);await db.prepare('INSERT OR IGNORE INTO site_memberships(site_id,user_id) VALUES(?,?)').bind(site,member).run();await audit(db,user,'site.member_added','site',site,{user_id:member},site);return json({ok:true})}
 if(path==='pm'&&method==='GET'){if(!can(user,'pm.read'))return json({error:'Forbidden'},403);const rows=await db.prepare("SELECT p.* FROM pm_plans p WHERE p.company_id=? AND (? IN ('admin','manager') OR p.site_id IS NULL OR EXISTS(SELECT 1 FROM site_memberships sm WHERE sm.site_id=p.site_id AND sm.user_id=?)) ORDER BY p.next_due").bind(user.company_id,user.role,user.id).all();return json({pm:rows.results})}
 if(path==='pm'&&method==='POST'){if(!can(user,'pm.write'))return json({error:'Forbidden'},403);const b=await body(request),title=clean(b.title,200),asset=clean(b.asset_code,100),site=clean(b.site_id,80)||null,unit=clean(b.schedule_unit,12),interval=Number(b.schedule_interval),due=clean(b.next_due,10),priority=clean(b.priority,20);if(!title||!asset||!['day','week','month','year'].includes(unit)||!Number.isInteger(interval)||interval<1||interval>365||!/^\d{4}-\d{2}-\d{2}$/.test(due))return json({error:'Valid title, asset, frequency and next due date required'},400);nextDue(due,unit,interval);if(site&&!await allowedSite(db,user,site))return json({error:'Site access denied'},403);const a=await db.prepare('SELECT id FROM assets WHERE company_id=? AND code=? AND (site_id=? OR ? IS NULL)').bind(user.company_id,asset,site,site).first();if(!a)return json({error:'Asset not found at selected site'},400);const assignee=clean(b.assigned_to,80);if(assignee&&!await db.prepare('SELECT id FROM users WHERE id=? AND company_id=?').bind(assignee,user.company_id).first())return json({error:'Invalid assignee'},400);const id=uid();await db.prepare('INSERT INTO pm_plans(id,code,title,asset_code,frequency,next_due,description,enabled,company_id,site_id,schedule_unit,schedule_interval,priority,assigned_to) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,'PM-'+id.slice(0,8).toUpperCase(),title,asset,unit+' / '+interval,due,clean(b.description,3000),0,user.company_id,site,unit,interval,['Low','Normal','High','Critical'].includes(priority)?priority:'Normal',assignee).run();await audit(db,user,'pm.created','pm',id,{title,asset,due},site);return json({ok:true,id,enabled:false},201)}
 const pmMatch=path.match(/^pm\/([^/]+)$/);if(pmMatch&&method==='PATCH'){if(!can(user,'pm.write'))return json({error:'Forbidden'},403);const b=await body(request),pm=await db.prepare('SELECT * FROM pm_plans WHERE id=? AND company_id=?').bind(pmMatch[1],user.company_id).first();if(!pm||!await allowedSite(db,user,pm.site_id))return json({error:'PM not found'},404);const enabled=b.enabled===true?1:b.enabled===false?0:null;if(enabled===null)return json({error:'enabled must be boolean'},400);await db.prepare('UPDATE pm_plans SET enabled=? WHERE id=? AND company_id=?').bind(enabled,pm.id,user.company_id).run();await audit(db,user,enabled?'pm.activated':'pm.paused','pm',pm.id,{previous:pm.enabled,new:enabled},pm.site_id);return json({ok:true})}
 if(path==='audit'&&method==='GET'){if(!can(user,'audit.read'))return json({error:'Forbidden'},403);const rows=await db.prepare('SELECT a.*,u.name AS actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id WHERE a.company_id=? ORDER BY a.created_at DESC LIMIT 250').bind(user.company_id).all();return json({events:rows.results})}
 if(path==='workspace'&&method==='GET'){const r=await db.prepare('SELECT layout_json FROM pulse_settings WHERE user_id=? AND company_id=?').bind(user.id,user.company_id).first();let settings={};try{settings=JSON.parse(r?.layout_json||'{}')}catch{}return json({settings})}
 if(path==='workspace'&&method==='POST'){const b=await body(request);const allowed=['dashboard','orders','pm','planner','calendar','assets','inventory','inspections','requests','reports','support','migration'];const visible=Array.isArray(b.visible)?b.visible.filter(x=>allowed.includes(x)):allowed;const dashboard=Array.isArray(b.widgets)?b.widgets.filter(x=>['metrics','attention','schedule','assets'].includes(x)):['metrics','attention','schedule','assets'];const settings={visible,widgets:dashboard,charts:b.charts===true};await db.prepare('INSERT INTO pulse_settings(user_id,company_id,layout_json) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET layout_json=excluded.layout_json,updated_at=CURRENT_TIMESTAMP').bind(user.id,user.company_id,JSON.stringify(settings)).run();return json({ok:true,settings})}
 if(path==='reports'&&method==='GET'){if(!can(user,'orders.read'))return json({error:'Forbidden'},403);const rows=await db.prepare('SELECT id,name,source,config_json,created_at FROM saved_reports WHERE company_id=? ORDER BY created_at DESC LIMIT 100').bind(user.company_id).all();return json({reports:rows.results})}
 if(path==='reports'&&method==='POST'){if(!can(user,'orders.read'))return json({error:'Forbidden'},403);const b=await body(request),name=clean(b.name,100),source=clean(b.source,20);if(!name||!['orders','assets','pm'].includes(source))return json({error:'Invalid report'},400);const id=uid();await db.prepare('INSERT INTO saved_reports(id,company_id,owner_id,name,source,config_json) VALUES(?,?,?,?,?,?)').bind(id,user.company_id,user.id,name,source,JSON.stringify({status:clean(b.status,40)})).run();return json({ok:true,id},201)}
 if(path==='preferences'&&method==='GET'){const row=await db.prepare('SELECT theme,density,accent FROM user_preferences WHERE user_id=? AND company_id=?').bind(user.id,user.company_id).first();return json({preferences:row||{theme:'hybrid',density:'comfortable',accent:'blue'}})}
 if(path==='preferences'&&method==='POST'){const b=await body(request),theme=clean(b.theme,20),density=clean(b.density,20),accent=clean(b.accent,20);if(!['hybrid','dark','light'].includes(theme)||!['compact','comfortable','spacious'].includes(density)||!['blue','teal','silver'].includes(accent))return json({error:'Invalid preferences'},400);await db.prepare('INSERT INTO user_preferences(user_id,company_id,theme,density,accent) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme,density=excluded.density,accent=excluded.accent').bind(user.id,user.company_id,theme,density,accent).run();return json({ok:true})}

 if(path==='migration/check'&&method==='POST'){
  if(!['admin','manager'].includes(user.role))return json({error:'Admin or manager access required'},403);
  const b=await body(request),kind=clean(b.kind,30),source=clean(b.source,80),records=Array.isArray(b.records)?b.records:[];
  if(!source||!['assets','orders','pm'].includes(kind)||!records.length||records.length>100)return json({error:'Invalid source, record type, or batch size (1–100)'},400);
  const ids=records.map(r=>clean(r.external_id,160));if(ids.some(x=>!x))return json({error:'Every record needs an original ID'},400);
  const existing=new Set();for(let i=0;i<ids.length;i++){const match=await db.prepare('SELECT 1 FROM migration_keys WHERE source=? AND kind=? AND external_id=?').bind(user.company_id+'::'+source,kind,ids[i]).first();if(match)existing.add(ids[i])}
  return json({duplicates:ids.filter(x=>existing.has(x)),newCount:ids.filter(x=>!existing.has(x)).length});
 }
 if(path==='migration/import'&&method==='POST'){
  if(!['admin','manager'].includes(user.role))return json({error:'Admin or manager access required'},403);
  const b=await body(request),kind=clean(b.kind,30),source=clean(b.source,80),records=Array.isArray(b.records)?b.records:[];
  if(!source||!['assets','orders','pm'].includes(kind)||!records.length||records.length>100)return json({error:'Invalid source/type or batch size (1–100)'},400);
  let inserted=0,skipped=0,errors=[];const seen=new Set();
  for(let i=0;i<records.length;i++){
   const r=records[i]||{},external=clean(r.external_id,160),title=clean(r.title,200),assetCode=clean(r.asset_code,100);
   if(!external||!title||(kind==='pm'&&!assetCode)){errors.push({row:i+1,error:'Missing original ID, title, or PM asset code'});continue}
   if(seen.has(external)){skipped++;continue}seen.add(external);
   if(await db.prepare('SELECT 1 FROM migration_keys WHERE source=? AND kind=? AND external_id=?').bind(user.company_id+'::'+source,kind,external).first()){skipped++;continue}
   const id=uid();try{
    let stmt;
    if(kind==='assets'){
     const code=clean(r.code,100)||external;
     if(await db.prepare('SELECT 1 FROM assets WHERE company_id=? AND code=?').bind(user.company_id,code).first())throw Error('Asset code already exists');
     stmt=db.prepare('INSERT INTO assets(id,code,name,location,description,source,company_id,manufacturer,model,serial_number,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,code,title,clean(r.location,180),clean(r.description,3000),source+' Import',user.company_id,clean(r.manufacturer,120),clean(r.model,160),clean(r.serial_number,120),clean(r.status,50)||'Operational');
    }else if(kind==='pm'){
     const asset=await db.prepare('SELECT id,site_id FROM assets WHERE company_id=? AND code=?').bind(user.company_id,assetCode).first();if(!asset||!await allowedSite(db,user,asset.site_id))throw Error('Asset code not found or not accessible; import assets first');
     const unit=clean(r.schedule_unit,12).toLowerCase()||'month',interval=Number(r.schedule_interval||1),due=clean(r.next_due,10)||new Date().toISOString().slice(0,10);
     if(!['day','week','month','year'].includes(unit)||!Number.isInteger(interval)||interval<1||interval>365||!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due+'T12:00:00Z')))throw Error('Invalid PM frequency or due date');
     stmt=db.prepare('INSERT INTO pm_plans(id,code,title,asset_code,frequency,next_due,description,enabled,company_id,site_id,schedule_unit,schedule_interval,priority) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,'PM-'+id.slice(0,8).toUpperCase(),title,assetCode,unit+' / '+interval,due,clean(r.description,3000),0,user.company_id,asset.site_id,unit,interval,['Low','Normal','High','Critical'].includes(r.priority)?r.priority:'Normal');
    }else{
     let site=null;if(assetCode){const asset=await db.prepare('SELECT site_id FROM assets WHERE company_id=? AND code=?').bind(user.company_id,assetCode).first();if(!asset||!await allowedSite(db,user,asset.site_id))throw Error('Linked asset not found or not accessible');site=asset.site_id}
     const created=/^\d{4}-\d{2}-\d{2}/.test(clean(r.created_at,30))?clean(r.created_at,30):new Date().toISOString();
     stmt=db.prepare('INSERT INTO work_orders(id,title,description,status,priority,location,asset,source,created_at,company_id,site_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,title,clean(r.description,3000),['New','Assigned','In Progress','On Hold','Completed','Closed'].includes(r.status)?r.status:'New',['Low','Normal','High','Critical'].includes(r.priority)?r.priority:'Normal',clean(r.location,180),assetCode,source+' Import',created,user.company_id,site);
    }
    await db.batch([stmt,db.prepare('INSERT INTO migration_keys(source,kind,external_id,record_id) VALUES(?,?,?,?)').bind(user.company_id+'::'+source,kind,external,id)]);inserted++;
   }catch(e){errors.push({row:i+1,error:e.message||'Unable to import record'})}
  }
  return json({inserted,skipped,errors});
 }

 if(path==='equipment'&&method==='GET'){
  const rows=await db.prepare('SELECT * FROM equipment_models WHERE company_id=? ORDER BY manufacturer,model LIMIT 500').bind(user.company_id).all();return json({equipment:rows.results});
 }
 if(path==='equipment'&&method==='POST'){if(!can(user,'assets.write'))return json({error:'Forbidden'},403);
  if(!['admin','manager','supervisor'].includes(user.role))return json({error:'Insufficient permissions'},403);
  const b=await body(request),manufacturer=clean(b.manufacturer,120),model=clean(b.model,160);
  if(!manufacturer||!model)return json({error:'Manufacturer and model are required'},400);
  const id=uid();await db.prepare('INSERT INTO equipment_models(id,company_id,manufacturer,model,category,description) VALUES(?,?,?,?,?,?)').bind(id,user.company_id,manufacturer,model,clean(b.category,120),clean(b.description,2000)).run();return json({ok:true,id},201);
 }
 if(path==='assets'&&method==='GET'){if(!can(user,'assets.read'))return json({error:'Forbidden'},403);
  const rows=await db.prepare("SELECT a.*,e.manufacturer AS library_manufacturer,e.model AS library_model FROM assets a LEFT JOIN equipment_models e ON e.id=a.equipment_model_id AND e.company_id=a.company_id WHERE a.company_id=? AND (? IN ('admin','manager') OR a.site_id IS NULL OR EXISTS(SELECT 1 FROM site_memberships sm WHERE sm.site_id=a.site_id AND sm.user_id=?)) ORDER BY a.name LIMIT 1000").bind(user.company_id,user.role,user.id).all();return json({assets:rows.results});
 }
 if(path==='assets'&&method==='POST'){if(!can(user,'assets.write'))return json({error:'Forbidden'},403);
  if(!['admin','manager','supervisor'].includes(user.role))return json({error:'Insufficient permissions'},403);
  const b=await body(request),code=clean(b.code,100),name=clean(b.name,180),modelId=clean(b.equipment_model_id,80);
  if(!code||!name)return json({error:'Asset ID and name required'},400);
  if(modelId){const e=await db.prepare('SELECT id FROM equipment_models WHERE id=? AND company_id=?').bind(modelId,user.company_id).first();if(!e)return json({error:'Equipment model not found'},400)}
  const siteId=clean(b.site_id,80)||null;if(siteId&&!await allowedSite(db,user,siteId))return json({error:'Site access denied'},403);const id=uid();await db.prepare('INSERT INTO assets(id,code,name,location,description,source,company_id,equipment_model_id,site,building,system_name,serial_number,status,manufacturer,model,site_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,code,name,clean(b.location,180),clean(b.description,3000),'PULSE',user.company_id,modelId||null,clean(b.site,120),clean(b.building,120),clean(b.system_name,120),clean(b.serial_number,120),clean(b.status,50)||'Operational',clean(b.manufacturer,120),clean(b.model,160),siteId).run();return json({ok:true,id},201);
 }
 const assetPath=path.match(/^assets\/([^/]+)$/);
 if(assetPath&&method==='GET'){
  const asset=await db.prepare('SELECT a.*,e.manufacturer AS library_manufacturer,e.model AS library_model FROM assets a LEFT JOIN equipment_models e ON e.id=a.equipment_model_id AND e.company_id=a.company_id WHERE a.id=? AND a.company_id=?').bind(assetPath[1],user.company_id).first();if(!asset||!await allowedSite(db,user,asset.site_id))return json({error:'Asset not found'},404);
  const docs=asset.equipment_model_id?await db.prepare('SELECT * FROM equipment_documents WHERE company_id=? AND equipment_model_id=? ORDER BY document_type,title').bind(user.company_id,asset.equipment_model_id).all():{results:[]};
  const pms=await db.prepare('SELECT * FROM pm_plans WHERE company_id=? AND asset_code=? ORDER BY title').bind(user.company_id,asset.code).all();
  const history=await db.prepare('SELECT id,title,status,created_at FROM work_orders WHERE asset=? AND company_id=? ORDER BY created_at DESC LIMIT 100').bind(asset.code,user.company_id).all();
  return json({asset,documents:docs.results,pmPlans:pms.results,history:history.results});
 }
 if(path==='equipment/documents'&&method==='POST'){if(!can(user,'assets.write'))return json({error:'Forbidden'},403);
  if(!['admin','manager','supervisor'].includes(user.role))return json({error:'Insufficient permissions'},403);
  const b=await body(request),modelId=clean(b.equipment_model_id,80),title=clean(b.title,200),link=clean(b.url,1500),type=clean(b.document_type,80);
  const model=await db.prepare('SELECT id FROM equipment_models WHERE id=? AND company_id=?').bind(modelId,user.company_id).first();if(!model)return json({error:'Equipment model not found'},404);
  let parsed;try{parsed=new URL(link)}catch{return json({error:'Enter a valid HTTPS document URL'},400)}
  if(parsed.protocol!=='https:'||!title)return json({error:'HTTPS URL and title required'},400);
  const id=uid();await db.prepare('INSERT INTO equipment_documents(id,company_id,equipment_model_id,title,document_type,url,revision,verification_status,added_by) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,user.company_id,modelId,title,type||'Manual',link,clean(b.revision,80),'Approved',user.id).run();return json({ok:true,id},201);
 }
 if(path==='pm/draft'&&method==='POST'){if(!can(user,'pm.write'))return json({error:'Forbidden'},403);
  if(!['admin','manager','supervisor'].includes(user.role))return json({error:'Insufficient permissions'},403);
  const b=await body(request),assetCode=clean(b.asset_code,100),title=clean(b.title,200),frequency=clean(b.frequency,80),description=clean(b.description,3000);
  const a=await db.prepare('SELECT id FROM assets WHERE company_id=? AND code=?').bind(user.company_id,assetCode).first();if(!a)return json({error:'Asset not found'},404);
  if(!title)return json({error:'PM title required'},400);
  const id=uid();await db.prepare('INSERT INTO pm_plans(id,code,title,asset_code,frequency,next_due,description,enabled,company_id) VALUES(?,?,?,?,?,?,?,0,?)').bind(id,'PM-'+id.slice(0,8).toUpperCase(),title,assetCode,frequency,clean(b.next_due,40),description,user.company_id).run();return json({ok:true,id,enabled:false},201);
 }

 // v1.5 operations: tenant-scoped parts, inspections, files, meter readings and planning.
 if(path==='inventory'&&method==='GET'){
  if(!can(user,'assets.read'))return json({error:'Forbidden'},403);
  const r=await db.prepare('SELECT * FROM inventory_parts WHERE company_id=? ORDER BY name LIMIT 500').bind(user.company_id).all();return json({parts:r.results});
 }
 if(path==='inventory'&&method==='POST'){
  if(!can(user,'assets.write'))return json({error:'Forbidden'},403);
  const b=await body(request),sku=clean(b.sku,80),name=clean(b.name,180),qty=Number(b.quantity||0),minimum=Number(b.reorder_point||0),cost=Number(b.unit_cost||0);
  if(!sku||!name||![qty,minimum,cost].every(x=>Number.isFinite(x)&&x>=0)||qty>1000000)return json({error:'Valid SKU, name, quantity and cost required'},400);
  const id=uid();try{await db.prepare('INSERT INTO inventory_parts(id,company_id,sku,name,description,location,supplier,quantity,reorder_point,unit_cost) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,user.company_id,sku,name,clean(b.description,500),clean(b.location,100),clean(b.supplier,120),qty,minimum,cost).run()}catch{return json({error:'SKU already exists or could not be saved'},409)}
  await audit(db,user,'inventory.created','inventory',id,{sku});return json({ok:true,id},201);
 }
 if(path==='inventory/adjust'&&method==='POST'){
  if(!can(user,'assets.write'))return json({error:'Forbidden'},403);const b=await body(request),id=clean(b.id,80),delta=Number(b.delta);
  if(!Number.isFinite(delta)||delta===0||Math.abs(delta)>100000)return json({error:'Valid nonzero adjustment required'},400);
  const r=await db.prepare('UPDATE inventory_parts SET quantity=quantity+?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=? AND quantity+?>=0').bind(delta,id,user.company_id,delta).run();if(!r.meta?.changes)return json({error:'Part not found or insufficient stock'},409);
  await audit(db,user,'inventory.adjusted','inventory',id,{delta});return json({ok:true});
 }
 if(path==='inspections/templates'&&method==='GET'){
  if(!can(user,'orders.read'))return json({error:'Forbidden'},403);const r=await db.prepare('SELECT * FROM inspection_templates WHERE company_id=? ORDER BY created_at DESC LIMIT 200').bind(user.company_id).all();return json({templates:r.results});
 }
 if(path==='inspections/templates'&&method==='POST'){
  if(!can(user,'pm.write'))return json({error:'Forbidden'},403);const b=await body(request),title=clean(b.title,160),items=Array.isArray(b.items)?b.items:[];
  if(!title||!items.length||items.length>50||items.some(i=>!clean(i.label,200)||!['passfail','number','text'].includes(i.type)))return json({error:'Title and 1–50 valid inspection questions required'},400);
  const id=uid();await db.prepare('INSERT INTO inspection_templates(id,company_id,title,description,items_json,created_by) VALUES(?,?,?,?,?,?)').bind(id,user.company_id,title,clean(b.description,1000),JSON.stringify(items.map(i=>({label:clean(i.label,200),type:i.type}))),user.id).run();return json({ok:true,id},201);
 }
 if(path==='inspections/results'&&method==='GET'){
  if(!can(user,'orders.read'))return json({error:'Forbidden'},403);const r=await db.prepare('SELECT * FROM inspection_results WHERE company_id=? ORDER BY created_at DESC LIMIT 200').bind(user.company_id).all();return json({results:r.results});
 }
 if(path==='inspections/results'&&method==='POST'){
  if(!can(user,'orders.write'))return json({error:'Forbidden'},403);const b=await body(request),template=await db.prepare('SELECT * FROM inspection_templates WHERE id=? AND company_id=?').bind(clean(b.template_id,80),user.company_id).first();if(!template)return json({error:'Inspection template not found'},404);
  const woId=clean(b.work_order_id,80),asset=clean(b.asset_code,100),wo=woId?await db.prepare('SELECT id,site_id,assigned_to FROM work_orders WHERE id=? AND company_id=?').bind(woId,user.company_id).first():null;
  if(woId&&(!wo||!await allowedSite(db,user,wo.site_id)||(user.role==='technician'&&wo.assigned_to!==user.id)))return json({error:'Work order not accessible'},403);
  if(asset){const a=await db.prepare('SELECT site_id FROM assets WHERE code=? AND company_id=?').bind(asset,user.company_id).first();if(!a||!await allowedSite(db,user,a.site_id))return json({error:'Asset not accessible'},403)}
  const answers=Array.isArray(b.answers)?b.answers:[],items=JSON.parse(template.items_json);if(answers.length!==items.length||answers.some((x,i)=>items[i].type==='number'&&x!==''&&!Number.isFinite(Number(x))))return json({error:'Invalid inspection answers'},400);
  const id=uid(),failed=answers.some((v,i)=>items[i].type==='passfail'&&v==='Fail');await db.prepare('INSERT INTO inspection_results(id,company_id,template_id,work_order_id,asset_code,completed_by,answers_json,failed) VALUES(?,?,?,?,?,?,?,?)').bind(id,user.company_id,template.id,woId||null,asset,user.id,JSON.stringify(answers.map(x=>clean(x,1000))),failed?1:0).run();
  await audit(db,user,'inspection.completed','inspection',id,{failed,work_order_id:woId});return json({ok:true,id,failed},201);
 }
 if(path==='planning'&&method==='GET'){
  if(!can(user,'orders.read'))return json({error:'Forbidden'},403);const r=await db.prepare('SELECT p.*,w.title,w.status,w.priority,w.assigned_to FROM maintenance_plans p JOIN work_orders w ON w.id=p.work_order_id AND w.company_id=p.company_id WHERE p.company_id=? ORDER BY p.planned_date LIMIT 300').bind(user.company_id).all();return json({plans:r.results});
 }
 if(path==='planning'&&method==='POST'){
  if(!can(user,'orders.write'))return json({error:'Forbidden'},403);const b=await body(request),id=clean(b.work_order_id,80),date=clean(b.planned_date,10),hours=Number(b.estimated_hours||0);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(hours)||hours<0||hours>10000)return json({error:'Valid date and estimated hours required'},400);
  const wo=await db.prepare('SELECT site_id,assigned_to FROM work_orders WHERE id=? AND company_id=?').bind(id,user.company_id).first();if(!wo||!await allowedSite(db,user,wo.site_id)||(user.role==='technician'&&wo.assigned_to!==user.id))return json({error:'Work order not accessible'},403);
  await db.prepare('INSERT INTO maintenance_plans(company_id,work_order_id,planned_date,estimated_hours,notes) VALUES(?,?,?,?,?) ON CONFLICT(company_id,work_order_id) DO UPDATE SET planned_date=excluded.planned_date,estimated_hours=excluded.estimated_hours,notes=excluded.notes').bind(user.company_id,id,date,hours,clean(b.notes,500)).run();return json({ok:true});
 }
 if(path==='assets/meters'&&method==='GET'){
  if(!can(user,'assets.read'))return json({error:'Forbidden'},403);const r=await db.prepare('SELECT * FROM asset_meter_readings WHERE company_id=? ORDER BY recorded_at DESC LIMIT 300').bind(user.company_id).all();return json({readings:r.results});
 }
 if(path==='assets/meters'&&method==='POST'){
  if(!can(user,'orders.write'))return json({error:'Forbidden'},403);const b=await body(request),asset=clean(b.asset_code,100),meter=clean(b.meter_name,80),value=Number(b.value);
  if(!asset||!meter||!Number.isFinite(value)||value<0)return json({error:'Valid asset, meter and reading required'},400);
  const a=await db.prepare('SELECT id,site_id FROM assets WHERE code=? AND company_id=?').bind(asset,user.company_id).first();if(!a||!await allowedSite(db,user,a.site_id))return json({error:'Asset not accessible'},404);
  await db.prepare('INSERT INTO asset_meter_readings(id,company_id,asset_code,meter_name,value,recorded_by) VALUES(?,?,?,?,?,?)').bind(uid(),user.company_id,asset,meter,value,user.id).run();return json({ok:true},201);
 }
 if(path==='files'&&method==='POST'){
  if(!can(user,'orders.write'))return json({error:'Forbidden'},403);if(!env.PULSE_FILES)return json({error:'R2 storage not configured. Create a private bucket and bind it as PULSE_FILES.'},503);
  const form=await request.formData(),file=form.get('file'),entity=clean(form.get('entity'),20),entityId=clean(form.get('entity_id'),100);
  if(!file||typeof file==='string'||!['work_order','asset','inspection'].includes(entity)||!entityId)return json({error:'Valid file and record required'},400);
  if(file.size>10*1024*1024)return json({error:'Maximum file size is 10 MB'},413);
  const types=['image/jpeg','image/png','image/webp','application/pdf','text/plain'];if(!types.includes(file.type))return json({error:'Only JPG, PNG, WebP, PDF or TXT files allowed'},400);
  let record=null;
  if(entity==='work_order')record=await db.prepare('SELECT site_id,assigned_to FROM work_orders WHERE id=? AND company_id=?').bind(entityId,user.company_id).first();
  if(entity==='asset')record=await db.prepare('SELECT site_id FROM assets WHERE id=? AND company_id=?').bind(entityId,user.company_id).first();
  if(entity==='inspection')record=await db.prepare('SELECT id FROM inspection_results WHERE id=? AND company_id=?').bind(entityId,user.company_id).first();
  if(!record||!await allowedSite(db,user,record.site_id)||(entity==='work_order'&&user.role==='technician'&&record.assigned_to!==user.id))return json({error:'Record not accessible'},403);
  const id=uid(),key=`${user.company_id}/${id}`;await env.PULSE_FILES.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
  try{await db.prepare('INSERT INTO file_attachments(id,company_id,entity_type,entity_id,storage_key,file_name,content_type,file_size,uploaded_by) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,user.company_id,entity,entityId,key,clean(file.name,180),file.type,file.size,user.id).run()}catch(e){await env.PULSE_FILES.delete(key);throw e}
  return json({ok:true,id},201);
 }
 if(path==='files'&&method==='GET'){
  if(!can(user,'orders.read'))return json({error:'Forbidden'},403);const entity=clean(url.searchParams.get('entity'),20),id=clean(url.searchParams.get('id'),100);
  if(!['work_order','asset','inspection'].includes(entity)||!id)return json({error:'Record required'},400);
  let record=entity==='work_order'?await db.prepare('SELECT site_id,assigned_to FROM work_orders WHERE id=? AND company_id=?').bind(id,user.company_id).first():entity==='asset'?await db.prepare('SELECT site_id FROM assets WHERE id=? AND company_id=?').bind(id,user.company_id).first():await db.prepare('SELECT id FROM inspection_results WHERE id=? AND company_id=?').bind(id,user.company_id).first();
  if(!record||!await allowedSite(db,user,record.site_id)||(entity==='work_order'&&user.role==='technician'&&record.assigned_to!==user.id))return json({error:'Forbidden'},403);
  const r=await db.prepare('SELECT id,file_name,content_type,file_size,created_at FROM file_attachments WHERE company_id=? AND entity_type=? AND entity_id=? ORDER BY created_at DESC').bind(user.company_id,entity,id).all();return json({files:r.results});
 }
 if(path.startsWith('files/')&&method==='GET'){
  if(!can(user,'orders.read'))return json({error:'Forbidden'},403);const id=clean(path.slice(6),80),f=await db.prepare('SELECT * FROM file_attachments WHERE id=? AND company_id=?').bind(id,user.company_id).first();if(!f)return json({error:'File not found'},404);
  const entity=f.entity_type;const record=entity==='work_order'?await db.prepare('SELECT site_id,assigned_to FROM work_orders WHERE id=? AND company_id=?').bind(f.entity_id,user.company_id).first():entity==='asset'?await db.prepare('SELECT site_id FROM assets WHERE id=? AND company_id=?').bind(f.entity_id,user.company_id).first():await db.prepare('SELECT id FROM inspection_results WHERE id=? AND company_id=?').bind(f.entity_id,user.company_id).first();
  if(!record||!await allowedSite(db,user,record.site_id)||(entity==='work_order'&&user.role==='technician'&&record.assigned_to!==user.id))return json({error:'Forbidden'},403);
  if(!env.PULSE_FILES)return json({error:'R2 storage not configured'},503);const object=await env.PULSE_FILES.get(f.storage_key);if(!object)return json({error:'File missing from storage'},404);
  return new Response(object.body,{headers:{'Content-Type':f.content_type,'Content-Disposition':`attachment; filename="${f.file_name.replace(/["\\\r\n]/g,'_')}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
 }
 if(path==='me'&&method==='GET')return json({user});
 if(path==='orders'&&method==='GET'){if(!can(user,'orders.read'))return json({error:'Forbidden'},403);const rows=await db.prepare("SELECT w.* FROM work_orders w WHERE w.company_id=? AND (? IN ('admin','manager') OR w.site_id IS NULL OR EXISTS(SELECT 1 FROM site_memberships sm WHERE sm.site_id=w.site_id AND sm.user_id=?)) ORDER BY w.created_at DESC LIMIT 300").bind(user.company_id,user.role,user.id).all();return json({orders:rows.results})}
 if(path==='orders'&&method==='POST'){
  if(!can(user,'orders.write'))return json({error:'Forbidden'},403);const b=await body(request),title=clean(b.title,160);if(!title)return json({error:'Title required'},400);
  const site=clean(b.site_id,80)||null,assignee=clean(b.assigned_to,80);if(site&&!await allowedSite(db,user,site))return json({error:'Site access denied'},403);if(assignee&&!await db.prepare('SELECT id FROM users WHERE id=? AND company_id=?').bind(assignee,user.company_id).first())return json({error:'Invalid assignee'},400);const id='WO-'+Date.now().toString(36).toUpperCase()+'-'+uid().slice(0,4).toUpperCase();
  await db.prepare('INSERT INTO work_orders(id,title,description,location,asset,priority,requester_name,requester_email,source,company_id,site_id,assigned_to,work_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,title,clean(b.description,4000),clean(b.location,180),clean(b.asset,180),['Low','Normal','High','Critical'].includes(b.priority)?b.priority:'Normal',user.name,user.email,'Internal',user.company_id,site,assignee,clean(b.work_type,40)||'Corrective').run();await audit(db,user,'order.created','work_order',id,{title});return json({ok:true,id},201);
 }
 if(path.match(/^orders\/WO-[A-Z0-9-]+\/activity$/)&&method==='GET'){
  if(!can(user,'orders.read'))return json({error:'Forbidden'},403);
  const id=path.split('/')[1];const wo=await db.prepare('SELECT site_id,assigned_to FROM work_orders WHERE id=? AND company_id=?').bind(id,user.company_id).first();
  if(!wo||!await allowedSite(db,user,wo.site_id))return json({error:'Work order not found'},404);
  if(user.role==='technician'&&wo.assigned_to!==user.id)return json({error:'Forbidden'},403);
  const result=await db.prepare('SELECT id,notes,labor_hours,down_time_hours,failure_code,action,created_at FROM work_order_activity WHERE work_order_id=? AND company_id=? ORDER BY created_at DESC LIMIT 100').bind(id,user.company_id).all();return json({activity:result.results});
 }
 if(path.match(/^orders\/WO-[A-Z0-9-]+\/complete$/)&&method==='POST'){
  if(!can(user,'orders.write'))return json({error:'Forbidden'},403);
  const id=path.split('/')[1],b=await body(request),notes=clean(b.notes,5000),hours=Number(b.hours||0),downtime=Number(b.downtime_hours||0),failure=clean(b.failure_code,80),parts=Array.isArray(b.parts)?b.parts:[];
  if(!notes)return json({error:'Work performed / findings are required'},400);
  if(![hours,downtime].every(x=>Number.isFinite(x)&&x>=0&&x<=10000)||parts.length>50)return json({error:'Invalid hours, downtime or parts'},400);
  const wo=await db.prepare('SELECT site_id,assigned_to,status FROM work_orders WHERE id=? AND company_id=?').bind(id,user.company_id).first();
  if(!wo||!await allowedSite(db,user,wo.site_id))return json({error:'Work order not found'},404);
  if(user.role==='technician'&&wo.assigned_to!==user.id)return json({error:'Only your assigned work orders may be completed'},403);
  if(['Completed','Closed'].includes(wo.status))return json({error:'Already completed or closed'},409);
  const combined=new Map();for(const part of parts){const pid=clean(part.id,80),qty=Number(part.quantity);if(!pid||!Number.isInteger(qty)||qty<=0||qty>100000)return json({error:'Invalid part or quantity'},400);combined.set(pid,(combined.get(pid)||0)+qty)}
  const statements=[];for(const [pid,qty] of combined){const item=await db.prepare('SELECT quantity,unit_cost FROM inventory_parts WHERE id=? AND company_id=?').bind(pid,user.company_id).first();if(!item||item.quantity<qty)return json({error:'Insufficient inventory for part '+pid},409);statements.push(db.prepare('UPDATE inventory_parts SET quantity=quantity-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=? AND quantity>=?').bind(qty,pid,user.company_id,qty));statements.push(db.prepare('INSERT INTO work_order_parts(id,company_id,work_order_id,part_id,quantity,unit_cost) VALUES(?,?,?,?,?,?)').bind(uid(),user.company_id,id,pid,qty,item.unit_cost))}
  statements.push(db.prepare('INSERT INTO work_order_activity(id,company_id,work_order_id,user_id,action,notes,labor_hours,down_time_hours,failure_code) VALUES(?,?,?,?,?,?,?,?,?)').bind(uid(),user.company_id,id,user.id,'Completed',notes,hours,downtime,failure));
  statements.push(db.prepare("UPDATE work_orders SET status='Completed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=? AND status NOT IN ('Completed','Closed')").bind(id,user.company_id));
  await db.batch(statements);
  await audit(db,user,'order.completed','work_order',id,{labor_hours:hours,downtime_hours:downtime,failure_code:failure,parts:[...combined]});return json({ok:true,id});
 }
 const match=path.match(/^orders\/(WO-[A-Z0-9-]+)$/);if(match&&method==='PATCH'){
  if(!can(user,'orders.write'))return json({error:'Forbidden'},403);const b=await body(request),status=clean(b.status,40),assigned=clean(b.assigned_to,120);if(!['New','Assigned','In Progress','On Hold','Completed','Closed'].includes(status))return json({error:'Invalid status'},400);
  const target=await db.prepare('SELECT site_id,assigned_to FROM work_orders WHERE id=? AND company_id=?').bind(match[1],user.company_id).first();if(!target||!await allowedSite(db,user,target.site_id))return json({error:'Work order not found'},404);if(user.role==='technician'&&target.assigned_to!==user.id)return json({error:'Only your assigned work orders may be updated'},403);const nextAssignee=user.role==='technician'?target.assigned_to:(Object.prototype.hasOwnProperty.call(b,'assigned_to')?assigned:target.assigned_to);if(nextAssignee&&!await db.prepare('SELECT id FROM users WHERE id=? AND company_id=?').bind(assigned,user.company_id).first())return json({error:'Invalid assignee'},400);const r=await db.prepare('UPDATE work_orders SET status=?,assigned_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?').bind(status,nextAssignee,match[1],user.company_id).run();if(r.meta.changes)await audit(db,user,'order.updated','work_order',match[1],{status,assigned:nextAssignee});return json({ok:r.meta.changes>0});
 }
 if(path==='users/assignable'&&method==='GET'){const rows=await db.prepare('SELECT id,name,role FROM users WHERE company_id=? ORDER BY name').bind(user.company_id).all();return json({users:rows.results})}
 if(path==='users'&&method==='GET'&&user.role==='admin'){const rows=await db.prepare('SELECT id,name,email,username,company_id,role,created_at FROM users WHERE company_id=? ORDER BY name').bind(user.company_id).all();return json({users:rows.results})}
 if(path==='users'&&method==='POST'&&user.role==='admin'){
  const b=await body(request),name=clean(b.name,100),email=clean(b.email,180).toLowerCase(),username=usernameOf(b.username),password=String(b.password??''),role=clean(b.role,30);
  if(!name||!/^\S+@\S+\.\S+$/.test(email)||!username||!/^[a-z0-9._-]+$/.test(username)||!password.length||!['admin','manager','supervisor','technician','viewer'].includes(role))return json({error:'Invalid user fields'},400);
  const salt=uid();await db.prepare('INSERT INTO users(id,name,email,password_hash,salt,role,company_id,username) VALUES(?,?,?,?,?,?,?,?)').bind(uid(),name,email,await passwordHash(password,salt),salt,role,user.company_id,username).run();return json({ok:true},201);
 }
 return json({error:'Not found or not permitted'},404);
 }catch(e){console.error('PULSE API failure',JSON.stringify({route:path,name:e.name,message:e.message}));return json({error:'Request failed. See Cloudflare logs.'},500)}
}

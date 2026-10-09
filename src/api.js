const json=(v,s=200,headers={})=>new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json',...headers}});
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
async function sha(s){return hex(await crypto.subtle.digest('SHA-256',enc.encode(s)))}
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:210000,hash:'SHA-256'},key,256))}
const cookie=(token,maxAge)=>`pulse_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
const uid=()=>crypto.randomUUID();
async function current(request,db){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)pulse_session=([^;]+)/)?.[1];if(!token)return null;return await db.prepare('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await sha(token),Date.now()).first()}
async function body(request){try{return await request.json()}catch{return {}}}
const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
export async function onRequest({request,env}){
 const db=env.PULSE_DB;if(!db)return json({error:'D1 binding PULSE_DB is missing. See README.'},503);
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'');const method=request.method;
 try{
 if(path==='health')return json({ok:true});
 if(path==='setup'&&method==='POST'){
  const existing=await db.prepare('SELECT COUNT(*) AS n FROM users').first();if(existing.n)return json({error:'Setup already completed'},403);
  const b=await body(request),name=clean(b.name,100),email=clean(b.email,180).toLowerCase(),password=String(b.password||'');
  if(!name||!/^\S+@\S+\.\S+$/.test(email)||password.length<12)return json({error:'Name, valid email and password of 12+ characters required'},400);
  const salt=uid();await db.prepare('INSERT INTO users(id,name,email,password_hash,salt,role) VALUES(?,?,?,?,?,?)').bind(uid(),name,email,await passwordHash(password,salt),salt,'admin').run();return json({ok:true});
 }
 if(path==='setup-status'&&method==='GET'){const row=await db.prepare('SELECT COUNT(*) AS n FROM users').first();return json({needsSetup:row.n===0})}
 if(path==='login'&&method==='POST'){
  const b=await body(request),u=await db.prepare('SELECT * FROM users WHERE email=?').bind(clean(b.email,180).toLowerCase()).first();
  if(!u||await passwordHash(String(b.password||''),u.salt)!==u.password_hash)return json({error:'Invalid email or password'},401);
  const token=uid()+uid();await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await sha(token),u.id,Date.now()+7*86400000).run();return json({user:{id:u.id,name:u.name,email:u.email,role:u.role}},200,{'Set-Cookie':cookie(token,604800)});
 }
 if(path==='logout'&&method==='POST'){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)pulse_session=([^;]+)/)?.[1];if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(token)).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)})}
 if(path==='ticket'&&method==='POST'){
  const b=await body(request);if(clean(b.website))return json({ok:true});
  const title=clean(b.title,160),description=clean(b.description,4000),name=clean(b.name,100),email=clean(b.email,180),location=clean(b.location,180);
  if(!title||!description||!name||!/^\S+@\S+\.\S+$/.test(email)||!location)return json({error:'Complete all required fields'},400);
  const id='WO-'+Date.now().toString(36).toUpperCase()+'-'+uid().slice(0,4).toUpperCase();
  await db.prepare('INSERT INTO work_orders(id,title,description,location,requester_name,requester_email,source,priority) VALUES(?,?,?,?,?,?,?,?)').bind(id,title,description,location,name,email,'Outside Request','Normal').run();return json({ok:true,id},201);
 }
 const user=await current(request,db);if(!user)return json({error:'Please sign in'},401);

 if(path==='migration/check'&&method==='POST'){
  if(!['admin','manager'].includes(user.role))return json({error:'Admin or manager access required'},403);
  const b=await body(request),kind=clean(b.kind,30),source=clean(b.source,40),records=Array.isArray(b.records)?b.records:[];
  if(source!=='Fiix'||!['assets','orders','pm'].includes(kind)||records.length>200)return json({error:'Unsupported source, entity type, or batch size (max 200)'},400);
  const ids=records.map(r=>clean(r.external_id,160));if(ids.some(x=>!x))return json({error:'Every record requires an original Fiix ID'},400);
  const found=await db.prepare('SELECT external_id FROM migration_keys WHERE source=? AND kind=?').bind(source,kind).all();const existing=new Set(found.results.map(x=>x.external_id));
  return json({duplicates:ids.filter(x=>existing.has(x)),newCount:ids.filter(x=>!existing.has(x)).length});
 }
 if(path==='migration/import'&&method==='POST'){
  if(!['admin','manager'].includes(user.role))return json({error:'Admin or manager access required'},403);
  const b=await body(request),kind=clean(b.kind,30),source=clean(b.source,40),records=Array.isArray(b.records)?b.records:[];
  if(source!=='Fiix'||!['assets','orders','pm'].includes(kind)||!records.length||records.length>100)return json({error:'Unsupported source/type or invalid batch size (1–100)'},400);
  let inserted=0,skipped=0,errors=[];const seen=new Set();
  for(let i=0;i<records.length;i++){
   const r=records[i],external=clean(r.external_id,160),title=clean(r.title,200),assetCode=clean(r.asset_code,160);
   if(!external||!title||(kind==='pm'&&!assetCode)){errors.push({row:i+1,error:'Missing ID, title, or PM asset code'});continue}
   if(seen.has(external)){skipped++;continue}seen.add(external);
   const id=uid();const existing=await db.prepare('SELECT 1 FROM migration_keys WHERE source=? AND kind=? AND external_id=?').bind(source,kind,external).first();if(existing){skipped++;continue}
   try{
    let statement;
    if(kind==='assets')statement=db.prepare('INSERT INTO assets(id,code,name,location,description,source) VALUES(?,?,?,?,?,?)').bind(id,external,title,clean(r.location,180),clean(r.description,4000),'Fiix');
    else if(kind==='pm')statement=db.prepare('INSERT INTO pm_plans(id,code,title,asset_code,frequency,next_due,description,enabled) VALUES(?,?,?,?,?,?,?,0)').bind(id,external,title,assetCode,clean(r.frequency,80),clean(r.next_due,40),clean(r.description,4000));
    else statement=db.prepare('INSERT INTO work_orders(id,title,description,status,priority,location,asset,source,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('WO-FIIX-'+id.slice(0,12).toUpperCase(),title,clean(r.description,4000),['New','Assigned','In Progress','On Hold','Completed','Closed'].includes(r.status)?r.status:'New',['Low','Normal','High','Critical'].includes(r.priority)?r.priority:'Normal',clean(r.location,180),assetCode,'Fiix Import',/^\d{4}-\d{2}-\d{2}/.test(r.created_at||'')?r.created_at:new Date().toISOString());
    await db.batch([statement,db.prepare('INSERT INTO migration_keys(source,kind,external_id,record_id) VALUES(?,?,?,?)').bind(source,kind,external,id)]);inserted++;
   }catch(e){errors.push({row:i+1,error:'Record could not be imported; check duplicate codes or field values'})}
  }
  return json({inserted,skipped,errors});
 }
 if(path==='me'&&method==='GET')return json({user});
 if(path==='orders'&&method==='GET'){const rows=await db.prepare('SELECT * FROM work_orders ORDER BY created_at DESC LIMIT 300').all();return json({orders:rows.results})}
 if(path==='orders'&&method==='POST'){
  const b=await body(request),title=clean(b.title,160);if(!title)return json({error:'Title required'},400);
  const id='WO-'+Date.now().toString(36).toUpperCase()+'-'+uid().slice(0,4).toUpperCase();
  await db.prepare('INSERT INTO work_orders(id,title,description,location,asset,priority,requester_name,requester_email,source) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,title,clean(b.description,4000),clean(b.location,180),clean(b.asset,180),['Low','Normal','High','Critical'].includes(b.priority)?b.priority:'Normal',user.name,user.email,'Internal').run();return json({ok:true,id},201);
 }
 const match=path.match(/^orders\/(WO-[A-Z0-9-]+)$/);if(match&&method==='PATCH'){
  const b=await body(request),status=clean(b.status,40),assigned=clean(b.assigned_to,120);if(!['New','Assigned','In Progress','On Hold','Completed','Closed'].includes(status))return json({error:'Invalid status'},400);
  const r=await db.prepare('UPDATE work_orders SET status=?,assigned_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status,assigned,match[1]).run();return json({ok:r.meta.changes>0});
 }
 if(path==='users'&&method==='GET'&&user.role==='admin'){const rows=await db.prepare('SELECT id,name,email,role,created_at FROM users ORDER BY name').all();return json({users:rows.results})}
 if(path==='users'&&method==='POST'&&user.role==='admin'){
  const b=await body(request),name=clean(b.name,100),email=clean(b.email,180).toLowerCase(),password=String(b.password||''),role=clean(b.role,30);
  if(!name||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||!['admin','manager','supervisor','technician','viewer'].includes(role))return json({error:'Invalid user fields'},400);
  const salt=uid();await db.prepare('INSERT INTO users(id,name,email,password_hash,salt,role) VALUES(?,?,?,?,?,?)').bind(uid(),name,email,await passwordHash(password,salt),salt,role).run();return json({ok:true},201);
 }
 return json({error:'Not found or not permitted'},404);
 }catch(e){return json({error:'Request failed. Check data and try again.'},500)}
}

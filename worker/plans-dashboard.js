const planResponse=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const statuses=['new','contacted','in_progress','closed'];
const destinations=['United Kingdom','Canada','Australia','Germany','I’m still exploring'];
const levels=['Foundation','Undergraduate','Postgraduate','Research / PhD'];
const intakes=['2027','2028','Still deciding'];
const hashValue=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export async function plansDashboard(request,env,allowed){
 const url=new URL(request.url);
 if(request.method==='GET'){
  if(!allowed)return planResponse({error:'Sign in to view study plans.'},401);
  const status=url.searchParams.get('status')||'all';if(status!=='all'&&!statuses.includes(status))return planResponse({error:'Invalid status.'},400);
  const search='%'+(url.searchParams.get('search')||'').trim().toLowerCase().slice(0,160)+'%';
  const offset=Math.max(0,Math.min(1000000,Number.parseInt(url.searchParams.get('offset')||'0',10)||0));
  const where='WHERE (? = \'all\' OR status = ?) AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(destination) LIKE ?)';
  const args=[status,status,search,search,search];
  const results=await env.DB.prepare('SELECT id, name, email, phone, destination, level, intake, status, created_at FROM study_plans '+where+' ORDER BY created_at DESC, id DESC LIMIT 25 OFFSET ?').bind(...args,offset).all();
  const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM study_plans '+where).bind(...args).first();
  const summary=await env.DB.prepare('SELECT status, COUNT(*) AS count FROM study_plans GROUP BY status').bind().all();
  return planResponse({plans:results.results,total:Number(count.total),offset,pageSize:25,summary:Object.fromEntries(summary.results.map(row=>[row.status,Number(row.count)]))});
 }
 if(!['POST','PATCH'].includes(request.method))return planResponse({error:'Method not allowed.'},405);
 if(request.method==='PATCH'&&!allowed)return planResponse({error:'Sign in to update study plans.'},401);
 if(request.headers.get('origin')!==url.origin)return planResponse({error:'Invalid request origin.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return planResponse({error:'JSON required.'},415);
 const raw=await request.text();if(raw.length>5000)return planResponse({error:'Submission is too large.'},413);
 let data;try{data=JSON.parse(raw)}catch{return planResponse({error:'Invalid submission.'},400)}
 if(!data||typeof data!=='object'||!/^\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b$/i.test(data.id||''))return planResponse({error:'Invalid plan reference.'},400);
 if(request.method==='PATCH'){
  if(!statuses.includes(data.status))return planResponse({error:'Invalid status.'},400);
  const result=await env.DB.prepare('UPDATE study_plans SET status = ? WHERE id = ?').bind(data.status,data.id).run();
  return result.meta?.changes?planResponse({ok:true}):planResponse({error:'Plan not found.'},404);
 }
 const clean={};for(const key of ['name','email','destination','level','intake']){if(typeof data[key]!=='string'||!data[key].trim()||data[key].length>200||/[\r\n]/.test(data[key]))return planResponse({error:'Please check your '+key+'.'},400);clean[key]=data[key].trim()}
 clean.email=clean.email.toLowerCase();if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean.email))return planResponse({error:'Enter a valid email address.'},400);
 clean.phone=typeof data.phone==='string'?data.phone.trim():'';if(clean.phone.length>50||/[\r\n]/.test(clean.phone))return planResponse({error:'Please check your phone number.'},400);
 if(!destinations.includes(clean.destination)||!levels.includes(clean.level)||!intakes.includes(clean.intake))return planResponse({error:'Choose valid study preferences.'},400);
 if(data.consent!==true)return planResponse({error:'Please agree to share your plan with the admissions team.'},400);
 if(data.website)return planResponse({error:'Unable to save this submission.'},400);
 const existing=await env.DB.prepare('SELECT id FROM study_plans WHERE id = ?').bind(data.id).first();if(existing)return planResponse({ok:true,id:data.id});
 const now=Date.now();const ip=await hashValue((env.ADMIN_PASSWORD||env.ADMIN_EMAIL||'local')+(request.headers.get('cf-connecting-ip')||'unknown'));
 const result=await env.DB.prepare('INSERT INTO study_plans (id, name, email, phone, destination, level, intake, status, created_at, consent_at, ip_hash) SELECT ?, ?, ?, ?, ?, ?, ?, \'new\', ?, ?, ? WHERE (SELECT COUNT(*) FROM study_plans WHERE ip_hash = ? AND created_at > ?) < 10 AND (SELECT COUNT(*) FROM study_plans WHERE email = ? AND created_at > ?) < 5 ON CONFLICT(id) DO NOTHING').bind(data.id,clean.name,clean.email,clean.phone,clean.destination,clean.level,clean.intake,now,now,ip,ip,now-3600000,clean.email,now-86400000).run();
 if(!result.meta?.changes){const duplicate=await env.DB.prepare('SELECT id FROM study_plans WHERE id = ?').bind(data.id).first();if(duplicate)return planResponse({ok:true,id:data.id});return planResponse({error:'You have submitted several plans. Please try again later or download your PDF only.'},429)}
 return planResponse({ok:true,id:data.id},201);
}

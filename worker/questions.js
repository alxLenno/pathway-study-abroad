const questionResponse=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digestQuestion=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export async function questionsApi(request,env,allowed){
 const url=new URL(request.url),publicView=url.pathname==='/api/faqs';
 if(publicView){if(request.method!=='GET')return questionResponse({error:'Method not allowed.'},405);const rows=await env.DB.prepare("SELECT id, public_question AS question, answer FROM questions WHERE status = 'published' AND deleted_at IS NULL ORDER BY created_at ASC, id ASC").bind().all();return questionResponse({faqs:rows.results})}
 if(request.method==='GET'){
  if(!allowed)return questionResponse({error:'Sign in to manage questions.'},401);
  const status=url.searchParams.get('status')||'all';if(!['all','pending','answered','published'].includes(status))return questionResponse({error:'Invalid status.'},400);
  const search='%'+(url.searchParams.get('search')||'').toLowerCase().trim().slice(0,160)+'%';const offset=Math.max(0,Math.min(1000000,parseInt(url.searchParams.get('offset')||'0',10)||0));
  const where="WHERE deleted_at IS NULL AND (? = 'all' OR status = ?) AND (LOWER(question) LIKE ? OR LOWER(name) LIKE ? OR LOWER(email) LIKE ?)";const args=[status,status,search,search,search];
  const rows=await env.DB.prepare('SELECT id,name,email,question,public_question,answer,status,created_at FROM questions '+where+' ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?').bind(...args,offset).all();const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM questions '+where).bind(...args).first();return questionResponse({questions:rows.results,total:Number(count.total),offset,pageSize:25});
 }
 if(!['POST','PATCH','DELETE'].includes(request.method))return questionResponse({error:'Method not allowed.'},405);
 if(request.method!=='POST'&&!allowed)return questionResponse({error:'Sign in to manage questions.'},401);
 if(request.headers.get('origin')!==url.origin)return questionResponse({error:'Invalid request origin.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return questionResponse({error:'JSON required.'},415);
 const raw=await request.text();if(raw.length>20000)return questionResponse({error:'Request too large.'},413);let data;try{data=JSON.parse(raw)}catch{return questionResponse({error:'Invalid request.'},400)}
 if(!data||!uuid.test(data.id||''))return questionResponse({error:'Invalid question reference.'},400);
 if(request.method==='DELETE'){const result=await env.DB.prepare("UPDATE questions SET deleted_at = ?, status = 'answered' WHERE id = ? AND deleted_at IS NULL").bind(Date.now(),data.id).run();return result.meta?.changes?questionResponse({ok:true}):questionResponse({error:'Question not found.'},404)}
 if(request.method==='PATCH'){
  if(typeof data.answer!=='string'||!data.answer.trim()||data.answer.length>5000)return questionResponse({error:'Write an answer (up to 5,000 characters).'},400);
  if(typeof data.public_question!=='string'||!data.public_question.trim()||data.public_question.length>2000)return questionResponse({error:'Enter the question text (up to 2,000 characters).'},400);
  if(!['answered','published'].includes(data.status))return questionResponse({error:'Invalid status.'},400);
  const result=await env.DB.prepare('UPDATE questions SET public_question = ?, answer = ?, status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL').bind(data.public_question.trim(),data.answer.trim(),data.status,Date.now(),data.id).run();return result.meta?.changes?questionResponse({ok:true}):questionResponse({error:'Question not found.'},404);
 }
 for(const field of ['name','email','question'])if(typeof data[field]!=='string'||!data[field].trim()||data[field].length>(field==='question'?2000:200))return questionResponse({error:'Please check your '+field+'.'},400);
 const email=data.email.trim().toLowerCase();if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return questionResponse({error:'Enter a valid email address.'},400);
 if(data.consent!==true||data.website)return questionResponse({error:'Please confirm consent and try again.'},400);
 const existing=await env.DB.prepare('SELECT id FROM questions WHERE id = ?').bind(data.id).first();if(existing)return questionResponse({ok:true,id:data.id});
 const now=Date.now(),ip=await digestQuestion((env.ADMIN_PASSWORD||env.ADMIN_EMAIL||'local')+(request.headers.get('cf-connecting-ip')||'unknown'));
 const result=await env.DB.prepare("INSERT INTO questions (id,name,email,question,public_question,created_at,updated_at,ip_hash) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM questions WHERE ip_hash = ? AND created_at > ?) < 10 AND (SELECT COUNT(*) FROM questions WHERE email = ? AND created_at > ?) < 5 ON CONFLICT(id) DO NOTHING").bind(data.id,data.name.trim(),email,data.question.trim(),data.question.trim(),now,now,ip,ip,now-3600000,email,now-86400000).run();
 if(!result.meta?.changes){const duplicate=await env.DB.prepare('SELECT id FROM questions WHERE id = ?').bind(data.id).first();if(duplicate)return questionResponse({ok:true,id:data.id});return questionResponse({error:'You have submitted several questions. Please try again later.'},429)}return questionResponse({ok:true,id:data.id},201);
}

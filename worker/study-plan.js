import {createPlanPdf,pdfBase64} from '../shared/plan-pdf.js';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const configured=env=>Boolean(env.RESEND_API_KEY&&env.EMAIL_FROM&&env.STUDY_PLAN_TO);
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function studyPlan(request,env,send=fetch){
 if(request.method==='GET')return reply({emailEnabled:configured(env)});
 if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON required.'},415);
 if(!configured(env))return reply({error:'Email delivery is not configured yet. You can still download your plan.'},503);
 const raw=await request.text();if(raw.length>5000)return reply({error:'Request is too large.'},413);
 let input;try{input=JSON.parse(raw)}catch{return reply({error:'Invalid request.'},400)}
 if(!input||typeof input!=='object')return reply({error:'Invalid request.'},400);
 const data={};for(const field of ['name','email','destination','level','intake']){if(typeof input[field]!=='string'||!input[field].trim()||input[field].length>200||/[\r\n]/.test(input[field]))return reply({error:'Please check your '+field+'.'},400);data[field]=input[field].trim()}
 data.email=data.email.toLowerCase();if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email))return reply({error:'Enter a valid email address.'},400);
 const choices={destination:['United Kingdom','Canada','Australia','Germany','I’m still exploring'],level:['Foundation','Undergraduate','Postgraduate','Research / PhD'],intake:['2027','2028','Still deciding']};for(const key of Object.keys(choices))if(!choices[key].includes(data[key]))return reply({error:'Select a valid '+key+'.'},400);
 if(input.consent!==true)return reply({error:'Please confirm you want your plan emailed.'},400);
 if(input.website)return reply({error:'Unable to submit this request.'},400);
 const now=Date.now(),day=new Date(now).toISOString().slice(0,10),id=await digest('pdf-v1:'+day+JSON.stringify(data));
 const existing=await env.DB.prepare('SELECT sent FROM email_requests WHERE id = ?').bind(id).first();if(existing?.sent)return reply({ok:true});
 if(!existing){
  const ip=await digest(env.RESEND_API_KEY+(request.headers.get('cf-connecting-ip')||request.headers.get('oai-authenticated-user-id')||'unknown'));
  const email=await digest(data.email);
  const result=await env.DB.prepare('INSERT OR IGNORE INTO email_requests (id, ip_hash, email_hash, created_at) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM email_requests WHERE created_at > ?) < 45 AND (SELECT COUNT(*) FROM email_requests WHERE ip_hash = ? AND created_at > ?) < 5 AND (SELECT COUNT(*) FROM email_requests WHERE email_hash = ? AND created_at > ?) < 3').bind(id,ip,email,now,now-86400000,ip,now-3600000,email,now-86400000).run();
  if(!result.meta?.changes)return reply({error:'Email request limit reached. Please download your plan or try again later.'},429);
 }
 const text=`YOUR STUDY ABROAD PLAN\n\nName: ${data.name}\nEmail: ${data.email}\nDestination: ${data.destination}\nStudy level: ${data.level}\nIntended intake: ${data.intake}\n\nYOUR NEXT STEPS\n1. Shortlist courses and check entry requirements.\n2. Compare tuition fees and living costs.\n3. Gather transcripts, references, and your passport.\n4. Check official application and visa deadlines.\n\nThis is a starting checklist, not an admission or visa offer.`;
 const rows=[['Name',data.name],['Email',data.email],['Destination',data.destination],['Study level',data.level],['Intended intake',data.intake]].map(([k,v])=>`<tr><td style="padding:12px;border-bottom:1px solid #e5ebe1;color:#687661">${k}</td><td style="padding:12px;border-bottom:1px solid #e5ebe1">${escape(v)}</td></tr>`).join('');
 const html=`<div style="background:#f3f6ef;padding:32px 16px;font-family:Arial,sans-serif;color:#193c35"><div style="max-width:580px;margin:auto;background:white;padding:32px;border-radius:10px"><p style="font-size:12px;letter-spacing:2px">YOUR STUDY ABROAD PLAN</p><h1 style="font-size:28px">Your next chapter starts here.</h1><p>Here is your starting plan and a checklist to help you prepare.</p><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table><h2 style="font-size:19px;margin-top:28px">Your next steps</h2><ol style="padding-left:22px;line-height:1.9"><li>Shortlist courses and check entry requirements.</li><li>Compare tuition fees and living costs.</li><li>Gather transcripts, references, and your passport.</li><li>Check official application and visa deadlines.</li></ol><p style="font-size:12px;color:#74816c;line-height:1.7">This is a starting checklist, not an admission or visa offer.</p></div></div>`;
 const bytes=await createPlanPdf({...data,date:day});
 const attachments=[{filename:'my-study-plan.pdf',content:pdfBase64(bytes)}];
 const messages=[{from:env.EMAIL_FROM,to:[data.email],subject:'Your study abroad plan (PDF)',html,text,attachments},{from:env.EMAIL_FROM,to:[env.STUDY_PLAN_TO],reply_to:data.email,subject:'New study plan enquiry',html,text,attachments}];
 try{
  for(let i=0;i<messages.length;i++){
   const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`study-plan-${id}-${i}`},body:JSON.stringify(messages[i]),signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok||!result.id)return reply({error:'We could not complete email delivery. Your PDF is available to download; please retry sending.'},502);
  }
  await env.DB.prepare('UPDATE email_requests SET sent = 1 WHERE id = ?').bind(id).run();return reply({ok:true});
 }catch{return reply({error:'Email service is temporarily unavailable. Your PDF is available to download; please retry sending.'},502)}
}
export {studyPlan};

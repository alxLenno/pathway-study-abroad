import {plansDashboard} from './plans-dashboard.js';
import {studyPlan} from './study-plan.js';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 const allowed=!!env.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.ADMIN_EMAIL.toLowerCase();
 if(url.pathname==='/api/study-plans')return plansDashboard(request,env,allowed);
 if(url.pathname==='/api/study-plan'){if(env.ENABLE_PLAN_EMAILS!=='true')return json(request.method==='GET'?{emailEnabled:false}:{error:'Email sending is paused. Please save your plan in the dashboard.'},request.method==='GET'?200:410);return studyPlan(request,env);}
 if(url.pathname==='/api/session') return json({admin:allowed});
 if(url.pathname==='/api/content'){
  if(request.method==='GET'){
   const row=await env.DB.prepare('SELECT content FROM site_content WHERE id = 1').first();
   return json(row?JSON.parse(row.content):null);
  }
  if(request.method==='PUT'){
   if(!allowed)return json({error:'Sign in with the site owner account to edit content.'},403);
   if(request.headers.get('origin')!==url.origin)return json({error:'Invalid request origin.'},403);
   if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON required.'},415);
   const text=await request.text();if(text.length>700000)return json({error:'Content is too large.'},413);
   let data;try{data=JSON.parse(text)}catch{return json({error:'Invalid JSON.'},400)}
   if(!data || typeof data!=='object'||Array.isArray(data))return json({error:'Invalid content.'},400);
   const fields=['brand','heroTitle','heroAccent','heroDescription','email','phone','address','whatsapp','instagram','tiktok'];
   const cleaned={};for(const key of fields){if(typeof data[key]!=='string'||data[key].length>3000)return json({error:'Invalid '+key},400);cleaned[key]=data[key]}
   if(cleaned.whatsapp&&!/^https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9_-]+(?:\?.*)?$/.test(cleaned.whatsapp))return json({error:'Use a valid WhatsApp group invitation URL.'},400);
   for(const key of ['instagram','tiktok'])if(cleaned[key]&&!/^https:\/\/(www\.)?(instagram\.com|tiktok\.com)\//.test(cleaned[key]))return json({error:'Use an official social profile URL.'},400);
   if(!Array.isArray(data.testimonials)||data.testimonials.length>20)return json({error:'Maximum 20 testimonials.'},400);
   if(data.testimonials.some(t=>!t||typeof t!=='object'||(t.image&& !/^https:\/\//i.test(t.image)&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(t.image))))return json({error:'Student photos must be an uploaded photo or HTTPS image URL.'},400);
   cleaned.testimonials=data.testimonials.map(t=>({name:String(t.name||'').slice(0,120),detail:String(t.detail||'').slice(0,200),quote:String(t.quote||'').slice(0,2000),image:String(t.image||'').slice(0,35000)})).filter(t=>t.name&&t.quote);
   await env.DB.prepare('INSERT INTO site_content (id, content, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at').bind(JSON.stringify(cleaned),new Date().toISOString()).run();return json({ok:true});
  }return json({error:'Method not allowed'},405);
 }
 const path=url.pathname==='/admin'||url.pathname==='/'?'/index.html':url.pathname;
 const asset=ASSETS[path];if(!asset)return new Response('Not found',{status:404});
 const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':asset.type,'Cache-Control':path==='/index.html'?'no-cache':'public, max-age=3600'}});
}};

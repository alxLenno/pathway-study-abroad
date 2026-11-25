import worker from '../../worker/index.js';
import{databaseAdapter,getPool}from'../lib/database.mjs';
import{ready,validPassword,sessionCookie,validSession,logoutCookie}from'../lib/auth.mjs';
import{createHash}from'node:crypto';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export default async(request,context)=>{
 const url=new URL(request.url);const path=url.pathname.startsWith('/api/')?url.pathname:'/api/'+url.pathname.split('/.netlify/functions/api/')[1];
 if(path==='/api/session')return json({admin:validSession(request,process.env),loginMethod:'password',configured:ready(process.env)});
 if(path==='/api/login'||path==='/api/logout'){
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(request.headers.get('origin')!==url.origin)return json({error:'Invalid request origin.'},403);
  if(path==='/api/logout')return json({ok:true},200,{'Set-Cookie':logoutCookie});
  if(!ready(process.env))return json({error:'Set ADMIN_PASSWORD (at least 16 characters) in Netlify environment variables to enable admin login.'},503);
  const body=await request.text();if(body.length>2000)return json({error:'Invalid request.'},400);
  let data;try{data=JSON.parse(body)}catch{return json({error:'Invalid request.'},400)}
  try{
   const ip=createHash('sha256').update(context.ip||'unknown').digest('hex');
   const attempt=await getPool().query('INSERT INTO admin_login_attempts (ip_hash) SELECT $1 WHERE (SELECT COUNT(*) FROM admin_login_attempts WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL \'15 minutes\') < 10 RETURNING ip_hash',[ip]);
   if(!attempt.rowCount)return json({error:'Too many login attempts. Please try again in 15 minutes.'},429);
   if(!validPassword(data?.password,process.env))return json({error:'Incorrect password.'},401);
   return json({ok:true},200,{'Set-Cookie':sessionCookie(process.env)});
  }catch{return json({error:'Admin storage is not ready. Check the Netlify database setup.'},503)}
 }
 const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.toLowerCase().startsWith('oai-authenticated-'))headers.delete(key);
 headers.delete('cf-connecting-ip');headers.set('cf-connecting-ip',context.ip||'unknown');
 if(validSession(request,process.env))headers.set('oai-authenticated-user-email','netlify-owner');
 const apiURL=new URL(path,url.origin);
 const forwarded=new Request(apiURL,{method:request.method,headers,...(!['GET','HEAD'].includes(request.method)?{body:await request.text()}:{})});
 const env={...process.env,ADMIN_EMAIL:'netlify-owner',DB:databaseAdapter()};
 try{return await worker.fetch(forwarded,env)}catch{return json({error:'The service is temporarily unavailable. Please try again shortly.'},503)}
};

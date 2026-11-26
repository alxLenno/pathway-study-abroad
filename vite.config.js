import{defineConfig}from'vite';
import{existsSync,readFileSync}from'node:fs';
import worker from './worker/index.js';
export default defineConfig({plugins:[{name:'local-content-api',async configureServer(server){
 const{DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync('.local-preview.db');
 db.exec('CREATE TABLE IF NOT EXISTS preview_migrations (name TEXT PRIMARY KEY)');
 const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));
 for(const migration of journal.entries){if(!db.prepare('SELECT name FROM preview_migrations WHERE name = ?').get(migration.tag)){db.exec(readFileSync('drizzle/'+migration.tag+'.sql','utf8'));db.prepare('INSERT INTO preview_migrations (name) VALUES (?)').run(migration.tag)}}
 if(existsSync('.local-content.json')&&!db.prepare('SELECT id FROM site_content WHERE id = 1').get())db.prepare('INSERT INTO site_content (id,content,updated_at) VALUES (1,?,?)').run(readFileSync('.local-content.json','utf8'),new Date().toISOString());
 const adapter={prepare(sql){
  const bind=(...args)=>({first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})});
  return {bind,first:async()=>db.prepare(sql).get()||null};
 }};
 server.middlewares.use(async(req,res,next)=>{if(!req.url.startsWith('/api/'))return next();try{let body='';for await(const chunk of req)body+=chunk;const origin='http://'+req.headers.host;const headers=new Headers({'oai-authenticated-user-email':'local-owner',origin});if(req.headers['content-type'])headers.set('content-type',req.headers['content-type']);const response=await worker.fetch(new Request(origin+req.url,{method:req.method,headers,...(body?{body}:{})}),{ADMIN_EMAIL:'local-owner',DB:adapter});res.statusCode=response.status;res.setHeader('Content-Type','application/json');res.end(await response.text())}catch{res.statusCode=500;res.end(JSON.stringify({error:'Local preview service error'}))}});
 server.httpServer?.once('close',()=>db.close());
 }}]});

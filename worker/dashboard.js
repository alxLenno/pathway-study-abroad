export async function dashboardApi(request,env,allowed){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!allowed)return reply({error:'Sign in to view your dashboard.'},401);
 if(request.method!=='GET')return reply({error:'Method not allowed.'},405);
 const today=Math.floor(Date.now()/86400000),start=(today-6)*86400000;
 const [statuses,questions,recent,activity,pending,content]=await Promise.all([
  env.DB.prepare('SELECT status, COUNT(*) AS count FROM study_plans GROUP BY status').bind().all(),
  env.DB.prepare('SELECT status, COUNT(*) AS count FROM questions WHERE deleted_at IS NULL GROUP BY status').bind().all(),
  env.DB.prepare('SELECT id,name,email,destination,level,intake,status,created_at FROM study_plans ORDER BY created_at DESC,id DESC LIMIT 5').bind().all(),
  env.DB.prepare('SELECT CAST(created_at / 86400000 AS BIGINT) AS day, COUNT(*) AS count FROM study_plans WHERE created_at >= ? GROUP BY CAST(created_at / 86400000 AS BIGINT) ORDER BY day').bind(start).all(),
  env.DB.prepare("SELECT id,public_question AS question,created_at FROM questions WHERE status = 'pending' AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 3").bind().all(),
  env.DB.prepare('SELECT content FROM site_content WHERE id = 1').bind().first()
 ]);
 const planCounts=Object.fromEntries(statuses.results.map(r=>[r.status,Number(r.count)]));const questionCounts=Object.fromEntries(questions.results.map(r=>[r.status,Number(r.count)]));let testimonials=0;try{testimonials=JSON.parse(content?.content||'{}').testimonials?.length||0}catch{}
 const days=Array.from({length:7},(_,i)=>({day:today-6+i,count:0}));for(const row of activity.results){const item=days.find(d=>d.day===Number(row.day));if(item)item.count=Number(row.count)}
 return reply({plans:planCounts,totalPlans:Object.values(planCounts).reduce((a,b)=>a+b,0),questions:questionCounts,testimonials,recent:recent.results,activity:days,pendingQuestions:pending.results,updatedAt:Date.now()});
}

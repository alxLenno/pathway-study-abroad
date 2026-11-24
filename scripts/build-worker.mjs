import{readFileSync,writeFileSync,readdirSync,mkdirSync}from'node:fs';
import{join,extname}from'node:path';
const assets={};const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'};
function walk(dir,base=''){for(const entry of readdirSync(dir,{withFileTypes:true})){const rel=base+'/'+entry.name;const path=join(dir,entry.name);if(entry.isDirectory()){if(!['server','.openai'].includes(entry.name))walk(path,rel)}else assets[rel]={data:readFileSync(path).toString('base64'),type:types[extname(path)]||'application/octet-stream'}}}walk('dist');mkdirSync('dist/server',{recursive:true});writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+readFileSync('worker/index.js','utf8'));

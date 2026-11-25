import {getConnectionString} from '@netlify/database';
import pg from 'pg';
let pool;
export function getPool(){return pool??=new pg.Pool({connectionString:getConnectionString(),max:3,idleTimeoutMillis:15000,connectionTimeoutMillis:10000})}
export function convertQuery(source){let i=0;let sql=source.replace(/\?/g,()=>`$${++i}`);if(sql.startsWith('INSERT OR IGNORE INTO'))sql=sql.replace('INSERT OR IGNORE INTO','INSERT INTO')+' ON CONFLICT DO NOTHING';return sql}
export function databaseAdapter(query=(text,args)=>getPool().query(text,args)){return{prepare(source){const execute=args=>query(convertQuery(source),args);return{async first(){return(await execute([])).rows[0]||null},bind(...args){return{async first(){return(await execute(args)).rows[0]||null},async run(){const result=await execute(args);return{meta:{changes:result.rowCount}}}}}}}}}

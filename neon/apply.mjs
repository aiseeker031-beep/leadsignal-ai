import {neon} from '@neondatabase/serverless';import {readFileSync} from 'node:fs';
const sql=neon(process.env.DATABASE_URL);
const file=process.argv[2]||'neon/migration.sql';
const script=readFileSync(file,'utf8');
// split on top-level semicolons, respecting $$ dollar-quoted bodies and line comments
const stmts=[];let cur='',inDollar=false,inLine=false;
for(let i=0;i<script.length;i++){
  const two=script.slice(i,i+2);
  if(!inDollar&&two==='$$'){inDollar=true;cur+=two;i++;continue}
  if(inDollar&&two==='$$'){inDollar=false;cur+=two;i++;continue}
  if(!inDollar&&!inLine&&two==='--'){inLine=true;cur+=two;i++;continue}
  if(inLine&&script[i]==='\n'){inLine=false;cur+=script[i];continue}
  if(!inDollar&&!inLine&&script[i]===';'){const s=cur.trim();if(s&&!s.replace(/^(--[^\n]*\n)+/,'').trim())cur='';else stmts.push(s);cur='';continue}
  cur+=script[i];
}
if(cur.trim())stmts.push(cur.trim());
let ok=0;
for(const stmt of stmts){
  try{await sql.query(stmt);ok++}catch(e){console.error('FAILED:',stmt.slice(0,100).replace(/\n/g,' '),'→',e.message);process.exit(1)}
}
console.log('applied statements:',ok);
const t=await sql`select table_name from information_schema.tables where table_schema='public' order by 1`;
console.log('tables:',t.map(r=>r.table_name).join(', '));
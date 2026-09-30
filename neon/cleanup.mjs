import {neon} from '@neondatabase/serverless';
const sql=neon(process.env.DATABASE_URL);
const tables=['api_limits','send_limits','jobs','activity_log','replies','outreach_messages','evidence','social_profiles','contacts','leads','searches','campaigns','user_settings','sessions','users'];
for(const t of tables){
  await sql.query(`drop table if exists ${t} cascade`);
  console.log('dropped',t);
}
await sql.query('drop function if exists reserve_send(uuid,uuid,integer,integer) cascade');
await sql.query('drop function if exists claim_job(uuid) cascade');
await sql.query('drop function if exists consume_request(uuid) cascade');
console.log('cleanup done');
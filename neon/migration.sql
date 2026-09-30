-- LeadSignal AI — Neon Postgres schema
-- Adapted from the original Supabase migration. Auth is handled by the app
-- (users + sessions tables); tenant isolation is enforced in queries.

create table users(
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);
create table sessions(
  token_hash text primary key,
  user_id uuid not null references users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index sessions_user on sessions(user_id);

create table user_settings(user_id uuid primary key references users on delete cascade, encrypted text not null);
create table campaigns(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,name text not null,query text,settings jsonb default '{}',status text default 'draft',created_at timestamptz default now());
create table searches(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,query text not null,filters jsonb default '{}',status text default 'queued',error text,created_at timestamptz default now());
create table leads(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,search_id uuid references searches on delete set null,campaign_id uuid references campaigns on delete set null,company_name text not null,domain text,website text,description text,category text,city text,state text,country text,company_age integer,launch_date date,place_id text,dedupe_key text not null,source text,source_url text,intent_score integer default 0 check(intent_score between 0 and 100),intent_level text default 'Low',crm_stage text default 'Discovered' check(crm_stage in ('Discovered','Researched','Qualified','Contacted','Replied','Meeting','Client','Lost')),next_action text,created_at timestamptz default now(),updated_at timestamptz default now(),unique(user_id,dedupe_key),unique(id,user_id));
create table contacts(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,lead_id uuid not null,name text,role text,email text,phone text,linkedin_url text,instagram_url text,facebook_url text,twitter_url text,source text,confidence numeric,foreign key(lead_id,user_id) references leads(id,user_id) on delete cascade);
create table social_profiles(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,lead_id uuid not null,platform text,url text,username text,follower_count bigint,metadata jsonb default '{}',last_checked_at timestamptz default now(),foreign key(lead_id,user_id) references leads(id,user_id) on delete cascade,unique(lead_id,url));
create table evidence(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,lead_id uuid not null,source text,source_url text not null,signal_type text not null,title text,extracted_text text not null,confidence numeric check(confidence between 0 and 1),verified boolean default false,metadata jsonb default '{}',detected_at timestamptz default now(),foreign key(lead_id,user_id) references leads(id,user_id) on delete cascade,unique(lead_id,source_url,signal_type));
create table outreach_messages(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,lead_id uuid not null,campaign_id uuid references campaigns on delete set null,channel text not null,recipient text,subject text,body text not null,status text default 'draft',external_message_id text,external_thread_id text,sent_at timestamptz,error text,created_at timestamptz default now(),foreign key(lead_id,user_id) references leads(id,user_id) on delete cascade,unique(id,user_id));
create unique index prevent_duplicate_send on outreach_messages(user_id,channel,lower(recipient)) where status in ('sending','sent','unknown');
create table replies(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,lead_id uuid not null references leads on delete cascade,outreach_message_id uuid not null references outreach_messages on delete cascade,channel text,body text not null,classification text,sender text,external_message_id text not null,received_at timestamptz,unique(user_id,channel,external_message_id));
create table activity_log(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,lead_id uuid references leads on delete set null,action text not null,metadata jsonb default '{}',created_at timestamptz default now());
create table jobs(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,kind text not null,payload jsonb not null,status text default 'queued',attempts integer default 0,error text,created_at timestamptz default now(),started_at timestamptz,finished_at timestamptz);
create table send_limits(user_id uuid primary key references users on delete cascade,last_send timestamptz,day date,count integer default 0);
create table api_limits(user_id uuid references users on delete cascade,bucket timestamptz,count integer default 0,primary key(user_id,bucket));

create function consume_request(p_user uuid) returns boolean language sql as $$
  insert into api_limits(user_id,bucket,count) values(p_user,date_trunc('minute',now()),1)
  on conflict(user_id,bucket) do update set count=api_limits.count+1
  returning count<=30
$$;

create function claim_job(p_owner uuid) returns setof jobs language plpgsql as $$
  begin
    update jobs set status='failed',error='Job timed out; queue a new research job to retry.'
      where user_id=p_owner and status='running' and started_at<now()-interval '5 minutes';
    return query update jobs set status='running',started_at=now(),attempts=attempts+1
      where id=(select id from jobs where user_id=p_owner and status='queued' order by created_at for update skip locked limit 1)
      returning *;
  end
$$;

create function reserve_send(p_user uuid,p_message uuid,daily_max integer,min_delay integer) returns outreach_messages language plpgsql as $$
  declare m outreach_messages;l send_limits;
  begin
    insert into send_limits(user_id,day,count) values(p_user,current_date,0) on conflict do nothing;
    select * into l from send_limits where user_id=p_user for update;
    select * into m from outreach_messages where id=p_message and user_id=p_user for update;
    if m.id is null or m.status<>'draft' then raise exception 'Message is not an unsent draft';end if;
    if m.recipient is null or m.recipient='' then raise exception 'Recipient required';end if;
    if exists(select 1 from replies where lead_id=m.lead_id and user_id=p_user) then raise exception 'Outreach stopped: lead has replied';end if;
    if l.day=current_date and l.count>=least(greatest(daily_max,1),100) then raise exception 'Daily send limit reached';end if;
    if l.last_send>now()-make_interval(secs=>greatest(min_delay,30)) then raise exception 'Wait before sending again';end if;
    update outreach_messages set status='sending' where id=m.id returning * into m;
    update send_limits set day=current_date,count=case when day=current_date then count+1 else 1 end,last_send=now() where user_id=p_user;
    return m;
  end
$$;

create index jobs_queue on jobs(user_id,status,created_at);
create index leads_owner on leads(user_id,intent_score desc);
create index evidence_lead on evidence(lead_id);
create index outreach_owner on outreach_messages(user_id,status);
-- CRM suite: one JSONB workspace document per user (single-tenant per workspace).
create table if not exists crm_workspace(
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table crm_workspace enable row level security;
drop policy if exists owner on crm_workspace;
create policy owner on crm_workspace for all to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
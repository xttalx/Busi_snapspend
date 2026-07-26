-- Run this in Supabase → SQL Editor if Estimates disappear after refresh.
-- Safe to re-run.

create table if not exists estimates (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table estimates enable row level security;

drop policy if exists "estimates_own" on estimates;
create policy "estimates_own" on estimates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

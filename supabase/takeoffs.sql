-- Project calculators (material takeoffs), saved per project address.
-- Run in Supabase → SQL Editor. Safe to re-run.

create table if not exists takeoffs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table takeoffs enable row level security;

drop policy if exists "takeoffs_own" on takeoffs;
create policy "takeoffs_own" on takeoffs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Run this in Supabase → SQL Editor after creating your project.
-- Enables Auth, tables, Row Level Security, and receipt storage.

-- Business profile (Settings screen)
create table if not exists business_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists employees (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists paystubs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table business_profiles enable row level security;
alter table expenses enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table employees enable row level security;
alter table paystubs enable row level security;

create policy "business_profiles_own" on business_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "expenses_own" on expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "clients_own" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "invoices_own" on invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "employees_own" on employees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "paystubs_own" on paystubs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Receipt uploads (Storage → New bucket → name: receipts, private)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_select_own" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_update_own" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_delete_own" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

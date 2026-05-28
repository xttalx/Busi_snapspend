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

create table if not exists bills (
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
alter table bills enable row level security;
alter table employees enable row level security;
alter table paystubs enable row level security;

-- Policies (drop first so this script is safe to re-run)
drop policy if exists "business_profiles_own" on business_profiles;
create policy "business_profiles_own" on business_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expenses_own" on expenses;
create policy "expenses_own" on expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "clients_own" on clients;
create policy "clients_own" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "invoices_own" on invoices;
create policy "invoices_own" on invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bills_own" on bills;
create policy "bills_own" on bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "employees_own" on employees;
create policy "employees_own" on employees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "paystubs_own" on paystubs;
create policy "paystubs_own" on paystubs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Receipt uploads (Storage → New bucket → name: receipts, private)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_select_own" on storage.objects;
create policy "receipts_select_own" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "receipts_insert_own" on storage.objects;
create policy "receipts_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "receipts_update_own" on storage.objects;
create policy "receipts_update_own" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "receipts_delete_own" on storage.objects;
create policy "receipts_delete_own" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Marten Bookkeeping — billing tables (run after schema.sql)
-- Lemon Squeezy sync: subscriptions, one-time downloads, entitlements

-- One row per user: plan choice + Lemon Squeezy customer link
create table if not exists billing_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'none' check (plan in ('none', 'pro', 'pay_per_download')),
  ls_customer_id text,
  payment_method_on_file boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Active/cancelled Pro subscriptions (mirrored from Lemon Squeezy webhooks)
create table if not exists subscriptions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  plan text not null default 'pro',
  variant_id text,
  renews_at timestamptz,
  ends_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on subscriptions (user_id);

-- Pay-per-download purchases ($11.39 CAD per invoice/paystub)
create table if not exists download_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null check (document_type in ('invoice', 'paystub')),
  document_id text not null,
  amount_cents integer not null,
  currency text not null default 'CAD',
  ls_order_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists download_transactions_user_id_idx on download_transactions (user_id);
create index if not exists download_transactions_doc_idx on download_transactions (user_id, document_type, document_id);

-- Grants right to download a specific document after payment (or manual grant)
create table if not exists download_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null check (document_type in ('invoice', 'paystub')),
  document_id text not null,
  transaction_id uuid references download_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, document_type, document_id)
);

alter table billing_profiles enable row level security;
alter table subscriptions enable row level security;
alter table download_transactions enable row level security;
alter table download_entitlements enable row level security;

-- Users can read their own billing data (writes via service role / webhooks only)
drop policy if exists "billing_profiles_select_own" on billing_profiles;
create policy "billing_profiles_select_own" on billing_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_select_own" on subscriptions;
create policy "subscriptions_select_own" on subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "download_transactions_select_own" on download_transactions;
create policy "download_transactions_select_own" on download_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "download_entitlements_select_own" on download_entitlements;
create policy "download_entitlements_select_own" on download_entitlements
  for select using (auth.uid() = user_id);

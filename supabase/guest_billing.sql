-- Guest pay-per-download (no login) — run after billing.sql

create table if not exists guest_download_sessions (
  id uuid primary key default gen_random_uuid(),
  guest_token text not null,
  document_id text not null,
  document_type text not null default 'invoice' check (document_type in ('invoice', 'paystub')),
  amount_cents integer not null,
  currency text not null default 'CAD',
  ls_order_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guest_token, document_id, document_type)
);

create index if not exists guest_download_sessions_token_idx on guest_download_sessions (guest_token);
create index if not exists guest_download_sessions_doc_idx on guest_download_sessions (document_id);

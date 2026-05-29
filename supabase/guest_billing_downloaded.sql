-- One PDF download per guest payment — run after guest_billing.sql

alter table guest_download_sessions
  add column if not exists downloaded_at timestamptz;

create index if not exists guest_download_sessions_downloaded_idx
  on guest_download_sessions (downloaded_at)
  where downloaded_at is not null;

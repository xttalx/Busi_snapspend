-- Add Stripe session tracking to existing guest_download_sessions (run if table already exists)
alter table guest_download_sessions
  add column if not exists stripe_session_id text unique;

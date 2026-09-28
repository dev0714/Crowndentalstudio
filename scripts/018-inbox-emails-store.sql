-- Stored copy of the practice inbox so email can be searched by date and kept
-- beyond the mail server's 48-hour window. Applied to the Medical project.

CREATE TABLE IF NOT EXISTS public.inbox_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox TEXT NOT NULL,
  uid TEXT NOT NULL,
  from_name TEXT,
  from_email TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  group_key TEXT NOT NULL DEFAULT 'other',
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  importance_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (mailbox, uid)
);
CREATE INDEX IF NOT EXISTS inbox_emails_received_idx ON public.inbox_emails (received_at DESC);
CREATE INDEX IF NOT EXISTS inbox_emails_important_idx ON public.inbox_emails (is_important, received_at DESC);

CREATE TABLE IF NOT EXISTS public.inbox_sync_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode TEXT NOT NULL,
  since TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  fetched INTEGER DEFAULT 0,
  stored INTEGER DEFAULT 0,
  error TEXT,
  triggered_by TEXT
);
CREATE INDEX IF NOT EXISTS inbox_sync_runs_started_idx ON public.inbox_sync_runs (started_at DESC);

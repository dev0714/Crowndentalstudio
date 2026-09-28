-- Full message bodies (fetched on demand from IMAP) and replies sent from the CRM.
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS body_fetched_at TIMESTAMPTZ;
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.inbox_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID NOT NULL REFERENCES public.inbox_emails(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  resend_id TEXT,
  sent_by UUID REFERENCES public.users(id),
  sent_by_name TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  error TEXT
);
CREATE INDEX IF NOT EXISTS inbox_replies_email_idx ON public.inbox_replies (email_id, sent_at DESC);

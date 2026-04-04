-- Automation events table for n8n and the portal automation feed.
-- This is the canonical event log for inbound/outbound automation activity.

CREATE TABLE IF NOT EXISTS public.automation_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  patient_name text NOT NULL,
  channel character varying NOT NULL CHECK (
    channel::text = ANY (
      ARRAY[
        'call'::character varying,
        'email'::character varying,
        'sms'::character varying,
        'whatsapp'::character varying,
        'in_person'::character varying,
        'instagram'::character varying,
        'facebook'::character varying,
        'tiktok'::character varying,
        'linkedin'::character varying,
        'system'::character varying
      ]::text[]
    )
  ),
  direction character varying NOT NULL CHECK (
    direction::text = ANY (ARRAY['inbound'::character varying, 'outbound'::character varying, 'internal'::character varying]::text[])
  ),
  status character varying NOT NULL DEFAULT 'queued'::character varying CHECK (
    status::text = ANY (
      ARRAY[
        'queued'::character varying,
        'sent'::character varying,
        'delivered'::character varying,
        'read'::character varying,
        'failed'::character varying,
        'received'::character varying,
        'acknowledged'::character varying,
        'resolved'::character varying
      ]::text[]
    )
  ),
  title text NOT NULL,
  message text,
  source_system text NOT NULL DEFAULT 'n8n'::text,
  source_kind text,
  source_id text,
  external_id text UNIQUE,
  scheduled_for timestamp with time zone,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT automation_events_pkey PRIMARY KEY (id),
  CONSTRAINT automation_events_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT automation_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT automation_events_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS automation_events_occurred_at_idx ON public.automation_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS automation_events_patient_id_idx ON public.automation_events (patient_id);
CREATE INDEX IF NOT EXISTS automation_events_status_idx ON public.automation_events (status);
CREATE INDEX IF NOT EXISTS automation_events_channel_idx ON public.automation_events (channel);
CREATE INDEX IF NOT EXISTS automation_events_source_system_idx ON public.automation_events (source_system);

ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to automation_events" ON public.automation_events;
CREATE POLICY "Service role full access to automation_events" ON public.automation_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

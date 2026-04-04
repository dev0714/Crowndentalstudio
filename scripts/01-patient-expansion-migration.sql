-- Migration: Add comprehensive patient management tables

-- 1. Extend patients table with additional patient info
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS id_number character varying UNIQUE,
ADD COLUMN IF NOT EXISTS preferred_contact_method character varying CHECK (preferred_contact_method::text = ANY (ARRAY['phone'::character varying, 'mobile'::character varying, 'email'::character varying, 'whatsapp'::character varying]::text[])),
ADD COLUMN IF NOT EXISTS referred_by character varying,
ADD COLUMN IF NOT EXISTS referring_doctor_id uuid REFERENCES public.users(id);

-- 2. Medical history table
CREATE TABLE IF NOT EXISTS public.patient_medical_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL,
  allergies text,
  medical_conditions text,
  current_medications text,
  previous_treatments text,
  surgical_history text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_medical_history_pkey PRIMARY KEY (id),
  CONSTRAINT patient_medical_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
);

-- 3. Medical aid details table
CREATE TABLE IF NOT EXISTS public.patient_medical_aid (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL UNIQUE,
  scheme_name character varying NOT NULL,
  member_number character varying NOT NULL,
  dependent_code character varying,
  main_member_name character varying,
  main_member_id_number character varying,
  relationship_to_main character varying,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_medical_aid_pkey PRIMARY KEY (id),
  CONSTRAINT patient_medical_aid_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
);

-- 4. Communication consent table
CREATE TABLE IF NOT EXISTS public.patient_communication_consent (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL UNIQUE,
  whatsapp_consent boolean DEFAULT false,
  call_recording_consent boolean DEFAULT false,
  popia_consent boolean DEFAULT false,
  email_consent boolean DEFAULT false,
  sms_consent boolean DEFAULT false,
  marketing_consent boolean DEFAULT false,
  consent_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_communication_consent_pkey PRIMARY KEY (id),
  CONSTRAINT patient_communication_consent_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
);

-- 5. Treatment plans table
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL,
  plan_name character varying NOT NULL,
  description text,
  planned_procedures text,
  estimated_cost numeric,
  issued_date date DEFAULT CURRENT_DATE,
  accepted boolean DEFAULT false,
  accepted_date date,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT treatment_plans_pkey PRIMARY KEY (id),
  CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT treatment_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- 6. Quotes/Estimates table
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL,
  quote_number character varying NOT NULL UNIQUE,
  description text,
  amount numeric NOT NULL,
  issued_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  status character varying DEFAULT 'Issued'::character varying CHECK (status::text = ANY (ARRAY['Issued'::character varying, 'Accepted'::character varying, 'Rejected'::character varying, 'Expired'::character varying]::text[])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- 7. Patient consents table
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL,
  consent_type character varying NOT NULL CHECK (consent_type::text = ANY (ARRAY['treatment'::character varying, 'procedure'::character varying, 'photography'::character varying, 'recording'::character varying, 'data_processing'::character varying]::text[])),
  consent_document text,
  signed_date date DEFAULT CURRENT_DATE,
  signed_by_patient boolean DEFAULT false,
  signed_by_guardian boolean DEFAULT false,
  guardian_name character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_consents_pkey PRIMARY KEY (id),
  CONSTRAINT patient_consents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
);

-- 8. Medical aid claims table
CREATE TABLE IF NOT EXISTS public.medical_aid_claims (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL,
  invoice_id uuid,
  claim_number character varying UNIQUE,
  amount_claimed numeric,
  amount_approved numeric,
  claim_date date DEFAULT CURRENT_DATE,
  status character varying DEFAULT 'Submitted'::character varying CHECK (status::text = ANY (ARRAY['Submitted'::character varying, 'Under Review'::character varying, 'Approved'::character varying, 'Rejected'::character varying, 'Paid'::character varying]::text[])),
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT medical_aid_claims_pkey PRIMARY KEY (id),
  CONSTRAINT medical_aid_claims_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT medical_aid_claims_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);

-- 9. Call recordings table
CREATE TABLE IF NOT EXISTS public.call_recordings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL,
  recording_date timestamp with time zone DEFAULT now(),
  recording_url text,
  transcript text,
  call_duration_seconds integer,
  call_type character varying CHECK (call_type::text = ANY (ARRAY['inbound'::character varying, 'outbound'::character varying]::text[])),
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT call_recordings_pkey PRIMARY KEY (id),
  CONSTRAINT call_recordings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT call_recordings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- 10. Messages table (WhatsApp, SMS, etc.)
CREATE TABLE IF NOT EXISTS public.patient_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL,
  message_type character varying CHECK (message_type::text = ANY (ARRAY['whatsapp'::character varying, 'sms'::character varying, 'email'::character varying, 'social'::character varying]::text[])),
  message_content text,
  message_date timestamp with time zone DEFAULT now(),
  sender character varying CHECK (sender::text = ANY (ARRAY['patient'::character varying, 'clinic'::character varying]::text[])),
  sender_name character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_messages_pkey PRIMARY KEY (id),
  CONSTRAINT patient_messages_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
);

-- 11. Patient clinical notes/timeline
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL,
  appointment_id uuid,
  note_type character varying CHECK (note_type::text = ANY (ARRAY['diagnosis'::character varying, 'treatment'::character varying, 'progress'::character varying, 'follow_up'::character varying, 'general'::character varying]::text[])),
  note_content text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clinical_notes_pkey PRIMARY KEY (id),
  CONSTRAINT clinical_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT clinical_notes_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT clinical_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

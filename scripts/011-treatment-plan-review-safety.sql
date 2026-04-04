-- Review-safety workflow for treatment-plan follow-up and complaint-first review prompting.

CREATE TABLE IF NOT EXISTS public.patient_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  appointment_id uuid,
  treatment_plan_id uuid,
  feedback_type character varying NOT NULL CHECK (
    feedback_type::text = ANY (ARRAY['satisfaction'::character varying, 'complaint'::character varying]::text[])
  ),
  outcome character varying NOT NULL CHECK (
    outcome::text = ANY (
      ARRAY[
        'happy'::character varying,
        'needs_follow_up'::character varying,
        'complaint_logged'::character varying,
        'resolved'::character varying
      ]::text[]
    )
  ),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  notes text,
  review_prompted_at timestamp with time zone,
  review_link_sent_at timestamp with time zone,
  complaint_logged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT patient_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT patient_feedback_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT patient_feedback_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT patient_feedback_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id),
  CONSTRAINT patient_feedback_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS patient_feedback_patient_id_idx ON public.patient_feedback (patient_id);
CREATE INDEX IF NOT EXISTS patient_feedback_appointment_id_idx ON public.patient_feedback (appointment_id);
CREATE INDEX IF NOT EXISTS patient_feedback_treatment_plan_id_idx ON public.patient_feedback (treatment_plan_id);
CREATE INDEX IF NOT EXISTS patient_feedback_created_at_idx ON public.patient_feedback (created_at DESC);

ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to patient_feedback" ON public.patient_feedback;
CREATE POLICY "Service role full access to patient_feedback" ON public.patient_feedback
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

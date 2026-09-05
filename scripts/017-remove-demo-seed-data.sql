-- Remove the demo rows inserted by scripts/seed-data.sql so the CRM only shows real practice data.
--
-- Demo patients and leads are identified by their @example.com email addresses
-- (John Smith, Sarah Johnson, Michael Brown, Emma Wilson, David Miller, Lisa Garcia,
-- James Anderson, Maria Martinez). Everything linked to those patients is removed too:
-- appointments, lab cases and their events, invoices with items / claims / authorisations /
-- reminders, treatment plans, procedures, notes, messages, consents, contacts and feedback.
--
-- Run once against the "Medical" Supabase project. Review the counts printed at the end.

BEGIN;

CREATE TEMP TABLE demo_patients ON COMMIT DROP AS
  SELECT id FROM public.patients WHERE email ILIKE '%@example.com';

CREATE TEMP TABLE demo_invoices ON COMMIT DROP AS
  SELECT id FROM public.invoices WHERE patient_id IN (SELECT id FROM demo_patients);

CREATE TEMP TABLE demo_lab_cases ON COMMIT DROP AS
  SELECT id FROM public.lab_cases WHERE patient_id IN (SELECT id FROM demo_patients);

CREATE TEMP TABLE demo_appointments ON COMMIT DROP AS
  SELECT id FROM public.appointments WHERE patient_id IN (SELECT id FROM demo_patients);

-- Rows that hang off invoices, lab cases and appointments
DELETE FROM public.medical_aid_authorizations
  WHERE patient_id IN (SELECT id FROM demo_patients) OR invoice_id IN (SELECT id FROM demo_invoices);
DELETE FROM public.medical_aid_claims
  WHERE patient_id IN (SELECT id FROM demo_patients) OR invoice_id IN (SELECT id FROM demo_invoices);
DELETE FROM public.payment_reminders
  WHERE patient_id IN (SELECT id FROM demo_patients) OR invoice_id IN (SELECT id FROM demo_invoices);
DELETE FROM public.invoice_items WHERE invoice_id IN (SELECT id FROM demo_invoices);
DELETE FROM public.lab_case_events WHERE lab_case_id IN (SELECT id FROM demo_lab_cases);
DELETE FROM public.clinical_notes
  WHERE patient_id IN (SELECT id FROM demo_patients) OR appointment_id IN (SELECT id FROM demo_appointments);
DELETE FROM public.patient_feedback
  WHERE patient_id IN (SELECT id FROM demo_patients) OR appointment_id IN (SELECT id FROM demo_appointments);

-- Rows that hang directly off the patient
DELETE FROM public.automation_events WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.call_recordings WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.patient_communication_consent WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.patient_consents WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.patient_contacts WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.patient_medical_aid WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.patient_medical_history WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.patient_messages WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.patient_procedures WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.quotes WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.treatment_plans WHERE patient_id IN (SELECT id FROM demo_patients);
DELETE FROM public.invoices WHERE id IN (SELECT id FROM demo_invoices);
DELETE FROM public.lab_cases WHERE id IN (SELECT id FROM demo_lab_cases);
DELETE FROM public.appointments WHERE id IN (SELECT id FROM demo_appointments);

-- The demo patients and leads themselves
DELETE FROM public.patients WHERE id IN (SELECT id FROM demo_patients);
DELETE FROM public.leads WHERE email ILIKE '%@example.com';

-- What is left
SELECT 'patients' AS table_name, COUNT(*) AS remaining FROM public.patients
UNION ALL SELECT 'leads', COUNT(*) FROM public.leads
UNION ALL SELECT 'appointments', COUNT(*) FROM public.appointments
UNION ALL SELECT 'lab_cases', COUNT(*) FROM public.lab_cases
UNION ALL SELECT 'invoices', COUNT(*) FROM public.invoices;

COMMIT;

-- Optional: the seed script also added four demo stock items. Uncomment to remove them.
-- DELETE FROM public.stock_items WHERE item_code IN ('MAT-001', 'MAT-002', 'INS-001', 'SUP-001');

-- Seed data for Crown Dental System

-- Insert Patients
INSERT INTO public.patients (patient_number, first_name, last_name, email, phone, mobile, date_of_birth, gender, address, city, postal_code, status) 
VALUES 
('P001', 'John', 'Smith', 'john@example.com', '021-555-0001', '083-555-0001', '1980-05-15', 'M', '123 Main St', 'Cape Town', '8001', 'Active'),
('P002', 'Sarah', 'Johnson', 'sarah@example.com', '021-555-0002', '083-555-0002', '1985-08-22', 'F', '456 Oak Ave', 'Cape Town', '8002', 'Active'),
('P003', 'Michael', 'Brown', 'michael@example.com', '021-555-0003', '083-555-0003', '1975-12-10', 'M', '789 Pine Rd', 'Johannesburg', '2000', 'Active'),
('P004', 'Emma', 'Wilson', 'emma@example.com', '021-555-0004', '083-555-0004', '1990-03-18', 'F', '321 Elm St', 'Durban', '4000', 'Active')
ON CONFLICT (patient_number) DO NOTHING;

-- Insert Appointments
INSERT INTO public.appointments (patient_id, appointment_date, duration_minutes, appointment_type, status)
SELECT id, NOW() + INTERVAL '2 days', 30, 'Checkup', 'Scheduled'
FROM public.patients WHERE patient_number = 'P001'
UNION ALL
SELECT id, NOW() + INTERVAL '3 days', 45, 'Cleaning', 'Scheduled'
FROM public.patients WHERE patient_number = 'P002'
UNION ALL
SELECT id, NOW() + INTERVAL '4 days', 60, 'Root Canal', 'Confirmed'
FROM public.patients WHERE patient_number = 'P003'
UNION ALL
SELECT id, NOW() + INTERVAL '5 days', 30, 'Extraction', 'Scheduled'
FROM public.patients WHERE patient_number = 'P004'
ON CONFLICT DO NOTHING;

-- Insert Leads
INSERT INTO public.leads (first_name, last_name, email, phone, source, service_interested, status, created_at)
VALUES 
('David', 'Miller', 'david@example.com', '021-555-0010', 'Google', 'Teeth Whitening', 'New', NOW()),
('Lisa', 'Garcia', 'lisa@example.com', '021-555-0011', 'Referral', 'Implants', 'Contacted', NOW() - INTERVAL '1 day'),
('James', 'Anderson', 'james@example.com', '021-555-0012', 'Facebook', 'General Checkup', 'Qualified', NOW() - INTERVAL '2 days'),
('Maria', 'Martinez', 'maria@example.com', '021-555-0013', 'Direct Call', 'Braces', 'New', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Insert Invoices
INSERT INTO public.invoices (invoice_number, patient_id, invoice_date, due_date, subtotal, tax, total_amount, paid_amount, status)
SELECT 'INV-2024-001', id, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 1500, 225, 1725, 1725, 'Paid'
FROM public.patients WHERE patient_number = 'P001'
UNION ALL
SELECT 'INV-2024-002', id, CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days', 2200, 330, 2530, 0, 'Overdue'
FROM public.patients WHERE patient_number = 'P002'
UNION ALL
SELECT 'INV-2024-003', id, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '15 days', 800, 120, 920, 460, 'Partially Paid'
FROM public.patients WHERE patient_number = 'P003'
UNION ALL
SELECT 'INV-2024-004', id, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 3500, 525, 4025, 0, 'Issued'
FROM public.patients WHERE patient_number = 'P004'
ON CONFLICT (invoice_number) DO NOTHING;

-- Insert Stock Items
INSERT INTO public.stock_items (item_code, item_name, category, quantity_on_hand, reorder_level, unit_cost, unit_price, expiry_date)
VALUES 
('MAT-001', 'Composite Resin A2', 'Restorative', 45, 20, 150, 200, CURRENT_DATE + INTERVAL '270 days'),
('MAT-002', 'Glass Ionomer', 'Restorative', 12, 25, 120, 160, CURRENT_DATE + INTERVAL '180 days'),
('INS-001', 'Dental Burs Set', 'Instruments', 8, 10, 200, 350, CURRENT_DATE + INTERVAL '730 days'),
('SUP-001', 'Dental Gloves (Box)', 'Supplies', 25, 50, 45, 75, CURRENT_DATE + INTERVAL '365 days')
ON CONFLICT (item_code) DO NOTHING;

-- Insert Lab Cases
INSERT INTO public.lab_cases (patient_id, lab_case_number, case_type, status, due_date, lab_name)
SELECT id, 'LAB-001', 'Crown', 'In Progress', CURRENT_DATE + INTERVAL '7 days', 'ProLab Dental'
FROM public.patients WHERE patient_number = 'P001'
UNION ALL
SELECT id, 'LAB-002', 'Bridge', 'Quality Check', CURRENT_DATE + INTERVAL '5 days', 'Dental Excellence'
FROM public.patients WHERE patient_number = 'P002'
UNION ALL
SELECT id, 'LAB-003', 'Veneer', 'Ready', CURRENT_DATE + INTERVAL '2 days', 'ProLab Dental'
FROM public.patients WHERE patient_number = 'P003'
UNION ALL
SELECT id, 'LAB-004', 'Crown', 'Received', CURRENT_DATE + INTERVAL '10 days', 'Dental Solutions'
FROM public.patients WHERE patient_number = 'P004'
ON CONFLICT (lab_case_number) DO NOTHING;

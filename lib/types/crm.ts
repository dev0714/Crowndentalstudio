// CRM Entity Types - Auto-generated from database schema

export interface User {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'CEO' | 'Reception' | 'Doctor' | 'Admin';
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Patient {
  id: string;
  patient_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  date_of_birth?: string;
  gender?: 'M' | 'F' | 'Other';
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  medical_aid?: string;
  medical_aid_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PatientContact {
  id: string;
  patient_id: string;
  contact_type: 'call' | 'email' | 'sms' | 'whatsapp' | 'in_person';
  contact_date: string;
  notes?: string;
  outcome?: string;
  created_by?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  source?: 'Website' | 'Referral' | 'Google' | 'Facebook' | 'Direct Call' | 'Other';
  service_interested?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
  notes?: string;
  assigned_to?: string;
  converted_patient_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes: number;
  appointment_type: string;
  notes?: string;
  status: 'Scheduled' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  assigned_doctor?: string;
  room_number?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PatientProcedure {
  id: string;
  patient_id: string;
  procedure_name: string;
  procedure_date?: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  cost_estimate?: number;
  cost_actual?: number;
  notes?: string;
  assigned_doctor?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface LabCase {
  id: string;
  patient_id: string;
  lab_case_number?: string;
  case_type: string;
  description?: string;
  status: 'Received' | 'In Progress' | 'Quality Check' | 'Ready' | 'Delivered' | 'On Hold';
  due_date?: string;
  delivery_date?: string;
  lab_name?: string;
  cost?: number;
  notes?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  status: 'Draft' | 'Issued' | 'Overdue' | 'Partially Paid' | 'Paid' | 'Cancelled';
  medical_aid_claim: boolean;
  claim_status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface MedicalAidAuthorization {
  id: string;
  patient_id: string;
  patient_name?: string | null;
  invoice_id?: string | null;
  claim_id?: string | null;
  procedure_name: string;
  procedure_code?: string | null;
  icd10_code?: string | null;
  scheme_name?: string | null;
  authorization_requested_date: string;
  authorization_reference?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Needs Review';
  authorized_amount?: number | null;
  co_payment_amount?: number | null;
  patient_shortfall_amount?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PatientFeedback {
  id: string;
  patient_id: string;
  appointment_id?: string | null;
  treatment_plan_id?: string | null;
  feedback_type: 'satisfaction' | 'complaint';
  outcome: 'happy' | 'needs_follow_up' | 'complaint_logged' | 'resolved';
  rating?: number | null;
  notes?: string | null;
  review_prompted_at?: string | null;
  review_link_sent_at?: string | null;
  complaint_logged_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface BillingInvoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  patient_name?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  status?: string | null;
}

export interface BankStatementLine {
  id: string;
  statement_date: string;
  description: string;
  reference?: string | null;
  amount: number;
  direction?: 'credit' | 'debit' | string | null;
  bank_account?: string | null;
  matched_invoice_id?: string | null;
  matched_invoice_number?: string | null;
  match_confidence?: 'high' | 'medium' | 'low' | 'unmatched';
  match_reason?: string | null;
  notes?: string | null;
}

export interface PaymentReminderLog {
  id: string;
  invoice_id: string;
  patient_id: string;
  reminder_day: number;
  reminder_type: 'payment' | 'deposit' | 'cancellation';
  status: 'sent' | 'queued' | 'failed';
  scheduled_for?: string | null;
  sent_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DebtBucket {
  count: number;
  amount: number;
}

export interface DebtBucketSummary {
  totalOutstanding: number;
  current: DebtBucket;
  day1to2: DebtBucket;
  day3to6: DebtBucket;
  day7to13: DebtBucket;
  day14to20: DebtBucket;
  day21Plus: DebtBucket;
}

export interface BankStatementMatch extends BankStatementLine {
  matched_invoice_id: string | null;
  matched_invoice_number: string | null;
  match_confidence: 'high' | 'medium' | 'low' | 'unmatched';
  match_reason: string;
}

export interface ReminderQueueItem {
  invoice_id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  reminder_day: number;
  due_date: string;
  overdue_days: number;
  outstanding_amount: number;
}

export interface ReminderSchedule {
  due: ReminderQueueItem[];
  sentDaysByInvoiceId: Record<string, number[]>;
}

export type SpecialInvoiceKind = 'deposit' | 'cancellation_fee';

export interface SpecialInvoiceDraft {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  status: 'Issued';
  medical_aid_claim: boolean;
  title: string;
  items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
}

export interface StockItem {
  id: string;
  item_code: string;
  item_name: string;
  category?: string;
  quantity_on_hand: number;
  quantity_on_order: number;
  reorder_level: number;
  min_stock_level?: number;
  unit_cost?: number;
  unit_price?: number;
  expiry_date?: string;
  supplier?: string;
  last_reorder_date?: string;
  batch_number?: string;
  storage_location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Settings {
  id: string;
  setting_key: string;
  setting_value?: string;
  setting_type?: string;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

// Request/Response types
export interface CreatePatientRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  date_of_birth?: string;
  gender?: 'M' | 'F' | 'Other';
  medical_aid?: string;
  medical_aid_number?: string;
  notes?: string;
}

export interface CreateAppointmentRequest {
  patient_id: string;
  appointment_date: string;
  appointment_type: string;
  duration_minutes?: number;
  assigned_doctor?: string;
  room_number?: string;
  notes?: string;
}

export interface CreateLeadRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  source?: string;
  service_interested?: string;
  notes?: string;
}

export interface CreateInvoiceRequest {
  patient_id: string;
  invoice_date: string;
  due_date?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  discount?: number;
  tax?: number;
  medical_aid_claim?: boolean;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

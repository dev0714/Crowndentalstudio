export const APPOINTMENT_STATUS = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
} as const;

export const APPOINTMENT_STATUSES = Object.values(APPOINTMENT_STATUS);

export const LEAD_STATUS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  LOST: 'Lost',
} as const;

export const LEAD_STATUSES = Object.values(LEAD_STATUS);

export const LAB_CASE_STATUS = {
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  QUALITY_CHECK: 'Quality Check',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  ON_HOLD: 'On Hold',
} as const;

export const LAB_CASE_STATUSES = Object.values(LAB_CASE_STATUS);

export const LAB_WORKFLOW_STAGE = {
  CREATED: 'Created',
  COLLECTED: 'Collected',
  RECEIVED_BY_LAB: 'Received by lab',
  IN_PRODUCTION: 'In production',
  READY: 'Ready',
  DISPATCHED: 'Dispatched',
  RECEIVED_BY_PRACTICE: 'Received by practice',
  FITTED_TO_PATIENT: 'Fitted to patient',
  RETURNED_FOR_ADJUSTMENT: 'Returned for adjustment',
  REMAKE: 'Remake',
  COMPLETED: 'Completed',
} as const;

export const LAB_WORKFLOW_STAGES = Object.values(LAB_WORKFLOW_STAGE);

export const INVOICE_STATUS = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  OVERDUE: 'Overdue',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
} as const;

export const INVOICE_STATUSES = Object.values(INVOICE_STATUS);

export const STOCK_ALERT_LEVEL = {
  LOW_STOCK: 'Low Stock',
  MONITOR: 'Monitor',
  IN_STOCK: 'In Stock',
} as const;

export const STOCK_ALERT_LEVELS = Object.values(STOCK_ALERT_LEVEL);

export const CLAIM_STATUS = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
} as const;

export const CLAIM_STATUSES = Object.values(CLAIM_STATUS);

export const MEDICAL_AID_AUTHORIZATION_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  NEEDS_REVIEW: 'Needs Review',
} as const;

export const MEDICAL_AID_AUTHORIZATION_STATUSES = Object.values(MEDICAL_AID_AUTHORIZATION_STATUS);

export const OPERATIONS_REGISTER_TYPE = {
  LEADS: 'Leads',
  LAB: 'Lab',
  CONSENTS: 'Consents',
  ACCOUNTS: 'Accounts',
  RECALLS: 'Recalls',
  STOCK: 'Stock',
  INCIDENTS: 'Incidents',
} as const;

export const OPERATIONS_REGISTER_TYPES = Object.values(OPERATIONS_REGISTER_TYPE);

export const RISK_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const PATIENT_FEEDBACK_TYPE = {
  SATISFACTION: 'satisfaction',
  COMPLAINT: 'complaint',
} as const;

export const PATIENT_FEEDBACK_OUTCOME = {
  HAPPY: 'happy',
  NEEDS_FOLLOW_UP: 'needs_follow_up',
  COMPLAINT_LOGGED: 'complaint_logged',
  RESOLVED: 'resolved',
} as const;

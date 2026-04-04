export type OperationsSummaryInput = {
  patients: Array<{ status?: string | null }>;
  appointments: Array<{ status?: string | null; appointment_date?: string | null }>;
  invoices: Array<{ status?: string | null; total_amount?: number | null; paid_amount?: number | null }>;
  labCases: Array<{ status?: string | null; workflow_stage?: string | null; due_date?: string | null; expected_return_date?: string | null }>;
  leads: Array<{ status?: string | null }>;
};

function toDayKey(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function isOpenLead(status?: string | null) {
  return Boolean(status) && status !== 'Lost' && status !== 'Converted';
}

function isOpenLabCase(status?: string | null, workflowStage?: string | null) {
  return (status || workflowStage || '').toLowerCase() !== 'completed';
}

export function buildOperationsSummary(input: OperationsSummaryInput) {
  const today = new Date().toISOString().slice(0, 10);
  const outstandingBalance = input.invoices.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)),
    0,
  );

  return {
    totalPatients: input.patients.length,
    activePatients: input.patients.filter((patient) => patient.status === 'Active').length,
    todayAppointments: input.appointments.filter((appointment) => toDayKey(appointment.appointment_date) === today).length,
    overdueInvoices: input.invoices.filter((invoice) => invoice.status === 'Overdue').length,
    outstandingBalance,
    openLabCases: input.labCases.filter((labCase) => isOpenLabCase(labCase.status, labCase.workflow_stage)).length,
    openLeads: input.leads.filter((lead) => isOpenLead(lead.status)).length,
  };
}

export type NormalizedRegisterRow = {
  id: string;
  label: string;
  patient_id?: string | null;
  patient_name?: string;
  status?: string | null;
  date?: string | null;
  owner?: string | null;
  source?: string | null;
  details?: string | null;
};

export function normalizeRegisterRow(row: NormalizedRegisterRow) {
  return {
    id: row.id,
    label: row.label,
    patient_id: row.patient_id || null,
    patient_name: row.patient_name || '',
    status: row.status || '',
    date: row.date || '',
    owner: row.owner || '',
    source: row.source || '',
    details: row.details || '',
  };
}

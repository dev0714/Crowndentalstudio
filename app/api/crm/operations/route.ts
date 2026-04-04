import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { supabaseServer } from '@/lib/supabase/server';
import { buildOperationsSummary, normalizeRegisterRow } from '@/lib/operations/operations-summary';
import { buildRiskSignals } from '@/lib/operations/risk-signals';

function isMissingRelationError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || Boolean(error.message?.includes('does not exist'));
}

async function safeMany<T extends Record<string, unknown>>(
  table: string,
  options: {
    select?: string;
    build?: (query: ReturnType<typeof supabaseServer.from>) => ReturnType<typeof supabaseServer.from>;
  } = {},
): Promise<T[]> {
  let query = supabaseServer.from(table).select(options.select || '*');
  if (options.build) {
    query = options.build(query);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []) as T[];
}

function patientNameFromRow(row: { first_name?: string | null; last_name?: string | null }) {
  return `${row.first_name || ''} ${row.last_name || ''}`.trim();
}

function mapByPatientId<T extends { patient_id?: string | null }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    const patientId = row.patient_id || '';
    if (!patientId) return acc;
    acc[patientId] = acc[patientId] || [];
    acc[patientId].push(row);
    return acc;
  }, {});
}

function toIso(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function sortDescByDate<T extends { date?: string | null; event_at?: string | null; created_at?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const left = new Date(String(a.event_at || a.date || a.created_at || '')).getTime();
    const right = new Date(String(b.event_at || b.date || b.created_at || '')).getTime();
    return right - left;
  });
}

function buildTimelineEvent(input: {
  id: string;
  label: string;
  description: string;
  event_at: string;
  patient_id?: string | null;
  patient_name?: string;
  source: string;
}) {
  return {
    id: input.id,
    label: input.label,
    description: input.description,
    event_at: input.event_at,
    patient_id: input.patient_id || null,
    patient_name: input.patient_name || '',
    source: input.source,
  };
}

function calculateOutstandingConsentCount(
  patients: Array<{ id: string }>,
  commConsents: Array<{ patient_id: string; popia_consent?: boolean | null }>,
) {
  const consentMap = new Map(commConsents.map((row) => [row.patient_id, row]));
  return patients.filter((patient) => !consentMap.get(patient.id) || !consentMap.get(patient.id)?.popia_consent).length;
}

function calculateOverdueLabCount(
  labCases: Array<{ status?: string | null; due_date?: string | null; expected_return_date?: string | null }>,
) {
  const today = new Date().toISOString().slice(0, 10);
  return labCases.filter((labCase) => {
    const deadline = labCase.expected_return_date || labCase.due_date || '';
    return (labCase.status || '').toLowerCase() !== 'completed' && Boolean(deadline) && String(deadline).slice(0, 10) < today;
  }).length;
}

function calculateOverdueInvoiceCount(invoices: Array<{ status?: string | null; due_date?: string | null; total_amount?: number | null; paid_amount?: number | null }>) {
  const today = new Date().toISOString().slice(0, 10);
  return invoices.filter((invoice) => {
    if (invoice.status === 'Overdue') return true;
    const dueDate = invoice.due_date ? String(invoice.due_date).slice(0, 10) : '';
    const unpaid = Number(invoice.total_amount || 0) > Number(invoice.paid_amount || 0);
    return unpaid && Boolean(dueDate) && dueDate < today;
  }).length;
}

function calculateLowStockCount(stockItems: Array<{ quantity_on_hand?: number | null; reorder_level?: number | null; expiry_date?: string | null }>) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + 90);
  const limit = thresholdDate.toISOString().slice(0, 10);
  return stockItems.filter((item) => {
    const quantityOnHand = Number(item.quantity_on_hand || 0);
    const reorderLevel = Number(item.reorder_level || 0);
    const expiryDate = item.expiry_date ? String(item.expiry_date).slice(0, 10) : '';
    return quantityOnHand <= reorderLevel || (Boolean(expiryDate) && expiryDate <= limit);
  }).length;
}

function calculateStaleRecallCount(appointments: Array<{ patient_id?: string | null; status?: string | null; appointment_date?: string | null }>) {
  const completedByPatient = new Map<string, string>();
  const futureScheduled = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  appointments.forEach((appointment) => {
    const patientId = appointment.patient_id || '';
    const appointmentDate = appointment.appointment_date ? String(appointment.appointment_date).slice(0, 10) : '';

    if (!patientId) return;

    if ((appointment.status || '') === 'Completed' && appointmentDate) {
      const current = completedByPatient.get(patientId);
      if (!current || appointmentDate > current) {
        completedByPatient.set(patientId, appointmentDate);
      }
    }

    if ((appointment.status || '') === 'Scheduled' || (appointment.status || '') === 'Confirmed') {
      if (appointmentDate >= today) {
        futureScheduled.add(patientId);
      }
    }
  });

  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - 180);
  const cutoff = staleCutoff.toISOString().slice(0, 10);

  return [...completedByPatient.entries()].filter(([patientId, lastCompleted]) => lastCompleted < cutoff && !futureScheduled.has(patientId)).length;
}

function buildRegisters(params: {
  patients: Array<{ id: string; first_name?: string | null; last_name?: string | null }>;
  leads: Array<Record<string, unknown>>;
  labCases: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  authorizations: Array<Record<string, unknown>>;
  patientConsents: Array<Record<string, unknown>>;
  communicationConsents: Array<Record<string, unknown>>;
  appointments: Array<Record<string, unknown>>;
  stockItems: Array<Record<string, unknown>>;
  auditLogs: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  labEvents: Array<Record<string, unknown>>;
}) {
  const patientNameMap = new Map(params.patients.map((patient) => [patient.id, patientNameFromRow(patient)]));

  const leads = sortDescByDate(
    params.leads.map((lead) =>
      normalizeRegisterRow({
        id: String(lead.id),
        label: `${String(lead.first_name || '')} ${String(lead.last_name || '')}`.trim() || 'Lead',
        patient_id: (lead.converted_patient_id as string | null) || null,
        patient_name: `${String(lead.first_name || '')} ${String(lead.last_name || '')}`.trim(),
        status: String(lead.status || ''),
        date: String(lead.created_at || ''),
        owner: String(lead.assigned_to || lead.created_by || ''),
        source: String(lead.source || ''),
        details: String(lead.service_interested || ''),
      }),
    ),
  );

  const lab = sortDescByDate(
    params.labCases.map((labCase) =>
      normalizeRegisterRow({
        id: String(labCase.id),
        label: String(labCase.lab_case_number || labCase.case_type || 'Lab case'),
        patient_id: String(labCase.patient_id || ''),
        patient_name: patientNameMap.get(String(labCase.patient_id || '')) || '',
        status: String(labCase.status || ''),
        date: String(labCase.expected_return_date || labCase.due_date || labCase.created_at || ''),
        owner: String(labCase.assigned_to || labCase.lab_name || ''),
        source: String(labCase.case_type || ''),
        details: [labCase.shade, labCase.description].filter(Boolean).join(' • '),
      }),
    ),
  );

  const consents = sortDescByDate([
    ...params.patientConsents.map((consent) =>
      normalizeRegisterRow({
        id: String(consent.id),
        label: `${String(consent.consent_type || 'consent')} consent`,
        patient_id: String(consent.patient_id || ''),
        patient_name: patientNameMap.get(String(consent.patient_id || '')) || '',
        status: Boolean(consent.signed_by_patient || consent.signed_by_guardian) ? 'Signed' : 'Draft',
        date: String(consent.signed_date || consent.created_at || ''),
        source: 'patient_consents',
        details: String(consent.notes || ''),
      }),
    ),
    ...params.communicationConsents.map((consent) =>
      normalizeRegisterRow({
        id: String(consent.id),
        label: 'Communication consent',
        patient_id: String(consent.patient_id || ''),
        patient_name: patientNameMap.get(String(consent.patient_id || '')) || '',
        status: Boolean(consent.popia_consent) ? 'Consented' : 'Needs Review',
        date: String(consent.consent_date || consent.created_at || ''),
        source: 'patient_communication_consent',
        details: 'WhatsApp / SMS / email consent snapshot',
      }),
    ),
  ]);

  const accounts = sortDescByDate([
    ...params.invoices.map((invoice) =>
      normalizeRegisterRow({
        id: String(invoice.id),
        label: String(invoice.invoice_number || 'Invoice'),
        patient_id: String(invoice.patient_id || ''),
        patient_name: patientNameMap.get(String(invoice.patient_id || '')) || '',
        status: String(invoice.status || ''),
        date: String(invoice.invoice_date || ''),
        source: 'invoice',
        details: `Balance due: ${Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0))}`,
      }),
    ),
    ...params.claims.map((claim) =>
      normalizeRegisterRow({
        id: String(claim.id),
        label: String(claim.claim_number || 'Claim'),
        patient_id: String(claim.patient_id || ''),
        patient_name: patientNameMap.get(String(claim.patient_id || '')) || '',
        status: String(claim.status || ''),
        date: String(claim.claim_date || ''),
        source: 'medical_aid_claim',
        details: String(claim.rejection_reason || ''),
      }),
    ),
    ...params.authorizations.map((authorization) =>
      normalizeRegisterRow({
        id: String(authorization.id),
        label: String(authorization.authorization_reference || authorization.procedure_name || 'Authorization'),
        patient_id: String(authorization.patient_id || ''),
        patient_name: patientNameMap.get(String(authorization.patient_id || '')) || '',
        status: String(authorization.status || ''),
        date: String(authorization.authorization_requested_date || ''),
        source: 'medical_aid_authorization',
        details: String(authorization.procedure_name || ''),
      }),
    ),
  ]);

  const recalls = sortDescByDate(
    params.appointments
      .filter((appointment) => (appointment.status || '') === 'Completed')
      .map((appointment) =>
        normalizeRegisterRow({
          id: String(appointment.id),
          label: 'Recall due',
          patient_id: String(appointment.patient_id || ''),
          patient_name: patientNameMap.get(String(appointment.patient_id || '')) || '',
          status: 'Due',
          date: String(appointment.appointment_date || ''),
          source: 'appointment',
          details: 'Completed appointment older than recall threshold',
        }),
      ),
  );

  const stock = sortDescByDate(
    params.stockItems.map((item) =>
      normalizeRegisterRow({
        id: String(item.id),
        label: String(item.item_name || item.item_code || 'Stock item'),
        status:
          Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0)
            ? 'Low Stock'
            : 'In Stock',
        date: String(item.expiry_date || item.last_reorder_date || item.created_at || ''),
        source: 'stock_items',
        details: `Qty on hand: ${Number(item.quantity_on_hand || 0)} / reorder: ${Number(item.reorder_level || 0)}`,
      }),
    ),
  );

  const incidents = sortDescByDate(
    params.auditLogs
      .filter((auditLog) => String(auditLog.action || '').includes('incident') || String(auditLog.entity_type || '').includes('incident'))
      .map((auditLog) =>
        normalizeRegisterRow({
          id: String(auditLog.id),
          label: String(auditLog.action || 'Incident'),
          status: 'Logged',
          date: String(auditLog.created_at || ''),
          source: String(auditLog.entity_type || 'audit_log'),
          details: String(auditLog.entity_id || ''),
        }),
      ),
  );

  return { leads, lab, consents, accounts, recalls, stock, incidents, patientNameMap };
}

function buildPatientTimeline(params: {
  patientId: string;
  patientName: string;
  auditLogs: Array<Record<string, unknown>>;
  appointments: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  authorizations: Array<Record<string, unknown>>;
  labCases: Array<Record<string, unknown>>;
  labEvents: Array<Record<string, unknown>>;
  patientConsents: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
}) {
  const events = [
    ...params.auditLogs
      .filter((row) => String(row.entity_id || '') === params.patientId || String(row.metadata?.patient_id || '') === params.patientId)
      .map((row) =>
        buildTimelineEvent({
          id: String(row.id),
          label: String(row.action || 'Audit event'),
          description: `${String(row.entity_type || 'record')} updated`,
          event_at: String(row.created_at || ''),
          patient_id: params.patientId,
          patient_name: params.patientName,
          source: 'audit_log',
        }),
      ),
    ...params.appointments.map((row) =>
      buildTimelineEvent({
        id: `appointment:${row.id}`,
        label: `Appointment ${String(row.status || '')}`,
        description: String(row.appointment_type || ''),
        event_at: String(row.appointment_date || row.created_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'appointments',
      }),
    ),
    ...params.claims.map((row) =>
      buildTimelineEvent({
        id: `claim:${row.id}`,
        label: `Claim ${String(row.status || '')}`,
        description: String(row.claim_number || ''),
        event_at: String(row.claim_date || row.created_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'medical_aid_claims',
      }),
    ),
    ...params.authorizations.map((row) =>
      buildTimelineEvent({
        id: `authorization:${row.id}`,
        label: `Authorization ${String(row.status || '')}`,
        description: String(row.procedure_name || ''),
        event_at: String(row.authorization_requested_date || row.created_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'medical_aid_authorizations',
      }),
    ),
    ...params.labCases.map((row) =>
      buildTimelineEvent({
        id: `lab:${row.id}`,
        label: `Lab case ${String(row.status || '')}`,
        description: String(row.lab_case_number || row.case_type || ''),
        event_at: String(row.updated_at || row.created_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'lab_cases',
      }),
    ),
    ...params.labEvents.map((row) =>
      buildTimelineEvent({
        id: `lab-event:${row.id}`,
        label: String(row.event_type || 'Lab event'),
        description: String(row.notes || ''),
        event_at: String(row.event_at || row.created_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'lab_case_events',
      }),
    ),
    ...params.patientConsents.map((row) =>
      buildTimelineEvent({
        id: `consent:${row.id}`,
        label: `Consent ${Boolean(row.signed_by_patient || row.signed_by_guardian) ? 'signed' : 'draft'}`,
        description: String(row.consent_type || ''),
        event_at: String(row.signed_date || row.created_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'patient_consents',
      }),
    ),
    ...params.documents.map((row) =>
      buildTimelineEvent({
        id: `document:${row.id}`,
        label: String(row.title || 'Document'),
        description: String(row.document_type || ''),
        event_at: String(row.created_at || row.signed_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'patient_documents',
      }),
    ),
    ...params.contacts.map((row) =>
      buildTimelineEvent({
        id: `contact:${row.id}`,
        label: String(row.contact_type || 'Contact'),
        description: String(row.outcome || row.notes || ''),
        event_at: String(row.contact_date || row.created_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'patient_contacts',
      }),
    ),
    ...params.invoices.map((row) =>
      buildTimelineEvent({
        id: `invoice:${row.id}`,
        label: `Invoice ${String(row.status || '')}`,
        description: String(row.invoice_number || ''),
        event_at: String(row.invoice_date || row.created_at || ''),
        patient_id: params.patientId,
        patient_name: params.patientName,
        source: 'invoices',
      }),
    ),
  ];

  return sortDescByDate(events).slice(0, 40).map((event) => ({
    ...event,
    event_at: toIso(event.event_at) || event.event_at,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || '';

    const [
      patients,
      appointments,
      leads,
      labCases,
      invoices,
      claims,
      authorizations,
      patientConsents,
      communicationConsents,
      documents,
      contacts,
      stockItems,
      auditLogs,
      labEvents,
    ] = await Promise.all([
      safeMany<{ id: string; first_name?: string | null; last_name?: string | null; status?: string | null }>('patients', {
        select: 'id, first_name, last_name, status',
        build: (query) => query.order('created_at', { ascending: false }).limit(1000),
      }),
      safeMany<{ id: string; patient_id?: string | null; appointment_date?: string | null; status?: string | null }>('appointments', {
        build: (query) => query.order('appointment_date', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('leads', {
        build: (query) => query.order('created_at', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('lab_cases', {
        build: (query) => query.order('created_at', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('invoices', {
        build: (query) => query.order('invoice_date', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('medical_aid_claims', {
        build: (query) => query.order('claim_date', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('medical_aid_authorizations', {
        build: (query) => query.order('authorization_requested_date', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('patient_consents', {
        build: (query) => query.order('signed_date', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('patient_communication_consent', {
        build: (query) => query.order('updated_at', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('patient_documents', {
        build: (query) => query.order('created_at', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('patient_contacts', {
        build: (query) => query.order('contact_date', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('stock_items', {
        build: (query) => query.order('updated_at', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('audit_log', {
        build: (query) => query.order('created_at', { ascending: false }).limit(1000),
      }),
      safeMany<Record<string, unknown>>('lab_case_events', {
        build: (query) => query.order('event_at', { ascending: false }).limit(1000),
      }),
    ]);

    const patientLookup = new Map(patients.map((patient) => [patient.id, patientNameFromRow(patient)]));
    const patientName = patientId ? patientLookup.get(patientId) || '' : '';

    const registers = buildRegisters({
      patients,
      leads,
      labCases,
      invoices,
      claims,
      authorizations,
      patientConsents,
      communicationConsents,
      appointments,
      stockItems,
      auditLogs,
      documents,
      contacts,
      labEvents,
    });

    const summary = buildOperationsSummary({
      patients,
      appointments: appointments as Array<{ status?: string | null; appointment_date?: string | null }>,
      invoices: invoices as Array<{ status?: string | null; total_amount?: number | null; paid_amount?: number | null }>,
      labCases: labCases as Array<{ status?: string | null; workflow_stage?: string | null; due_date?: string | null; expected_return_date?: string | null }>,
      leads: leads as Array<{ status?: string | null }>,
    });

    const outstandingConsentCount = calculateOutstandingConsentCount(patients, communicationConsents as Array<{ patient_id: string; popia_consent?: boolean | null }>);
    const overdueLabCount = calculateOverdueLabCount(labCases as Array<{ status?: string | null; due_date?: string | null; expected_return_date?: string | null }>);
    const overdueInvoiceCount = calculateOverdueInvoiceCount(invoices as Array<{ status?: string | null; due_date?: string | null; total_amount?: number | null; paid_amount?: number | null }>);
    const staleRecallCount = calculateStaleRecallCount(appointments as Array<{ patient_id?: string | null; status?: string | null; appointment_date?: string | null }>);
    const lowStockCount = calculateLowStockCount(stockItems as Array<{ quantity_on_hand?: number | null; reorder_level?: number | null; expiry_date?: string | null }>);
    const risks = buildRiskSignals({
      outstandingConsentCount,
      overdueLabCount,
      overdueInvoiceCount,
      staleRecallCount,
      lowStockCount,
    });

    const patientTimeline = patientId
      ? buildPatientTimeline({
          patientId,
          patientName,
          auditLogs,
          appointments: appointments.filter((appointment) => String(appointment.patient_id || '') === patientId),
          claims: claims.filter((claim) => String(claim.patient_id || '') === patientId),
          authorizations: authorizations.filter((authorization) => String(authorization.patient_id || '') === patientId),
          labCases: labCases.filter((labCase) => String(labCase.patient_id || '') === patientId),
          labEvents: labEvents.filter((labEvent) => String(labEvent.patient_id || '') === patientId),
          patientConsents: patientConsents.filter((consent) => String(consent.patient_id || '') === patientId),
          documents: documents.filter((document) => String(document.patient_id || '') === patientId),
          contacts: contacts.filter((contact) => String(contact.patient_id || '') === patientId),
          invoices: invoices.filter((invoice) => String(invoice.patient_id || '') === patientId),
        })
      : sortDescByDate(
          auditLogs.slice(0, 20).map((auditLog) =>
            buildTimelineEvent({
              id: String(auditLog.id),
              label: String(auditLog.action || 'Audit event'),
              description: String(auditLog.entity_type || ''),
              event_at: String(auditLog.created_at || ''),
              source: 'audit_log',
            }),
          ),
        ).map((event) => ({ ...event, event_at: toIso(event.event_at) || event.event_at }));

    return NextResponse.json({
      data: {
        summary: {
          ...summary,
          outstandingConsentCount,
          overdueLabCount,
          overdueInvoiceCount,
          staleRecallCount,
          lowStockCount,
        },
        registers: {
          leads: registers.leads,
          lab: registers.lab,
          consents: registers.consents,
          accounts: registers.accounts,
          recalls: registers.recalls,
          stock: registers.stock,
          incidents: registers.incidents,
        },
        patientTimeline,
        risks: {
          counts: {
            outstandingConsentCount,
            overdueLabCount,
            overdueInvoiceCount,
            staleRecallCount,
            lowStockCount,
          },
          signals: risks,
        },
      },
    });
  } catch (error) {
    console.error('Error building operations overview:', error);
    return NextResponse.json({ error: 'Failed to build operations overview' }, { status: 500 });
  }
}

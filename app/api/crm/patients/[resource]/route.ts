import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { supabaseServer } from '@/lib/supabase/server';
import { generatePatientDocument, type PatientDocumentType } from '@/lib/documents/patient-document-generator';
import {
  normalizeClaimStatus,
  normalizeConsentType,
  normalizeMessageType,
  parseClinicalNoteContent,
  serializeClinicalNote,
} from '@/lib/patients/patient-detail-formatters';

type ResourceConfig = {
  table: string;
  orderBy?: string;
  ascending?: boolean;
};

const LAB_WORKFLOW_FIELDS = [
  'workflow_stage',
  'shade',
  'expected_return_date',
  'slip_text',
  'slip_sent_at',
  'collected_at',
  'ready_for_collection_at',
  'collected_by_driver_at',
  'dropped_off_by_me_at',
  'patient_called_at',
  'patient_collected_at',
  'comeback_requested_at',
  'comeback_reason',
  'satisfaction_signed_at',
  'closed_at',
  'lab_driver_name',
  'worker_name',
] as const;

function stripLabWorkflowFields(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !LAB_WORKFLOW_FIELDS.includes(key as (typeof LAB_WORKFLOW_FIELDS)[number])),
  );
}

function isMissingRelationError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || Boolean(error.message?.includes('does not exist'));
}

const RESOURCE_CONFIG: Record<string, ResourceConfig> = {
  'medical-history': { table: 'patient_medical_history' },
  'medical-aid': { table: 'patient_medical_aid' },
  authorizations: { table: 'medical_aid_authorizations', orderBy: 'authorization_requested_date', ascending: false },
  consents: { table: 'patient_consents', orderBy: 'signed_date', ascending: false },
  'clinical-notes': { table: 'clinical_notes', orderBy: 'created_at', ascending: false },
  'treatment-plans': { table: 'treatment_plans', orderBy: 'created_at', ascending: false },
  feedback: { table: 'patient_feedback', orderBy: 'created_at', ascending: false },
  quotes: { table: 'quotes', orderBy: 'issued_date', ascending: false },
  payments: { table: 'patient_payments', orderBy: 'payment_date', ascending: false },
  claims: { table: 'medical_aid_claims', orderBy: 'claim_date', ascending: false },
  lab: { table: 'lab_cases', orderBy: 'created_at', ascending: false },
  messages: { table: 'patient_messages', orderBy: 'message_date', ascending: false },
  documents: { table: 'patient_documents', orderBy: 'created_at', ascending: false },
};

function getResourceConfig(resource: string) {
  return RESOURCE_CONFIG[resource] || null;
}

function isVoiceNoteDocument(record: Record<string, unknown>) {
  return record.document_type === 'voice_note' || (record.metadata as Record<string, unknown> | undefined)?.document_kind === 'voice_note';
}

function splitLines(value: string | null | undefined) {
  return (value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(lines: string[]) {
  return lines.join('\n');
}

function removeLine(lines: string[], index: number) {
  return lines.filter((_, lineIndex) => lineIndex !== index);
}

function buildHistoryItems(row: Record<string, string | null>, patientId: string) {
  const items: Array<{ id: string; patient_id: string; type: 'allergy' | 'condition' | 'medication'; description: string; severity?: string }> = [];
  splitLines(row.allergies).forEach((description, index) => {
    items.push({
      id: `${row.id}:allergies:${index}`,
      patient_id: patientId,
      type: 'allergy',
      description,
    });
  });
  splitLines(row.medical_conditions).forEach((description, index) => {
    items.push({
      id: `${row.id}:medical_conditions:${index}`,
      patient_id: patientId,
      type: 'condition',
      description,
    });
  });
  splitLines(row.current_medications).forEach((description, index) => {
    items.push({
      id: `${row.id}:current_medications:${index}`,
      patient_id: patientId,
      type: 'medication',
      description,
    });
  });
  splitLines(row.previous_treatments).forEach((description, index) => {
    items.push({
      id: `${row.id}:previous_treatments:${index}`,
      patient_id: patientId,
      type: 'condition',
      description: `Previous treatment: ${description}`,
    });
  });
  splitLines(row.surgical_history).forEach((description, index) => {
    items.push({
      id: `${row.id}:surgical_history:${index}`,
      patient_id: patientId,
      type: 'condition',
      description: `Surgical history: ${description}`,
    });
  });
  return items;
}

function patientNameFromRecord(record: { first_name?: string | null; last_name?: string | null }) {
  return `${record.first_name || ''} ${record.last_name || ''}`.trim();
}

async function getPatientName(patientId: string) {
  const { data } = await supabaseServer
    .from('patients')
    .select('first_name, last_name')
    .eq('id', patientId)
    .maybeSingle();

  return patientNameFromRecord(data || {});
}

export async function GET(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resource } = await context.params;
    const config = getResourceConfig(resource);
    if (!config) {
      return NextResponse.json({ error: 'Unknown patient resource' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const id = searchParams.get('id');

    if (resource === 'documents') {
      const patientIds = patientId ? [patientId] : [];
      const patientName = patientId ? await getPatientName(patientId) : '';
      const [documentsResult, treatmentPlansResult, consentsResult] = await Promise.all([
        supabaseServer.from('patient_documents').select('*').order('created_at', { ascending: false }),
        patientId
          ? supabaseServer.from('treatment_plans').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        patientId
          ? supabaseServer.from('patient_consents').select('*').eq('patient_id', patientId).order('signed_date', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      const missingDocumentsTable = documentsResult.error && isMissingRelationError(documentsResult.error);
      if (documentsResult.error && !missingDocumentsTable) {
        throw documentsResult.error;
      }

      const syntheticDocuments = [
        ...(documentsResult.data || [])
          .filter((row) => !isVoiceNoteDocument(row))
          .map((row) => mapDocumentForResponse(row)),
        ...(treatmentPlansResult.data || []).map((row) => ({
          id: row.id,
          patient_id: row.patient_id,
          document_type: 'treatment_plan',
          title: row.plan_name || 'Treatment Plan',
          content: row.description || row.planned_procedures || '',
          status: row.accepted ? 'signed' : 'draft',
          signed_by_patient: Boolean(row.accepted),
          signed_by_guardian: false,
          signature_name: '',
          signed_at: row.accepted_date || '',
          related_entity_type: 'treatment_plan',
          related_entity_id: row.id,
          metadata: { estimated_cost: row.estimated_cost || null },
          created_at: row.created_at || '',
        })),
        ...(consentsResult.data || [])
          .filter((row) => Boolean(row.consent_document))
          .map((row) => ({
            id: row.id,
            patient_id: row.patient_id,
            document_type: 'consent_form',
            title: `${row.consent_type || 'treatment'} consent`,
            content: row.consent_document || '',
            status: row.signed_by_patient || row.signed_by_guardian ? 'signed' : 'draft',
            signed_by_patient: Boolean(row.signed_by_patient),
            signed_by_guardian: Boolean(row.signed_by_guardian),
            signature_name: row.guardian_name || '',
            signed_at: row.signed_date || '',
            related_entity_type: 'consent',
            related_entity_id: row.id,
            metadata: {},
            created_at: row.created_at || row.signed_date || '',
          })),
      ]
        .filter((row) => !patientId || row.patient_id === patientId)
        .filter((row) => !id || row.id === id)
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

      if (id) {
        return NextResponse.json({ data: syntheticDocuments[0] || null });
      }

      return NextResponse.json({ data: syntheticDocuments });
    }

    if (config.table === 'patient_medical_history' && patientId) {
      const { data: row, error } = await supabaseServer
        .from('patient_medical_history')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return NextResponse.json({ data: row ? buildHistoryItems(row, patientId) : [] });
    }

    if (config.table === 'patient_medical_aid' && patientId) {
      const { data, error } = await supabaseServer
        .from('patient_medical_aid')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return NextResponse.json({ data: data || null });
    }

    let query = supabaseServer.from(config.table).select('*');

    if (id) {
      const { data, error } = await query.eq('id', id).maybeSingle();
      if (error) {
        if (resource === 'documents' && isMissingRelationError(error)) {
          return NextResponse.json({ data: null });
        }
        if (resource === 'feedback' && isMissingRelationError(error)) {
          return NextResponse.json({ data: null });
        }
        if (resource === 'payments' && isMissingRelationError(error)) {
          return NextResponse.json({ data: null });
        }
        throw error;
      }
      return NextResponse.json({ data: data ? mapRecordForResponse(resource, data) : null });
    }

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    if (config.orderBy) {
      query = query.order(config.orderBy, { ascending: config.ascending ?? false });
    }

    const { data, error } = await query;
    if (error) {
      if (resource === 'payments' && (error as { code?: string }).code === 'PGRST205') {
        return NextResponse.json({ data: [] });
      }
      if (resource === 'authorizations' && isMissingRelationError(error as { code?: string; message?: string })) {
        return NextResponse.json({ data: [] });
      }
      if (resource === 'documents' && isMissingRelationError(error)) {
        return NextResponse.json({ data: [] });
      }
      if (resource === 'feedback' && isMissingRelationError(error)) {
        return NextResponse.json({ data: [] });
      }
      throw error;
    }

    if (resource === 'lab' && patientId) {
      const patientName = await getPatientName(patientId);
      return NextResponse.json({ data: (data || []).map((item) => mapLabCaseForResponse(item, patientName)) });
    }

    return NextResponse.json({ data: (data || []).map((item) => mapRecordForResponse(resource, item)) });
  } catch (error) {
    console.error('Error fetching patient resource:', error);
    return NextResponse.json({ error: 'Failed to fetch patient resource' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resource } = await context.params;
    const config = getResourceConfig(resource);
    if (!config) {
      return NextResponse.json({ error: 'Unknown patient resource' }, { status: 404 });
    }

    const body = await request.json();
    const response = await createResource(resource, config.table, body, user.id);

    if (response.error) {
      throw response.error;
    }

    return NextResponse.json({ data: response.data }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient resource:', error);
    return NextResponse.json({ error: 'Failed to create patient resource' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resource } = await context.params;
    const config = getResourceConfig(resource);
    if (!config) {
      return NextResponse.json({ error: 'Unknown patient resource' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Resource ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { data, error } = await updateResource(resource, config.table, id, body, user.id);

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating patient resource:', error);
    return NextResponse.json({ error: 'Failed to update patient resource' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resource } = await context.params;
    const config = getResourceConfig(resource);
    if (!config) {
      return NextResponse.json({ error: 'Unknown patient resource' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Resource ID required' }, { status: 400 });
    }

    if (resource === 'medical-history') {
      const { error } = await deleteHistoryItem(id);
      if (error) throw error;
      return NextResponse.json({ message: 'Resource deleted successfully' });
    }

    const { error } = await supabaseServer.from(config.table).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient resource:', error);
    return NextResponse.json({ error: 'Failed to delete patient resource' }, { status: 500 });
  }
}

function mapRecordForResponse(resource: string, record: Record<string, unknown>) {
  if (resource === 'clinical-notes') {
    const parsed = parseClinicalNoteContent(record.note_content as string | null | undefined);
    return {
      id: record.id,
      patient_id: record.patient_id,
      visit_date: parsed.visit_date || (record.created_at as string) || '',
      diagnosis: parsed.diagnosis,
      notes: parsed.notes,
      procedures: parsed.procedures,
    };
  }

  if (resource === 'treatment-plans') {
    return {
      id: record.id,
      patient_id: record.patient_id,
      plan_name: record.plan_name || '',
      description: record.planned_procedures || record.description || '',
      status: record.accepted ? 'accepted' : 'proposed',
      created_at: record.created_at,
    };
  }

  if (resource === 'quotes') {
    return {
      id: record.id,
      patient_id: record.patient_id,
      description: record.description || '',
      amount: Number(record.amount || 0),
      date: (record.issued_date as string) || '',
    };
  }

  if (resource === 'payments') {
    return {
      id: record.id,
      patient_id: record.patient_id,
      amount: Number(record.amount || 0),
      date: (record.payment_date as string) || '',
      method: record.payment_method || '',
      notes: record.notes || '',
    };
  }

  if (resource === 'claims') {
    return {
      id: record.id,
      patient_id: record.patient_id,
      claim_number: record.claim_number || '',
      amount: Number(record.amount_claimed || 0),
      status: normalizeClaimStatus(record.status as string | null | undefined),
      date: (record.claim_date as string) || '',
    };
  }

  if (resource === 'lab') {
    return mapLabCaseForResponse(record, '');
  }

  if (resource === 'messages') {
    return {
      id: record.id,
      patient_id: record.patient_id,
      message_type: normalizeMessageType(record.message_type as string | null | undefined),
      content: record.message_content || '',
      timestamp: record.message_date || record.created_at || '',
    };
  }

  if (resource === 'consents') {
    return {
      id: record.id,
      patient_id: record.patient_id,
      consent_type: normalizeConsentType(record.consent_type as string | null | undefined),
      value: Boolean(record.signed_by_patient || record.signed_by_guardian),
      date: (record.signed_date as string) || '',
    };
  }

  if (resource === 'documents') {
    return mapDocumentForResponse(record);
  }

  if (resource === 'authorizations') {
    return {
      id: record.id,
      patient_id: record.patient_id,
      invoice_id: record.invoice_id || null,
      claim_id: record.claim_id || null,
      procedure_name: record.procedure_name || '',
      procedure_code: record.procedure_code || '',
      icd10_code: record.icd10_code || '',
      scheme_name: record.scheme_name || '',
      authorization_requested_date: (record.authorization_requested_date as string) || '',
      authorization_reference: record.authorization_reference || '',
      status: record.status || 'Pending',
      authorized_amount: record.authorized_amount == null ? null : Number(record.authorized_amount),
      co_payment_amount: record.co_payment_amount == null ? null : Number(record.co_payment_amount),
      patient_shortfall_amount: record.patient_shortfall_amount == null ? null : Number(record.patient_shortfall_amount),
      notes: record.notes || '',
      created_at: (record.created_at as string) || '',
      updated_at: (record.updated_at as string) || '',
    };
  }

  if (resource === 'feedback') {
    return {
      id: record.id,
      patient_id: record.patient_id,
      appointment_id: record.appointment_id || null,
      treatment_plan_id: record.treatment_plan_id || null,
      feedback_type: record.feedback_type || 'satisfaction',
      outcome: record.outcome || 'needs_follow_up',
      rating: record.rating == null ? null : Number(record.rating),
      notes: record.notes || '',
      review_prompted_at: (record.review_prompted_at as string) || '',
      review_link_sent_at: (record.review_link_sent_at as string) || '',
      complaint_logged_at: (record.complaint_logged_at as string) || '',
      resolved_at: (record.resolved_at as string) || '',
      created_at: (record.created_at as string) || '',
      updated_at: (record.updated_at as string) || '',
    };
  }

  return record;
}

function mapDocumentForResponse(record: Record<string, unknown>) {
  return {
    id: record.id,
    patient_id: record.patient_id,
    document_type: String(record.document_type || 'treatment_plan'),
    title: String(record.title || ''),
    content: String(record.content || ''),
    status: String(record.status || 'draft'),
    related_entity_type: String(record.related_entity_type || ''),
    related_entity_id: String(record.related_entity_id || ''),
    signed_by_patient: Boolean(record.signed_by_patient),
    signed_by_guardian: Boolean(record.signed_by_guardian),
    signature_name: String(record.signature_name || ''),
    signed_at: (record.signed_at as string) || '',
    metadata: (record.metadata as Record<string, unknown>) || {},
    created_at: (record.created_at as string) || '',
  };
}

async function createPatientDocument(body: Record<string, unknown>, userId: string) {
  const documentType = String(body.document_type || 'treatment_plan') as PatientDocumentType;
  const generated = generatePatientDocument({
    patientName: String(body.patient_name || body.patient || 'Patient').trim(),
    documentType,
    title: String(body.title || ''),
    diagnosis: String(body.diagnosis || ''),
    treatmentOptions: String(body.treatment_options || body.treatmentOptions || ''),
    risks: String(body.risks || ''),
    alternatives: String(body.alternatives || ''),
    prices: String(body.prices || ''),
    specialty: String(body.specialty || ''),
    reason: String(body.reason || ''),
    procedure: String(body.procedure || ''),
    daysOff: String(body.days_off || body.daysOff || ''),
    consentType: String(body.consent_type || ''),
    notes: String(body.notes || ''),
    doctorName: String(body.doctor_name || body.doctorName || ''),
    practiceName: String(body.practice_name || body.practiceName || 'Crown Dental Studio'),
    createdAt: body.created_at ? String(body.created_at) : new Date().toISOString().slice(0, 10),
  });

  const payload = {
    patient_id: body.patient_id,
    document_type: documentType,
    title: generated.title,
    content: generated.content,
    status: body.status || 'draft',
    related_entity_type: body.related_entity_type || null,
    related_entity_id: body.related_entity_id || null,
    signed_by_patient: Boolean(body.signed_by_patient),
    signed_by_guardian: Boolean(body.signed_by_guardian),
    signature_name: body.signature_name || null,
    signed_at: body.signed_at || null,
    metadata: {
      summary: generated.summary,
      source: body.source || 'patient-document-generator',
      ...(typeof body.metadata === 'object' && body.metadata ? body.metadata : {}),
    },
    created_by: userId,
  };

  const { data, error } = await supabaseServer.from('patient_documents').insert([payload]).select();
  if (error && isMissingRelationError(error)) {
    const fallback = {
      id: `doc-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (documentType === 'consent_form') {
      await supabaseServer.from('patient_consents').insert([
        {
          patient_id: body.patient_id,
          consent_type: normalizeConsentType(String(body.consent_type || 'treatment')),
          consent_document: generated.content,
          signed_date: body.signed_at || new Date().toISOString().slice(0, 10),
          signed_by_patient: Boolean(body.signed_by_patient ?? true),
          signed_by_guardian: Boolean(body.signed_by_guardian),
          guardian_name: body.guardian_name || null,
          notes: body.notes || null,
        },
      ]);
    } else if (documentType === 'treatment_plan') {
      await supabaseServer.from('treatment_plans').insert([
        {
          patient_id: body.patient_id,
          plan_name: generated.title,
          description: generated.content,
          planned_procedures: generated.content,
          estimated_cost: body.estimated_cost ? Number(body.estimated_cost) : null,
          accepted: Boolean(body.accepted),
          created_by: userId,
        },
      ]);
    }
    return { data: fallback, error: null };
  }

  if (documentType === 'consent_form') {
    await supabaseServer.from('patient_consents').insert([
      {
        patient_id: body.patient_id,
        consent_type: normalizeConsentType(String(body.consent_type || 'treatment')),
        consent_document: generated.content,
        signed_date: body.signed_at || new Date().toISOString().slice(0, 10),
        signed_by_patient: Boolean(body.signed_by_patient ?? true),
        signed_by_guardian: Boolean(body.signed_by_guardian),
        guardian_name: body.guardian_name || null,
        notes: body.notes || null,
      },
    ]);
  }

  if (documentType === 'treatment_plan') {
    await supabaseServer.from('treatment_plans').insert([
      {
        patient_id: body.patient_id,
        plan_name: generated.title,
        description: generated.content,
        planned_procedures: generated.content,
        estimated_cost: body.estimated_cost ? Number(body.estimated_cost) : null,
        accepted: Boolean(body.accepted),
        created_by: userId,
      },
    ]);
  }

  return { data: data?.[0], error };
}

async function updatePatientDocument(table: string, id: string, body: Record<string, unknown>, userId: string) {
  const documentType = String(body.document_type || 'treatment_plan') as PatientDocumentType;
  const generated = generatePatientDocument({
    patientName: String(body.patient_name || body.patient || 'Patient').trim(),
    documentType,
    title: String(body.title || ''),
    diagnosis: String(body.diagnosis || ''),
    treatmentOptions: String(body.treatment_options || body.treatmentOptions || ''),
    risks: String(body.risks || ''),
    alternatives: String(body.alternatives || ''),
    prices: String(body.prices || ''),
    specialty: String(body.specialty || ''),
    reason: String(body.reason || ''),
    procedure: String(body.procedure || ''),
    daysOff: String(body.days_off || body.daysOff || ''),
    consentType: String(body.consent_type || ''),
    notes: String(body.notes || ''),
    doctorName: String(body.doctor_name || body.doctorName || ''),
    practiceName: String(body.practice_name || body.practiceName || 'Crown Dental Studio'),
    createdAt: body.created_at ? String(body.created_at) : new Date().toISOString().slice(0, 10),
  });

  const payload = {
    document_type: documentType,
    title: generated.title,
    content: generated.content,
    status: body.status || 'draft',
    related_entity_type: body.related_entity_type || null,
    related_entity_id: body.related_entity_id || null,
    signed_by_patient: Boolean(body.signed_by_patient),
    signed_by_guardian: Boolean(body.signed_by_guardian),
    signature_name: body.signature_name || null,
    signed_at: body.signed_at || null,
    metadata: {
      summary: generated.summary,
      source: body.source || 'patient-document-generator',
      ...(typeof body.metadata === 'object' && body.metadata ? body.metadata : {}),
    },
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
  if (error && isMissingRelationError(error)) {
    return { data: null, error: null };
  }
  return { data: data?.[0], error };
}

function mapLabCaseForResponse(record: Record<string, unknown>, patientName: string) {
  return {
    id: record.id,
    patient_id: record.patient_id,
    case_number: record.lab_case_number || '',
    patient_name: patientName,
    case_type: record.case_type || '',
    description: record.description || '',
    status: record.status || 'Received',
    workflow_stage: record.workflow_stage || 'Created',
    date: (record.due_date as string) || (record.created_at as string) || '',
    lab_name: record.lab_name || '',
    shade: record.shade || '',
    expected_return_date: (record.expected_return_date as string) || '',
    slip_text: record.slip_text || '',
  };
}

async function createResource(resource: string, table: string, body: Record<string, unknown>, userId: string) {
  if (resource === 'medical-history') {
    return upsertHistory(body, userId);
  }

  if (resource === 'medical-aid') {
    const payload = {
      patient_id: body.patient_id,
      scheme_name: body.scheme_name || '',
      member_number: body.member_number || '',
      dependent_code: body.dependent_code || null,
      main_member_name: body.main_member_name || null,
      main_member_id_number: body.main_member_id_number || body.main_member_id || null,
      relationship_to_main: body.relationship_to_main || null,
      active: body.active ?? true,
    };
    const { data, error } = await supabaseServer.from(table).upsert(payload, { onConflict: 'patient_id' }).select();
    return { data: data?.[0], error };
  }

  if (resource === 'clinical-notes') {
    const payload = {
      patient_id: body.patient_id,
      appointment_id: body.appointment_id || null,
      note_type: body.note_type || 'general',
      note_content: serializeClinicalNote({
        visit_date: String(body.visit_date || ''),
        diagnosis: String(body.diagnosis || ''),
        notes: String(body.notes || ''),
        procedures: String(body.procedures || ''),
      }),
      created_by: userId,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    return { data: data?.[0], error };
  }

  if (resource === 'treatment-plans') {
    const payload = {
      patient_id: body.patient_id,
      plan_name: body.plan_name || '',
      description: body.description || null,
      planned_procedures: body.planned_procedures || body.description || null,
      estimated_cost: body.estimated_cost ? Number(body.estimated_cost) : null,
      accepted: body.status === 'accepted',
      created_by: userId,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    return { data: data?.[0], error };
  }

  if (resource === 'quotes') {
    const payload = {
      patient_id: body.patient_id,
      quote_number: body.quote_number || `QT-${Date.now()}`,
      description: body.description || '',
      amount: Number(body.amount || 0),
      issued_date: body.date || new Date().toISOString().slice(0, 10),
      expiry_date: body.expiry_date || null,
      status: body.status || 'Issued',
      created_by: userId,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    return { data: data?.[0], error };
  }

  if (resource === 'payments') {
    const payload = {
      patient_id: body.patient_id,
      amount: Number(body.amount || 0),
      payment_date: body.date || new Date().toISOString().slice(0, 10),
      payment_method: body.method || null,
      notes: body.notes || null,
      created_by: userId,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    return { data: data?.[0], error };
  }

  if (resource === 'claims') {
    const payload = {
      patient_id: body.patient_id,
      invoice_id: body.invoice_id || null,
      claim_number: body.claim_number || `CLM-${Date.now()}`,
      amount_claimed: Number(body.amount || 0),
      amount_approved: body.amount_approved ? Number(body.amount_approved) : null,
      claim_date: body.date || new Date().toISOString().slice(0, 10),
      status: normalizeClaimStatus(body.status as string | null | undefined),
      rejection_reason: body.rejection_reason || null,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    return { data: data?.[0], error };
  }

  if (resource === 'lab') {
    const patientName = await getPatientName(String(body.patient_id || ''));
    const payload = {
      patient_id: body.patient_id,
      lab_case_number: body.case_number || `LAB-${Date.now()}`,
      case_type: body.case_type || body.description || 'General',
      description: body.description || null,
      status: body.status || 'Received',
      workflow_stage: body.workflow_stage || 'Created',
      due_date: body.date || null,
      expected_return_date: body.expected_return_date || null,
      lab_name: body.lab_name || null,
      shade: body.shade || null,
      slip_text: body.slip_text || null,
      created_by: userId,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    if (
      error &&
      ((error as { code?: string }).code === '42703' ||
        (error as { code?: string }).code === 'PGRST204' ||
        error.message.includes('does not exist'))
    ) {
      const retry = await supabaseServer.from(table).insert([stripLabWorkflowFields(payload)]).select();
      return { data: retry.data?.[0], error: retry.error };
    }
    const mapped = mapLabCaseForResponse(data?.[0] || {}, patientName);
    return { data: mapped, error };
  }

  if (resource === 'messages') {
    const payload = {
      patient_id: body.patient_id,
      message_type: normalizeMessageType(String(body.message_type || '')),
      message_content: body.content || '',
      message_date: body.timestamp || new Date().toISOString(),
      sender: body.sender || 'clinic',
      sender_name: body.sender_name || null,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    return { data: data?.[0], error };
  }

  if (resource === 'consents') {
    const payload = {
      patient_id: body.patient_id,
      consent_type: normalizeConsentType(String(body.consent_type || '')),
      consent_document: body.consent_document || null,
      signed_date: body.date || new Date().toISOString().slice(0, 10),
      signed_by_patient: Boolean(body.value),
      signed_by_guardian: Boolean(body.signed_by_guardian),
      guardian_name: body.guardian_name || null,
      notes: body.notes || null,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    return { data: data?.[0], error };
  }

  if (resource === 'documents') {
    return createPatientDocument(body, userId);
  }

  if (resource === 'authorizations') {
    const payload = {
      patient_id: body.patient_id,
      invoice_id: body.invoice_id || null,
      claim_id: body.claim_id || null,
      procedure_name: body.procedure_name || '',
      procedure_code: body.procedure_code || null,
      icd10_code: body.icd10_code || null,
      scheme_name: body.scheme_name || null,
      authorization_requested_date: body.authorization_requested_date || new Date().toISOString().slice(0, 10),
      authorization_reference: body.authorization_reference || null,
      status: body.status || 'Pending',
      authorized_amount: body.authorized_amount == null ? null : Number(body.authorized_amount),
      co_payment_amount: body.co_payment_amount == null ? null : Number(body.co_payment_amount),
      patient_shortfall_amount: body.patient_shortfall_amount == null ? null : Number(body.patient_shortfall_amount),
      notes: body.notes || null,
      created_by: userId,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    return { data: data?.[0], error };
  }

  if (resource === 'feedback') {
    const payload = {
      patient_id: body.patient_id,
      appointment_id: body.appointment_id || null,
      treatment_plan_id: body.treatment_plan_id || null,
      feedback_type: String(body.feedback_type || 'satisfaction'),
      outcome: String(body.outcome || 'needs_follow_up'),
      rating: body.rating == null || body.rating === '' ? null : Number(body.rating),
      notes: body.notes || null,
      review_prompted_at: body.review_prompted_at || null,
      review_link_sent_at: body.review_link_sent_at || null,
      complaint_logged_at: body.complaint_logged_at || null,
      resolved_at: body.resolved_at || null,
      created_by: userId,
    };
    const { data, error } = await supabaseServer.from(table).insert([payload]).select();
    if (error && isMissingRelationError(error)) {
      return {
        data: [
          {
            id: `feedback-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      };
    }
    return { data: data?.[0], error };
  }

  const { data, error } = await supabaseServer.from(table).insert([{ ...body, created_by: userId }]).select();
  return { data: data?.[0], error };
}

async function updateResource(resource: string, table: string, id: string, body: Record<string, unknown>, userId: string) {
  if (resource === 'medical-history') {
    return upsertHistory({ ...body, id }, userId);
  }

  if (resource === 'medical-aid') {
    const payload = {
      scheme_name: body.scheme_name || '',
      member_number: body.member_number || '',
      dependent_code: body.dependent_code || null,
      main_member_name: body.main_member_name || null,
      main_member_id_number: body.main_member_id_number || body.main_member_id || null,
      relationship_to_main: body.relationship_to_main || null,
      active: body.active ?? true,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'clinical-notes') {
    const payload = {
      note_type: body.note_type || 'general',
      note_content: serializeClinicalNote({
        visit_date: String(body.visit_date || ''),
        diagnosis: String(body.diagnosis || ''),
        notes: String(body.notes || ''),
        procedures: String(body.procedures || ''),
      }),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'treatment-plans') {
    const payload = {
      plan_name: body.plan_name || '',
      description: body.description || null,
      planned_procedures: body.planned_procedures || body.description || null,
      estimated_cost: body.estimated_cost ? Number(body.estimated_cost) : null,
      accepted: body.status === 'accepted',
      accepted_date: body.status === 'accepted' ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'quotes') {
    const payload = {
      description: body.description || '',
      amount: Number(body.amount || 0),
      issued_date: body.date || new Date().toISOString().slice(0, 10),
      expiry_date: body.expiry_date || null,
      status: body.status || 'Issued',
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'payments') {
    const payload = {
      amount: Number(body.amount || 0),
      payment_date: body.date || new Date().toISOString().slice(0, 10),
      payment_method: body.method || null,
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'claims') {
    const payload = {
      claim_number: body.claim_number || `CLM-${Date.now()}`,
      amount_claimed: Number(body.amount || 0),
      amount_approved: body.amount_approved ? Number(body.amount_approved) : null,
      claim_date: body.date || new Date().toISOString().slice(0, 10),
      status: normalizeClaimStatus(body.status as string | null | undefined),
      rejection_reason: body.rejection_reason || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'lab') {
    const payload = {
      lab_case_number: body.case_number || `LAB-${Date.now()}`,
      case_type: body.case_type || body.description || 'General',
      description: body.description || null,
      status: body.status || 'Received',
      workflow_stage: body.workflow_stage || 'Created',
      due_date: body.date || null,
      expected_return_date: body.expected_return_date || null,
      lab_name: body.lab_name || null,
      shade: body.shade || null,
      slip_text: body.slip_text || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    if (
      error &&
      ((error as { code?: string }).code === '42703' ||
        (error as { code?: string }).code === 'PGRST204' ||
        error.message.includes('does not exist'))
    ) {
      const retry = await supabaseServer.from(table).update(stripLabWorkflowFields(payload)).eq('id', id).select();
      return { data: retry.data?.[0], error: retry.error };
    }
    const mapped = mapLabCaseForResponse(data?.[0] || {}, '');
    return { data: mapped, error };
  }

  if (resource === 'messages') {
    const payload = {
      message_type: normalizeMessageType(String(body.message_type || '')),
      message_content: body.content || '',
      message_date: body.timestamp || new Date().toISOString(),
      sender: body.sender || 'clinic',
      sender_name: body.sender_name || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'consents') {
    const payload = {
      consent_type: normalizeConsentType(String(body.consent_type || '')),
      consent_document: body.consent_document || null,
      signed_date: body.date || new Date().toISOString().slice(0, 10),
      signed_by_patient: Boolean(body.value),
      signed_by_guardian: Boolean(body.signed_by_guardian),
      guardian_name: body.guardian_name || null,
      notes: body.notes || null,
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'documents') {
    return updatePatientDocument(table, id, body, userId);
  }

  if (resource === 'authorizations') {
    const payload = {
      patient_id: body.patient_id,
      invoice_id: body.invoice_id || null,
      claim_id: body.claim_id || null,
      procedure_name: body.procedure_name || '',
      procedure_code: body.procedure_code || null,
      icd10_code: body.icd10_code || null,
      scheme_name: body.scheme_name || null,
      authorization_requested_date: body.authorization_requested_date || new Date().toISOString().slice(0, 10),
      authorization_reference: body.authorization_reference || null,
      status: body.status || 'Pending',
      authorized_amount: body.authorized_amount == null ? null : Number(body.authorized_amount),
      co_payment_amount: body.co_payment_amount == null ? null : Number(body.co_payment_amount),
      patient_shortfall_amount: body.patient_shortfall_amount == null ? null : Number(body.patient_shortfall_amount),
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    return { data: data?.[0], error };
  }

  if (resource === 'feedback') {
    const payload = {
      patient_id: body.patient_id,
      appointment_id: body.appointment_id || null,
      treatment_plan_id: body.treatment_plan_id || null,
      feedback_type: String(body.feedback_type || 'satisfaction'),
      outcome: String(body.outcome || 'needs_follow_up'),
      rating: body.rating == null || body.rating === '' ? null : Number(body.rating),
      notes: body.notes || null,
      review_prompted_at: body.review_prompted_at || null,
      review_link_sent_at: body.review_link_sent_at || null,
      complaint_logged_at: body.complaint_logged_at || null,
      resolved_at: body.resolved_at || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseServer.from(table).update(payload).eq('id', id).select();
    if (error && isMissingRelationError(error)) {
      return {
        data: {
          id,
          ...payload,
          created_at: new Date().toISOString(),
        },
        error: null,
      };
    }
    return { data: data?.[0], error };
  }

  const { data, error } = await supabaseServer
    .from(table)
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  return { data: data?.[0], error };
}

async function deleteHistoryItem(id: string) {
  const [rowId, field, indexString] = id.split(':');
  const index = Number(indexString);
  if (!rowId || !field || Number.isNaN(index)) {
    return supabaseServer.from('patient_medical_history').delete().eq('id', id);
  }

  const { data: row, error: fetchError } = await supabaseServer
    .from('patient_medical_history')
    .select('*')
    .eq('id', rowId)
    .single();

  if (fetchError) {
    return { error: fetchError };
  }

  const fieldMap: Record<string, keyof typeof row> = {
    allergies: 'allergies',
    medical_conditions: 'medical_conditions',
    current_medications: 'current_medications',
    previous_treatments: 'previous_treatments',
    surgical_history: 'surgical_history',
  };

  const targetField = fieldMap[field];
  if (!targetField) {
    return supabaseServer.from('patient_medical_history').delete().eq('id', rowId);
  }

  const lines = splitLines((row as Record<string, string | null>)[targetField]);
  const nextValue = joinLines(removeLine(lines, index));
  return supabaseServer
    .from('patient_medical_history')
    .update({ [targetField]: nextValue, updated_at: new Date().toISOString() })
    .eq('id', rowId);
}

async function upsertHistory(body: Record<string, unknown>, userId: string) {
  const patientId = String(body.patient_id || '');
  const field = String(body.type || 'condition');
  const description = String(body.description || '').trim();
  const severity = body.severity ? String(body.severity) : null;

  const { data: existing, error: fetchError } = await supabaseServer
    .from('patient_medical_history')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    return { error: fetchError };
  }

  const row = existing || {
    patient_id: patientId,
    allergies: '',
    medical_conditions: '',
    current_medications: '',
    previous_treatments: '',
    surgical_history: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const fieldMap: Record<string, keyof typeof row> = {
    allergy: 'allergies',
    condition: 'medical_conditions',
    medication: 'current_medications',
  };

  const targetField = fieldMap[field] || 'medical_conditions';
  const nextLines = splitLines((row as Record<string, string | null>)[targetField]);
  nextLines.push(severity ? `${description} (${severity})` : description);
  const payload = {
    patient_id: patientId,
    allergies: (row as Record<string, string | null>).allergies || '',
    medical_conditions: (row as Record<string, string | null>).medical_conditions || '',
    current_medications: (row as Record<string, string | null>).current_medications || '',
    previous_treatments: (row as Record<string, string | null>).previous_treatments || '',
    surgical_history: (row as Record<string, string | null>).surgical_history || '',
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>;
  payload[targetField] = joinLines(nextLines);
  if (!existing) {
    payload.created_at = new Date().toISOString();
  }

  const result = existing
    ? await supabaseServer.from('patient_medical_history').update(payload).eq('id', existing.id).select()
    : await supabaseServer.from('patient_medical_history').insert([payload]).select();

  return { data: result.data?.[0], error: result.error };
}

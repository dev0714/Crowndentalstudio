import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { supabaseServer } from '@/lib/supabase/server';

async function getPatientNames(patientIds: string[]) {
  if (patientIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseServer
    .from('patients')
    .select('id, first_name, last_name')
    .in('id', patientIds);

  if (error) {
    throw error;
  }

  return Object.fromEntries(
    (data || []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]),
  );
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [communicationResult, consentResult, treatmentPlanResult, consentDraftResult] = await Promise.all([
      supabaseServer
        .from('patient_communication_consent')
        .select('*')
        .order('updated_at', { ascending: false }),
      supabaseServer
        .from('patient_consents')
        .select('*')
        .order('signed_date', { ascending: false }),
      supabaseServer
        .from('treatment_plans')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseServer
        .from('patient_consents')
        .select('*')
        .order('signed_date', { ascending: false }),
    ]);

    const { data: documentRows, error: documentError } = await supabaseServer
      .from('patient_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (documentError && documentError.code !== 'PGRST205' && !documentError.message.includes('does not exist')) {
      throw documentError;
    }

    if (communicationResult.error) throw communicationResult.error;
    if (consentResult.error) throw consentResult.error;

    const communicationPatientNames = await getPatientNames(
      (communicationResult.data || []).map((row) => row.patient_id),
    );
    const consentPatientNames = await getPatientNames((consentResult.data || []).map((row) => row.patient_id));
    const documentPatientNames = await getPatientNames([
      ...(documentRows || []).map((row) => row.patient_id),
      ...(treatmentPlanResult.data || []).map((row) => row.patient_id),
      ...(consentDraftResult.data || []).map((row) => row.patient_id),
    ]);

    const communicationConsents = (communicationResult.data || []).map((row) => ({
      id: row.id,
      patient_id: row.patient_id,
      patient_name: communicationPatientNames[row.patient_id] || row.patient_id,
      whatsapp_consent: Boolean(row.whatsapp_consent),
      call_recording_consent: Boolean(row.call_recording_consent),
      popia_consent: Boolean(row.popia_consent),
      email_consent: Boolean(row.email_consent),
      sms_consent: Boolean(row.sms_consent),
      marketing_consent: Boolean(row.marketing_consent),
      consent_date: row.consent_date,
      updated_at: row.updated_at,
    }));

    const signedConsents = (consentResult.data || []).map((row) => ({
      id: row.id,
      patient_id: row.patient_id,
      patient_name: consentPatientNames[row.patient_id] || row.patient_id,
      consent_type: row.consent_type,
      consent_document: row.consent_document,
      signed_date: row.signed_date,
      signed_by_patient: Boolean(row.signed_by_patient),
      signed_by_guardian: Boolean(row.signed_by_guardian),
      guardian_name: row.guardian_name || '',
      notes: row.notes || '',
    }));

    const documents = [
      ...(documentRows || []).map((row) => ({
        id: row.id,
        patient_id: row.patient_id,
        patient_name: documentPatientNames[row.patient_id] || row.patient_id,
        document_type: row.document_type,
        title: row.title,
        status: row.status,
        signed_at: row.signed_at,
        signed_by_patient: Boolean(row.signed_by_patient),
        signed_by_guardian: Boolean(row.signed_by_guardian),
        signature_name: row.signature_name || '',
        created_at: row.created_at,
        content: row.content,
        metadata: row.metadata || {},
      })),
      ...(treatmentPlanResult.data || []).map((row) => ({
        id: row.id,
        patient_id: row.patient_id,
        patient_name: documentPatientNames[row.patient_id] || row.patient_id,
        document_type: 'treatment_plan',
        title: row.plan_name || 'Treatment Plan',
        status: row.accepted ? 'signed' : 'draft',
        signed_at: row.accepted_date || '',
        signed_by_patient: Boolean(row.accepted),
        signed_by_guardian: false,
        signature_name: '',
        created_at: row.created_at,
        content: row.description || row.planned_procedures || '',
        metadata: { estimated_cost: row.estimated_cost || null },
      })),
      ...(consentDraftResult.data || [])
        .filter((row) => Boolean(row.consent_document))
        .map((row) => ({
          id: row.id,
          patient_id: row.patient_id,
          patient_name: documentPatientNames[row.patient_id] || row.patient_id,
          document_type: 'consent_form',
          title: `${row.consent_type || 'treatment'} consent`,
          status: row.signed_by_patient || row.signed_by_guardian ? 'signed' : 'draft',
          signed_at: row.signed_date || '',
          signed_by_patient: Boolean(row.signed_by_patient),
          signed_by_guardian: Boolean(row.signed_by_guardian),
          signature_name: row.guardian_name || '',
          created_at: row.created_at || row.signed_date || '',
          content: row.consent_document || '',
          metadata: {},
        })),
    ].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const summary = {
      communication_consents: communicationConsents.length,
      signed_consents: signedConsents.length,
      documents: documents.length,
      with_documents: signedConsents.filter((row) => Boolean(row.consent_document)).length,
      guardian_signed: signedConsents.filter((row) => row.signed_by_guardian).length,
      patient_signed: signedConsents.filter((row) => row.signed_by_patient).length,
      popia_confirmed: communicationConsents.filter((row) => row.popia_consent).length,
    };

    return NextResponse.json({
      data: {
        summary,
        communicationConsents,
        signedConsents,
        documents,
      },
    });
  } catch (error) {
    console.error('Error fetching compliance data:', error);
    return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 });
  }
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneSA, formatDateSA } from '@/lib/sa-formatting';
import { ArrowLeft, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { CLAIM_STATUS, LAB_CASE_STATUS, MEDICAL_AID_AUTHORIZATION_STATUS } from '@/lib/workflows/status-definitions';
import { PATIENT_CONSENT_TYPES, PATIENT_MESSAGE_TYPES } from '@/lib/patients/patient-detail-formatters';
import { PatientAuditTimeline } from '@/components/patient-audit-timeline';
import { needsManagerFollowUp, shouldPromptForReview } from '@/lib/reviews/review-safety';

type TabType = 'dashboard' | 'personal' | 'medical-history' | 'medical-aid' | 'authorizations' | 'communication' | 'clinical' | 'treatment' | 'quotes' | 'consents' | 'documents' | 'payments' | 'claims' | 'lab' | 'messages' | 'feedback';

interface PatientDetail {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  postal_code: string;
  status: string;
  id_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  preferred_contact_method?: string;
  referring_doctor_id?: string;
  created_at: string;
}

interface MedicalHistoryItem {
  id: string;
  patient_id: string;
  type: 'allergy' | 'condition' | 'medication';
  description: string;
  severity?: string;
  created_at?: string;
}

interface MedicalAid {
  id: string;
  patient_id: string;
  scheme_name: string;
  member_number: string;
  dependent_code?: string;
  main_member_name?: string;
  main_member_id?: string;
}

interface PatientConsent {
  id: string;
  patient_id: string;
  consent_type: string;
  value: boolean;
  date: string;
  consent_document?: string | null;
}

interface ClinicalNote {
  id: string;
  patient_id: string;
  visit_date: string;
  diagnosis: string;
  notes: string;
  procedures?: string;
}

interface TreatmentPlan {
  id: string;
  patient_id: string;
  plan_name: string;
  description: string;
  status: 'proposed' | 'accepted';
  created_at: string;
}

interface PatientFeedback {
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
}

interface PatientDocument {
  id: string;
  patient_id: string;
  document_type: string;
  title: string;
  content: string;
  status: string;
  signed_by_patient: boolean;
  signed_by_guardian: boolean;
  signature_name?: string;
  signed_at?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Quote {
  id: string;
  patient_id: string;
  description: string;
  amount: number;
  date: string;
}

interface Payment {
  id: string;
  patient_id: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
}

interface MedicalAidClaim {
  id: string;
  patient_id: string;
  claim_number: string;
  amount: number;
  status: string;
  date: string;
}

interface MedicalAidAuthorization {
  id: string;
  patient_id: string;
  invoice_id?: string | null;
  claim_id?: string | null;
  procedure_name: string;
  procedure_code?: string | null;
  icd10_code?: string | null;
  scheme_name?: string | null;
  authorization_requested_date: string;
  authorization_reference?: string | null;
  status: string;
  authorized_amount?: number | null;
  co_payment_amount?: number | null;
  patient_shortfall_amount?: number | null;
  notes?: string | null;
}

interface LabCase {
  id: string;
  patient_id: string;
  case_number: string;
  description: string;
  status: string;
  date: string;
}

interface PatientMessage {
  id: string;
  patient_id: string;
  message_type: string;
  content: string;
  timestamp: string;
}

function PatientDetailContent() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryItem[]>([]);
  const [medicalAid, setMedicalAid] = useState<MedicalAid | null>(null);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [feedback, setFeedback] = useState<PatientFeedback[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [claims, setClaims] = useState<MedicalAidClaim[]>([]);
  const [authorizations, setAuthorizations] = useState<MedicalAidAuthorization[]>([]);
  const [labCases, setLabCases] = useState<LabCase[]>([]);
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PatientDetail>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Medical history form
  const [newHistoryType, setNewHistoryType] = useState<'allergy' | 'condition' | 'medication'>('allergy');
  const [newHistoryDesc, setNewHistoryDesc] = useState('');
  const [newHistorySeverity, setNewHistorySeverity] = useState('');

  // Medical Aid form
  const [aidFormData, setAidFormData] = useState({ scheme_name: '', member_number: '', dependent_code: '', main_member_name: '', main_member_id: '' });
  
  // Clinical Notes form
  const [clinicalFormData, setClinicalFormData] = useState({ visit_date: '', diagnosis: '', notes: '', procedures: '' });
  
  // Treatment Plan form
  const [treatmentFormData, setTreatmentFormData] = useState({ plan_name: '', description: '', status: 'proposed' as 'proposed' | 'accepted' });
  const [documentFormData, setDocumentFormData] = useState({
    document_type: 'treatment_plan',
    title: '',
    diagnosis: '',
    treatment_options: '',
    risks: '',
    alternatives: '',
    prices: '',
    specialty: '',
    reason: '',
    procedure: '',
    days_off: '',
    consent_type: '',
    notes: '',
    signed_by_patient: true,
    signed_by_guardian: false,
    guardian_name: '',
    signature_name: '',
  });
  
  // Quote form
  const [quoteFormData, setQuoteFormData] = useState({ description: '', amount: '', date: '' });
  
  // Payment form
  const [paymentFormData, setPaymentFormData] = useState({ amount: '', date: '', method: '', notes: '' });
  
  // Consent form
  const [consentFormData, setConsentFormData] = useState({ consent_type: '', value: true, date: '' });
  
  // Claim form
  const [claimFormData, setClaimFormData] = useState({
    claim_number: '',
    amount: '',
    date: '',
    status: CLAIM_STATUS.SUBMITTED,
  });

  const [authorizationFormData, setAuthorizationFormData] = useState({
    invoice_id: '',
    claim_id: '',
    procedure_name: '',
    procedure_code: '',
    icd10_code: '',
    scheme_name: '',
    authorization_requested_date: new Date().toISOString().slice(0, 10),
    authorization_reference: '',
    status: MEDICAL_AID_AUTHORIZATION_STATUS.PENDING,
    authorized_amount: '',
    co_payment_amount: '',
    patient_shortfall_amount: '',
    notes: '',
  });
  
  // Lab Case form
  const [labFormData, setLabFormData] = useState({
    case_number: '',
    description: '',
    status: LAB_CASE_STATUS.RECEIVED,
    date: '',
  });
  
  // Message form
  const [messageFormData, setMessageFormData] = useState({ message_type: '', content: '' });

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchJson = async <T,>(url: string, init?: RequestInit) => {
    const response = await fetch(url, {
      credentials: 'include',
      ...init,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Request failed');
    }

    return payload.data as T;
  };

  const fetchPatientData = async () => {
    try {
      const [
        patientData,
        historyData,
        aidData,
        consentsData,
        notesData,
        plansData,
        feedbackData,
        quotesData,
        paymentsData,
        claimsData,
        authorizationsData,
        labData,
        messagesData,
        documentsData,
      ] = await Promise.all([
        fetchJson<PatientDetail>(`/api/crm/patients?id=${patientId}`),
        fetchJson<MedicalHistoryItem[]>(`/api/crm/patients/medical-history?patientId=${patientId}`),
        fetchJson<MedicalAid | null>(`/api/crm/patients/medical-aid?patientId=${patientId}`),
        fetchJson<PatientConsent[]>(`/api/crm/patients/consents?patientId=${patientId}`),
        fetchJson<ClinicalNote[]>(`/api/crm/patients/clinical-notes?patientId=${patientId}`),
        fetchJson<TreatmentPlan[]>(`/api/crm/patients/treatment-plans?patientId=${patientId}`),
        fetchJson<PatientFeedback[]>(`/api/crm/patients/feedback?patientId=${patientId}`),
        fetchJson<Quote[]>(`/api/crm/patients/quotes?patientId=${patientId}`),
        fetchJson<Payment[]>(`/api/crm/patients/payments?patientId=${patientId}`),
        fetchJson<MedicalAidClaim[]>(`/api/crm/patients/claims?patientId=${patientId}`),
        fetchJson<MedicalAidAuthorization[]>(`/api/crm/patients/authorizations?patientId=${patientId}`),
        fetchJson<LabCase[]>(`/api/crm/patients/lab?patientId=${patientId}`),
        fetchJson<PatientMessage[]>(`/api/crm/patients/messages?patientId=${patientId}`),
        fetchJson<PatientDocument[]>(`/api/crm/patients/documents?patientId=${patientId}`),
      ]);

      setPatient(patientData);
      setFormData(patientData);
      setMedicalHistory(historyData || []);
      setMedicalAid(aidData || null);
      setConsents(consentsData || []);
      setClinicalNotes(notesData || []);
      setTreatmentPlans(plansData || []);
      setFeedback(feedbackData || []);
      setQuotes(quotesData || []);
      setPayments(paymentsData || []);
      setClaims(claimsData || []);
      setAuthorizations(authorizationsData || []);
      setLabCases(labData || []);
      setMessages(messagesData || []);
      setDocuments(documentsData || []);
    } catch (err) {
      setError('Failed to load patient data');
      console.error('[v0] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!patient) return;
    
    setIsSaving(true);
    try {
      await fetchJson<PatientDetail>(`/api/crm/patients?id=${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      setPatient({ ...patient, ...formData } as PatientDetail);
      setIsEditing(false);
      alert('Patient updated successfully');
    } catch (err) {
      setError('Failed to update patient');
      console.error('[v0] Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addMedicalHistoryItem = async () => {
    if (!newHistoryDesc) return;

    try {
      await fetchJson('/api/crm/patients/medical-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          type: newHistoryType,
          description: newHistoryDesc,
          severity: newHistorySeverity || null,
        }),
      });

      setNewHistoryDesc('');
      setNewHistorySeverity('');
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error adding medical history:', err);
      alert('Failed to add medical history item');
    }
  };

  const deleteMedicalHistoryItem = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/medical-history?id=${id}`, {
        method: 'DELETE',
      });

      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error deleting:', err);
      alert('Failed to delete medical history item');
    }
  };

  // Medical Aid functions
  const saveMedicalAid = async () => {
    if (!aidFormData.scheme_name || !aidFormData.member_number) {
      alert('Scheme name and member number are required');
      return;
    }
    try {
      if (medicalAid?.id) {
        await fetchJson(`/api/crm/patients/medical-aid?id=${medicalAid.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aidFormData),
        });
      } else {
        await fetchJson('/api/crm/patients/medical-aid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...aidFormData, patient_id: patientId }),
        });
      }
      await fetchPatientData();
      setAidFormData({ scheme_name: '', member_number: '', dependent_code: '', main_member_name: '', main_member_id: '' });
      alert('Medical aid information saved');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to save medical aid information');
    }
  };

  // Clinical Notes functions
  const addClinicalNote = async () => {
    if (!clinicalFormData.visit_date || !clinicalFormData.diagnosis) {
      alert('Visit date and diagnosis are required');
      return;
    }
    try {
      await fetchJson('/api/crm/patients/clinical-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...clinicalFormData, patient_id: patientId }),
      });
      await fetchPatientData();
      setClinicalFormData({ visit_date: '', diagnosis: '', notes: '', procedures: '' });
      alert('Clinical note added');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to add clinical note');
    }
  };

  const deleteClinicalNote = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/clinical-notes?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete clinical note');
    }
  };

  // Treatment Plan functions
  const addTreatmentPlan = async () => {
    if (!treatmentFormData.plan_name) {
      alert('Plan name is required');
      return;
    }
    try {
      await fetchJson('/api/crm/patients/treatment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...treatmentFormData, patient_id: patientId }),
      });
      await fetchPatientData();
      setTreatmentFormData({ plan_name: '', description: '', status: 'proposed' });
      alert('Treatment plan added');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to add treatment plan');
    }
  };

  const approveTreatmentPlan = async (plan: TreatmentPlan) => {
    try {
      await fetchJson('/api/crm/patients/treatment-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          plan_name: plan.plan_name,
          description: plan.description,
          status: 'accepted',
          id: plan.id,
        }),
      });
      await fetchPatientData();
      alert('Treatment plan approved');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to approve treatment plan');
    }
  };

  const deleteTreatmentPlan = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/treatment-plans?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete treatment plan');
    }
  };

  const addPatientFeedback = async (feedbackType: 'satisfaction' | 'complaint', outcome: 'happy' | 'needs_follow_up' | 'complaint_logged' | 'resolved') => {
    try {
      await fetchJson('/api/crm/patients/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          feedback_type: feedbackType,
          outcome,
          rating: feedbackType === 'satisfaction' && outcome === 'happy' ? 5 : 2,
          notes:
            feedbackType === 'satisfaction'
              ? 'Patient confirmed they were happy with the visit'
              : 'Complaint logged for manager follow-up',
          review_prompted_at: feedbackType === 'satisfaction' && outcome === 'happy' ? new Date().toISOString() : null,
          complaint_logged_at: feedbackType === 'complaint' ? new Date().toISOString() : null,
        }),
      });
      await fetchPatientData();
      alert('Patient feedback recorded');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to record patient feedback');
    }
  };

  const generateDocument = async () => {
    if (!documentFormData.title && documentFormData.document_type !== 'consent_form') {
      setError('Title is required');
      return;
    }

    try {
      await fetchJson('/api/crm/patients/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...documentFormData,
          patient_id: patientId,
          patient_name: `${patient.first_name} ${patient.last_name}`.trim(),
          doctor_name: documentFormData.signature_name || '',
          practice_name: 'Crown Dental Studio',
        }),
      });
      await fetchPatientData();
      setDocumentFormData({
        document_type: 'treatment_plan',
        title: '',
        diagnosis: '',
        treatment_options: '',
        risks: '',
        alternatives: '',
        prices: '',
        specialty: '',
        reason: '',
        procedure: '',
        days_off: '',
        consent_type: '',
        notes: '',
        signed_by_patient: true,
        signed_by_guardian: false,
        guardian_name: '',
        signature_name: '',
      });
      alert('Document generated');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to generate document');
    }
  };

  // Quote functions
  const addQuote = async () => {
    if (!quoteFormData.description || !quoteFormData.amount || !quoteFormData.date) {
      alert('Description, amount, and date are required');
      return;
    }
    try {
      await fetchJson('/api/crm/patients/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...quoteFormData, patient_id: patientId, amount: parseFloat(quoteFormData.amount) }),
      });
      await fetchPatientData();
      setQuoteFormData({ description: '', amount: '', date: '' });
      alert('Quote added');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to add quote');
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/quotes?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete quote');
    }
  };

  // Payment functions
  const addPayment = async () => {
    if (!paymentFormData.amount || !paymentFormData.date || !paymentFormData.method) {
      alert('Amount, date, and method are required');
      return;
    }
    try {
      await fetchJson('/api/crm/patients/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentFormData, patient_id: patientId, amount: parseFloat(paymentFormData.amount) }),
      });
      await fetchPatientData();
      setPaymentFormData({ amount: '', date: '', method: '', notes: '' });
      alert('Payment recorded');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to record payment');
    }
  };

  const deletePayment = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/payments?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete payment');
    }
  };

  // Consent functions
  const addConsent = async () => {
    if (!consentFormData.consent_type || !consentFormData.date) {
      alert('Consent type and date are required');
      return;
    }
    try {
      await fetchJson('/api/crm/patients/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...consentFormData, patient_id: patientId }),
      });
      await fetchPatientData();
      setConsentFormData({ consent_type: '', value: true, date: '' });
      alert('Consent recorded');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to record consent');
    }
  };

  const deleteConsent = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/consents?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete consent');
    }
  };

  // Claim functions
  const addClaim = async () => {
    if (!claimFormData.claim_number || !claimFormData.amount || !claimFormData.date) {
      alert('Claim number, amount, and date are required');
      return;
    }
    try {
      await fetchJson('/api/crm/patients/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...claimFormData, patient_id: patientId, amount: parseFloat(claimFormData.amount) }),
      });
      await fetchPatientData();
      setClaimFormData({ claim_number: '', amount: '', date: '', status: CLAIM_STATUS.SUBMITTED });
      alert('Claim recorded');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to record claim');
    }
  };

  const deleteClaim = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/claims?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete claim');
    }
  };

  const addAuthorization = async () => {
    if (!authorizationFormData.procedure_name || !authorizationFormData.authorization_requested_date) {
      alert('Procedure name and requested date are required');
      return;
    }

    try {
      await fetchJson('/api/crm/patients/authorizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authorizationFormData,
          patient_id: patientId,
          invoice_id: authorizationFormData.invoice_id || null,
          claim_id: authorizationFormData.claim_id || null,
          authorized_amount: authorizationFormData.authorized_amount ? parseFloat(authorizationFormData.authorized_amount) : null,
          co_payment_amount: authorizationFormData.co_payment_amount ? parseFloat(authorizationFormData.co_payment_amount) : null,
          patient_shortfall_amount: authorizationFormData.patient_shortfall_amount ? parseFloat(authorizationFormData.patient_shortfall_amount) : null,
        }),
      });
      await fetchPatientData();
      setAuthorizationFormData({
        invoice_id: '',
        claim_id: '',
        procedure_name: '',
        procedure_code: '',
        icd10_code: '',
        scheme_name: '',
        authorization_requested_date: new Date().toISOString().slice(0, 10),
        authorization_reference: '',
        status: MEDICAL_AID_AUTHORIZATION_STATUS.PENDING,
        authorized_amount: '',
        co_payment_amount: '',
        patient_shortfall_amount: '',
        notes: '',
      });
      alert('Authorization recorded');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to record authorization');
    }
  };

  const deleteAuthorization = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/authorizations?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete authorization');
    }
  };

  // Lab Case functions
  const addLabCase = async () => {
    if (!labFormData.case_number || !labFormData.date) {
      alert('Case number and date are required');
      return;
    }
    try {
      await fetchJson('/api/crm/patients/lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...labFormData, patient_id: patientId }),
      });
      await fetchPatientData();
      setLabFormData({ case_number: '', description: '', status: LAB_CASE_STATUS.RECEIVED, date: '' });
      alert('Lab case added');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to add lab case');
    }
  };

  const deleteLabCase = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/lab?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete lab case');
    }
  };

  // Message functions
  const addMessage = async () => {
    if (!messageFormData.message_type || !messageFormData.content) {
      alert('Message type and content are required');
      return;
    }
    try {
      await fetchJson('/api/crm/patients/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...messageFormData, patient_id: patientId, timestamp: new Date().toISOString() }),
      });
      await fetchPatientData();
      setMessageFormData({ message_type: '', content: '' });
      alert('Message recorded');
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to record message');
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await fetchJson(`/api/crm/patients/messages?id=${id}`, {
        method: 'DELETE',
      });
      await fetchPatientData();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert('Failed to delete message');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <p className="text-red-600 mb-4">Patient not found</p>
          <Button onClick={() => router.push('/patients')} variant="outline">← Back to Patients</Button>
        </div>
      </DashboardLayout>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'personal', label: 'Personal' },
    { id: 'medical-history', label: 'Medical History' },
    { id: 'medical-aid', label: 'Medical Aid' },
    { id: 'authorizations', label: 'Authorizations' },
    { id: 'documents', label: 'Documents' },
    { id: 'communication', label: 'Communication' },
    { id: 'clinical', label: 'Clinical Timeline' },
    { id: 'treatment', label: 'Treatment Plans' },
    { id: 'quotes', label: 'Quotes' },
    { id: 'consents', label: 'Consents' },
    { id: 'payments', label: 'Payments' },
    { id: 'claims', label: 'Claims' },
    { id: 'lab', label: 'Lab Cases' },
    { id: 'messages', label: 'Messages' },
    { id: 'feedback', label: 'Feedback' },
  ];

  const latestFeedback = feedback[0] || null;
  const reviewEligible = latestFeedback ? shouldPromptForReview(latestFeedback) : false;
  const complaintNeedsFollowUp = latestFeedback ? needsManagerFollowUp(latestFeedback) : false;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#f1f5f9]">

        {/* Patient Hero Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 px-6 lg:px-8 pt-6 pb-0">
          <div className="max-w-7xl mx-auto">
            {/* Back + actions row */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => router.push('/patients')}
                className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Patients
              </button>
              {activeTab === 'personal' && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSave} disabled={isSaving} size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-md">
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {isSaving ? 'Saving…' : 'Save Changes'}
                      </Button>
                      <Button onClick={() => { setIsEditing(false); setFormData(patient); }} size="sm" variant="outline"
                        className="border-white/30 text-white bg-white/10 hover:bg-white/20">
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)} size="sm"
                      className="bg-white text-blue-700 hover:bg-blue-50 border-0 shadow-md font-bold">
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit Patient
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Patient identity */}
            <div className="flex items-end gap-5 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-black text-2xl shadow-lg border border-white/20 flex-shrink-0">
                {patient.first_name?.[0]}{patient.last_name?.[0]}
              </div>
              <div className="flex-1 pb-1">
                <h1 className="text-3xl font-bold text-white leading-tight">
                  {patient.first_name} {patient.last_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="text-white/70 text-sm">#{patient.patient_number}</span>
                  <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full ${patient.status === 'Active' ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' : 'bg-white/10 text-white/60 border border-white/20'}`}>
                    {patient.status}
                  </span>
                  {patient.email && <span className="text-white/60 text-xs">{patient.email}</span>}
                  {patient.mobile && <span className="text-white/60 text-xs">{formatPhoneSA(patient.mobile)}</span>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 overflow-x-auto pb-0 -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex-shrink-0 px-4 py-2.5 text-[13px] font-semibold rounded-t-lg transition-all border-b-2',
                    activeTab === tab.id
                      ? 'bg-[#f1f5f9] text-blue-700 border-transparent'
                      : 'text-white/60 hover:text-white/90 border-transparent hover:bg-white/10',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5">

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              <div className="flex justify-end">
                <Button
                  onClick={() => router.push(`/appointments?patientId=${patientId}&open=1`)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md border-0"
                >
                  Book Appointment
                </Button>
              </div>
              <PatientAuditTimeline patientId={patientId} />
            </div>
          )}

          {/* Personal Info Tab */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {['first_name', 'last_name', 'id_number', 'date_of_birth', 'gender'].map((field) => (
                    <div key={field}>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">{field.replace(/_/g, ' ')}</label>
                      {isEditing ? (
                        field === 'date_of_birth' ? (
                          <Input type="date" name={field} value={formData[field as keyof PatientDetail] || ''} onChange={handleInputChange} className="rounded-xl border-slate-200" />
                        ) : field === 'gender' ? (
                          <select name={field} value={formData.gender || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                            <option value="">Select</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <Input name={field} value={formData[field as keyof PatientDetail] || ''} onChange={handleInputChange} className="rounded-xl border-slate-200" />
                        )
                      ) : (
                        <p className="text-sm font-semibold text-slate-800">{field === 'date_of_birth' ? formatDateSA(patient[field as keyof PatientDetail] as string) : (patient[field as keyof PatientDetail] || '—')}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {['email', 'phone', 'mobile', 'emergency_contact_name', 'emergency_contact_phone'].map((field) => (
                    <div key={field}>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">{field.replace(/_/g, ' ')}</label>
                      {isEditing ? (
                        <Input name={field} value={formData[field as keyof PatientDetail] || ''} onChange={handleInputChange} className="rounded-xl border-slate-200" />
                      ) : (
                        <p className="text-sm font-semibold text-slate-800">{patient[field as keyof PatientDetail] || '—'}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                  <CardTitle className="text-base">Address & Preferences</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {['address', 'city', 'postal_code'].map((field) => (
                    <div key={field}>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">{field.replace(/_/g, ' ')}</label>
                      {isEditing ? (
                        <Input name={field} value={formData[field as keyof PatientDetail] || ''} onChange={handleInputChange} className="rounded-xl border-slate-200" />
                      ) : (
                        <p className="text-sm font-semibold text-slate-800">{patient[field as keyof PatientDetail] || '—'}</p>
                      )}
                    </div>
                  ))}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Preferred Contact</label>
                    {isEditing ? (
                      <Input name="preferred_contact_method" value={formData.preferred_contact_method || ''} onChange={handleInputChange} className="rounded-xl border-slate-200" />
                    ) : (
                      <p className="text-sm font-semibold text-slate-800">{patient.preferred_contact_method || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Referring Doctor</label>
                    {isEditing ? (
                      <Input name="referring_doctor_id" value={formData.referring_doctor_id || ''} onChange={handleInputChange} className="rounded-xl border-slate-200" />
                    ) : (
                      <p className="text-sm font-semibold text-slate-800">{patient.referring_doctor_id || '—'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Medical History Tab */}
          {activeTab === 'medical-history' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                    <CardTitle className="text-base">Add Item</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <select value={newHistoryType} onChange={(e) => setNewHistoryType(e.target.value as 'allergy' | 'condition' | 'medication')} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="allergy">Allergy</option>
                      <option value="condition">Condition</option>
                      <option value="medication">Medication</option>
                    </select>
                    <Input placeholder="Description" value={newHistoryDesc} onChange={(e) => setNewHistoryDesc(e.target.value)} className="rounded-xl border-slate-200" />
                    {newHistoryType === 'allergy' && (
                      <select value={newHistorySeverity} onChange={(e) => setNewHistorySeverity(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                        <option value="">Severity (optional)</option>
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    )}
                    <Button onClick={addMedicalHistoryItem} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md">
                      <Plus className="w-4 h-4 mr-2" />Add Item
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {medicalHistory.length > 0 ? medicalHistory.map((item) => {
                  const colors: Record<string, string> = { allergy: 'border-l-red-400 bg-red-50', condition: 'border-l-amber-400 bg-amber-50', medication: 'border-l-blue-400 bg-blue-50' };
                  return (
                    <div key={item.id} className={`flex items-start justify-between p-4 rounded-2xl border border-slate-200 border-l-4 ${colors[item.type] || 'bg-white'} bg-white`}>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.type}</span>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{item.description}</p>
                        {item.severity && <p className="text-xs text-slate-500 mt-0.5">Severity: <span className="font-semibold capitalize">{item.severity}</span></p>}
                      </div>
                      <Button onClick={() => deleteMedicalHistoryItem(item.id)} variant="outline" size="sm" className="flex-shrink-0 border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  );
                }) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No medical history recorded</div>}
              </div>
            </div>
          )}

          {/* Medical Aid Tab */}
          {activeTab === 'medical-aid' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                    <CardTitle className="text-base">{medicalAid ? 'Update Medical Aid' : 'Add Medical Aid'}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Input placeholder="Scheme Name" value={aidFormData.scheme_name} onChange={(e) => setAidFormData({...aidFormData, scheme_name: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input placeholder="Member Number" value={aidFormData.member_number} onChange={(e) => setAidFormData({...aidFormData, member_number: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input placeholder="Dependent Code" value={aidFormData.dependent_code} onChange={(e) => setAidFormData({...aidFormData, dependent_code: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input placeholder="Main Member Name" value={aidFormData.main_member_name} onChange={(e) => setAidFormData({...aidFormData, main_member_name: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input placeholder="Main Member ID" value={aidFormData.main_member_id} onChange={(e) => setAidFormData({...aidFormData, main_member_id: e.target.value})} className="rounded-xl border-slate-200" />
                    <Button onClick={saveMedicalAid} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md">Save Medical Aid</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                {medicalAid ? (
                  <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-emerald-50/50 py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <CardTitle className="text-base text-emerald-800">{medicalAid.scheme_name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-2 gap-5">
                      {[
                        { label: 'Member Number', value: medicalAid.member_number },
                        { label: 'Dependent Code', value: medicalAid.dependent_code || '—' },
                        { label: 'Main Member', value: medicalAid.main_member_name || '—' },
                        { label: 'Main Member ID', value: medicalAid.main_member_id || '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                          <p className="text-sm font-semibold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No medical aid on file</div>
                )}
              </div>
            </div>
          )}

          {/* Authorizations Tab */}
          {activeTab === 'authorizations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Record Authorization</CardTitle></CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {[
                      { placeholder: 'Procedure Name', field: 'procedure_name' },
                      { placeholder: 'Scheme Name', field: 'scheme_name' },
                      { placeholder: 'Authorization Reference', field: 'authorization_reference' },
                      { placeholder: 'Procedure Code', field: 'procedure_code' },
                      { placeholder: 'ICD10 Code', field: 'icd10_code' },
                    ].map(({ placeholder, field }) => (
                      <Input key={field} placeholder={placeholder} value={(authorizationFormData as Record<string, string>)[field]} onChange={(e) => setAuthorizationFormData({ ...authorizationFormData, [field]: e.target.value })} className="rounded-xl border-slate-200" />
                    ))}
                    <Input type="date" value={authorizationFormData.authorization_requested_date} onChange={(e) => setAuthorizationFormData({ ...authorizationFormData, authorization_requested_date: e.target.value })} className="rounded-xl border-slate-200" />
                    <select value={authorizationFormData.status} onChange={(e) => setAuthorizationFormData({ ...authorizationFormData, status: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value={MEDICAL_AID_AUTHORIZATION_STATUS.PENDING}>Pending</option>
                      <option value={MEDICAL_AID_AUTHORIZATION_STATUS.APPROVED}>Approved</option>
                      <option value={MEDICAL_AID_AUTHORIZATION_STATUS.REJECTED}>Rejected</option>
                      <option value={MEDICAL_AID_AUTHORIZATION_STATUS.EXPIRED}>Expired</option>
                      <option value={MEDICAL_AID_AUTHORIZATION_STATUS.NEEDS_REVIEW}>Needs Review</option>
                    </select>
                    {['authorized_amount','co_payment_amount','patient_shortfall_amount'].map((f) => (
                      <Input key={f} type="number" placeholder={f.replace(/_/g,' ')} value={(authorizationFormData as Record<string,string>)[f]} onChange={(e) => setAuthorizationFormData({ ...authorizationFormData, [f]: e.target.value })} className="rounded-xl border-slate-200" />
                    ))}
                    <textarea placeholder="Notes" value={authorizationFormData.notes} onChange={(e) => setAuthorizationFormData({ ...authorizationFormData, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" rows={3} />
                    <Button onClick={addAuthorization} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md"><Plus className="w-4 h-4 mr-2" />Record Authorization</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {authorizations.length > 0 ? authorizations.map((auth) => {
                  const statusColors: Record<string, string> = { Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', Rejected: 'bg-red-50 text-red-700 border-red-200', Pending: 'bg-amber-50 text-amber-700 border-amber-200', Expired: 'bg-slate-100 text-slate-600 border-slate-200' };
                  const sc = statusColors[auth.status] || 'bg-blue-50 text-blue-700 border-blue-200';
                  return (
                    <div key={auth.id} className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900">{auth.procedure_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{auth.scheme_name || 'No scheme'} · {formatDateSA(auth.authorization_requested_date)}</p>
                          {auth.authorization_reference && <p className="text-xs text-slate-500 mt-0.5">Ref: {auth.authorization_reference}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${sc}`}>{auth.status}</span>
                          <Button onClick={() => deleteAuthorization(auth.id)} variant="outline" size="sm" className="border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                }) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No authorizations recorded</div>}
              </div>
            </div>
          )}

          {/* Communication Tab */}
          {activeTab === 'communication' && (
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-base">Communication Preferences</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {consents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {consents.map((consent) => (
                      <div key={consent.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white">
                        <span className="text-sm font-semibold text-slate-800 capitalize">{consent.consent_type.replace(/_/g, ' ')}</span>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${consent.value ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {consent.value ? 'Consented' : 'Declined'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 text-sm py-10">No communication preferences recorded</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Clinical Timeline Tab */}
          {activeTab === 'clinical' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                    <CardTitle className="text-base">Add Clinical Note</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Input type="date" value={clinicalFormData.visit_date} onChange={(e) => setClinicalFormData({...clinicalFormData, visit_date: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input placeholder="Diagnosis" value={clinicalFormData.diagnosis} onChange={(e) => setClinicalFormData({...clinicalFormData, diagnosis: e.target.value})} className="rounded-xl border-slate-200" />
                    <textarea placeholder="Notes" value={clinicalFormData.notes} onChange={(e) => setClinicalFormData({...clinicalFormData, notes: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" rows={3} />
                    <Input placeholder="Procedures (optional)" value={clinicalFormData.procedures} onChange={(e) => setClinicalFormData({...clinicalFormData, procedures: e.target.value})} className="rounded-xl border-slate-200" />
                    <Button onClick={addClinicalNote} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md"><Plus className="w-4 h-4 mr-2" />Add Note</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {clinicalNotes.length > 0 ? clinicalNotes.map((note) => (
                  <div key={note.id} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors">
                    <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-blue-400 to-cyan-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{formatDateSA(note.visit_date)}</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{note.diagnosis}</p>
                      <p className="text-sm text-slate-600 mt-1">{note.notes}</p>
                      {note.procedures && <p className="text-xs text-slate-500 mt-2 font-medium">Procedures: {note.procedures}</p>}
                    </div>
                    <Button onClick={() => deleteClinicalNote(note.id)} variant="outline" size="sm" className="flex-shrink-0 border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No clinical notes recorded</div>}
              </div>
            </div>
          )}

          {/* Treatment Plans Tab */}
          {activeTab === 'treatment' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                    <CardTitle className="text-base">Add Treatment Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Input placeholder="Plan Name" value={treatmentFormData.plan_name} onChange={(e) => setTreatmentFormData({...treatmentFormData, plan_name: e.target.value})} className="rounded-xl border-slate-200" />
                    <textarea placeholder="Description" value={treatmentFormData.description} onChange={(e) => setTreatmentFormData({...treatmentFormData, description: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" rows={3} />
                    <select value={treatmentFormData.status} onChange={(e) => setTreatmentFormData({...treatmentFormData, status: e.target.value as 'proposed' | 'accepted'})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="proposed">Proposed</option>
                      <option value="accepted">Accepted</option>
                    </select>
                    <Button onClick={addTreatmentPlan} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md"><Plus className="w-4 h-4 mr-2" />Add Plan</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {treatmentPlans.length > 0 ? treatmentPlans.map((plan) => (
                  <div key={plan.id} className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{plan.plan_name}</p>
                        <p className="text-sm text-slate-600 mt-1">{plan.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${plan.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{plan.status}</span>
                        {plan.status === 'proposed' && (
                          <Button onClick={() => approveTreatmentPlan(plan)} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs">Approve</Button>
                        )}
                        <Button onClick={() => deleteTreatmentPlan(plan.id)} variant="outline" size="sm" className="border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                )) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No treatment plans recorded</div>}
              </div>
            </div>
          )}

          {/* Quotes Tab */}
          {activeTab === 'quotes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Add Quote</CardTitle></CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Input placeholder="Description" value={quoteFormData.description} onChange={(e) => setQuoteFormData({...quoteFormData, description: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input type="number" placeholder="Amount (R)" value={quoteFormData.amount} onChange={(e) => setQuoteFormData({...quoteFormData, amount: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input type="date" value={quoteFormData.date} onChange={(e) => setQuoteFormData({...quoteFormData, date: e.target.value})} className="rounded-xl border-slate-200" />
                    <Button onClick={addQuote} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md"><Plus className="w-4 h-4 mr-2" />Add Quote</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {quotes.length > 0 ? quotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                    <div><p className="text-sm font-semibold text-slate-900">{quote.description}</p><p className="text-xs text-slate-500 mt-0.5">{formatDateSA(quote.date)}</p></div>
                    <div className="flex items-center gap-3">
                      <p className="text-base font-bold text-slate-900">R{quote.amount.toFixed(2)}</p>
                      <Button onClick={() => deleteQuote(quote.id)} variant="outline" size="sm" className="border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                )) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No quotes issued</div>}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Input type="number" placeholder="Amount (R)" value={paymentFormData.amount} onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input type="date" value={paymentFormData.date} onChange={(e) => setPaymentFormData({...paymentFormData, date: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input placeholder="Payment Method" value={paymentFormData.method} onChange={(e) => setPaymentFormData({...paymentFormData, method: e.target.value})} className="rounded-xl border-slate-200" />
                    <textarea placeholder="Notes (optional)" value={paymentFormData.notes} onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" rows={2} />
                    <Button onClick={addPayment} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md"><Plus className="w-4 h-4 mr-2" />Record Payment</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {payments.length > 0 ? payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 border-l-4 border-l-emerald-400">
                    <div><p className="text-sm font-semibold text-slate-900">{payment.method}</p><p className="text-xs text-slate-500 mt-0.5">{formatDateSA(payment.date)}</p></div>
                    <div className="flex items-center gap-3">
                      <p className="text-base font-bold text-emerald-600">R{payment.amount.toFixed(2)}</p>
                      <Button onClick={() => deletePayment(payment.id)} variant="outline" size="sm" className="border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                )) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No payments recorded</div>}
              </div>
            </div>
          )}

          {/* Consents Tab */}
          {activeTab === 'consents' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Record Consent</CardTitle></CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <select value={consentFormData.consent_type} onChange={(e) => setConsentFormData({...consentFormData, consent_type: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="">Select Consent Type</option>
                      {PATIENT_CONSENT_TYPES.map((type) => (<option key={type} value={type}>{type.replace(/_/g, ' ')}</option>))}
                    </select>
                    <select value={consentFormData.value ? 'yes' : 'no'} onChange={(e) => setConsentFormData({...consentFormData, value: e.target.value === 'yes'})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="yes">Consent Given</option>
                      <option value="no">Consent Not Given</option>
                    </select>
                    <Input type="date" value={consentFormData.date} onChange={(e) => setConsentFormData({...consentFormData, date: e.target.value})} className="rounded-xl border-slate-200" />
                    <Button onClick={addConsent} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md"><Plus className="w-4 h-4 mr-2" />Record Consent</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {consents.length > 0 ? consents.map((consent) => (
                  <div key={consent.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                    <div><p className="text-sm font-semibold text-slate-900 capitalize">{consent.consent_type.replace(/_/g, ' ')}</p><p className="text-xs text-slate-500 mt-0.5">{formatDateSA(consent.date)}</p></div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${consent.value ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{consent.value ? 'Consented' : 'Declined'}</span>
                      <Button onClick={() => deleteConsent(consent.id)} variant="outline" size="sm" className="border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                )) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No consents recorded</div>}
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
              <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-base">Generate Document</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                  <div className="space-y-3">
                  <select
                    value={documentFormData.document_type}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, document_type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="treatment_plan">Treatment Plan</option>
                    <option value="referral_letter">Referral Letter</option>
                    <option value="medical_certificate">Medical Certificate</option>
                    <option value="consent_form">Consent Form</option>
                  </select>
                  <Input
                    placeholder="Title"
                    value={documentFormData.title}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, title: e.target.value })}
                  />
                  <Input
                    placeholder="Diagnosis / reason"
                    value={documentFormData.diagnosis}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, diagnosis: e.target.value })}
                  />
                  <select
                    value={documentFormData.consent_type}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, consent_type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Consent type</option>
                    <option value="treatment">Treatment</option>
                    <option value="procedure">Procedure</option>
                    <option value="photography">Photography</option>
                    <option value="recording">Recording</option>
                    <option value="data_processing">Data processing</option>
                  </select>
                  <textarea
                    placeholder="Treatment options"
                    value={documentFormData.treatment_options}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, treatment_options: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    rows={3}
                  />
                  <textarea
                    placeholder="Risks"
                    value={documentFormData.risks}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, risks: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    rows={3}
                  />
                  <textarea
                    placeholder="Alternatives"
                    value={documentFormData.alternatives}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, alternatives: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    rows={3}
                  />
                  <textarea
                    placeholder="Prices / fees"
                    value={documentFormData.prices}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, prices: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    rows={3}
                  />
                  <Input
                    placeholder="Specialty or recipient"
                    value={documentFormData.specialty}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, specialty: e.target.value })}
                  />
                  <Input
                    placeholder="Procedure or focus"
                    value={documentFormData.procedure}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, procedure: e.target.value })}
                  />
                  <Input
                    placeholder="Days off / time off"
                    value={documentFormData.days_off}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, days_off: e.target.value })}
                  />
                  <Input
                    placeholder="Guardian name"
                    value={documentFormData.guardian_name}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, guardian_name: e.target.value })}
                  />
                  <Input
                    placeholder="Signature name"
                    value={documentFormData.signature_name}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, signature_name: e.target.value })}
                  />
                  <textarea
                    placeholder="Extra notes"
                    value={documentFormData.notes}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    rows={3}
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={documentFormData.signed_by_patient}
                      onChange={(e) => setDocumentFormData({ ...documentFormData, signed_by_patient: e.target.checked })}
                    />
                    Signed by patient
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={documentFormData.signed_by_guardian}
                      onChange={(e) => setDocumentFormData({ ...documentFormData, signed_by_guardian: e.target.checked })}
                    />
                    Signed by guardian
                  </label>
                  <Button onClick={generateDocument} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md">
                    <Plus className="w-4 h-4 mr-2" />Generate Document
                  </Button>
                  </div>
              </CardContent>
            </Card>
            </div>
            <div className="lg:col-span-2 space-y-3">
                {documents.length > 0 ? documents.map((doc) => (
                  <div key={doc.id} className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 capitalize">{doc.document_type.replace(/_/g, ' ')} · {formatDateSA(doc.created_at)}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${doc.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{doc.content.slice(0, 240)}{doc.content.length > 240 ? '…' : ''}</p>
                  </div>
                )) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No documents generated yet</div>}
            </div>
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Latest Outcome', value: latestFeedback ? `${latestFeedback.feedback_type} / ${latestFeedback.outcome.replace(/_/g,' ')}` : 'No feedback yet', color: 'from-blue-600 to-cyan-500' },
                  { label: 'Review Status', value: reviewEligible ? 'Safe to prompt' : 'Hold public review', color: reviewEligible ? 'from-emerald-600 to-teal-500' : 'from-amber-500 to-orange-500' },
                  { label: 'Follow-up', value: complaintNeedsFollowUp ? 'Manager follow-up needed' : 'No action needed', color: complaintNeedsFollowUp ? 'from-red-500 to-rose-500' : 'from-slate-600 to-slate-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-md`}>
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-1">{label}</p>
                    <p className="text-base font-bold capitalize">{value}</p>
                    <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
                  </div>
                ))}
              </div>
              <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Record Satisfaction</CardTitle></CardHeader>
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => addPatientFeedback('satisfaction', 'happy')} className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">Patient Happy</Button>
                    <Button variant="outline" onClick={() => addPatientFeedback('complaint', 'needs_follow_up')} className="border-amber-200 text-amber-700 hover:bg-amber-50">Needs Follow-up</Button>
                    <Button variant="outline" onClick={() => addPatientFeedback('complaint', 'complaint_logged')} className="border-red-200 text-red-700 hover:bg-red-50">Complaint Logged</Button>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-3">
                {feedback.length > 0 ? feedback.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between p-5 bg-white rounded-2xl border border-slate-200">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 capitalize">{entry.feedback_type}</p>
                      <p className="text-sm text-slate-600 capitalize mt-0.5">{entry.outcome.replace(/_/g, ' ')}</p>
                      {entry.notes && <p className="text-xs text-slate-500 mt-1">{entry.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${shouldPromptForReview(entry) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {shouldPromptForReview(entry) ? 'Review ready' : 'Internal follow-up'}
                      </span>
                      {entry.rating != null && <p className="text-xs text-slate-500 mt-1.5">Rating: {entry.rating}/5</p>}
                    </div>
                  </div>
                )) : <div className="flex items-center justify-center h-32 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No feedback recorded yet</div>}
              </div>
            </div>
          )}

          {/* Claims Tab */}
          {activeTab === 'claims' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Record Claim</CardTitle></CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Input placeholder="Claim Number" value={claimFormData.claim_number} onChange={(e) => setClaimFormData({...claimFormData, claim_number: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input type="number" placeholder="Amount (R)" value={claimFormData.amount} onChange={(e) => setClaimFormData({...claimFormData, amount: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input type="date" value={claimFormData.date} onChange={(e) => setClaimFormData({...claimFormData, date: e.target.value})} className="rounded-xl border-slate-200" />
                    <select value={claimFormData.status} onChange={(e) => setClaimFormData({...claimFormData, status: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value={CLAIM_STATUS.SUBMITTED}>{CLAIM_STATUS.SUBMITTED}</option>
                      <option value={CLAIM_STATUS.UNDER_REVIEW}>{CLAIM_STATUS.UNDER_REVIEW}</option>
                      <option value={CLAIM_STATUS.APPROVED}>{CLAIM_STATUS.APPROVED}</option>
                      <option value={CLAIM_STATUS.REJECTED}>{CLAIM_STATUS.REJECTED}</option>
                      <option value={CLAIM_STATUS.PAID}>{CLAIM_STATUS.PAID}</option>
                    </select>
                    <Button onClick={addClaim} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md"><Plus className="w-4 h-4 mr-2" />Record Claim</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {claims.length > 0 ? claims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                    <div><p className="text-sm font-semibold text-slate-900">{claim.claim_number}</p><p className="text-xs text-slate-500 mt-0.5">{formatDateSA(claim.date)}</p></div>
                    <div className="flex items-center gap-3">
                      <p className="text-base font-bold text-slate-900">R{claim.amount.toFixed(2)}</p>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{claim.status}</span>
                      <Button onClick={() => deleteClaim(claim.id)} variant="outline" size="sm" className="border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                )) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No claims recorded</div>}
              </div>
            </div>
          )}

          {/* Lab Cases Tab */}
          {activeTab === 'lab' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden sticky top-4">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Add Lab Case</CardTitle></CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <Input placeholder="Case Number" value={labFormData.case_number} onChange={(e) => setLabFormData({...labFormData, case_number: e.target.value})} className="rounded-xl border-slate-200" />
                    <Input placeholder="Description" value={labFormData.description} onChange={(e) => setLabFormData({...labFormData, description: e.target.value})} className="rounded-xl border-slate-200" />
                    <select value={labFormData.status} onChange={(e) => setLabFormData({...labFormData, status: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value={LAB_CASE_STATUS.RECEIVED}>{LAB_CASE_STATUS.RECEIVED}</option>
                      <option value={LAB_CASE_STATUS.IN_PROGRESS}>{LAB_CASE_STATUS.IN_PROGRESS}</option>
                      <option value={LAB_CASE_STATUS.QUALITY_CHECK}>{LAB_CASE_STATUS.QUALITY_CHECK}</option>
                      <option value={LAB_CASE_STATUS.READY}>{LAB_CASE_STATUS.READY}</option>
                      <option value={LAB_CASE_STATUS.DELIVERED}>{LAB_CASE_STATUS.DELIVERED}</option>
                      <option value={LAB_CASE_STATUS.ON_HOLD}>{LAB_CASE_STATUS.ON_HOLD}</option>
                    </select>
                    <Input type="date" value={labFormData.date} onChange={(e) => setLabFormData({...labFormData, date: e.target.value})} className="rounded-xl border-slate-200" />
                    <Button onClick={addLabCase} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md"><Plus className="w-4 h-4 mr-2" />Add Lab Case</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {labCases.length > 0 ? labCases.map((labCase) => (
                  <div key={labCase.id} className="flex items-start justify-between p-4 bg-white rounded-2xl border border-slate-200 border-l-4 border-l-violet-400">
                    <div><p className="text-sm font-bold text-slate-900">{labCase.case_number}</p><p className="text-sm text-slate-600 mt-0.5">{labCase.description}</p><p className="text-xs text-slate-500 mt-0.5">{formatDateSA(labCase.date)}</p></div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{labCase.status}</span>
                      <Button onClick={() => deleteLabCase(labCase.id)} variant="outline" size="sm" className="border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                )) : <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">No lab cases linked</div>}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                <CardTitle className="text-base">Communications</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold text-blue-900">Record Message</h3>
                  <select value={messageFormData.message_type} onChange={(e) => setMessageFormData({...messageFormData, message_type: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                    <option value="">Select Type</option>
                    {PATIENT_MESSAGE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type === 'whatsapp' ? 'WhatsApp' : type === 'social' ? 'Social Media' : type.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <textarea placeholder="Message Content" value={messageFormData.content} onChange={(e) => setMessageFormData({...messageFormData, content: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" rows={3}></textarea>
                  <Button onClick={addMessage} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 w-full shadow-md">
                    <Plus className="w-4 h-4 mr-2" />Record Message
                  </Button>
                </div>
                <div className="space-y-2">
                  {messages.length > 0 ? messages.map((msg) => (
                    <div key={msg.id} className="flex items-start justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors">
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{msg.message_type} · {formatDateSA(msg.timestamp)}</p>
                        <p className="text-sm text-slate-700 mt-1">{msg.content}</p>
                      </div>
                      <Button onClick={() => deleteMessage(msg.id)} variant="outline" size="sm" className="ml-3 flex-shrink-0 border-slate-200 hover:border-red-200 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )) : <p className="text-center text-slate-400 text-sm py-10">No messages recorded</p>}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

// Patient detail page - comprehensive patient management interface
export default function PatientDetailPage() {
  return <PatientDetailContent />;
}

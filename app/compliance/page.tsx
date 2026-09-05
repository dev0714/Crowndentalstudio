'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateSA } from '@/lib/sa-formatting';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginationFooter } from '@/components/pagination-footer';
import { describeRange, sliceForPage } from '@/lib/pagination';

type ComplianceSummary = {
  communication_consents: number;
  signed_consents: number;
  documents: number;
  with_documents: number;
  guardian_signed: number;
  patient_signed: number;
  popia_confirmed: number;
};

type CommunicationConsent = {
  id: string;
  patient_id: string;
  patient_name: string;
  whatsapp_consent: boolean;
  call_recording_consent: boolean;
  popia_consent: boolean;
  email_consent: boolean;
  sms_consent: boolean;
  marketing_consent: boolean;
  consent_date: string;
  updated_at: string;
};

type SignedConsent = {
  id: string;
  patient_id: string;
  patient_name: string;
  consent_type: string;
  consent_document: string | null;
  signed_date: string;
  signed_by_patient: boolean;
  signed_by_guardian: boolean;
  guardian_name: string;
  notes: string;
};

type PatientDocument = {
  id: string;
  patient_id: string;
  patient_name: string;
  document_type: string;
  title: string;
  status: string;
  signed_at: string;
  signed_by_patient: boolean;
  signed_by_guardian: boolean;
  signature_name: string;
  created_at: string;
  content: string;
  metadata: Record<string, unknown>;
};

function CompliancePageContent() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [communicationConsents, setCommunicationConsents] = useState<CommunicationConsent[]>([]);
  const [signedConsents, setSignedConsents] = useState<SignedConsent[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'signed' | 'documents'>('dashboard');
  const [pageState, setPageState] = useState<Record<string, { page: number; size: number }>>({});
  const pagingFor = (key: string) => pageState[key] || { page: 1, size: 10 };
  const setPageFor = (key: string, page: number) => setPageState((current) => ({ ...current, [key]: { ...pagingFor(key), page } }));
  const setSizeFor = (key: string, size: number) => setPageState((current) => ({ ...current, [key]: { page: 1, size } }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const response = await fetch('/api/crm/compliance', {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load compliance data');
        }

        setSummary(payload.data?.summary || null);
        setCommunicationConsents(payload.data?.communicationConsents || []);
        setSignedConsents(payload.data?.signedConsents || []);
        setDocuments(payload.data?.documents || []);
      } catch (err) {
        console.error('[v0] Error fetching compliance data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load compliance data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, []);

  const chipClass = (value: boolean) =>
    value ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500';

  const paged = <T,>(key: string, rows: T[]) => {
    const { page, size } = pagingFor(key);
    const { pageCount } = describeRange(page, size, rows.length);
    return sliceForPage<T>(rows, Math.min(page, pageCount), size);
  };
  const pagedMatrix = paged('matrix', communicationConsents);
  const pagedSigned = paged('signed', signedConsents);
  const pagedDocuments = paged('documents', documents);
  const footer = (key: string, count: number, noun: string) => {
    const { page, size } = pagingFor(key);
    const { pageCount } = describeRange(page, size, count);
    return (
      <PaginationFooter
        page={Math.min(page, pageCount)}
        pageSize={size}
        count={count}
        onPageChange={(next) => setPageFor(key, next)}
        onPageSizeChange={(next) => setSizeFor(key, next)}
        noun={noun}
        className="-mx-6 -mb-6 mt-3"
      />
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Compliance Vault</h1>
            <p className="text-slate-500 text-sm mt-0.5">Review communication consent and signed compliance records</p>
          </div>
          <Button asChild className="bg-navy-800 hover:bg-ink border-0 shadow-md text-xs">
            <Link href="/patients">Open Patients</Link>
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="h-auto flex-wrap justify-start bg-white border border-slate-200 rounded-full p-1 gap-0.5 mb-3">
            <TabsTrigger value="dashboard" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Dashboard
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : ''}</span>
            </TabsTrigger>
            <TabsTrigger value="matrix" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Consent matrix
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : communicationConsents.length}</span>
            </TabsTrigger>
            <TabsTrigger value="signed" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Signed consents
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : signedConsents.length}</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Document vault
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : documents.length}</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="dashboard" className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Communication Consents', value: summary?.communication_consents ?? 0, gradient: 'from-navy-800 to-ink' },
            { label: 'Signed Consents', value: summary?.signed_consents ?? 0, gradient: 'from-[#3f4c7a] to-[#2c365c]' },
            { label: 'Vault Documents', value: summary?.documents ?? 0, gradient: 'from-teal to-[#0b6f71]' },
            { label: 'Documents Attached', value: summary?.with_documents ?? 0, gradient: 'from-[#b8742e] to-[#8f5a22]' },
          ].map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
              <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
              <p className="text-xs font-semibold opacity-75">{card.label}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        <OperationsRiskStrip variant="compliance" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Patient Signed', value: summary?.patient_signed ?? 0, gradient: 'from-teal to-[#0b6f71]' },
            { label: 'Guardian Signed', value: summary?.guardian_signed ?? 0, gradient: 'from-[#3f4c7a] to-[#2c365c]' },
            { label: 'POPIA Confirmed', value: summary?.popia_confirmed ?? 0, gradient: 'from-[#b8742e] to-[#8f5a22]' },
          ].map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
              <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
              <p className="text-xs font-semibold opacity-75">{card.label}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        </TabsContent>

        <TabsContent value="matrix">
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Communication Consent Matrix</CardTitle>
            <CardDescription className="text-xs">Latest communication consent snapshot by patient</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-600 py-8 text-center">Loading communication consents...</p>
            ) : communicationConsents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="border-b-2 border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">POPIA</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">WhatsApp</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">SMS</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Marketing</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Call Recording</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedMatrix.map((row) => (
                      <tr key={row.id} className="border-b border-slate-200">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <Link href={`/patients/${row.patient_id}`} className="hover:underline">
                            {row.patient_name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatDateSA(row.consent_date)}</td>
                        {[
                          row.popia_consent,
                          row.whatsapp_consent,
                          row.sms_consent,
                          row.email_consent,
                          row.marketing_consent,
                          row.call_recording_consent,
                        ].map((value, index) => (
                          <td key={`${row.id}-${index}`} className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${chipClass(value)}`}>
                              {value ? 'Yes' : 'No'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-600 py-8 text-center">No communication consents recorded</p>
            )}
            {!loading && communicationConsents.length > 0 && footer('matrix', communicationConsents.length, 'patients')}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="signed">
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Signed Consent Records</CardTitle>
            <CardDescription className="text-xs">Procedure and treatment consent documents</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-600 py-8 text-center">Loading signed consents...</p>
            ) : signedConsents.length > 0 ? (
              <div className="space-y-3">
                {pagedSigned.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          <Link href={`/patients/${row.patient_id}`} className="hover:underline">
                            {row.patient_name}
                          </Link>
                        </p>
                        <p className="text-sm text-slate-600 capitalize">{row.consent_type.replace('_', ' ')}</p>
                        <p className="text-sm text-slate-500 mt-1">{formatDateSA(row.signed_date)}</p>
                        {row.guardian_name && <p className="text-sm text-slate-500">Guardian: {row.guardian_name}</p>}
                        {row.notes && <p className="text-sm text-slate-500 mt-2">{row.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${chipClass(Boolean(row.consent_document))}`}>
                          {row.consent_document ? 'Document Attached' : 'No Document'}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${chipClass(row.signed_by_patient)}`}>
                          Patient Signed
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${chipClass(row.signed_by_guardian)}`}>
                          Guardian Signed
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 py-8 text-center">No signed consent records found</p>
            )}
            {!loading && signedConsents.length > 0 && footer('signed', signedConsents.length, 'records')}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="documents">
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Document Vault</CardTitle>
            <CardDescription className="text-xs">Generated treatment plans, referral letters, certificates, and consent drafts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-600 py-8 text-center">Loading document vault...</p>
            ) : documents.length > 0 ? (
              <div className="space-y-3">
                {pagedDocuments.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{row.title}</p>
                        <p className="text-sm text-slate-600 capitalize">{row.document_type.replace('_', ' ')}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          <Link href={`/patients/${row.patient_id}`} className="hover:underline">
                            {row.patient_name}
                          </Link>
                        </p>
                        <p className="text-sm text-slate-500 mt-1">{formatDateSA(row.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${chipClass(row.status === 'signed')}`}>
                          {row.status}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${chipClass(row.signed_by_patient)}`}>
                          Patient Signed
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{row.content.slice(0, 400)}{row.content.length > 400 ? '...' : ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 py-8 text-center">No generated documents yet</p>
            )}
            {!loading && documents.length > 0 && footer('documents', documents.length, 'documents')}
          </CardContent>
        </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function CompliancePage() {
  return (
    <DashboardLayout>
      <CompliancePageContent />
    </DashboardLayout>
  );
}

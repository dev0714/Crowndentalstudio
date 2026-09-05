import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { supabaseServer } from '@/lib/supabase/server';
import { buildRecallQueue } from '@/lib/recalls/recall-queue';
import { buildWorkCalendar, toDateKey } from '@/lib/dashboard/work-calendar';
import type { LabWorkflowCase } from '@/lib/lab/lab-workflow';

export const runtime = 'nodejs';

/** Real numbers for the dashboard cards plus every dated piece of work for the calendar. */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [patientsResult, appointmentsResult, labCasesResult, invoicesResult, treatmentPlansResult, proceduresResult] = await Promise.all([
      supabaseServer.from('patients').select('id, first_name, last_name, created_at, status'),
      supabaseServer.from('appointments').select('id, patient_id, appointment_date, appointment_type, status, duration_minutes'),
      supabaseServer.from('lab_cases').select('*'),
      supabaseServer.from('invoices').select('id, patient_id, invoice_number, invoice_date, due_date, status, total_amount, paid_amount'),
      supabaseServer.from('treatment_plans').select('id, patient_id, plan_name, description, accepted, accepted_date, issued_date'),
      supabaseServer.from('patient_procedures').select('id, patient_id, procedure_name, status, procedure_date, created_at'),
    ]);

    const firstError = [patientsResult, appointmentsResult, labCasesResult, invoicesResult, treatmentPlansResult, proceduresResult]
      .map((result) => result.error)
      .find(Boolean);
    if (firstError) throw firstError;

    const patients = patientsResult.data || [];
    const appointments = appointmentsResult.data || [];
    const labCases = (labCasesResult.data || []) as LabWorkflowCase[];
    const invoices = invoicesResult.data || [];
    const patientNames: Record<string, string> = Object.fromEntries(
      patients.map((patient) => [patient.id, `${patient.first_name || ''} ${patient.last_name || ''}`.trim()]),
    );

    const now = new Date();
    const today = toDateKey(now.toISOString());
    const monthStart = today.slice(0, 7);

    const recallQueue = buildRecallQueue(
      patients.map((patient) => ({ id: patient.id, first_name: patient.first_name || '', last_name: patient.last_name || '', created_at: patient.created_at })),
      appointments.map((appointment) => ({ id: appointment.id, patient_id: appointment.patient_id, appointment_date: appointment.appointment_date, status: appointment.status || '' })),
      treatmentPlansResult.data || [],
      proceduresResult.data || [],
      labCases.map((labCase) => ({ ...labCase, id: labCase.id, patient_id: labCase.patient_id })),
      now.toISOString(),
    );

    const calendar = buildWorkCalendar(
      {
        appointments,
        labCases: labCases.map((labCase) => ({ ...labCase, patient_name: patientNames[labCase.patient_id] || undefined })),
        invoices,
        recallItems: recallQueue.items,
        patientNames,
      },
      today,
    );

    const activePatients = patients.filter((patient) => (patient.status || 'Active').toLowerCase() === 'active');
    const outstandingBalance = invoices.reduce((sum, invoice) => {
      const status = (invoice.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'draft') return sum;
      return sum + Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
    }, 0);

    const summary = {
      totalPatients: activePatients.length,
      newPatientsThisMonth: activePatients.filter((patient) => toDateKey(patient.created_at).startsWith(monthStart)).length,
      appointmentsToday: calendar.today.filter((item) => item.kind === 'appointment').length,
      appointmentsUpcoming: calendar.items.filter((item) => item.kind === 'appointment' && item.status === 'upcoming').length,
      outstandingBalance,
      overdueInvoices: calendar.outstanding.filter((item) => item.kind === 'invoice').length,
      openLabCases: calendar.counts.lab,
      overdueLabCases: calendar.outstanding.filter((item) => item.kind === 'lab').length,
    };

    return NextResponse.json({ data: { today, summary, calendar } });
  } catch (error) {
    console.error('Error building dashboard:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}

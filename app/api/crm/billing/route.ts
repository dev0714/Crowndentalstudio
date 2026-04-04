import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';
import {
  buildBankStatementMatches,
  buildDebtBuckets,
  buildPaymentReminderSchedule,
  buildSpecialInvoiceDraft,
} from '@/lib/billing/billing-ledger';

function isMissingRelationError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || Boolean(error.message?.includes('does not exist'));
}

async function loadBillingData() {
  const [
    invoicesResult,
    patientsResult,
    statementLinesResult,
    remindersResult,
  ] = await Promise.all([
    supabaseServer.from('invoices').select('id, invoice_number, patient_id, invoice_date, due_date, total_amount, paid_amount, status').order('invoice_date', { ascending: false }).limit(1000),
    supabaseServer.from('patients').select('id, first_name, last_name'),
    supabaseServer
      .from('bank_statement_lines')
      .select('id, statement_date, description, reference, amount, direction, bank_account, matched_invoice_id, matched_invoice_number, match_confidence, match_reason, matched_at, raw_payload, notes, imported_by, created_at, updated_at')
      .order('statement_date', { ascending: false })
      .limit(500),
    supabaseServer
      .from('payment_reminders')
      .select('id, invoice_id, patient_id, reminder_day, reminder_type, status, scheduled_for, sent_at, notes, created_by, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (invoicesResult.error) throw invoicesResult.error;
  if (patientsResult.error) throw patientsResult.error;

  const statementLines = statementLinesResult.error && isMissingRelationError(statementLinesResult.error) ? [] : statementLinesResult.data || [];
  const reminders = remindersResult.error && isMissingRelationError(remindersResult.error) ? [] : remindersResult.data || [];

  if (statementLinesResult.error && !isMissingRelationError(statementLinesResult.error)) {
    throw statementLinesResult.error;
  }
  if (remindersResult.error && !isMissingRelationError(remindersResult.error)) {
    throw remindersResult.error;
  }

  const patientNameMap = Object.fromEntries(
    (patientsResult.data || []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]),
  );

  const invoices = (invoicesResult.data || []).map((invoice) => ({
    ...invoice,
    patient_name: patientNameMap[invoice.patient_id] || '',
  }));

  const matches = buildBankStatementMatches(statementLines, invoices);
  const debtBuckets = buildDebtBuckets(invoices);
  const reminderSchedule = buildPaymentReminderSchedule(invoices, reminders);

  return {
    invoices,
    statementLines: matches,
    reminders,
    debtBuckets,
    reminderSchedule,
  };
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await loadBillingData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim();

    if (action === 'import_statement_line') {
      const statementDate = String(body.statement_date || new Date().toISOString().slice(0, 10));
      const description = String(body.description || '').trim();
      const reference = String(body.reference || '').trim();
      const amount = Number(body.amount || 0);
      const bankAccount = String(body.bank_account || '').trim();
      if (!description) {
        return NextResponse.json({ error: 'Description is required' }, { status: 400 });
      }

      const current = await loadBillingData();
      const draft = buildBankStatementMatches(
        [
          {
            id: `line-${Date.now()}`,
            statement_date: statementDate,
            description,
            reference,
            amount,
            bank_account: bankAccount || null,
            direction: 'credit',
          },
        ],
        current.invoices,
      )[0];

      let insertedLine = {
        id: `line-${Date.now()}`,
        statement_date: statementDate,
        description,
        reference: reference || null,
        amount,
        direction: 'credit',
        bank_account: bankAccount || null,
        matched_invoice_id: draft.matched_invoice_id,
        matched_invoice_number: draft.matched_invoice_number,
        match_confidence: draft.match_confidence,
        match_reason: draft.match_reason,
        matched_at: draft.matched_invoice_id ? new Date().toISOString() : null,
        raw_payload: {
          description,
          reference,
          amount,
          bank_account: bankAccount || null,
        },
        notes: body.notes || null,
        imported_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: bankLineData, error: bankLineError } = await supabaseServer.from('bank_statement_lines').insert([insertedLine]).select();
      if (bankLineError && isMissingRelationError(bankLineError)) {
        bankLineData?.[0];
      } else if (bankLineError) {
        throw bankLineError;
      } else {
        insertedLine = bankLineData?.[0] || insertedLine;
      }

      if (draft.matched_invoice_id) {
        const invoice = current.invoices.find((entry) => entry.id === draft.matched_invoice_id);
        if (invoice) {
          const nextPaidAmount = Math.min(Number(invoice.total_amount || 0), Number(invoice.paid_amount || 0) + amount);
          const nextStatus = nextPaidAmount >= Number(invoice.total_amount || 0)
            ? 'Paid'
            : nextPaidAmount > 0
              ? 'Partially Paid'
              : invoice.status || 'Issued';

          await supabaseServer.from('patient_payments').insert([
            {
              patient_id: invoice.patient_id,
              amount,
              payment_date: statementDate,
              payment_method: 'Bank transfer',
              notes: `Matched bank statement import: ${description}`,
              created_by: user.id,
            },
          ]);

          await supabaseServer
            .from('invoices')
            .update({
              paid_amount: nextPaidAmount,
              status: nextStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);
        }
      }

      await writeAuditEntry({
        actor: user,
        action: 'billing.bank_statement_imported',
        entityType: 'bank_statement_line',
        entityId: insertedLine.id,
        metadata: {
          matched_invoice_id: insertedLine.matched_invoice_id || null,
          amount,
          description,
        },
      });

      return NextResponse.json({ data: insertedLine }, { status: 201 });
    }

    if (action === 'log_reminder') {
      const invoiceId = String(body.invoice_id || '').trim();
      const patientId = String(body.patient_id || '').trim();
      const reminderDay = Number(body.reminder_day || 0);
      const reminderType = String(body.reminder_type || 'payment');
      const notes = String(body.notes || '').trim();

      if (!invoiceId || !patientId || ![1, 3, 7, 14, 21].includes(reminderDay)) {
        return NextResponse.json({ error: 'Invoice, patient, and valid reminder day are required' }, { status: 400 });
      }

      const payload = {
        invoice_id: invoiceId,
        patient_id: patientId,
        reminder_day: reminderDay,
        reminder_type: reminderType,
        status: String(body.status || 'sent'),
        scheduled_for: body.scheduled_for || null,
        sent_at: body.sent_at || new Date().toISOString(),
        notes: notes || null,
        created_by: user.id,
      };

      const { data, error } = await supabaseServer.from('payment_reminders').insert([payload]).select();
      if (error && isMissingRelationError(error)) {
        return NextResponse.json({
          data: [
            {
              id: `reminder-${Date.now()}`,
              ...payload,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          warning: 'Reminder stored in fallback mode because payment_reminders table is missing',
        }, { status: 201 });
      }
      if (error) throw error;

      await writeAuditEntry({
        actor: user,
        action: 'billing.reminder_logged',
        entityType: 'payment_reminder',
        entityId: data?.[0]?.id,
        metadata: { invoice_id: invoiceId, reminder_day: reminderDay, reminder_type: reminderType },
      });

      return NextResponse.json({ data: data?.[0] }, { status: 201 });
    }

    if (action === 'create_special_invoice') {
      const kind = String(body.kind || 'deposit') as 'deposit' | 'cancellation_fee';
      const patientId = String(body.patient_id || '').trim();
      const patientName = String(body.patient_name || '').trim();
      const amount = Number(body.amount || 0);
      const description = String(body.description || '').trim();
      if (!patientId || !patientName || !amount || !description) {
        return NextResponse.json({ error: 'Patient, amount, and description are required' }, { status: 400 });
      }

      const draft = buildSpecialInvoiceDraft({
        kind,
        patient_id: patientId,
        patient_name: patientName,
        amount,
        description,
        due_date: body.due_date || null,
      });

      const { data: invoiceData, error: invoiceError } = await supabaseServer.from('invoices').insert([
        {
          invoice_number: draft.invoice_number,
          patient_id: patientId,
          invoice_date: draft.invoice_date,
          due_date: draft.due_date,
          subtotal: draft.subtotal,
          discount: draft.discount,
          tax: draft.tax,
          total_amount: draft.total_amount,
          paid_amount: draft.paid_amount,
          status: draft.status,
          medical_aid_claim: draft.medical_aid_claim,
          notes: kind === 'deposit' ? 'Deposit invoice' : 'Cancellation fee invoice',
          created_by: user.id,
        },
      ]).select();
      if (invoiceError) throw invoiceError;

      const invoice = invoiceData?.[0];
      await supabaseServer.from('invoice_items').insert(
        draft.items.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        })),
      );

      await writeAuditEntry({
        actor: user,
        action: kind === 'deposit' ? 'invoice.deposit_created' : 'invoice.cancellation_fee_created',
        entityType: 'invoice',
        entityId: invoice.id,
        metadata: { patient_id: patientId, patient_name: patientName, amount, description },
      });

      return NextResponse.json({ data: invoice }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown billing action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating billing data:', error);
    return NextResponse.json({ error: 'Failed to update billing data' }, { status: 500 });
  }
}

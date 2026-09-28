import { PRACTICE_OWN_ADDRESSES, type EmailGroupKey, type GroupableEmail } from '@/lib/email/email-grouping';

export type ImportanceVerdict = { important: boolean; reason: string };

// Anything from these senders is automated and rarely needs a person.
const AUTOMATED_SENDER = /(noreply|no-reply|donotreply|do-not-reply|newsletter|mailer|marketing|notifications?|bounce|mailer-daemon|postmaster)@/i;
const PROMO_SUBJECT = /\b(unsubscribe|newsletter|webinar|promo(tion)?|% off|sale ends|special offer|top pick|last chance|black friday|discount code|free trial|renewal notice|your (weekly|monthly) (digest|update|report)|new sign-in|password reset|verify your email|security alert)\b/i;
const URGENT_SUBJECT = /\b(urgent|asap|overdue|final notice|reminder|action required|payment (due|failed)|outstanding|invoice|statement|quote|quotation|claim|authori[sz]ation|pre-?auth|refund)\b/i;
const CLINICAL_SUBJECT = /\b(patient|appointment|booking|cancel|reschedul|referral|x-?ray|radiograph|lab|crown|bridge|denture|implant|impression|shade|emergency|pain|toothache)\b/i;
const IMPORTANT_GROUPS = new Set<EmailGroupKey>(['lab', 'appointments', 'accounts', 'patient_enquiries']);

/**
 * Decides whether a staff member needs to read this email. Rule based and
 * deliberately conservative: real people about clinical, lab or money matters
 * are important; automated notifications, promotions and digests are not.
 */
export function classifyImportance(email: GroupableEmail, group: EmailGroupKey): ImportanceVerdict {
  const subject = email.subject || '';
  const sender = email.fromEmail || '';
  const automated = AUTOMATED_SENDER.test(sender);

  if (group === 'patient_enquiries') {
    return { important: true, reason: 'Patient enquiry: reply promptly' };
  }
  if (PRACTICE_OWN_ADDRESSES.test(sender.trim())) {
    return { important: true, reason: 'From practice staff' };
  }
  if (/(^|\.)leadsync\.co\.za$/i.test(sender.split('@')[1] || '')) {
    return /support ticket|outstanding items/i.test(subject)
      ? { important: true, reason: 'CRM vendor: support ticket or outstanding items' }
      : { important: false, reason: 'CRM vendor notification' };
  }
  if (group === 'personal') {
    return { important: false, reason: 'Personal, social or travel mail' };
  }
  if (group === 'marketing') {
    return { important: false, reason: 'Marketing or automated notification' };
  }
  if (group === 'accounts' && /(investec|nedbank|standardbank|absa|fnb|capitec|paypal|ikhokha|yoco|payfast|mediswitch|e-md|discovery|healthbridge|momentum|bonitas)\./i.test(sender)) {
    return { important: true, reason: /statement|remittance|report/i.test(subject) ? 'Bank or medical aid statement' : 'Bank or medical aid notice' };
  }
  if (PROMO_SUBJECT.test(subject)) {
    return { important: false, reason: 'Promotional or system notice' };
  }
  if (URGENT_SUBJECT.test(subject)) {
    return { important: true, reason: automated ? 'Automated but about money or a deadline' : 'Money, deadline or action needed' };
  }
  if (CLINICAL_SUBJECT.test(subject) && !automated) {
    return { important: true, reason: 'Patient, appointment or lab matter' };
  }
  if (IMPORTANT_GROUPS.has(group) && !automated) {
    return { important: true, reason: `Filed under ${group.replace('_', ' ')} from a person` };
  }
  if (group === 'suppliers' && !automated) {
    return { important: true, reason: 'Supplier correspondence' };
  }
  return { important: false, reason: automated ? 'Automated sender' : 'General correspondence' };
}

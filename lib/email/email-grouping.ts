export type EmailGroupKey =
  | 'appointments'
  | 'lab'
  | 'accounts'
  | 'suppliers'
  | 'patient_enquiries'
  | 'marketing'
  | 'other';

export type GroupableEmail = {
  uid: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
};

export type GroupedEmail = GroupableEmail & { group: EmailGroupKey };

export type EmailGroupSummary = {
  key: EmailGroupKey;
  label: string;
  count: number;
  emails: GroupedEmail[];
};

export const EMAIL_GROUP_LABELS: Record<EmailGroupKey, string> = {
  appointments: 'Appointments',
  lab: 'Lab',
  accounts: 'Accounts & Billing',
  suppliers: 'Suppliers',
  patient_enquiries: 'Patient enquiries',
  marketing: 'Marketing & Notifications',
  other: 'Other',
};

// Ordered so the most specific/important categories win first.
const GROUP_ORDER: EmailGroupKey[] = [
  'lab',
  'appointments',
  'accounts',
  'suppliers',
  'marketing',
  'patient_enquiries',
  'other',
];

const KEYWORDS: Record<Exclude<EmailGroupKey, 'other'>, RegExp> = {
  lab: /\b(lab|crown|bridge|denture|impression|shade|prosthe|technician|milling|zirconia)\b/i,
  appointments: /\b(appointment|booking|schedule|reschedul|reminder|confirm(ed|ation)?|cancel(led|lation)?|visit)\b/i,
  accounts: /\b(invoice|statement|payment|account|billing|quote|quotation|receipt|paid|outstanding|medical aid|claim|refund)\b/i,
  suppliers: /\b(order|delivery|dispatch|shipment|stock|supply|supplier|purchase|consignment|backorder)\b/i,
  marketing: /\b(newsletter|unsubscribe|promotion|offer|sale|webinar|noreply|no-reply|notification|digest)\b/i,
  patient_enquiries: /\b(enquiry|inquiry|question|query|help|pain|toothache|emergency|new patient|referral)\b/i,
};

const MARKETING_SENDERS = /(noreply|no-reply|donotreply|do-not-reply|newsletter|mailer|marketing|notifications?)@/i;

export function classifyEmail(email: GroupableEmail): EmailGroupKey {
  const haystack = `${email.subject} ${email.from} ${email.fromEmail}`;

  if (MARKETING_SENDERS.test(email.fromEmail)) {
    // A sender that is clearly automated is marketing/notification unless it is
    // plainly about a lab case, appointment or account.
    if (!KEYWORDS.lab.test(haystack) && !KEYWORDS.appointments.test(haystack) && !KEYWORDS.accounts.test(haystack)) {
      return 'marketing';
    }
  }

  for (const key of GROUP_ORDER) {
    if (key === 'other') continue;
    if (KEYWORDS[key].test(haystack)) {
      return key;
    }
  }

  return 'other';
}

export function groupEmails(emails: GroupableEmail[]): EmailGroupSummary[] {
  const grouped: GroupedEmail[] = emails.map((email) => ({ ...email, group: classifyEmail(email) }));

  return GROUP_ORDER.map((key) => {
    const groupEmailsList = grouped.filter((email) => email.group === key);
    return {
      key,
      label: EMAIL_GROUP_LABELS[key],
      count: groupEmailsList.length,
      emails: groupEmailsList,
    };
  }).filter((group) => group.count > 0);
}

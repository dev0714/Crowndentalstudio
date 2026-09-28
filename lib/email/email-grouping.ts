export type EmailGroupKey =
  | 'appointments'
  | 'lab'
  | 'accounts'
  | 'suppliers'
  | 'patient_enquiries'
  | 'marketing'
  | 'personal'
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
  personal: 'Personal & travel',
  other: 'Other',
};

export const EMAIL_GROUP_ORDER: EmailGroupKey[] = [
  'lab',
  'appointments',
  'accounts',
  'patient_enquiries',
  'suppliers',
  'marketing',
  'personal',
  'other',
];

/**
 * Senders we recognise by domain. Checked before any keyword, because the
 * organisation tells you far more than a word in the subject line.
 * Matching is on the end of the sender domain, so sub-domains count.
 */
const DOMAIN_RULES: Array<{ match: RegExp; group: EmailGroupKey }> = [
  // Banks, cards, payment providers and medical aid switches: money the practice must watch.
  { match: /(^|\.)(investec\.(co\.za|com)|nedbank\.co\.za|standardbank\.co\.za|absa\.(africa|co\.za)|fnb\.co\.za|capitec\.co\.za|paypal\.com|ikhokha\.com|yoco\.com|payfast\.co\.za|dinersclub\.co\.za|amex\.co\.za)$/i, group: 'accounts' },
  { match: /(^|\.)(mediswitch\.co\.za|e-md\.co\.za|discovery\.co\.za|momentum\.co\.za|bonitas\.co\.za|gems\.gov\.za|medihelp\.co\.za|bestmed\.co\.za|fedhealth\.co\.za|healthbridge\.co\.za)$/i, group: 'accounts' },
  // Dental suppliers and labs.
  { match: /(^|\.)(kzndental\.co\.za|wright-millners\.co\.za|dentiphoto\.com|henryschein\.(co\.za|com)|dentsply\.com|ivoclar\.com|3m\.com|colgateprofessional\.com|dentalwarehouse\.co\.za)$/i, group: 'suppliers' },
  { match: /(ridge(dental|lab)|dentallab|\.lab\.|prolab|dentaltech)/i, group: 'lab' },
  // Professional bodies and dental events: read at leisure.
  { match: /(^|\.)(sada\.co\.za|hpcsa\.co\.za|cappmea\.com|dentalexpo|aacd\.com)$/i, group: 'marketing' },
  // Personal life and travel that lands in the same inbox.
  { match: /(^|\.)(linkedin\.com|facebook(mail)?\.com|instagram\.com|tiktok\.com|x\.com|twitter\.com|youtube\.com|whatsapp\.com)$/i, group: 'personal' },
  { match: /(^|\.)(uber\.com|bolt\.eu|booking\.com|airbnb\.com|skyscanner\.(com|net)|qatarairways\.com|flysaa\.com|kulula\.com|flysafair\.co\.za|emirates\.com|travelstart\.co\.za|netflorist\.co\.za|takealot\.com|bobshop\.co\.za|builders\.co\.za|checkers\.co\.za|woolworths\.co\.za|makro\.co\.za|spotify\.com|netflix\.com|dstv\.com|showmax\.com|strava\.com|garmin\.com)$/i, group: 'personal' },
  // Newsletters and software vendors.
  { match: /(^|\.)(media24\.com|news24\.com|beehiiv\.com|substack\.com|ghostmail\.co\.za|mailchimp|constantcontact|grammarly\.com|adobe\.com|dropbox(mail)?\.com|canva\.com|notion\.so|zoom\.us|godaddy\.com|hostking\.co\.za|registry\.net\.za|alibaba\.com|aliexpress\.com|amazon\.(com|co\.za)|microsoft\.com|google\.com|apple\.com|reptyle\.com|founditgulf\.com)$/i, group: 'marketing' },
];

const KEYWORDS: Record<Exclude<EmailGroupKey, 'other' | 'personal'>, RegExp> = {
  lab: /\b(lab case|lab slip|dental lab|laboratory|crown|bridge|denture|veneer|implant abutment|impression|shade|prosthe|technician|milling|zirconia|try-?in|bite block)\b/i,
  appointments: /\b(appointment|dental visit|reschedul|check-?up|consult(ation)? (booked|request)|book(ing)? (request|an appointment))\b/i,
  accounts: /\b(invoice|statement|payment|remittance|billing|quote|quotation|receipt|outstanding|arrears|overdue|medical aid|claim|refund|debit order|tax|sars|vat)\b/i,
  suppliers: /\b(order (no|number|confirmation|update|has)|dispatch(ed)?|deliver(y|ed)|shipment|back-?order|consignment|purchase order|stock|supply|supplier)\b/i,
  marketing: /\b(newsletter|unsubscribe|promotion|promo|% off|offer|sale|webinar|digest|survey|congratulations|celebrate|birthday|invite|new sign-in|password|verify|security (alert|update)|renewal|expiring|your (weekly|monthly|daily))\b/i,
  patient_enquiries: /\b(enquiry|inquiry|question about|query|toothache|tooth pain|emergency|new patient|referral|second opinion|price of|cost of|do you (do|offer|accept))\b/i,
};

const AUTOMATED_SENDER = /(noreply|no-reply|donotreply|do-not-reply|newsletter|mailer|marketing|notifications?|alerts?|bounce|mailer-daemon|postmaster|info@e\.|@e\.|@mail\.|@email\.|@sender\.|@go\.|@sales\.|@loyalty\.)/i;

function senderDomain(fromEmail: string) {
  return (fromEmail.split('@')[1] || '').toLowerCase();
}

export function classifyEmail(email: GroupableEmail): EmailGroupKey {
  const domain = senderDomain(email.fromEmail);
  const haystack = `${email.subject} ${email.from}`;

  for (const rule of DOMAIN_RULES) {
    if (rule.match.test(domain)) {
      // A supplier's promo is still marketing; a supplier's invoice is still supplier business.
      if (rule.group === 'suppliers' && KEYWORDS.marketing.test(email.subject) && !KEYWORDS.accounts.test(email.subject)) return 'marketing';
      return rule.group;
    }
  }

  const automated = AUTOMATED_SENDER.test(email.fromEmail);

  if (KEYWORDS.lab.test(haystack)) return 'lab';
  if (KEYWORDS.accounts.test(haystack)) return 'accounts';
  if (KEYWORDS.appointments.test(haystack) && !automated) return 'appointments';
  if (KEYWORDS.patient_enquiries.test(haystack) && !automated) return 'patient_enquiries';
  if (KEYWORDS.suppliers.test(haystack)) return 'suppliers';
  if (automated || KEYWORDS.marketing.test(haystack)) return 'marketing';
  return 'other';
}

export function groupEmails(emails: GroupableEmail[]): EmailGroupSummary[] {
  const grouped: GroupedEmail[] = emails.map((email) => ({ ...email, group: classifyEmail(email) }));

  return EMAIL_GROUP_ORDER.map((key) => {
    const groupEmailsList = grouped.filter((email) => email.group === key);
    return {
      key,
      label: EMAIL_GROUP_LABELS[key],
      count: groupEmailsList.length,
      emails: groupEmailsList,
    };
  }).filter((group) => group.count > 0);
}

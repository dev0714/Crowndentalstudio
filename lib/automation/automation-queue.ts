import type {
  RecallAppointment,
  RecallKind,
  RecallPatient,
  RecallPriority,
  RecallQueueItem,
} from '@/lib/recalls/recall-queue';

export type AutomationPriority = RecallPriority;
export type AutomationKind =
  | RecallKind
  | 'lab-follow-up'
  | 'appointment-confirmation'
  | 'missing-popia-consent'
  | 'missing-signed-consent'
  | 'outreach-gap';

export type AutomationPatient = RecallPatient & {
  status?: string | null;
};

export type AutomationAppointment = RecallAppointment & {
  appointment_type?: string | null;
};

export type AutomationCommunicationConsent = {
  id: string;
  patient_id: string;
  popia_consent?: boolean | null;
  updated_at?: string | null;
};

export type AutomationSignedConsent = {
  id: string;
  patient_id: string;
  consent_type: string;
  signed_date?: string | null;
  created_at?: string | null;
};

export type AutomationPatientContact = {
  id: string;
  patient_id: string;
  contact_type: string;
  contact_date: string;
  outcome?: string | null;
};

export type AutomationQueueItem = {
  id: string;
  kind: AutomationKind;
  patient_id: string;
  patient_name: string;
  title: string;
  reason: string;
  due_date: string;
  last_activity_date: string;
  priority: AutomationPriority;
  source: string;
  source_id: string;
  suggested_contact_type: 'call' | 'email' | 'sms' | 'whatsapp' | 'in_person';
  suggested_outcome: string;
  metadata: Record<string, unknown>;
  days_overdue: number;
};

export type AutomationQueue = {
  items: AutomationQueueItem[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    recalls: number;
    confirmations: number;
    compliance: number;
    outreach_gaps: number;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const APPOINTMENT_CONFIRMATION_WINDOW_HOURS = 48;
const OUTREACH_GAP_DAYS = 30;
const INACTIVE_APPOINTMENT_STATUSES = new Set(['cancelled', 'canceled', 'no show', 'no-show', 'no_show']);

function isActivePatient(patient: AutomationPatient) {
  const status = (patient.status || 'Active').trim().toLowerCase();
  return status === 'active';
}

function isActiveAppointment(appointment: AutomationAppointment) {
  return !INACTIVE_APPOINTMENT_STATUSES.has((appointment.status || '').trim().toLowerCase());
}

const PRIORITY_ORDER: Record<AutomationPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const KIND_ORDER: Record<AutomationKind, number> = {
  'routine-recall': 0,
  'treatment-review': 1,
  'procedure-review': 2,
  'lab-follow-up': 3,
  'missing-signed-consent': 4,
  'missing-popia-consent': 5,
  'appointment-confirmation': 6,
  'outreach-gap': 7,
};

function patientName(patient: { first_name: string; last_name: string }) {
  return `${patient.first_name} ${patient.last_name}`.trim();
}

function toTime(value: string | null | undefined) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toIso(value: string | null | undefined) {
  const timestamp = toTime(value);
  if (timestamp == null) {
    return '';
  }

  return new Date(timestamp).toISOString();
}

function daysBetween(from: string | null | undefined, toIsoValue: string) {
  const fromTime = toTime(from);
  const toTimeValue = toTime(toIsoValue);

  if (fromTime == null || toTimeValue == null) {
    return null;
  }

  return Math.floor((toTimeValue - fromTime) / DAY_MS);
}

function hoursBetween(from: string | null | undefined, toIsoValue: string) {
  const fromTime = toTime(from);
  const toTimeValue = toTime(toIsoValue);

  if (fromTime == null || toTimeValue == null) {
    return null;
  }

  return (toTimeValue - fromTime) / (60 * 60 * 1000);
}

function dedupeKey(item: Pick<AutomationQueueItem, 'patient_id' | 'kind'>) {
  return `${item.patient_id}:${item.kind}`;
}

function createItem(item: Omit<AutomationQueueItem, 'days_overdue'> & { days_overdue?: number }): AutomationQueueItem {
  return {
    days_overdue: item.days_overdue ?? 0,
    ...item,
  };
}

function recallItemToAutomationItem(item: RecallQueueItem): AutomationQueueItem {
  return createItem({
    id: item.id,
    kind: item.kind,
    patient_id: item.patient_id,
    patient_name: item.patient_name,
    title: item.kind.replace('-', ' '),
    reason: item.reason,
    due_date: toIso(item.due_date),
    last_activity_date: toIso(item.last_activity_date),
    priority: item.priority,
    source: item.source_label,
    source_id: item.source_id,
    suggested_contact_type: 'call',
    suggested_outcome: 'Reached patient',
    metadata: {
      source_kind: item.kind,
      source_label: item.source_label,
    },
    days_overdue: item.days_overdue,
  });
}

export function buildAutomationQueue(
  patients: AutomationPatient[],
  appointments: AutomationAppointment[],
  communicationConsents: AutomationCommunicationConsent[],
  signedConsents: AutomationSignedConsent[],
  patientContacts: AutomationPatientContact[],
  recallItems: RecallQueueItem[],
  nowIso = new Date().toISOString(),
): AutomationQueue {
  const items: AutomationQueueItem[] = [];
  const activePatients = patients.filter(isActivePatient);
  const patientsById = new Map(activePatients.map((patient) => [patient.id, patient]));
  const nowTime = toTime(nowIso) ?? Date.now();

  // Appointments count as touchpoints: the latest past visit, and whether the patient is already booked in.
  const lastVisitByPatientId = new Map<string, string>();
  const bookedPatientIds = new Set<string>();
  appointments.filter(isActiveAppointment).forEach((appointment) => {
    const time = toTime(appointment.appointment_date);
    if (time == null) return;
    if (time >= nowTime) {
      bookedPatientIds.add(appointment.patient_id);
      return;
    }
    const current = toTime(lastVisitByPatientId.get(appointment.patient_id));
    if (current == null || time > current) {
      lastVisitByPatientId.set(appointment.patient_id, appointment.appointment_date);
    }
  });
  const consentByPatientId = new Map(communicationConsents.map((row) => [row.patient_id, row]));
  const signedCountByPatientId = new Map<string, number>();
  const latestContactByPatientId = new Map<string, AutomationPatientContact>();

  signedConsents.forEach((row) => {
    signedCountByPatientId.set(row.patient_id, (signedCountByPatientId.get(row.patient_id) || 0) + 1);
  });

  patientContacts.forEach((row) => {
    const current = latestContactByPatientId.get(row.patient_id);
    if (!current || new Date(row.contact_date) > new Date(current.contact_date)) {
      latestContactByPatientId.set(row.patient_id, row);
    }
  });

  recallItems
    .filter((item) => patientsById.has(item.patient_id))
    .forEach((item) => {
      items.push(recallItemToAutomationItem(item));
    });

  appointments
    .filter((appointment) => appointment.status === 'Scheduled')
    .forEach((appointment) => {
      const hoursUntilAppointment = hoursBetween(nowIso, appointment.appointment_date);
      if (hoursUntilAppointment == null || hoursUntilAppointment > APPOINTMENT_CONFIRMATION_WINDOW_HOURS || hoursUntilAppointment < 0) {
        return;
      }

      const patient = patientsById.get(appointment.patient_id);
      if (!patient) {
        return;
      }

      items.push(
        createItem({
          id: `appointment:${appointment.id}`,
          kind: 'appointment-confirmation',
          patient_id: appointment.patient_id,
          patient_name: patientName(patient),
          title: 'Appointment confirmation',
          reason: `Scheduled appointment needs confirmation`,
          due_date: toIso(appointment.appointment_date),
          last_activity_date: toIso(appointment.appointment_date),
          priority: 'medium',
          source: appointment.appointment_type || 'Appointment',
          source_id: appointment.id,
          suggested_contact_type: 'call',
          suggested_outcome: 'Confirmed',
          metadata: {
            appointment_type: appointment.appointment_type || null,
          },
          days_overdue: Math.max(0, Math.ceil(hoursUntilAppointment / 24)),
        }),
      );
    });

  activePatients.forEach((patient) => {
    const patientConsent = consentByPatientId.get(patient.id);
    const signedCount = signedCountByPatientId.get(patient.id) || 0;
    const latestContact = latestContactByPatientId.get(patient.id);
    const lastVisit = lastVisitByPatientId.get(patient.id);
    // The most recent of: a logged contact, a past appointment, or the day the patient was added.
    const lastTouchDate = [latestContact?.contact_date, lastVisit, patient.created_at]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => (toTime(b) ?? 0) - (toTime(a) ?? 0))[0];
    const daysSinceTouch = daysBetween(lastTouchDate, nowIso);

    if (!patientConsent || !patientConsent.popia_consent) {
      items.push(
        createItem({
          id: `compliance:popia:${patient.id}`,
          kind: 'missing-popia-consent',
          patient_id: patient.id,
          patient_name: patientName(patient),
          title: 'POPIA consent missing',
          reason: 'Patient communication consent does not confirm POPIA consent',
          due_date: toIso(nowIso),
          last_activity_date: toIso(patientConsent?.updated_at || patient.created_at),
          priority: 'high',
          source: 'Communication consent',
          source_id: patientConsent?.id || patient.id,
          suggested_contact_type: 'call',
          suggested_outcome: 'Consent captured',
          metadata: {
            popia_consent: Boolean(patientConsent?.popia_consent),
          },
          days_overdue: 0,
        }),
      );
    }

    if (signedCount === 0) {
      items.push(
        createItem({
          id: `compliance:signed:${patient.id}`,
          kind: 'missing-signed-consent',
          patient_id: patient.id,
          patient_name: patientName(patient),
          title: 'Signed consent missing',
          reason: 'No signed consent records are recorded for this patient',
          due_date: toIso(nowIso),
          last_activity_date: toIso(patient.created_at),
          priority: 'high',
          source: 'Patient consent records',
          source_id: patient.id,
          suggested_contact_type: 'call',
          suggested_outcome: 'Consent signed',
          metadata: {
            signed_consent_count: signedCount,
          },
          days_overdue: 0,
        }),
      );
    }

    // Outreach gap: nothing has happened with this patient for 30 days and they are not booked in.
    if (!bookedPatientIds.has(patient.id) && daysSinceTouch != null && daysSinceTouch >= OUTREACH_GAP_DAYS) {
      const lastTouchLabel = latestContact && latestContact.contact_date === lastTouchDate
        ? `Last contact was a ${latestContact.contact_type.replace('_', ' ')}`
        : lastVisit === lastTouchDate
          ? 'Last touchpoint was an appointment'
          : 'No contact or appointment since the patient was added';
      items.push(
        createItem({
          id: `followup:gap:${patient.id}`,
          kind: 'outreach-gap',
          patient_id: patient.id,
          patient_name: patientName(patient),
          title: 'Outreach gap',
          reason: `${lastTouchLabel}, ${daysSinceTouch} days ago`,
          due_date: toIso(new Date((toTime(lastTouchDate) ?? nowTime) + OUTREACH_GAP_DAYS * DAY_MS).toISOString()),
          last_activity_date: toIso(lastTouchDate),
          priority: 'low',
          source: latestContact && latestContact.contact_date === lastTouchDate ? 'Patient contacts' : lastVisit === lastTouchDate ? 'Appointments' : 'Patient record',
          source_id: latestContact?.id || patient.id,
          suggested_contact_type: 'call',
          suggested_outcome: 'Reached',
          metadata: {
            last_contact_type: latestContact?.contact_type || null,
            last_touch: lastTouchDate,
          },
          days_overdue: daysSinceTouch - OUTREACH_GAP_DAYS,
        }),
      );
    }
  });

  const deduped = Array.from(
    new Map(items.map((item) => [dedupeKey(item), item])).values(),
  ).sort((a, b) => {
    const priorityDelta = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const dueDateDelta = (toTime(a.due_date) ?? 0) - (toTime(b.due_date) ?? 0);
    if (dueDateDelta !== 0) {
      return dueDateDelta;
    }

    const kindDelta = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (kindDelta !== 0) {
      return kindDelta;
    }

    return a.patient_name.localeCompare(b.patient_name);
  });

  return {
    items: deduped,
    summary: {
      total: deduped.length,
      high: deduped.filter((item) => item.priority === 'high').length,
      medium: deduped.filter((item) => item.priority === 'medium').length,
      low: deduped.filter((item) => item.priority === 'low').length,
      recalls: deduped.filter(
        (item) =>
          item.kind === 'routine-recall' ||
          item.kind === 'treatment-review' ||
          item.kind === 'procedure-review' ||
          item.kind === 'lab-follow-up',
      ).length,
      confirmations: deduped.filter((item) => item.kind === 'appointment-confirmation').length,
      compliance: deduped.filter((item) => item.kind === 'missing-popia-consent' || item.kind === 'missing-signed-consent').length,
      outreach_gaps: deduped.filter((item) => item.kind === 'outreach-gap').length,
    },
  };
}

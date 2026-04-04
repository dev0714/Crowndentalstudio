export type RecallKind = 'routine-recall' | 'treatment-review' | 'procedure-review';
export type RecallPriority = 'high' | 'medium' | 'low';

export type RecallPatient = {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
};

export type RecallAppointment = {
  id: string;
  patient_id: string;
  appointment_date: string;
  status: string;
};

export type RecallTreatmentPlan = {
  id: string;
  patient_id: string;
  plan_name: string;
  description?: string | null;
  accepted?: boolean | null;
  accepted_date?: string | null;
  issued_date?: string | null;
};

export type RecallProcedure = {
  id: string;
  patient_id: string;
  procedure_name: string;
  status: string;
  procedure_date?: string | null;
  created_at?: string | null;
};

export type RecallLabCase = {
  id: string;
  patient_id: string;
  patient_name?: string | null;
  workflow_stage?: string | null;
  patient_collected_at?: string | null;
  comeback_requested_at?: string | null;
  satisfaction_signed_at?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RecallQueueItem = {
  id: string;
  kind: RecallKind | 'lab-follow-up';
  patient_id: string;
  patient_name: string;
  source_id: string;
  source_label: string;
  due_date: string;
  last_activity_date: string;
  days_overdue: number;
  priority: RecallPriority;
  reason: string;
};

export type RecallQueue = {
  items: RecallQueueItem[];
  summary: {
    total: number;
    routine: number;
    treatment: number;
    procedures: number;
    lab: number;
    overdue: number;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ROUTINE_RECALL_DAYS = 180;
const TREATMENT_REVIEW_DAYS = 30;
const PROCEDURE_REVIEW_DAYS = 90;
const LAB_RECALL_DAYS = 3;

function patientName(patient: { first_name: string; last_name: string }) {
  return `${patient.first_name} ${patient.last_name}`.trim();
}

function toTime(value: string | null | undefined) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toDateString(value: string | null | undefined) {
  const timestamp = toTime(value);
  if (timestamp == null) {
    return '';
  }

  return new Date(timestamp).toISOString();
}

function daysBetween(from: string | null | undefined, toIso: string) {
  const fromTime = toTime(from);
  const toTimeValue = toTime(toIso);

  if (fromTime == null || toTimeValue == null) {
    return null;
  }

  return Math.floor((toTimeValue - fromTime) / DAY_MS);
}

function priorityForDays(daysOverdue: number): RecallPriority {
  if (daysOverdue >= 180) {
    return 'high';
  }

  if (daysOverdue >= 60) {
    return 'medium';
  }

  return 'low';
}

export function buildRecallQueue(
  patients: RecallPatient[],
  appointments: RecallAppointment[],
  treatmentPlans: RecallTreatmentPlan[],
  procedures: RecallProcedure[],
  labCases: RecallLabCase[] = [],
  nowIso = new Date().toISOString(),
): RecallQueue {
  const items: RecallQueueItem[] = [];
  const latestCompletedAppointments = new Map<string, RecallAppointment>();

  appointments
    .filter((appointment) => appointment.status === 'Completed')
    .forEach((appointment) => {
      const current = latestCompletedAppointments.get(appointment.patient_id);
      if (!current || new Date(appointment.appointment_date) > new Date(current.appointment_date)) {
        latestCompletedAppointments.set(appointment.patient_id, appointment);
      }
    });

  patients.forEach((patient) => {
    const completedAppointment = latestCompletedAppointments.get(patient.id);
    const referenceDate = completedAppointment?.appointment_date || patient.created_at;
    const daysOverdue = daysBetween(referenceDate, nowIso);

    if (daysOverdue != null && daysOverdue >= ROUTINE_RECALL_DAYS) {
      items.push({
        id: `routine:${patient.id}`,
        kind: 'routine-recall',
        patient_id: patient.id,
        patient_name: patientName(patient),
        source_id: completedAppointment?.id || patient.id,
        source_label: completedAppointment ? 'Completed appointment' : 'Patient record',
        due_date: toDateString(referenceDate),
        last_activity_date: toDateString(referenceDate),
        days_overdue: daysOverdue - ROUTINE_RECALL_DAYS,
        priority: priorityForDays(daysOverdue - ROUTINE_RECALL_DAYS),
        reason: completedAppointment
          ? `Routine recall due after last completed appointment`
          : `Routine recall due from patient creation date`,
      });
    }
  });

  treatmentPlans
    .filter((plan) => Boolean(plan.accepted))
    .forEach((plan) => {
      const referenceDate = plan.accepted_date || plan.issued_date;
      const daysOverdue = daysBetween(referenceDate, nowIso);

      if (daysOverdue != null && daysOverdue >= TREATMENT_REVIEW_DAYS) {
        const patient = patients.find((entry) => entry.id === plan.patient_id);
        if (!patient) return;

        items.push({
          id: `treatment:${plan.id}`,
          kind: 'treatment-review',
          patient_id: plan.patient_id,
          patient_name: patientName(patient),
          source_id: plan.id,
          source_label: plan.plan_name,
          due_date: toDateString(referenceDate),
          last_activity_date: toDateString(referenceDate),
          days_overdue: daysOverdue - TREATMENT_REVIEW_DAYS,
          priority: priorityForDays(daysOverdue - TREATMENT_REVIEW_DAYS),
          reason: `Accepted treatment plan requires follow-up review`,
        });
      }
    });

  procedures
    .filter((procedure) => procedure.status === 'Completed')
    .forEach((procedure) => {
      const referenceDate = procedure.procedure_date || procedure.created_at;
      const daysOverdue = daysBetween(referenceDate, nowIso);

      if (daysOverdue != null && daysOverdue >= PROCEDURE_REVIEW_DAYS) {
        const patient = patients.find((entry) => entry.id === procedure.patient_id);
        if (!patient) return;

        items.push({
          id: `procedure:${procedure.id}`,
          kind: 'procedure-review',
          patient_id: procedure.patient_id,
          patient_name: patientName(patient),
          source_id: procedure.id,
          source_label: procedure.procedure_name,
          due_date: toDateString(referenceDate),
          last_activity_date: toDateString(referenceDate),
          days_overdue: daysOverdue - PROCEDURE_REVIEW_DAYS,
          priority: priorityForDays(daysOverdue - PROCEDURE_REVIEW_DAYS),
          reason: `Completed procedure requires review`,
        });
      }
    });

  labCases.forEach((labCase) => {
    const patient = patients.find((entry) => entry.id === labCase.patient_id);
    if (!patient) {
      return;
    }

    const referenceDate = labCase.comeback_requested_at || labCase.patient_collected_at || labCase.created_at || labCase.updated_at;
    const daysSinceReference = daysBetween(referenceDate, nowIso);
    const hasOpenRecall = Boolean(labCase.patient_collected_at && !labCase.satisfaction_signed_at && !labCase.closed_at);
    const hasComeback = Boolean(labCase.comeback_requested_at && !labCase.closed_at);

    if (!hasOpenRecall && !hasComeback) {
      return;
    }

    const daysOverdue = labCase.comeback_requested_at
      ? (daysSinceReference ?? 0)
      : (daysSinceReference ?? 0) - LAB_RECALL_DAYS;

    items.push({
      id: `lab:${labCase.id}`,
      kind: 'lab-follow-up',
      patient_id: labCase.patient_id,
      patient_name: patientName(patient),
      source_id: labCase.id,
      source_label: labCase.comeback_requested_at ? 'Comeback requested' : 'Patient collected',
      due_date: toDateString(referenceDate),
      last_activity_date: toDateString(referenceDate),
      days_overdue: Math.max(0, daysOverdue),
      priority: daysOverdue > 0 ? 'high' : 'medium',
      reason: labCase.comeback_requested_at
        ? 'Lab comeback requires immediate follow-up'
        : 'Patient should be recalled a few days after collection',
    });
  });

  const uniqueItems = Array.from(
    new Map(
      items.map((item) => [`${item.kind}:${item.source_id}`, item]),
    ).values(),
  ).sort((a, b) => {
    const priorityRank = { high: 0, medium: 1, low: 2 } as const;
    const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  return {
    items: uniqueItems,
    summary: {
      total: uniqueItems.length,
      routine: uniqueItems.filter((item) => item.kind === 'routine-recall').length,
      treatment: uniqueItems.filter((item) => item.kind === 'treatment-review').length,
      procedures: uniqueItems.filter((item) => item.kind === 'procedure-review').length,
      lab: uniqueItems.filter((item) => item.kind === 'lab-follow-up').length,
      overdue: uniqueItems.filter((item) => item.days_overdue > 0).length,
    },
  };
}

import { LAB_WORKFLOW_STAGE } from '@/lib/workflows/status-definitions';

export type LabWorkflowStage = (typeof LAB_WORKFLOW_STAGE)[keyof typeof LAB_WORKFLOW_STAGE];

export const LAB_WORKFLOW_EVENT_TYPE = {
  SLIP_EMAILED: 'slip_emailed',
  COLLECTED_FROM_PATIENT: 'collected_from_patient',
  SENT_TO_LAB: 'sent_to_lab',
  RECEIVED_BY_LAB: 'received_by_lab',
  IN_PRODUCTION: 'in_production',
  READY_FOR_COLLECTION: 'ready_for_collection',
  COLLECTED_BY_DRIVER: 'collected_by_driver',
  DROPPED_OFF_BY_ME: 'dropped_off_by_me',
  PATIENT_CALLED: 'patient_called',
  PATIENT_COLLECTED: 'patient_collected',
  COMEBACK_REQUESTED: 'comeback_requested',
  RETURNED_FOR_ADJUSTMENT: 'returned_for_adjustment',
  SATISFACTION_SIGNED: 'satisfaction_signed',
  CASE_CLOSED: 'case_closed',
} as const;

export type LabWorkflowEventType = (typeof LAB_WORKFLOW_EVENT_TYPE)[keyof typeof LAB_WORKFLOW_EVENT_TYPE];

export type LabWorkflowCase = {
  id: string;
  patient_id: string;
  patient_name?: string;
  case_type: string;
  description?: string | null;
  status?: string | null;
  workflow_stage?: string | null;
  due_date?: string | null;
  expected_return_date?: string | null;
  lab_name?: string | null;
  shade?: string | null;
  slip_text?: string | null;
  slip_sent_at?: string | null;
  collected_at?: string | null;
  ready_for_collection_at?: string | null;
  collected_by_driver_at?: string | null;
  dropped_off_by_me_at?: string | null;
  patient_called_at?: string | null;
  patient_collected_at?: string | null;
  comeback_requested_at?: string | null;
  comeback_reason?: string | null;
  satisfaction_signed_at?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LabWorkflowEvent = {
  id: string;
  lab_case_id: string;
  event_type: LabWorkflowEventType | string;
  event_at: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
};

export type LabWorkflowTimelineEntry = {
  id: string;
  label: string;
  description: string;
  event_at: string;
};

export type LabWorkflowSnapshot = {
  current_stage: LabWorkflowStage;
  is_closed: boolean;
  requires_recall: boolean;
  can_close: boolean;
  timeline: LabWorkflowTimelineEntry[];
};

export type LabWorkflowUpdate = {
  patch: Record<string, unknown>;
  metadata: Record<string, unknown>;
  next_stage?: LabWorkflowStage;
};

const STAGE_TO_STATUS: Record<LabWorkflowStage, string> = {
  [LAB_WORKFLOW_STAGE.CREATED]: 'Received',
  [LAB_WORKFLOW_STAGE.COLLECTED]: 'In Progress',
  [LAB_WORKFLOW_STAGE.RECEIVED_BY_LAB]: 'In Progress',
  [LAB_WORKFLOW_STAGE.IN_PRODUCTION]: 'In Progress',
  [LAB_WORKFLOW_STAGE.READY]: 'Ready',
  [LAB_WORKFLOW_STAGE.DISPATCHED]: 'Ready',
  [LAB_WORKFLOW_STAGE.RECEIVED_BY_PRACTICE]: 'Ready',
  [LAB_WORKFLOW_STAGE.FITTED_TO_PATIENT]: 'Delivered',
  [LAB_WORKFLOW_STAGE.RETURNED_FOR_ADJUSTMENT]: 'On Hold',
  [LAB_WORKFLOW_STAGE.REMAKE]: 'On Hold',
  [LAB_WORKFLOW_STAGE.COMPLETED]: 'Delivered',
};

const EVENT_LABELS: Record<string, string> = {
  [LAB_WORKFLOW_EVENT_TYPE.SLIP_EMAILED]: 'Slip emailed',
  [LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_PATIENT]: 'Collected from patient',
  [LAB_WORKFLOW_EVENT_TYPE.SENT_TO_LAB]: 'Sent to lab',
  [LAB_WORKFLOW_EVENT_TYPE.RECEIVED_BY_LAB]: 'Received by lab',
  [LAB_WORKFLOW_EVENT_TYPE.IN_PRODUCTION]: 'In production',
  [LAB_WORKFLOW_EVENT_TYPE.READY_FOR_COLLECTION]: 'Ready for collection',
  [LAB_WORKFLOW_EVENT_TYPE.COLLECTED_BY_DRIVER]: 'Collected by driver',
  [LAB_WORKFLOW_EVENT_TYPE.DROPPED_OFF_BY_ME]: 'Dropped off by me',
  [LAB_WORKFLOW_EVENT_TYPE.PATIENT_CALLED]: 'Patient called',
  [LAB_WORKFLOW_EVENT_TYPE.PATIENT_COLLECTED]: 'Patient collected',
  [LAB_WORKFLOW_EVENT_TYPE.COMEBACK_REQUESTED]: 'Comeback requested',
  [LAB_WORKFLOW_EVENT_TYPE.RETURNED_FOR_ADJUSTMENT]: 'Returned for adjustment',
  [LAB_WORKFLOW_EVENT_TYPE.SATISFACTION_SIGNED]: 'Satisfaction signed',
  [LAB_WORKFLOW_EVENT_TYPE.CASE_CLOSED]: 'Case closed',
};

function isLabWorkflowStage(value: string | null | undefined): value is LabWorkflowStage {
  return Boolean(value) && Object.values(LAB_WORKFLOW_STAGE).includes(value as LabWorkflowStage);
}

function toTime(value: string | null | undefined) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toIso(value: string | null | undefined) {
  const timestamp = toTime(value);
  return timestamp == null ? '' : new Date(timestamp).toISOString();
}

function defaultStageForStatus(status: string | null | undefined): LabWorkflowStage {
  switch (status) {
    case 'Ready':
      return LAB_WORKFLOW_STAGE.READY;
    case 'Delivered':
      return LAB_WORKFLOW_STAGE.COMPLETED;
    case 'On Hold':
      return LAB_WORKFLOW_STAGE.REMAKE;
    case 'In Progress':
      return LAB_WORKFLOW_STAGE.IN_PRODUCTION;
    default:
      return LAB_WORKFLOW_STAGE.CREATED;
  }
}

export function deriveLabWorkflowStage(labCase: LabWorkflowCase): LabWorkflowStage {
  if (isLabWorkflowStage(labCase.workflow_stage)) {
    return labCase.workflow_stage;
  }

  return defaultStageForStatus(labCase.status || null);
}

export function labStatusForWorkflowStage(stage: LabWorkflowStage): string {
  return STAGE_TO_STATUS[stage];
}

function eventLabel(eventType: string) {
  return EVENT_LABELS[eventType] || eventType.replace(/_/g, ' ');
}

export function buildLabWorkflowSnapshot(
  labCase: LabWorkflowCase,
  events: LabWorkflowEvent[] = [],
): LabWorkflowSnapshot {
  const sortedEvents = [...events].sort((a, b) => (toTime(a.event_at) ?? 0) - (toTime(b.event_at) ?? 0));
  const timeline = sortedEvents.map((event) => ({
    id: event.id,
    label: eventLabel(event.event_type),
    description: event.notes || '',
    event_at: toIso(event.event_at),
  }));

  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const currentStage = deriveLabWorkflowStage(labCase);
  const isClosed = Boolean(labCase.closed_at || currentStage === LAB_WORKFLOW_STAGE.COMPLETED);
  const hasSatisfaction = sortedEvents.some((event) => event.event_type === LAB_WORKFLOW_EVENT_TYPE.SATISFACTION_SIGNED)
    || Boolean(labCase.satisfaction_signed_at);
  const hasPatientCollected = sortedEvents.some((event) => event.event_type === LAB_WORKFLOW_EVENT_TYPE.PATIENT_COLLECTED)
    || Boolean(labCase.patient_collected_at);

  return {
    current_stage: currentStage,
    is_closed: isClosed,
    requires_recall: hasPatientCollected && !hasSatisfaction && !isClosed,
    can_close: hasSatisfaction && !isClosed,
    timeline: lastEvent
      ? timeline
      : [],
  };
}

export function resolveLabWorkflowUpdate(
  eventType: LabWorkflowEventType,
  body: Record<string, unknown>,
  nowIso = new Date().toISOString(),
): LabWorkflowUpdate {
  const notes = String(body.notes || '').trim();
  const patientHappy = Boolean(body.patient_happy);
  const requestedStage = String(body.workflow_stage || '').trim();
  const shade = String(body.shade || '').trim();
  const labDriverName = String(body.lab_driver_name || '').trim();
  const workerName = String(body.worker_name || '').trim();
  const expectedReturnDate = String(body.expected_return_date || '').trim();
  const slipText = String(body.slip_text || '').trim();
  const comebackReason = String(body.comeback_reason || '').trim();

  const metadata: Record<string, unknown> = {
    event_type: eventType,
    notes: notes || null,
  };

  const patch: Record<string, unknown> = {
    updated_at: nowIso,
  };

  if (shade) patch.shade = shade;
  if (labDriverName) patch.lab_driver_name = labDriverName;
  if (workerName) patch.worker_name = workerName;
  if (expectedReturnDate) patch.expected_return_date = expectedReturnDate;
  if (slipText) patch.slip_text = slipText;
  if (comebackReason) patch.comeback_reason = comebackReason;

  switch (eventType) {
    case LAB_WORKFLOW_EVENT_TYPE.SLIP_EMAILED:
      patch.slip_sent_at = nowIso;
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.CREATED;
      break;
    case LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_PATIENT:
      patch.collected_at = nowIso;
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.COLLECTED;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.SENT_TO_LAB:
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.DISPATCHED;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.RECEIVED_BY_LAB:
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.RECEIVED_BY_LAB;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.IN_PRODUCTION:
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.IN_PRODUCTION;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.READY_FOR_COLLECTION:
      patch.ready_for_collection_at = nowIso;
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.READY;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.COLLECTED_BY_DRIVER:
      patch.collected_by_driver_at = nowIso;
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.DISPATCHED;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.DROPPED_OFF_BY_ME:
      patch.dropped_off_by_me_at = nowIso;
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.RECEIVED_BY_PRACTICE;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.PATIENT_CALLED:
      patch.patient_called_at = nowIso;
      if (requestedStage && isLabWorkflowStage(requestedStage)) {
        patch.workflow_stage = requestedStage;
        patch.status = labStatusForWorkflowStage(requestedStage);
      }
      break;
    case LAB_WORKFLOW_EVENT_TYPE.PATIENT_COLLECTED:
      patch.patient_collected_at = nowIso;
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.FITTED_TO_PATIENT;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.COMEBACK_REQUESTED:
      patch.comeback_requested_at = nowIso;
      patch.comeback_reason = comebackReason || notes || 'Comeback requested';
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.RETURNED_FOR_ADJUSTMENT;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.RETURNED_FOR_ADJUSTMENT:
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.REMAKE;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.SATISFACTION_SIGNED:
      patch.satisfaction_signed_at = nowIso;
      metadata.patient_happy = patientHappy;
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.COMPLETED;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    case LAB_WORKFLOW_EVENT_TYPE.CASE_CLOSED:
      if (!patientHappy) {
        throw new Error('Patient satisfaction must be confirmed before closing a lab case');
      }
      patch.satisfaction_signed_at = nowIso;
      patch.closed_at = nowIso;
      metadata.patient_happy = true;
      patch.workflow_stage = requestedStage || LAB_WORKFLOW_STAGE.COMPLETED;
      patch.status = labStatusForWorkflowStage(patch.workflow_stage as LabWorkflowStage);
      break;
    default:
      if (requestedStage) {
        patch.workflow_stage = requestedStage;
        if (isLabWorkflowStage(requestedStage)) {
          patch.status = labStatusForWorkflowStage(requestedStage);
        }
      }
  }

  if (shade) {
    metadata.shade = shade;
  }

  if (labDriverName) {
    metadata.lab_driver_name = labDriverName;
  }

  if (workerName) {
    metadata.worker_name = workerName;
  }

  if (expectedReturnDate) {
    metadata.expected_return_date = expectedReturnDate;
  }

  if (slipText) {
    metadata.slip_text = slipText;
  }

  if (comebackReason) {
    metadata.comeback_reason = comebackReason;
  }

  const nextStage = patch.workflow_stage && isLabWorkflowStage(String(patch.workflow_stage))
    ? (patch.workflow_stage as LabWorkflowStage)
    : undefined;

  if (nextStage) {
    patch.workflow_stage = nextStage;
    patch.status = labStatusForWorkflowStage(nextStage);
  }

  return { patch, metadata, next_stage: nextStage };
}

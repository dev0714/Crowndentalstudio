import { LAB_WORKFLOW_STAGE } from '@/lib/workflows/status-definitions';

export type LabWorkflowStage = (typeof LAB_WORKFLOW_STAGE)[keyof typeof LAB_WORKFLOW_STAGE];

export const LAB_WORKFLOW_EVENT_TYPE = {
  NEW_PATIENT: 'new_patient',
  COLLECTED_FROM_STUDIO: 'collected_from_studio',
  AT_LAB: 'at_lab',
  DELIVERED_TO_STUDIO: 'delivered_to_studio',
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
  [LAB_WORKFLOW_STAGE.NEW_PATIENT]: 'Received',
  [LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO]: 'In Progress',
  [LAB_WORKFLOW_STAGE.AT_LAB]: 'In Progress',
  [LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO]: 'Delivered',
};

const EVENT_TO_STAGE: Record<LabWorkflowEventType, LabWorkflowStage> = {
  [LAB_WORKFLOW_EVENT_TYPE.NEW_PATIENT]: LAB_WORKFLOW_STAGE.NEW_PATIENT,
  [LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_STUDIO]: LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO,
  [LAB_WORKFLOW_EVENT_TYPE.AT_LAB]: LAB_WORKFLOW_STAGE.AT_LAB,
  [LAB_WORKFLOW_EVENT_TYPE.DELIVERED_TO_STUDIO]: LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO,
};

// Stage values written before the tracker was simplified to four stages.
const LEGACY_STAGE_MAP: Record<string, LabWorkflowStage> = {
  Created: LAB_WORKFLOW_STAGE.NEW_PATIENT,
  Collected: LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO,
  'Received by lab': LAB_WORKFLOW_STAGE.AT_LAB,
  'In production': LAB_WORKFLOW_STAGE.AT_LAB,
  Ready: LAB_WORKFLOW_STAGE.AT_LAB,
  Dispatched: LAB_WORKFLOW_STAGE.AT_LAB,
  'Returned for adjustment': LAB_WORKFLOW_STAGE.AT_LAB,
  Remake: LAB_WORKFLOW_STAGE.AT_LAB,
  'Received by practice': LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO,
  'Fitted to patient': LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO,
  Completed: LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO,
};

const EVENT_LABELS: Record<string, string> = {
  [LAB_WORKFLOW_EVENT_TYPE.NEW_PATIENT]: 'New patient',
  [LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_STUDIO]: 'Collected from Crown Dental Studio',
  [LAB_WORKFLOW_EVENT_TYPE.AT_LAB]: 'At Lab',
  [LAB_WORKFLOW_EVENT_TYPE.DELIVERED_TO_STUDIO]: 'Delivered to Crown Dental Studio',
  // Legacy event types kept so old timeline entries still read well.
  slip_emailed: 'Slip emailed',
  collected_from_patient: 'Collected from patient',
  sent_to_lab: 'Sent to lab',
  received_by_lab: 'Received by lab',
  in_production: 'In production',
  ready_for_collection: 'Ready for collection',
  collected_by_driver: 'Collected by driver',
  dropped_off_by_me: 'Dropped off by me',
  patient_called: 'Patient called',
  patient_collected: 'Patient collected',
  comeback_requested: 'Comeback requested',
  returned_for_adjustment: 'Returned for adjustment',
  satisfaction_signed: 'Satisfaction signed',
  case_closed: 'Case closed',
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
    case 'Delivered':
      return LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO;
    case 'Ready':
    case 'In Progress':
    case 'Quality Check':
    case 'On Hold':
      return LAB_WORKFLOW_STAGE.AT_LAB;
    default:
      return LAB_WORKFLOW_STAGE.NEW_PATIENT;
  }
}

export function deriveLabWorkflowStage(labCase: LabWorkflowCase): LabWorkflowStage {
  if (isLabWorkflowStage(labCase.workflow_stage)) {
    return labCase.workflow_stage;
  }

  if (labCase.workflow_stage && LEGACY_STAGE_MAP[labCase.workflow_stage]) {
    return LEGACY_STAGE_MAP[labCase.workflow_stage];
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
  const isClosed = Boolean(labCase.closed_at || currentStage === LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO);
  const hasSatisfaction = sortedEvents.some((event) => event.event_type === 'satisfaction_signed')
    || Boolean(labCase.satisfaction_signed_at);
  const hasPatientCollected = sortedEvents.some((event) => event.event_type === 'patient_collected')
    || Boolean(labCase.patient_collected_at);

  return {
    current_stage: currentStage,
    is_closed: isClosed,
    requires_recall: hasPatientCollected && !hasSatisfaction && !labCase.closed_at,
    can_close: currentStage === LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO && !labCase.closed_at,
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
  const requestedStage = String(body.workflow_stage || '').trim();
  const shade = String(body.shade || '').trim();
  const labDriverName = String(body.lab_driver_name || '').trim();
  const workerName = String(body.worker_name || '').trim();
  const expectedReturnDate = String(body.expected_return_date || '').trim();
  const slipText = String(body.slip_text || '').trim();

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

  const stageForRequest = isLabWorkflowStage(requestedStage)
    ? requestedStage
    : LEGACY_STAGE_MAP[requestedStage];
  const nextStage = stageForRequest || EVENT_TO_STAGE[eventType];

  if (eventType === LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_STUDIO) {
    patch.collected_at = nowIso;
  }

  if (eventType === LAB_WORKFLOW_EVENT_TYPE.DELIVERED_TO_STUDIO) {
    patch.dropped_off_by_me_at = nowIso;
  }

  if (nextStage) {
    patch.workflow_stage = nextStage;
    patch.status = labStatusForWorkflowStage(nextStage);
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

  return { patch, metadata, next_stage: nextStage };
}

export type AutomationEventChannel =
  | 'call'
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'in_person'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'linkedin'
  | 'system';

export type AutomationEventDirection = 'inbound' | 'outbound' | 'internal';
export type AutomationEventStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'received'
  | 'acknowledged'
  | 'resolved';

export type AutomationEventRow = {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  channel: AutomationEventChannel | string;
  direction: AutomationEventDirection | string;
  status: AutomationEventStatus | string;
  title: string;
  message?: string | null;
  source_system?: string | null;
  source_kind?: string | null;
  source_id?: string | null;
  external_id?: string | null;
  scheduled_for?: string | null;
  occurred_at?: string | null;
  resolved_at?: string | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AutomationEventFeedItem = {
  id: string;
  patient_id: string | null;
  patient_name: string;
  channel: string;
  channel_label: string;
  direction: string;
  direction_label: string;
  status: string;
  status_label: string;
  title: string;
  message: string;
  source_system: string;
  source_kind: string;
  source_id: string;
  external_id: string;
  occurred_at: string;
  scheduled_for: string;
  resolved_at: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type AutomationEventFeed = {
  items: AutomationEventFeedItem[];
  summary: {
    total: number;
    inbound: number;
    outbound: number;
    internal: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    received: number;
    acknowledged: number;
    resolved: number;
  };
};

const CHANNEL_LABELS: Record<string, string> = {
  call: 'Call',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  in_person: 'In person',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  system: 'System',
};

const DIRECTION_LABELS: Record<string, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  internal: 'Internal',
};

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  received: 'Received',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
};

function toTime(value: string | null | undefined) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toIso(value: string | null | undefined) {
  const timestamp = toTime(value);
  return timestamp == null ? '' : new Date(timestamp).toISOString();
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeRecord(value: Record<string, unknown> | null | undefined) {
  return value && typeof value === 'object' ? value : {};
}

function sortEventItems(left: AutomationEventFeedItem, right: AutomationEventFeedItem) {
  const leftTime = toTime(left.occurred_at) ?? 0;
  const rightTime = toTime(right.occurred_at) ?? 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  const leftUpdated = toTime(left.resolved_at) ?? toTime(left.scheduled_for) ?? 0;
  const rightUpdated = toTime(right.resolved_at) ?? toTime(right.scheduled_for) ?? 0;

  if (leftUpdated !== rightUpdated) {
    return rightUpdated - leftUpdated;
  }

  return right.id.localeCompare(left.id);
}

export function buildAutomationEventFeed(rows: AutomationEventRow[], nowIso = new Date().toISOString()): AutomationEventFeed {
  const items = rows.map((row) => ({
    id: row.id,
    patient_id: row.patient_id ?? null,
    patient_name: normalizeText(row.patient_name, 'Unlinked patient'),
    channel: row.channel,
    channel_label: CHANNEL_LABELS[row.channel] || row.channel,
    direction: row.direction,
    direction_label: DIRECTION_LABELS[row.direction] || row.direction,
    status: row.status,
    status_label: STATUS_LABELS[row.status] || row.status,
    title: normalizeText(row.title, 'Automation event'),
    message: normalizeText(row.message, ''),
    source_system: normalizeText(row.source_system, 'n8n'),
    source_kind: normalizeText(row.source_kind, ''),
    source_id: normalizeText(row.source_id, ''),
    external_id: normalizeText(row.external_id, ''),
    occurred_at: toIso(row.occurred_at || row.created_at || nowIso),
    scheduled_for: toIso(row.scheduled_for),
    resolved_at: toIso(row.resolved_at),
    payload: normalizeRecord(row.payload),
    metadata: normalizeRecord(row.metadata),
  }));

  const ordered = items.sort(sortEventItems);

  return {
    items: ordered,
    summary: {
      total: ordered.length,
      inbound: ordered.filter((item) => item.direction === 'inbound').length,
      outbound: ordered.filter((item) => item.direction === 'outbound').length,
      internal: ordered.filter((item) => item.direction === 'internal').length,
      queued: ordered.filter((item) => item.status === 'queued').length,
      sent: ordered.filter((item) => item.status === 'sent').length,
      delivered: ordered.filter((item) => item.status === 'delivered').length,
      read: ordered.filter((item) => item.status === 'read').length,
      failed: ordered.filter((item) => item.status === 'failed').length,
      received: ordered.filter((item) => item.status === 'received').length,
      acknowledged: ordered.filter((item) => item.status === 'acknowledged').length,
      resolved: ordered.filter((item) => item.status === 'resolved').length,
    },
  };
}

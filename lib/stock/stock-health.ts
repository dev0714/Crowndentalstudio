export type StockHealthItem = {
  id: string;
  item_code: string;
  item_name: string;
  category?: string | null;
  quantity_on_hand?: number | null;
  quantity_on_order?: number | null;
  reorder_level?: number | null;
  min_stock_level?: number | null;
  expiry_date?: string | null;
  supplier?: string | null;
  last_reorder_date?: string | null;
  storage_location?: string | null;
  batch_number?: string | null;
};

export type StockExpirySeverity = 'expired' | '30-days' | '60-days' | '90-days';

export type StockExpiryAlert = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  expiry_date: string;
  days_to_expiry: number;
  severity: StockExpirySeverity;
  reason: string;
  recommended_action: string;
};

export type StockReorderItem = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  quantity_on_hand: number;
  reorder_level: number;
  shortfall: number;
  supplier: string;
  recommended_action: string;
};

export type MonthlyChecklistItem = {
  key: string;
  label: string;
  completed: boolean;
};

export type StockLocationGroup = {
  location: string;
  itemCount: number;
  totalQuantity: number;
  lowStockCount: number;
  expiringSoonCount: number;
};

export type StockLocationSummary = {
  totalLocations: number;
  locations: StockLocationGroup[];
};

export type StockHealthSummary = {
  totalItems: number;
  inventoryValue: number;
  lowStockCount: number;
  expiringWithin90Count: number;
  expiringWithin60Count: number;
  expiringWithin30Count: number;
  expiredCount: number;
  expiryAlerts: StockExpiryAlert[];
  reorderQueue: StockReorderItem[];
  monthlyChecklist: MonthlyChecklistItem[];
};

function toTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function daysUntilExpiry(expiryDate: string | null | undefined, nowIso: string) {
  const expiry = toTime(expiryDate);
  const now = toTime(nowIso);
  if (expiry == null || now == null) return null;
  return Math.floor((expiry - now) / (24 * 60 * 60 * 1000));
}

function expirySeverity(daysToExpiry: number): StockExpirySeverity {
  if (daysToExpiry <= 0) return 'expired';
  if (daysToExpiry <= 30) return '30-days';
  if (daysToExpiry <= 60) return '60-days';
  return '90-days';
}

function expiryReason(daysToExpiry: number, severity: StockExpirySeverity) {
  if (severity === 'expired') {
    return `Expired ${Math.abs(daysToExpiry)} day${Math.abs(daysToExpiry) === 1 ? '' : 's'} ago`;
  }
  return `Expires in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'}`;
}

function reorderAction(item: StockHealthItem, shortfall: number) {
  if (shortfall <= 0) {
    return 'Monitor usage';
  }
  return `Reorder ${shortfall} unit${shortfall === 1 ? '' : 's'}`;
}

function stockThreshold(item: StockHealthItem) {
  return Number(item.min_stock_level ?? item.reorder_level ?? 0);
}

function stockLocation(item: StockHealthItem) {
  return (item.storage_location || 'Unassigned').trim() || 'Unassigned';
}

export function buildStockLocationSummary(items: StockHealthItem[]): StockLocationSummary {
  const locationMap = new Map<
    string,
    {
      itemCount: number;
      totalQuantity: number;
      lowStockCount: number;
      expiringSoonCount: number;
    }
  >();

  items.forEach((item) => {
    const location = stockLocation(item);
    const bucket = locationMap.get(location) || {
      itemCount: 0,
      totalQuantity: 0,
      lowStockCount: 0,
      expiringSoonCount: 0,
    };

    const quantityOnHand = Number(item.quantity_on_hand || 0);
    const threshold = stockThreshold(item);
    const shortfall = Math.max(0, threshold - quantityOnHand);
    const expiryDays = daysUntilExpiry(item.expiry_date, new Date().toISOString());

    bucket.itemCount += 1;
    bucket.totalQuantity += quantityOnHand;
    if (shortfall > 0) bucket.lowStockCount += 1;
    if (expiryDays != null && expiryDays <= 30) bucket.expiringSoonCount += 1;

    locationMap.set(location, bucket);
  });

  const locations = Array.from(locationMap.entries())
    .map(([location, summary]) => ({
      location,
      ...summary,
    }))
    .sort((left, right) => right.totalQuantity - left.totalQuantity || left.location.localeCompare(right.location));

  return {
    totalLocations: locations.length,
    locations,
  };
}

export function buildStockHealthSummary(items: StockHealthItem[], nowIso = new Date().toISOString()): StockHealthSummary {
  const expiryAlerts: StockExpiryAlert[] = [];
  const reorderQueue: StockReorderItem[] = [];
  let expiringWithin90Count = 0;
  let expiringWithin60Count = 0;
  let expiringWithin30Count = 0;
  let expiredCount = 0;

  const inventoryValue = items.reduce((sum, item) => {
    const quantity = Number(item.quantity_on_hand || 0);
    const cost = Number((item as { unit_cost?: number | null }).unit_cost || 0);
    return sum + quantity * cost;
  }, 0);

  items.forEach((item) => {
    const expiryDays = daysUntilExpiry(item.expiry_date, nowIso);
    const quantityOnHand = Number(item.quantity_on_hand || 0);
    const reorderLevel = stockThreshold(item);
    const shortfall = Math.max(0, reorderLevel - quantityOnHand);

    if (shortfall > 0) {
      reorderQueue.push({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category || '',
        quantity_on_hand: quantityOnHand,
        reorder_level: reorderLevel,
        shortfall,
        supplier: item.supplier || '',
        recommended_action: reorderAction(item, shortfall),
      });
    }

    if (expiryDays == null || expiryDays > 90) {
      return;
    }

    const severity = expirySeverity(expiryDays);
    const absoluteDays = Math.abs(expiryDays);
    expiryAlerts.push({
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      category: item.category || '',
      expiry_date: item.expiry_date || '',
      days_to_expiry: expiryDays,
      severity,
      reason: expiryReason(absoluteDays, severity),
      recommended_action:
        severity === 'expired'
          ? 'Quarantine and replace'
          : severity === '30-days'
            ? 'Use first and consider transfer'
            : severity === '60-days'
              ? 'Plan usage and reorder early'
              : 'Monitor expiry closely',
    });

    expiringWithin90Count += 1;
    if (expiryDays <= 60) expiringWithin60Count += 1;
    if (expiryDays <= 30) expiringWithin30Count += 1;
    if (expiryDays <= 0) expiredCount += 1;
  });

  expiryAlerts.sort((left, right) => left.days_to_expiry - right.days_to_expiry);
  reorderQueue.sort((left, right) => right.shortfall - left.shortfall || left.item_name.localeCompare(right.item_name));

  return {
    totalItems: items.length,
    inventoryValue,
    lowStockCount: reorderQueue.length,
    expiringWithin90Count,
    expiringWithin60Count,
    expiringWithin30Count,
    expiredCount,
    expiryAlerts,
    reorderQueue,
    monthlyChecklist: [
      { key: 'count', label: 'Complete monthly stock count', completed: reorderQueue.length === 0 },
      { key: 'expiry', label: 'Check expiry labels and quarantine expired items', completed: expiredCount === 0 },
      { key: 'reorder', label: 'Review reorder thresholds by room', completed: reorderQueue.length <= 5 },
      { key: 'supplier', label: 'Confirm supplier lead times', completed: true },
      { key: 'usage', label: 'Review high-usage items', completed: true },
    ],
  };
}

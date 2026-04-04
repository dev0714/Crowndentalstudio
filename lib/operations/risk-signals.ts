export type RiskSignalInput = {
  outstandingConsentCount: number;
  overdueLabCount: number;
  overdueInvoiceCount: number;
  staleRecallCount: number;
  lowStockCount?: number;
};

export function buildRiskSignals(input: RiskSignalInput) {
  const signals: Array<{ key: string; label: string; severity: 'low' | 'medium' | 'high' }> = [];

  if (input.outstandingConsentCount > 0) {
    signals.push({ key: 'missing-consent', label: 'Missing consent records', severity: 'high' });
  }

  if (input.overdueLabCount > 0) {
    signals.push({ key: 'overdue-lab', label: 'Overdue lab cases', severity: 'high' });
  }

  if (input.overdueInvoiceCount > 0) {
    signals.push({ key: 'unpaid-invoices', label: 'Unpaid invoices', severity: 'medium' });
  }

  if (input.staleRecallCount > 0) {
    signals.push({ key: 'stale-recalls', label: 'Stale recall follow-ups', severity: 'medium' });
  }

  if ((input.lowStockCount || 0) > 0) {
    signals.push({ key: 'low-stock', label: 'Low stock items', severity: 'medium' });
  }

  return signals;
}

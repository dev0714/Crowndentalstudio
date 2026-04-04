'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatZAR, formatDateSA } from '@/lib/sa-formatting';
import { STOCK_ALERT_LEVEL } from '@/lib/workflows/status-definitions';
import { buildStockHealthSummary, buildStockLocationSummary } from '@/lib/stock/stock-health';

type StockItem = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  quantity_on_hand: number;
  quantity_on_order?: number | null;
  reorder_level: number;
  min_stock_level?: number | null;
  expiry_date?: string | null;
  supplier?: string | null;
  last_reorder_date?: string | null;
  storage_location?: string | null;
  batch_number?: string | null;
  unit_cost: number;
};

function StockContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await fetch('/api/crm/stock?limit=1000&page=1', {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load stock');
        }

        setStockItems(payload.data || []);
      } catch (err) {
        console.error('[stock] Error fetching stock:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stock');
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, []);

  const health = useMemo(() => buildStockHealthSummary(stockItems), [stockItems]);
  const locations = useMemo(() => buildStockLocationSummary(stockItems), [stockItems]);

  const filteredItems = stockItems.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStockStatus = (item: StockItem) => {
    const expiryDays = item.expiry_date ? Math.floor((new Date(item.expiry_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
    const threshold = item.min_stock_level ?? item.reorder_level;
    if (expiryDays != null && expiryDays <= 0) {
      return { color: 'bg-slate-400 text-white', label: 'Expired' };
    }
    if (expiryDays != null && expiryDays <= 30) {
      return { color: 'bg-red-100 text-red-700', label: 'Expires soon' };
    }
    if (item.quantity_on_hand <= threshold) {
      return { color: 'bg-red-100 text-red-700', label: STOCK_ALERT_LEVEL.LOW_STOCK };
    }
    if (item.quantity_on_hand <= threshold * 1.5) {
      return { color: 'bg-amber-100 text-amber-700', label: STOCK_ALERT_LEVEL.MONITOR };
    }
    return { color: 'bg-green-100 text-green-700', label: STOCK_ALERT_LEVEL.IN_STOCK };
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Control</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track inventory, expiry risk, and reorder pressure</p>
        </div>

        <OperationsRiskStrip variant="stock" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: health.totalItems, note: 'In inventory', gradient: 'from-blue-600 to-cyan-500' },
            { label: 'Low Stock', value: health.lowStockCount, note: 'Needs reorder', gradient: 'from-rose-600 to-pink-500' },
            { label: 'Expiry 30 Days', value: health.expiringWithin30Count, note: 'Use or transfer first', gradient: 'from-amber-500 to-orange-500' },
            { label: 'Inventory Value', value: formatZAR(health.inventoryValue), note: 'Total cost', gradient: 'from-emerald-600 to-teal-500' },
          ].map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
              <p className="text-2xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
              <p className="text-xs font-semibold opacity-75">{card.label}</p>
              <p className="text-xs opacity-60 mt-0.5">{card.note}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <CardTitle className="text-base">Expiry Alerts</CardTitle>
              <CardDescription className="text-xs">Items expiring within 90, 60, and 30 days or already expired.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">Loading expiry alerts...</p>
                </div>
              ) : health.expiryAlerts.length > 0 ? (
                <div className="space-y-3">
                  {health.expiryAlerts.map((alert) => (
                    <div key={alert.id} className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{alert.item_name}</p>
                        <p className="text-sm text-slate-600">
                          {alert.item_code} · {alert.category || 'Uncategorised'} · {formatDateSA(alert.expiry_date)}
                        </p>
                      </div>
                      <div className="text-sm text-slate-700 md:text-right">
                        <p className={alert.severity === 'expired' ? 'font-semibold text-red-700' : 'font-semibold text-amber-700'}>
                          {alert.reason}
                        </p>
                        <p className="text-slate-500">{alert.recommended_action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-600">No expiry alerts right now</div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <CardTitle className="text-base">Monthly Stock Take</CardTitle>
              <CardDescription className="text-xs">Simple checklist for the team.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {health.monthlyChecklist.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.completed ? 'Current review looks healthy' : 'Needs attention'}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${item.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.completed ? 'Done' : 'Open'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Storage Locations</CardTitle>
            <CardDescription>
              {loading ? 'Loading...' : `${locations.totalLocations} storage locations tracked`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600">Loading storage locations...</p>
              </div>
            ) : locations.locations.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {locations.locations.map((location) => (
                  <div key={location.location} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{location.location}</p>
                      <span className="text-xs font-semibold rounded-full bg-slate-900 px-2 py-1 text-white">
                        {location.itemCount} items
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>
                        <p className="font-semibold text-slate-900">{location.totalQuantity}</p>
                        <p>Total qty</p>
                      </div>
                      <div>
                        <p className="font-semibold text-red-700">{location.lowStockCount}</p>
                        <p>Low stock</p>
                      </div>
                      <div>
                        <p className="font-semibold text-amber-700">{location.expiringSoonCount}</p>
                        <p>Expiring soon</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-600">No storage locations recorded yet</div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Search stock items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md">Add Stock Item</Button>
        </div>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Reorder Queue</CardTitle>
            <CardDescription>
              {loading ? 'Loading...' : `${health.reorderQueue.length} items need reordering or closer monitoring`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600">Loading reorder queue...</p>
              </div>
            ) : health.reorderQueue.length > 0 ? (
              <div className="space-y-3">
                {health.reorderQueue.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{item.item_name}</p>
                      <p className="text-sm text-slate-600">
                        {item.item_code} · On hand {item.quantity_on_hand} / reorder {item.reorder_level}
                      </p>
                      <p className="text-xs text-slate-500">
                        Supplier: {item.supplier || 'N/A'} · Shortfall: {item.shortfall}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">{item.recommended_action}</span>
                      <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-sm">
                        Order Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">No reorder items right now</div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Inventory List</CardTitle>
            <CardDescription>{loading ? 'Loading...' : `${filteredItems.length} items displayed`}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600">Loading stock data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Code</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Item Name</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Category</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Qty On Hand</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">On Order</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Reorder Level</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Storage</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Batch</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Expiry</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Last Order</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => {
                        const status = getStockStatus(item);
                        return (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-900">{item.item_code}</td>
                            <td className="py-3 px-4 text-slate-700">{item.item_name}</td>
                            <td className="py-3 px-4 text-slate-600">{item.category}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{item.quantity_on_hand}</td>
                            <td className="py-3 px-4 text-slate-600">{item.quantity_on_order || 0}</td>
                            <td className="py-3 px-4 text-slate-600">{item.min_stock_level ?? item.reorder_level}</td>
                            <td className="py-3 px-4 text-slate-600">{item.storage_location || '-'}</td>
                            <td className="py-3 px-4 text-slate-600">{item.batch_number || '-'}</td>
                            <td className="py-3 px-4 text-slate-600">{item.expiry_date ? formatDateSA(item.expiry_date) : '-'}</td>
                            <td className="py-3 px-4 text-slate-600">{item.last_reorder_date ? formatDateSA(item.last_reorder_date) : '-'}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-semibold px-2 py-1 rounded ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-900 font-medium">{formatZAR(item.unit_cost)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-600">
                          No stock items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function StockPage() {
  return (
    <DashboardLayout>
      <StockContent />
    </DashboardLayout>
  );
}

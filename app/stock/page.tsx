'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatZAR, formatDateSA } from '@/lib/sa-formatting';
import { STOCK_ALERT_LEVEL } from '@/lib/workflows/status-definitions';
import { buildStockHealthSummary, buildStockLocationSummary } from '@/lib/stock/stock-health';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginationFooter } from '@/components/pagination-footer';
import { describeRange, sliceForPage } from '@/lib/pagination';

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
  unit_price?: number | null;
  notes?: string | null;
};

type StockFormState = {
  item_code: string;
  item_name: string;
  category: string;
  quantity_on_hand: string;
  quantity_on_order: string;
  reorder_level: string;
  unit_cost: string;
  unit_price: string;
  supplier: string;
  storage_location: string;
  batch_number: string;
  expiry_date: string;
  last_reorder_date: string;
  notes: string;
};

const EMPTY_FORM: StockFormState = {
  item_code: '',
  item_name: '',
  category: '',
  quantity_on_hand: '0',
  quantity_on_order: '0',
  reorder_level: '10',
  unit_cost: '0',
  unit_price: '',
  supplier: '',
  storage_location: '',
  batch_number: '',
  expiry_date: '',
  last_reorder_date: '',
  notes: '',
};

function formFromItem(item: StockItem & { unit_price?: number | null; notes?: string | null }): StockFormState {
  return {
    item_code: item.item_code || '',
    item_name: item.item_name || '',
    category: item.category || '',
    quantity_on_hand: String(item.quantity_on_hand ?? 0),
    quantity_on_order: String(item.quantity_on_order ?? 0),
    reorder_level: String(item.min_stock_level ?? item.reorder_level ?? 10),
    unit_cost: String(item.unit_cost ?? 0),
    unit_price: item.unit_price == null ? '' : String(item.unit_price),
    supplier: item.supplier || '',
    storage_location: item.storage_location || '',
    batch_number: item.batch_number || '',
    expiry_date: item.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
    last_reorder_date: item.last_reorder_date ? String(item.last_reorder_date).slice(0, 10) : '',
    notes: item.notes || '',
  };
}

/** Blank strings become null and numeric fields become numbers, so Postgres accepts the row. */
function payloadFromForm(form: StockFormState) {
  const text = (value: string) => (value.trim() ? value.trim() : null);
  const num = (value: string, fallback = 0) => (value.trim() === '' ? fallback : Number(value));
  const reorder = num(form.reorder_level, 10);
  return {
    item_code: form.item_code.trim(),
    item_name: form.item_name.trim(),
    category: text(form.category),
    quantity_on_hand: num(form.quantity_on_hand),
    quantity_on_order: num(form.quantity_on_order),
    reorder_level: reorder,
    min_stock_level: reorder,
    unit_cost: num(form.unit_cost),
    unit_price: form.unit_price.trim() === '' ? null : Number(form.unit_price),
    supplier: text(form.supplier),
    storage_location: text(form.storage_location),
    batch_number: text(form.batch_number),
    expiry_date: text(form.expiry_date),
    last_reorder_date: text(form.last_reorder_date),
    notes: text(form.notes),
  };
}

function StockContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'locations' | 'reorder' | 'inventory'>('dashboard');
  const [pageState, setPageState] = useState<Record<string, { page: number; size: number }>>({});
  const pagingFor = (key: string) => pageState[key] || { page: 1, size: 10 };
  const setPageFor = (key: string, page: number) => setPageState((current) => ({ ...current, [key]: { ...pagingFor(key), page } }));
  const setSizeFor = (key: string, size: number) => setPageState((current) => ({ ...current, [key]: { page: 1, size } }));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StockFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStock = async () => {
    const response = await fetch('/api/crm/stock?limit=1000&page=1', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to load stock');
    setStockItems(payload.data || []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadStock();
      } catch (err) {
        console.error('[stock] Error fetching stock:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stock');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: StockItem) => {
    setEditingId(item.id);
    setForm(formFromItem(item));
    setDialogOpen(true);
  };

  const updateForm = (field: keyof StockFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveItem = async () => {
    if (!form.item_code.trim() || !form.item_name.trim()) {
      setError('Item code and item name are required');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const url = editingId ? `/api/crm/stock?id=${encodeURIComponent(editingId)}` : '/api/crm/stock';
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromForm(form)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to save stock item');
      await loadStock();
      setNotice(editingId ? `${form.item_name.trim()} updated` : `${form.item_name.trim()} added to inventory`);
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stock item');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: StockItem) => {
    if (!window.confirm(`Remove ${item.item_name} (${item.item_code}) from inventory?`)) return;
    try {
      setDeletingId(item.id);
      setError(null);
      const response = await fetch(`/api/crm/stock?id=${encodeURIComponent(item.id)}`, { method: 'DELETE', credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to delete stock item');
      await loadStock();
      setNotice(`${item.item_name} removed`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete stock item');
    } finally {
      setDeletingId(null);
    }
  };

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

  const paged = <T,>(key: string, rows: T[]) => {
    const { page, size } = pagingFor(key);
    const { pageCount } = describeRange(page, size, rows.length);
    return sliceForPage<T>(rows, Math.min(page, pageCount), size);
  };
  const pagedItems = paged('inventory', filteredItems);
  const pagedReorder = paged('reorder', health.reorderQueue);
  const footer = (key: string, count: number, noun: string) => {
    const { page, size } = pagingFor(key);
    const { pageCount } = describeRange(page, size, count);
    return (
      <PaginationFooter
        page={Math.min(page, pageCount)}
        pageSize={size}
        count={count}
        onPageChange={(next) => setPageFor(key, next)}
        onPageSizeChange={(next) => setSizeFor(key, next)}
        noun={noun}
        className="-mx-6 -mb-6 mt-3"
      />
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Control</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track inventory, expiry risk, and reorder pressure</p>
        </div>

        {notice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
            <p className="text-emerald-700 text-sm">{notice}</p>
            <button type="button" onClick={() => setNotice(null)} className="text-xs text-emerald-700 hover:underline">Dismiss</button>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="h-auto flex-wrap justify-start bg-white border border-slate-200 rounded-full p-1 gap-0.5 mb-3">
            <TabsTrigger value="dashboard" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Dashboard
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : ''}</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Inventory
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : filteredItems.length}</span>
            </TabsTrigger>
            <TabsTrigger value="reorder" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Reorder queue
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : health.reorderQueue.length}</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Locations
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : locations.locations.length}</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="dashboard" className="space-y-5">
        <OperationsRiskStrip variant="stock" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: health.totalItems, note: 'In inventory', gradient: 'from-navy-800 to-ink' },
            { label: 'Low Stock', value: health.lowStockCount, note: 'Needs reorder', gradient: 'from-[#9f2f2f] to-[#6f1d1d]' },
            { label: 'Expiry 30 Days', value: health.expiringWithin30Count, note: 'Use or transfer first', gradient: 'from-[#b8742e] to-[#8f5a22]' },
            { label: 'Inventory Value', value: formatZAR(health.inventoryValue), note: 'Total cost', gradient: 'from-teal to-[#0b6f71]' },
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

        </TabsContent>

        <TabsContent value="inventory">
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-4">
          <Input
            placeholder="Search stock items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-sm"
          />
          <Button onClick={openCreate} className="bg-navy-800 hover:bg-ink border-0 shadow-md">+ Add Stock Item</Button>
        </div>

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
                <table className="w-full min-w-[1100px]">
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
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length > 0 ? (
                      pagedItems.map((item) => {
                        const status = getStockStatus(item);
                        return (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-cream/40 transition-colors">
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
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="sm" className="text-xs border-slate-200 hover:border-teal hover:text-teal" onClick={() => openEdit(item)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                                  onClick={() => deleteItem(item)}
                                  disabled={deletingId === item.id}
                                >
                                  {deletingId === item.id ? '…' : 'Delete'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-slate-600">
                          No stock items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && filteredItems.length > 0 && footer('inventory', filteredItems.length, 'items')}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="reorder">
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
                {pagedReorder.map((item) => (
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
                      <Button size="sm" className="bg-navy-800 hover:bg-ink border-0 shadow-sm">
                        Order Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">No reorder items right now</div>
            )}
            {!loading && health.reorderQueue.length > 0 && footer('reorder', health.reorderQueue.length, 'items')}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="locations">
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
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
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
        </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : !saving && setDialogOpen(false))}>
          <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit stock item' : 'Add stock item'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update the details of this inventory item.' : 'Add a new item to the practice inventory.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5"><Label htmlFor="stock_item_code">Item code</Label><Input id="stock_item_code" value={form.item_code} onChange={(e) => updateForm('item_code', e.target.value)} placeholder="e.g. MAT-010" /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_item_name">Item name</Label><Input id="stock_item_name" value={form.item_name} onChange={(e) => updateForm('item_name', e.target.value)} placeholder="e.g. Composite resin A2" /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_category">Category</Label><Input id="stock_category" value={form.category} onChange={(e) => updateForm('category', e.target.value)} placeholder="Restorative, Instruments, Supplies…" /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_supplier">Supplier</Label><Input id="stock_supplier" value={form.supplier} onChange={(e) => updateForm('supplier', e.target.value)} placeholder="Supplier name" /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_qty">Quantity on hand</Label><Input id="stock_qty" type="number" min="0" value={form.quantity_on_hand} onChange={(e) => updateForm('quantity_on_hand', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_on_order">Quantity on order</Label><Input id="stock_on_order" type="number" min="0" value={form.quantity_on_order} onChange={(e) => updateForm('quantity_on_order', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_reorder">Reorder level</Label><Input id="stock_reorder" type="number" min="0" value={form.reorder_level} onChange={(e) => updateForm('reorder_level', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_cost">Unit cost (R)</Label><Input id="stock_cost" type="number" min="0" step="0.01" value={form.unit_cost} onChange={(e) => updateForm('unit_cost', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_price">Unit price (R)</Label><Input id="stock_price" type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => updateForm('unit_price', e.target.value)} placeholder="Optional" /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_location">Storage location</Label><Input id="stock_location" value={form.storage_location} onChange={(e) => updateForm('storage_location', e.target.value)} placeholder="e.g. Cupboard B" /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_batch">Batch number</Label><Input id="stock_batch" value={form.batch_number} onChange={(e) => updateForm('batch_number', e.target.value)} placeholder="Optional" /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_expiry">Expiry date</Label><Input id="stock_expiry" type="date" value={form.expiry_date} onChange={(e) => updateForm('expiry_date', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="stock_last_order">Last reorder date</Label><Input id="stock_last_order" type="date" value={form.last_reorder_date} onChange={(e) => updateForm('last_reorder_date', e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="stock_notes">Notes</Label><Input id="stock_notes" value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Optional" /></div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="border-slate-200">Cancel</Button>
              <Button onClick={saveItem} disabled={saving} className="bg-navy-800 hover:bg-ink border-0 shadow-md">
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

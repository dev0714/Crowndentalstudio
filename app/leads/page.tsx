'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateSA, formatPhoneSA } from '@/lib/sa-formatting';
import { LEAD_STATUS } from '@/lib/workflows/status-definitions';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  created_at: string;
}

function LeadsContent() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/crm/leads?limit=1000&page=1', {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load leads');
        }

        setLeads(payload.data || []);
      } catch (err) {
        console.error('[v0] Error fetching leads:', err);
        setError(err instanceof Error ? err.message : 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case LEAD_STATUS.NEW:
        return 'bg-blue-100 text-blue-700';
      case LEAD_STATUS.CONTACTED:
        return 'bg-amber-100 text-amber-700';
      case LEAD_STATUS.QUALIFIED:
        return 'bg-green-100 text-green-700';
      case LEAD_STATUS.CONVERTED:
        return 'bg-slate-400 text-white';
      case LEAD_STATUS.LOST:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const sourceColor = (source: string) => {
    const colors: { [key: string]: string } = {
      Google: 'bg-red-50 text-red-700',
      Referral: 'bg-green-50 text-green-700',
      Facebook: 'bg-blue-50 text-blue-700',
      'Direct Call': 'bg-purple-50 text-purple-700',
    };
    return colors[source] || 'bg-slate-50 text-slate-700';
  };

  const stats = [
    { label: 'Total Leads', value: leads.length },
    { label: 'New', value: leads.filter((l) => l.status === LEAD_STATUS.NEW).length },
    { label: 'Qualified', value: leads.filter((l) => l.status === LEAD_STATUS.QUALIFIED).length },
    { label: 'Converted', value: leads.filter((l) => l.status === LEAD_STATUS.CONVERTED).length },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage and track new leads</p>
          </div>
          <div className="text-xs text-slate-400 font-medium">{leads.length} total leads</div>
        </div>

        <OperationsRiskStrip variant="leads" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const gradients = ['from-blue-600 to-cyan-500','from-violet-600 to-purple-500','from-emerald-600 to-teal-500','from-amber-500 to-orange-500'];
            return (
              <div key={stat.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i]} p-5 text-white shadow-md`}>
                <p className="text-3xl font-bold leading-none mb-1">{stat.value}</p>
                <p className="text-xs font-semibold opacity-75">{stat.label}</p>
                <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Lead Pipeline</CardTitle>
                <CardDescription className="text-xs">{loading ? 'Loading...' : `${leads.length} leads`}</CardDescription>
              </div>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md border-0 text-xs">
                + Add Lead
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600">Loading leads...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Source</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length > 0 ? (
                      leads.map((lead) => (
                        <tr key={lead.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {lead.first_name} {lead.last_name}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{lead.email}</td>
                          <td className="py-3 px-4 text-slate-600">{lead.phone ? formatPhoneSA(lead.phone) : '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${sourceColor(lead.source)}`}>
                              {lead.source}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-sm">{formatDateSA(lead.created_at)}</td>
<td className="py-3 px-4">
                              <Button variant="outline" size="sm" onClick={() => router.push(`/leads/${lead.id}`)}>
                                View
                              </Button>
                            </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-600">
                          No leads found
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

export default function LeadsPage() {
  return (
    <DashboardLayout>
      <LeadsContent />
    </DashboardLayout>
  );
}

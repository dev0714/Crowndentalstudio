'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { buildStaffComplianceSummary, type StaffComplianceProfile } from '@/lib/hr/staff-compliance';

type StaffRow = StaffComplianceProfile & {
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

function HRPageContent() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const response = await fetch('/api/crm/staff', { credentials: 'include' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load staff profiles');
        }
        setStaff(payload.data || []);
      } catch (err) {
        console.error('[hr] Error loading staff:', err);
        setError(err instanceof Error ? err.message : 'Failed to load staff');
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, []);

  const summary = useMemo(() => buildStaffComplianceSummary(staff), [staff]);

  const filteredStaff = staff.filter((row) =>
    [row.full_name, row.email, row.role, row.hpcsa_registration_number || '']
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HR Compliance</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track onboarding, contracts, and staff readiness</p>
        </div>

        <OperationsRiskStrip variant="operations" />

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Staff', value: summary.totalStaff, gradient: 'from-blue-600 to-cyan-500' },
            { label: 'Ready', value: summary.readyStaffCount, gradient: 'from-emerald-600 to-teal-500' },
            { label: 'Needs Attention', value: summary.needsAttentionCount, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Inactive', value: summary.inactiveStaffCount, gradient: 'from-slate-600 to-slate-800' },
          ].map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
              <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
              <p className="text-xs font-semibold opacity-75">{card.label}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Staff Register</CardTitle>
            <CardDescription className="text-xs">Onboarding and compliance snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 max-w-sm">
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-600">Loading staff profiles...</div>
            ) : filteredStaff.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Compliance</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Missing Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((row) => {
                      const profile = summary.profiles.find((item) => item.id === row.id);
                      return (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.full_name}</td>
                          <td className="px-4 py-3 text-slate-700">{row.role}</td>
                          <td className="px-4 py-3 text-slate-600">{row.email}</td>
                          <td className="px-4 py-3">
                            <Badge className={profile?.complianceStatus === 'Ready' ? 'bg-green-100 text-green-800 hover:bg-green-100' : profile?.complianceStatus === 'Inactive' ? 'bg-slate-100 text-slate-700 hover:bg-slate-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>
                              {profile?.complianceStatus || 'Needs Attention'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {profile?.missingItems.length ? profile.missingItems.join(', ') : 'None'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-600">No staff profiles found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function HRPage() {
  return (
    <DashboardLayout>
      <HRPageContent />
    </DashboardLayout>
  );
}

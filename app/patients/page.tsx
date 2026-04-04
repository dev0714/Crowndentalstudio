'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneSA, formatDateSA } from '@/lib/sa-formatting';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: string;
  created_at: string;
}

function PatientsContent() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/crm/patients?limit=100', {
          credentials: 'include',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          console.error('[v0] Fetch error:', payload);
          setError(payload.error || 'Failed to load patients');
        } else {
          const payload = await response.json();
          setPatients(payload.data || []);
        }
      } catch (err) {
        console.error('[v0] Error fetching patients:', err);
        setError('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(
    (p) =>
      p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage patient records and information</p>
          </div>
          <Button
            onClick={() => router.push('/patients/add')}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md border-0"
          >
            + Add Patient
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Input
            placeholder="Filter by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-4 bg-white border-slate-200"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Patients Table */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Patient Records</CardTitle>
              <CardDescription className="text-xs">
                {loading ? 'Loading...' : `${filteredPatients.length} patients`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Phone</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Added</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <tr key={patient.id} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold shadow-sm">
                                {patient.first_name?.[0]}{patient.last_name?.[0]}
                              </div>
                              <span className="text-sm font-semibold text-slate-900">
                                {patient.first_name} {patient.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{patient.email || '—'}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{patient.phone ? formatPhoneSA(patient.phone) : '—'}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                patient.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {patient.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">{formatDateSA(patient.created_at)}</td>
                          <td className="py-3 px-4">
                            <Button
                              onClick={() => router.push(`/patients/${patient.id}`)}
                              variant="outline"
                              size="sm"
                              className="text-xs border-slate-200 hover:border-blue-300 hover:text-blue-600"
                            >
                              View →
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                          No patients found
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

export default function PatientsPage() {
  return (
    <DashboardLayout>
      <PatientsContent />
    </DashboardLayout>
  );
}

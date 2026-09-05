'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneSA, formatDateSA } from '@/lib/sa-formatting';
import { PaginationFooter } from '@/components/pagination-footer';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: string;
  created_at: string;
}

const DEFAULT_PAGE_SIZE = 20;

function PatientsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* debounce the filter box into the query that hits the server; a new query starts at page 1 */
  const queryRef = useRef(query);
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = searchTerm.trim();
      if (next === queryRef.current) return;
      queryRef.current = next;
      setQuery(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    const fetchPatients = async () => {
      setRefreshing(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
        if (query) params.set('search', query);
        const response = await fetch(`/api/crm/patients?${params.toString()}`, { credentials: 'include' });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setError(payload.error || 'Failed to load patients');
        } else {
          setPatients(payload.data || []);
          setCount(typeof payload.count === 'number' ? payload.count : (payload.data || []).length);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[patients] Error fetching patients:', err);
        setError('Failed to load patients');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchPatients();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, query]);

  const changePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage patient records and information</p>
          </div>
          <Button
            onClick={() => router.push('/patients/add')}
            className="bg-navy-800 hover:bg-ink text-white shadow-md border-0"
          >
            + Add Patient
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Input
            placeholder="Filter by name, email or phone..."
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
                {loading ? 'Loading...' : refreshing ? 'Updating…' : `${count} patient${count === 1 ? '' : 's'}`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className={`overflow-x-auto transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
                  <table className="w-full min-w-[720px]">
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
                      {patients.length > 0 ? (
                        patients.map((patient) => (
                          <tr key={patient.id} className="border-b border-slate-50 hover:bg-cream/40 transition-colors">
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold shadow-sm">
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
                                className="text-xs border-slate-200 hover:border-teal hover:text-teal"
                              >
                                View →
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                            {query ? `No patients match “${query}”` : 'No patients found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationFooter
                  page={page}
                  pageSize={pageSize}
                  count={count}
                  onPageChange={setPage}
                  onPageSizeChange={changePageSize}
                  disabled={refreshing}
                  noun="patients"
                />
              </>
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
      <Suspense fallback={null}>
        <PatientsContent />
      </Suspense>
    </DashboardLayout>
  );
}

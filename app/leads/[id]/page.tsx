'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateSA, formatPhoneSA } from '@/lib/sa-formatting';
import { LEAD_STATUS } from '@/lib/workflows/status-definitions';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  source: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

function LeadDetailContent() {
  const router = useRouter();
  const params = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await fetch(`/api/crm/leads/${params.id}`, {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load lead');
        }

        setLead(payload.data || payload);
        setEditForm(payload.data || payload);
      } catch (err) {
        console.error('[v0] Error fetching lead:', err);
        setError(err instanceof Error ? err.message : 'Failed to load lead');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchLead();
    }
  }, [params.id]);

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/crm/leads?id=${lead?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update lead');
      }

      setLead({ ...lead, ...editForm } as Lead);
      setIsEditing(false);
    } catch (err) {
      console.error('[v0] Error updating lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    }
  };

  const handleConvertToPatient = async () => {
    if (!lead) return;
    
    setIsConverting(true);
    try {
      const response = await fetch('/api/crm/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email || null,
          phone: lead.phone || null,
          mobile: lead.mobile || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      console.log('[convert] Response:', response.status, payload);

      if (!response.ok) {
        throw new Error(payload.error || `Failed to convert: ${response.status}`);
      }

      await fetch(`/api/crm/leads?id=${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: LEAD_STATUS.CONVERTED,
          converted_patient_id: payload.data?.id 
        }),
      });

      router.push(`/patients/${payload.data?.id}`);
    } catch (err) {
      console.error('[v0] Error converting lead:', err);
      alert(err instanceof Error ? err.message : 'Failed to convert lead');
    } finally {
      setIsConverting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-600">Loading lead...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => router.push('/leads')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error || 'Lead not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/leads')} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {lead.first_name} {lead.last_name}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Lead Details</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditForm(lead); }}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleConvertToPatient}
                  disabled={isConverting || lead.status === LEAD_STATUS.CONVERTED}
                >
                  {isConverting ? 'Converting...' : 'Convert to Patient'}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="py-4 px-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
                {isEditing ? (
                  <Input 
                    value={editForm.email || ''} 
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-slate-900">{lead.email || '-'}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Phone</p>
                {isEditing ? (
                  <Input 
                    value={editForm.phone || ''} 
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-slate-900">{lead.phone ? formatPhoneSA(lead.phone) : '-'}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Mobile</p>
                {isEditing ? (
                  <Input 
                    value={editForm.mobile || ''} 
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-slate-900">{lead.mobile ? formatPhoneSA(lead.mobile) : '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-base">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="py-4 px-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${statusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Source</p>
                {isEditing ? (
                  <Input 
                    value={editForm.source || ''} 
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-slate-900">{lead.source || '-'}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Created</p>
                <p className="text-slate-900">{formatDateSA(lead.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-6">
            {isEditing ? (
              <textarea 
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg resize-none"
                placeholder="Add notes about this lead..."
              />
            ) : (
              <p className="text-slate-700 whitespace-pre-wrap">{lead.notes || 'No notes'}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  return (
    <DashboardLayout>
      <LeadDetailContent />
    </DashboardLayout>
  );
}

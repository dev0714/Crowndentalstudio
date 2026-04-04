'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatZAR } from '@/lib/sa-formatting';

type ConsultQuote = {
  amount: number;
  rule: string;
  requiresPaymentMethodConfirmation: boolean;
  hoursLabel: string;
};

function PricingContent() {
  const [datetime, setDatetime] = useState(() => new Date().toISOString().slice(0, 16));
  const [quote, setQuote] = useState<ConsultQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = async (value = datetime) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/crm/pricing/consult?datetime=${encodeURIComponent(value)}`, {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load consult quote');
      }
      setQuote(payload.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consult quote');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchQuote(datetime);
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consult Pricing</h1>
          <p className="text-slate-500 text-sm mt-0.5">Quote normal and after-hours consult pricing from one rule set</p>
        </div>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Quote Calculator</CardTitle>
            <CardDescription className="text-xs">Enter a date and time to see the applicable consult fee.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-slate-700">Appointment Date & Time</label>
                <Input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} className="rounded-xl border-slate-200" />
              </div>
              <Button
                type="button"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md"
                onClick={() => void fetchQuote(datetime)}
              >
                Calculate Quote
              </Button>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Fee', value: loading ? '-' : formatZAR(quote?.amount || 0), gradient: 'from-blue-600 to-cyan-500' },
                { label: 'Rule', value: loading ? '-' : (quote?.rule || 'No quote'), gradient: 'from-violet-600 to-purple-500' },
                { label: 'Payment Check', value: loading ? '-' : (quote?.requiresPaymentMethodConfirmation ? 'Required' : 'Not required'), gradient: 'from-emerald-600 to-teal-500' },
              ].map((card) => (
                <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
                  <p className="text-2xl font-bold leading-none mb-1">{card.value}</p>
                  <p className="text-xs font-semibold opacity-75">{card.label}</p>
                  <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-600">
              {loading ? 'Calculating...' : quote?.hoursLabel || 'No schedule selected'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <DashboardLayout>
      <PricingContent />
    </DashboardLayout>
  );
}

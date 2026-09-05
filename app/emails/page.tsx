'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeSA } from '@/lib/sa-formatting';
import { Mail, Sparkles, RefreshCcw } from 'lucide-react';

type GroupedEmail = {
  uid: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
  group: string;
};

type EmailGroup = {
  key: string;
  label: string;
  count: number;
  emails: GroupedEmail[];
};

type EmailDigest = {
  summary: string;
  highlights: string[];
};

type EmailsPayload = {
  since: string;
  total: number;
  groups: EmailGroup[];
  digest: EmailDigest | null;
  summary_error: string | null;
};

const GROUP_ACCENT: Record<string, string> = {
  lab: 'from-[#3f4c7a] to-[#2c365c]',
  appointments: 'from-navy-800 to-ink',
  accounts: 'from-teal to-[#0b6f71]',
  suppliers: 'from-[#b8742e] to-[#8f5a22]',
  patient_enquiries: 'from-[#2f5f86] to-[#1f4562]',
  marketing: 'from-[#5b6b7f] to-[#3b4653]',
  other: 'from-[#8a94a3] to-[#4b5563]',
};

function EmailsContent() {
  const [data, setData] = useState<EmailsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const response = await fetch('/api/crm/emails?hours=48&summarize=1', { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 400 && /not configured/i.test(payload.error || '')) {
          setNotConfigured(true);
          return;
        }
        throw new Error(payload.error || 'Failed to load emails');
      }
      setData(payload.data as EmailsPayload);
      setActiveGroup(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleGroups = data?.groups.filter((group) => !activeGroup || group.key === activeGroup) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-teal" /> Emails
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Inbound email from the last 48 hours, grouped and summarised with AI
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" className="text-xs border-slate-200">
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Pulling…' : 'Refresh'}
        </Button>
      </div>

      {notConfigured && (
        <div className="max-w-6xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-amber-900 text-sm font-semibold">Email inbox not configured</p>
          <p className="text-amber-800 text-sm mt-1">
            Add your mail server (IMAP) details in Settings to start pulling emails.
          </p>
          <Button asChild className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs">
            <Link href="/settings">Go to Settings</Link>
          </Button>
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="max-w-6xl mx-auto text-center py-16 text-slate-500 text-sm">Pulling emails from the mail server…</div>
      )}

      {data && (
        <>
          {/* AI digest */}
          <div className="max-w-6xl mx-auto">
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-cream py-4 px-6">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal" /> AI summary
                </CardTitle>
                <CardDescription className="text-xs">
                  {data.total} emails since {formatDateTimeSA(data.since)}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3">
                {data.digest ? (
                  <>
                    <p className="text-sm text-slate-700 leading-relaxed">{data.digest.summary}</p>
                    {data.digest.highlights.length > 0 && (
                      <ul className="space-y-1.5">
                        {data.digest.highlights.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    {data.summary_error
                      ? `AI summary unavailable: ${data.summary_error}`
                      : 'AI summary is unavailable. Add an OpenAI API key in Settings to enable summaries.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Group chips */}
          <div className="max-w-6xl mx-auto flex flex-wrap gap-2">
            <button
              onClick={() => setActiveGroup(null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${!activeGroup ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              All ({data.total})
            </button>
            {data.groups.map((group) => (
              <button
                key={group.key}
                onClick={() => setActiveGroup(group.key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${activeGroup === group.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {group.label} ({group.count})
              </button>
            ))}
          </div>

          {/* Groups */}
          <div className="max-w-6xl mx-auto space-y-4">
            {data.total === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">No emails in the last 48 hours.</div>
            )}
            {visibleGroups.map((group) => (
              <Card key={group.key} className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className={`py-3 px-5 bg-gradient-to-r ${GROUP_ACCENT[group.key] || GROUP_ACCENT.other} text-white`}>
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>{group.label}</span>
                    <span className="text-xs bg-white/25 rounded-full px-2 py-0.5">{group.count}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100">
                  {group.emails.map((email) => (
                    <div key={email.uid} className="px-5 py-3 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 truncate">{email.subject}</p>
                        <p className="text-[11px] text-slate-400 flex-shrink-0">{email.date ? formatDateTimeSA(email.date) : ''}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {email.from}{email.fromEmail && email.from !== email.fromEmail ? ` · ${email.fromEmail}` : ''}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function EmailsPage() {
  return (
    <DashboardLayout>
      <EmailsContent />
    </DashboardLayout>
  );
}

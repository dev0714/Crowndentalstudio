'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PaginationFooter } from '@/components/pagination-footer';
import { describeRange, sliceForPage } from '@/lib/pagination';
import { formatDateTimeSA, formatDateSA } from '@/lib/sa-formatting';
import { Mail, Sparkles, RefreshCcw, DownloadCloud, CheckCircle2, ChevronRight } from 'lucide-react';
import { EmailViewer } from '@/components/email-viewer';

type ApiEmail = {
  id: string;
  uid: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
  group: string;
  important: boolean;
  reason: string;
  senderKind: string;
  classifiedBy: 'rules' | 'ai';
};

type SyncState = {
  last_synced_at: string | null;
  backfill_completed_at: string | null;
  stored_total: number;
  oldest_stored_at: string | null;
  awaiting_ai: number;
  last_run: { mode?: string; started_at?: string; finished_at?: string | null; fetched?: number; stored?: number; error?: string | null } | null;
};

type EmailsPayload = {
  from: string;
  to: string;
  today: string;
  total: number;
  important_total: number;
  emails: ApiEmail[];
  digest: { summary: string; highlights: string[] } | null;
  summary_error: string | null;
  sync: SyncState;
};

const GROUP_LABEL: Record<string, string> = {
  lab: 'Lab',
  appointments: 'Appointments',
  accounts: 'Accounts & Billing',
  suppliers: 'Suppliers',
  patient_enquiries: 'Patient enquiries',
  marketing: 'Marketing & Notifications',
  other: 'Other',
};

const GROUP_CHIP: Record<string, string> = {
  lab: 'bg-[#3f4c7a] text-white',
  appointments: 'bg-navy-800 text-white',
  accounts: 'bg-teal text-white',
  suppliers: 'bg-[#b8742e] text-white',
  patient_enquiries: 'bg-[#2f5f86] text-white',
  marketing: 'bg-[#5b6b7f] text-white',
  other: 'bg-slate-400 text-white',
};

type Bucket = 'important' | 'other' | 'all';

function shiftKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function saToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
}

function EmailsContent() {
  const today = saToday();
  const [from, setFrom] = useState(shiftKey(today, -1));
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ from: shiftKey(today, -1), to: today });
  const [data, setData] = useState<EmailsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [syncing, setSyncing] = useState<'backfill' | 'daily' | 'reclassify' | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>('important');
  const [group, setGroup] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async (range = applied) => {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to, summarize: '1' });
      const response = await fetch(`/api/crm/emails?${params.toString()}`, { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 400 && /not configured/i.test(payload.error || '')) {
          setNotConfigured(true);
          return;
        }
        throw new Error(payload.error || 'Failed to load emails');
      }
      setData(payload.data as EmailsPayload);
      setPage(1);
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

  const applyRange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    const range = { from: nextFrom, to: nextTo };
    setApplied(range);
    setGroup(null);
    load(range);
  };

  const runSync = async (mode: 'backfill' | 'daily' | 'reclassify') => {
    setSyncing(mode);
    setSyncMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/crm/emails/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Sync failed');
      const result = payload.data as { fetched: number; stored: number; ai_classified: number };
      setSyncMessage(
        mode === 'backfill'
          ? `Pulled ${result.fetched} emails from the last three months${result.ai_classified ? `, ${result.ai_classified} sorted with AI` : ''}. From now on the inbox is synced automatically every morning.`
          : mode === 'reclassify'
            ? `AI re-sorted ${result.stored} of ${result.fetched} emails${result.fetched === 400 ? '. Press again to continue with the rest.' : '.'}`
            : `Checked the inbox: ${result.fetched} email${result.fetched === 1 ? '' : 's'} in the sync window, ${result.stored} stored${result.ai_classified ? `, ${result.ai_classified} sorted with AI` : ''}.`,
      );
      if (mode === 'backfill') {
        applyRange(shiftKey(today, -92), today);
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const sync = data?.sync;
  const backfillDone = Boolean(sync?.backfill_completed_at);
  const allEmails = data?.emails || [];
  const bucketEmails = allEmails.filter((email) => (bucket === 'all' ? true : bucket === 'important' ? email.important : !email.important));
  const groupCounts = Object.keys(GROUP_LABEL)
    .map((key) => ({ key, label: GROUP_LABEL[key], count: bucketEmails.filter((email) => email.group === key).length }))
    .filter((entry) => entry.count > 0);
  const visibleList = group ? bucketEmails.filter((email) => email.group === group) : bucketEmails;
  const { pageCount } = describeRange(page, pageSize, visibleList.length);
  const currentPage = Math.min(page, pageCount);
  const pageRows = sliceForPage<ApiEmail>(visibleList, currentPage, pageSize);

  const presets: Array<{ label: string; from: string; to: string }> = [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: shiftKey(today, -1), to: shiftKey(today, -1) },
    { label: 'Last 48 hours', from: shiftKey(today, -1), to: today },
    { label: 'Last 7 days', from: shiftKey(today, -6), to: today },
    { label: 'Last 30 days', from: shiftKey(today, -29), to: today },
    { label: 'Last 3 months', from: shiftKey(today, -92), to: today },
  ];

  const rangeLabel = applied.from === applied.to ? formatDateSA(applied.from) : `${formatDateSA(applied.from)} – ${formatDateSA(applied.to)}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-teal" /> Emails
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {sync?.stored_total
              ? `${sync.stored_total} emails stored${sync.oldest_stored_at ? ` since ${formatDateSA(sync.oldest_stored_at)}` : ''}${sync.last_synced_at ? ` · last checked ${formatDateTimeSA(sync.last_synced_at)}` : ''}`
              : 'Your inbox, stored in the CRM, sorted into what needs attention and what does not'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!backfillDone && !notConfigured && (
            <Button onClick={() => runSync('backfill')} disabled={Boolean(syncing)} className="bg-navy-800 hover:bg-ink text-white border-0 text-xs">
              <DownloadCloud className={`w-4 h-4 mr-2 ${syncing === 'backfill' ? 'animate-bounce' : ''}`} />
              {syncing === 'backfill' ? 'Pulling 3 months…' : 'Pull last 3 months'}
            </Button>
          )}
          {(sync?.awaiting_ai ?? 0) > 0 && (
            <Button onClick={() => runSync('reclassify')} disabled={Boolean(syncing)} variant="outline" className="text-xs border-teal/40 text-teal hover:text-ink">
              <Sparkles className={`w-4 h-4 mr-2 ${syncing === 'reclassify' ? 'animate-pulse' : ''}`} />
              {syncing === 'reclassify' ? 'Sorting with AI…' : `Sort ${sync?.awaiting_ai} with AI`}
            </Button>
          )}
          <Button onClick={() => runSync('daily')} disabled={Boolean(syncing) || notConfigured} variant="outline" className="text-xs border-slate-200">
            <RefreshCcw className={`w-4 h-4 mr-2 ${syncing === 'daily' ? 'animate-spin' : ''}`} />
            {syncing === 'daily' ? 'Checking…' : 'Check for new mail'}
          </Button>
        </div>
      </div>

      {notConfigured && (
        <div className="max-w-6xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-amber-900 text-sm font-semibold">Email inbox not configured</p>
          <p className="text-amber-800 text-sm mt-1">Add your mail server (IMAP) details in Settings to start pulling emails.</p>
          <Button asChild className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs">
            <Link href="/settings">Go to Settings</Link>
          </Button>
        </div>
      )}

      {syncMessage && (
        <div className="max-w-6xl mx-auto rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-emerald-800 text-sm">{syncMessage}</p>
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {syncing === 'backfill' && (
        <div className="max-w-6xl mx-auto rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Pulling three months of mail from the server and sorting it. This can take a few minutes on a busy inbox; leave this page open.
        </div>
      )}

      {!notConfigured && (
        <>
          {/* Date select */}
          <div className="max-w-6xl mx-auto rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const active = applied.from === preset.from && applied.to === preset.to;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyRange(preset.from, preset.to)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-ink text-white border-ink' : 'bg-white text-slate-600 border-slate-200 hover:border-teal/40'}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (from && to && from <= to) applyRange(from, to);
              }}
            >
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                From
                <Input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-9 text-xs rounded-lg border-slate-200" />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                To
                <Input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="mt-1 h-9 text-xs rounded-lg border-slate-200" />
              </label>
              <Button type="submit" variant="outline" disabled={loading || !from || !to || from > to} className="h-9 text-xs border-slate-200">
                Show
              </Button>
            </form>
          </div>

          {loading && !data && (
            <div className="max-w-6xl mx-auto text-center py-16 text-slate-500 text-sm">Loading stored emails…</div>
          )}

          {data && (
            <>
              {/* AI digest */}
              <div className="max-w-6xl mx-auto">
                <Card className={`border border-slate-200 shadow-sm rounded-2xl overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
                  <CardHeader className="border-b border-slate-100 bg-cream py-4 px-6">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal" /> AI summary of what needs attention
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {rangeLabel} · {data.important_total} important of {data.total} emails
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
                        {data.total === 0
                          ? sync?.stored_total
                            ? 'No stored emails in this date range.'
                            : 'Nothing stored yet. Use “Pull last 3 months” to load the inbox.'
                          : data.important_total === 0
                            ? 'Nothing in this range needs attention.'
                            : data.summary_error
                              ? `AI summary unavailable: ${data.summary_error}`
                              : 'AI summary is unavailable. Add an OpenAI API key in Settings to enable summaries.'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Important / other */}
              <div className="max-w-6xl mx-auto flex flex-col gap-3">
                <div className="inline-flex self-start rounded-full border border-slate-200 bg-white p-1 gap-0.5">
                  {([
                    ['important', 'Important', data.important_total],
                    ['other', 'Everything else', data.total - data.important_total],
                    ['all', 'All', data.total],
                  ] as Array<[Bucket, string, number]>).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setBucket(key);
                        setGroup(null);
                        setPage(1);
                      }}
                      className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${bucket === key ? 'bg-ink text-white' : 'text-slate-500 hover:text-ink'}`}
                    >
                      {label} <span className="ml-1 text-[10px] font-bold opacity-70">{count}</span>
                    </button>
                  ))}
                </div>
                {groupCounts.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setGroup(null);
                        setPage(1);
                      }}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${!group ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      All groups ({bucketEmails.length})
                    </button>
                    {groupCounts.map((entry) => (
                      <button
                        key={entry.key}
                        type="button"
                        onClick={() => {
                          setGroup(entry.key);
                          setPage(1);
                        }}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${group === entry.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {entry.label} ({entry.count})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* List */}
              <div className="max-w-6xl mx-auto">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    {visibleList.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-sm">
                        {bucket === 'important' ? 'Nothing important in this range' : 'No emails in this range'}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {pageRows.map((email) => (
                          <button
                            key={email.uid}
                            type="button"
                            onClick={() => setOpenId(email.id)}
                            className="w-full text-left px-4 sm:px-5 py-3 hover:bg-cream/50 focus:outline-none focus-visible:bg-cream/70"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${GROUP_CHIP[email.group] || GROUP_CHIP.other}`}>
                                    {GROUP_LABEL[email.group] || email.group}
                                  </span>
                                  {email.important && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                      Needs attention
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-slate-900 truncate">{email.subject}</p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                  {email.from}
                                  {email.fromEmail && email.from !== email.fromEmail ? ` · ${email.fromEmail}` : ''}
                                  {email.senderKind ? ` · ${email.senderKind}` : ''}
                                  {email.reason ? ` · ${email.reason}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <p className="text-[11px] text-slate-400">{email.date ? formatDateTimeSA(email.date) : ''}</p>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {visibleList.length > 0 && (
                      <PaginationFooter
                        page={currentPage}
                        pageSize={pageSize}
                        count={visibleList.length}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                          setPageSize(size);
                          setPage(1);
                        }}
                        pageSizes={[20, 50, 100]}
                        noun="emails"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <p className="max-w-6xl mx-auto text-[11px] text-slate-400">
                {backfillDone
                  ? `The inbox is pulled automatically every morning at 06:00. Last automatic or manual check: ${sync?.last_synced_at ? formatDateTimeSA(sync.last_synced_at) : 'never'}.`
                  : 'Once the three-month pull has run, the inbox is synced automatically every morning at 06:00.'}
                {sync?.last_run?.error ? ` Last sync failed: ${sync.last_run.error}` : ''}
              </p>
            </>
          )}
        </>
      )}

      <EmailViewer emailId={openId} onClose={() => setOpenId(null)} />
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

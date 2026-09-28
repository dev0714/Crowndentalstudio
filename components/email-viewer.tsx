'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, Reply, RefreshCcw, Send, CheckCircle2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTimeSA } from '@/lib/sa-formatting';

type ViewerEmail = {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
  group: string;
  important: boolean;
  reason: string;
  senderKind: string;
  hasAttachments: boolean;
};

type ViewerReply = {
  id: string;
  to_email: string;
  subject: string;
  body_text: string;
  sent_by_name: string | null;
  sent_at: string;
  error: string | null;
};

type ViewerPayload = {
  email: ViewerEmail;
  body: { text: string; html: string };
  body_error: string | null;
  replies: ViewerReply[];
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

function textToHtml(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.55;color:#0b1f3a;white-space:pre-wrap;word-break:break-word">${escaped}</div>`;
}

/**
 * Renders untrusted email HTML in a sandboxed frame. Scripts are forbidden (no
 * allow-scripts); allow-same-origin only lets the parent measure the content
 * height so the frame grows to fit, since the HTML was sanitised server-side.
 */
function BodyFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(240);
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;padding:4px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.55;color:#0b1f3a;word-break:break-word}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${html}</body></html>`;
  const measure = () => {
    try {
      const doc = ref.current?.contentDocument;
      const next = doc ? Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0) : 0;
      if (next > 0) setHeight(Math.min(20000, next + 16));
    } catch {
      /* cross-origin guard; keep the previous height */
    }
  };
  useEffect(() => {
    const timers = [400, 1500, 4000].map((ms) => window.setTimeout(measure, ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);
  return (
    <iframe
      ref={ref}
      title="Email content"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      style={{ height }}
      className="w-full border-0 bg-white"
      onLoad={measure}
    />
  );
}

export function EmailViewer({ emailId, onClose, onReplied }: { emailId: string | null; onClose: () => void; onReplied?: () => void }) {
  const [data, setData] = useState<ViewerPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (!emailId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/emails/${emailId}${refresh ? '?refresh=1' : ''}`, { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to load email');
      const next = payload.data as ViewerPayload;
      setData(next);
      setTo(next.email.fromEmail);
      setSubject(/^re:/i.test(next.email.subject) ? next.email.subject : `Re: ${next.email.subject}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    setReplying(false);
    setMessage('');
    setSentNotice(null);
    if (emailId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailId]);

  const sendReply = async () => {
    if (!emailId || !data) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/emails/${emailId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body: message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to send reply');
      const reply = payload.data.reply as ViewerReply;
      setData({ ...data, replies: [reply, ...data.replies] });
      setSentNotice(`Reply sent to ${to}`);
      setReplying(false);
      setMessage('');
      onReplied?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const email = data?.email;
  const html = data?.body.html || (data?.body.text ? textToHtml(data.body.text) : '');

  return (
    <Sheet open={Boolean(emailId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 gap-0 flex flex-col bg-cream overflow-hidden">
        <SheetTitle className="sr-only">{email?.subject || 'Email'}</SheetTitle>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 pr-14 border-b border-hairline bg-white">
          {loading && !data ? (
            <p className="text-sm text-slate-500">Opening email…</p>
          ) : email ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-navy-800 text-white">{GROUP_LABEL[email.group] || email.group}</span>
                {email.important && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Needs attention</span>
                )}
                {email.senderKind && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{email.senderKind}</span>}
                {email.hasAttachments && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 inline-flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Attachments
                  </span>
                )}
              </div>
              <h2 className="font-display text-[22px] leading-tight text-ink">{email.subject}</h2>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-semibold text-slate-800">{email.from}</span>
                {email.fromEmail && email.from !== email.fromEmail ? ` <${email.fromEmail}>` : ''}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDateTimeSA(email.date)}
                {email.reason ? ` · ${email.reason}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" onClick={() => setReplying((current) => !current)} className="bg-navy-800 hover:bg-ink text-white border-0 text-xs">
                  <Reply className="w-3.5 h-3.5 mr-1.5" /> {replying ? 'Cancel reply' : 'Reply'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => load(true)} disabled={loading} className="text-xs border-slate-200">
                  <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Email</p>
          )}
        </div>

        {/* Scrolling body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
          )}
          {sentNotice && (
            <div className="m-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {sentNotice}
            </div>
          )}

          {replying && data && (
            <div className="m-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-ink">Reply from the practice</p>
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">To</label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} className="h-9 text-sm rounded-lg border-slate-200" />
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm rounded-lg border-slate-200" />
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                placeholder="Write your reply…"
                className="rounded-lg border-slate-200 text-sm"
              />
              <p className="text-[11px] text-slate-400">The original message is quoted underneath your reply. Sent from the practice address configured under Settings, with staff copies.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={sendReply} disabled={sending || !message.trim() || !to.trim()} className="bg-navy-800 hover:bg-ink text-white border-0 text-xs">
                  <Send className="w-3.5 h-3.5 mr-1.5" /> {sending ? 'Sending…' : 'Send reply'}
                </Button>
                <Button variant="outline" onClick={() => setReplying(false)} disabled={sending} className="text-xs border-slate-200">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {data && (
            <div className="m-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {data.body_error ? (
                <p className="p-4 text-sm text-red-700">{data.body_error}</p>
              ) : html ? (
                <div className="p-2 sm:p-3">
                  <BodyFrame html={html} />
                </div>
              ) : (
                <p className="p-6 text-sm text-slate-500 text-center">This email has no readable text.</p>
              )}
              {email?.hasAttachments && (
                <p className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> This email has attachments. Open it in your mail client to download them.
                </p>
              )}
            </div>
          )}

          {data && data.replies.length > 0 && (
            <div className="m-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <p className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-ink">Replies sent from the CRM</p>
              <div className="divide-y divide-slate-100">
                {data.replies.map((reply) => (
                  <div key={reply.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        To {reply.to_email}
                        {reply.sent_by_name ? ` · by ${reply.sent_by_name}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400">{formatDateTimeSA(reply.sent_at)}</p>
                    </div>
                    {reply.error ? (
                      <p className="text-xs text-red-600 mt-1">Failed: {reply.error}</p>
                    ) : (
                      <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{reply.body_text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

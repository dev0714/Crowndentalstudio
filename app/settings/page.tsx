'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, KeyRound, Save, Bell, Mail } from 'lucide-react';

type OpenAiKeyStatus = {
  configured: boolean;
  updated_at: string | null;
  updated_by: string | null;
};

type EmailInboxStatus = {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  tls: boolean;
  mailbox: string;
  updated_at: string | null;
};

type NotificationSettingsStatus = {
  resend_configured: boolean;
  from_email: string;
  lab_notifications_enabled: boolean;
  appointment_notifications_enabled: boolean;
  updated_at: string | null;
};

function SettingsPageContent() {
  const [openAiKey, setOpenAiKey] = useState('');
  const [status, setStatus] = useState<OpenAiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Patient notifications (Resend)
  const [notif, setNotif] = useState<NotificationSettingsStatus | null>(null);
  const [resendKey, setResendKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [labNotifEnabled, setLabNotifEnabled] = useState(true);
  const [apptNotifEnabled, setApptNotifEnabled] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Incoming email (IMAP)
  const [inbox, setInbox] = useState<EmailInboxStatus | null>(null);
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [imapUser, setImapUser] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [imapTls, setImapTls] = useState(true);
  const [imapMailbox, setImapMailbox] = useState('INBOX');
  const [inboxSaving, setInboxSaving] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [inboxSuccess, setInboxSuccess] = useState<string | null>(null);
  const [inboxTesting, setInboxTesting] = useState(false);
  const [inboxTestResult, setInboxTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings().catch((err) => {
      console.error('[v0] Failed to load settings', err);
      setError('Failed to load settings');
    });
    fetchNotificationSettings().catch((err) => {
      console.error('[v0] Failed to load notification settings', err);
      setNotifError('Failed to load notification settings');
    });
    fetchInboxSettings().catch((err) => {
      console.error('[v0] Failed to load email inbox settings', err);
      setInboxError('Failed to load email inbox settings');
    });
  }, []);

  const fetchInboxSettings = async () => {
    const response = await fetch('/api/crm/settings/email-inbox', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load email inbox settings');
    }
    const data = payload.data as EmailInboxStatus;
    setInbox(data);
    setImapHost(data?.host || '');
    setImapPort(String(data?.port || 993));
    setImapUser(data?.user || '');
    setImapTls(data?.tls ?? true);
    setImapMailbox(data?.mailbox || 'INBOX');
  };

  const handleSaveInbox = async () => {
    setInboxSaving(true);
    setInboxError(null);
    setInboxSuccess(null);
    try {
      const body: Record<string, unknown> = {
        host: imapHost,
        port: Number(imapPort) || 993,
        user: imapUser,
        tls: imapTls,
        mailbox: imapMailbox,
      };
      if (imapPassword.trim()) {
        body.password = imapPassword.trim();
      }
      const response = await fetch('/api/crm/settings/email-inbox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save email inbox settings');
      }
      setImapPassword('');
      setInbox(payload.data as EmailInboxStatus);
      setInboxSuccess('Email inbox settings saved.');
    } catch (err) {
      setInboxError(err instanceof Error ? err.message : 'Failed to save email inbox settings');
    } finally {
      setInboxSaving(false);
    }
  };

  const handleTestInbox = async () => {
    setInboxTesting(true);
    setInboxTestResult(null);
    try {
      const response = await fetch('/api/crm/settings/email-inbox/test', {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Connection test failed');
      }
      const count = payload.data?.message_count;
      setInboxTestResult({
        ok: true,
        message: `Connected to ${payload.data?.host} — mailbox "${payload.data?.mailbox}" reachable${
          typeof count === 'number' ? ` (${count} messages)` : ''
        }.`,
      });
    } catch (err) {
      setInboxTestResult({ ok: false, message: err instanceof Error ? err.message : 'Connection test failed' });
    } finally {
      setInboxTesting(false);
    }
  };

  const fetchNotificationSettings = async () => {
    const response = await fetch('/api/crm/settings/notifications', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load notification settings');
    }
    const data = payload.data as NotificationSettingsStatus;
    setNotif(data);
    setFromEmail(data?.from_email || '');
    setLabNotifEnabled(data?.lab_notifications_enabled ?? true);
    setApptNotifEnabled(data?.appointment_notifications_enabled ?? true);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      setTestResult({ ok: false, message: 'Enter an email address to send the test to' });
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/crm/settings/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send test email');
      }
      setTestResult({ ok: true, message: `Test email sent to ${testEmail.trim()}. Check the inbox (and spam).` });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to send test email' });
    } finally {
      setTestSending(false);
    }
  };

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    setNotifError(null);
    setNotifSuccess(null);
    try {
      const body: Record<string, unknown> = {
        from_email: fromEmail,
        lab_notifications_enabled: labNotifEnabled,
        appointment_notifications_enabled: apptNotifEnabled,
      };
      if (resendKey.trim()) {
        body.resend_api_key = resendKey.trim();
      }
      const response = await fetch('/api/crm/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save notification settings');
      }
      setResendKey('');
      setNotif(payload.data as NotificationSettingsStatus);
      setNotifSuccess('Notification settings saved.');
    } catch (err) {
      console.error('[v0] Failed to save notification settings', err);
      setNotifError(err instanceof Error ? err.message : 'Failed to save notification settings');
    } finally {
      setNotifSaving(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/crm/settings/openai-key', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load settings');
      }

      setStatus(payload.data || null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!openAiKey.trim()) {
      setError('Please enter an OpenAI API key');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/crm/settings/openai-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ openai_api_key: openAiKey }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save settings');
      }

      setOpenAiKey('');
      setSuccess('OpenAI key saved securely.');
      await fetchSettings();
    } catch (err) {
      console.error('[v0] Failed to save settings', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage secure system configuration</p>
          </div>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">OpenAI API Key</CardTitle>
                  <CardDescription className="text-xs">
                    Stored encrypted on the server for voice note transcription only
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                The key is never shown again after save. Only staff with CEO or Admin access can update it.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {loading ? 'Loading…' : status?.configured ? 'Configured' : 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Last Updated</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {status?.updated_at ? new Date(status.updated_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">OpenAI API Key</label>
                <Input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-..."
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving…' : 'Save Key'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOpenAiKey('')}
                  className="border-slate-200"
                  type="button"
                >
                  Clear
                </Button>
              </div>

              {success && <p className="text-sm text-emerald-700">{success}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Patient Notifications (Resend)</CardTitle>
                  <CardDescription className="text-xs">
                    Email patients automatically about lab case progress and appointment changes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
                Add your Resend API key and the &ldquo;from&rdquo; address you verified in Resend. Patients with an
                email on file are then notified when their lab work arrives at the lab and when it is delivered back
                to Crown Dental Studio. The key is stored encrypted and never shown again.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Resend Key</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {notif == null ? 'Loading…' : notif.resend_configured ? 'Configured' : 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Last Updated</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {notif?.updated_at ? new Date(notif.updated_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">Resend API Key</label>
                <Input
                  type="password"
                  value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                  placeholder={notif?.resend_configured ? 'Leave blank to keep current key' : 're_...'}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">From Email Address</label>
                <Input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="Crown Dental Studio <noreply@yourdomain.co.za>"
                  className="rounded-xl border-slate-200"
                />
                <p className="text-xs text-slate-400">Must be a domain or address verified in your Resend account.</p>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={labNotifEnabled}
                  onChange={(e) => setLabNotifEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">
                  Send patients an email when their lab case reaches a new stage (arrived at lab / delivered back)
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={apptNotifEnabled}
                  onChange={(e) => setApptNotifEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">
                  Send patients an email when an appointment is booked, rescheduled or cancelled
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSaveNotifications} disabled={notifSaving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {notifSaving ? 'Saving…' : 'Save Notification Settings'}
                </Button>
              </div>

              {notifSuccess && <p className="text-sm text-emerald-700">{notifSuccess}</p>}
              {notifError && <p className="text-sm text-red-600">{notifError}</p>}

              <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Send a test email</p>
                  <p className="text-xs text-slate-500">
                    Verify your Resend key and sending domain by emailing any address. Save your settings first.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl border-slate-200 flex-1"
                  />
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={testSending}
                    variant="outline"
                    className="border-slate-300"
                  >
                    {testSending ? 'Sending…' : 'Send Test Email'}
                  </Button>
                </div>
                {testResult && (
                  <p className={`text-sm ${testResult.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                    {testResult.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Incoming Email (IMAP)</CardTitle>
                  <CardDescription className="text-xs">
                    Connect the practice mailbox so the Emails tab can pull the last 48 hours of messages
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
                Pulling email uses <strong>IMAP</strong> (SMTP only sends). Enter your mail host, e.g.
                <code className="mx-1 rounded bg-white/70 px-1">imap.gmail.com</code> on port 993, the full mailbox
                address as the username, and an app password. The password is stored encrypted and never shown again.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {inbox == null ? 'Loading…' : inbox.configured ? 'Configured' : 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Last Updated</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {inbox?.updated_at ? new Date(inbox.updated_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">IMAP Host</label>
                  <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.yourprovider.com" className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">Port</label>
                  <Input value={imapPort} onChange={(e) => setImapPort(e.target.value)} placeholder="993" className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">Username (email)</label>
                  <Input value={imapUser} onChange={(e) => setImapUser(e.target.value)} placeholder="info@crowndentalstudio.co.za" className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">Password / App password</label>
                  <Input type="password" value={imapPassword} onChange={(e) => setImapPassword(e.target.value)} placeholder={inbox?.configured ? 'Leave blank to keep current' : '••••••••'} className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">Mailbox</label>
                  <Input value={imapMailbox} onChange={(e) => setImapMailbox(e.target.value)} placeholder="INBOX" className="rounded-xl border-slate-200" />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer self-end">
                  <input type="checkbox" checked={imapTls} onChange={(e) => setImapTls(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-slate-700">Use TLS (recommended, port 993)</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSaveInbox} disabled={inboxSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {inboxSaving ? 'Saving…' : 'Save Email Settings'}
                </Button>
                <Button
                  onClick={handleTestInbox}
                  disabled={inboxTesting || !inbox?.configured}
                  variant="outline"
                  className="border-indigo-200 text-indigo-700"
                >
                  {inboxTesting ? 'Testing…' : 'Test Connection'}
                </Button>
              </div>
              {!inbox?.configured && (
                <p className="text-xs text-slate-400">Save your settings before testing the connection.</p>
              )}

              {inboxSuccess && <p className="text-sm text-emerald-700">{inboxSuccess}</p>}
              {inboxError && <p className="text-sm text-red-600">{inboxError}</p>}
              {inboxTestResult && (
                <p className={`text-sm ${inboxTestResult.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                  {inboxTestResult.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Security note</p>
                <p className="text-sm text-slate-600">
                  We store the key encrypted in the database and only decrypt it on the server when voice notes need transcription.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}

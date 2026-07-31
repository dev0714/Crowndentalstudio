'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, KeyRound, Save, Bell } from 'lucide-react';

type OpenAiKeyStatus = {
  configured: boolean;
  updated_at: string | null;
  updated_by: string | null;
};

type NotificationSettingsStatus = {
  resend_configured: boolean;
  from_email: string;
  lab_notifications_enabled: boolean;
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
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings().catch((err) => {
      console.error('[v0] Failed to load settings', err);
      setError('Failed to load settings');
    });
    fetchNotificationSettings().catch((err) => {
      console.error('[v0] Failed to load notification settings', err);
      setNotifError('Failed to load notification settings');
    });
  }, []);

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
  };

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    setNotifError(null);
    setNotifSuccess(null);
    try {
      const body: Record<string, unknown> = {
        from_email: fromEmail,
        lab_notifications_enabled: labNotifEnabled,
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
                    Email patients automatically when their lab case reaches the lab or is delivered back
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

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSaveNotifications} disabled={notifSaving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {notifSaving ? 'Saving…' : 'Save Notification Settings'}
                </Button>
              </div>

              {notifSuccess && <p className="text-sm text-emerald-700">{notifSuccess}</p>}
              {notifError && <p className="text-sm text-red-600">{notifError}</p>}
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

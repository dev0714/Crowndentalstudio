import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';
import {
  decryptSettingSecret,
  encryptSettingSecret,
  resolveSettingsEncryptionSecret,
} from './secret-vault.ts';

export const RESEND_API_KEY_SETTING = 'resend_api_key';
export const RESEND_FROM_EMAIL_SETTING = 'resend_from_email';
export const LAB_NOTIFICATIONS_ENABLED_SETTING = 'lab_notifications_enabled';

type SettingRow = {
  setting_key: string;
  setting_value?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

function getEncryptionSecret() {
  const secret = resolveSettingsEncryptionSecret();
  if (!secret) {
    throw new Error('Settings encryption secret is required');
  }
  return secret;
}

async function readSetting(key: string) {
  const { data, error } = await supabaseServer
    .from('settings')
    .select('setting_key, setting_value, updated_at, updated_by')
    .eq('setting_key', key)
    .maybeSingle<SettingRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

export async function getResendApiKey() {
  if (process.env.RESEND_API_KEY) {
    return process.env.RESEND_API_KEY;
  }

  const row = await readSetting(RESEND_API_KEY_SETTING);
  if (!row?.setting_value) {
    return null;
  }

  return decryptSettingSecret(row.setting_value, getEncryptionSecret());
}

export async function getResendFromEmail() {
  if (process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }

  const row = await readSetting(RESEND_FROM_EMAIL_SETTING);
  return row?.setting_value?.trim() || null;
}

export async function areLabNotificationsEnabled() {
  const row = await readSetting(LAB_NOTIFICATIONS_ENABLED_SETTING);
  // Default to enabled: once a key and sender are configured, notifications should fire
  // unless the practice explicitly turns them off.
  if (!row || row.setting_value == null) {
    return true;
  }
  return row.setting_value === 'true';
}

export async function getNotificationSettingsStatus() {
  const [apiKeyRow, fromRow, enabledRow] = await Promise.all([
    readSetting(RESEND_API_KEY_SETTING),
    readSetting(RESEND_FROM_EMAIL_SETTING),
    readSetting(LAB_NOTIFICATIONS_ENABLED_SETTING),
  ]);

  const updatedTimestamps = [apiKeyRow?.updated_at, fromRow?.updated_at, enabledRow?.updated_at]
    .filter((value): value is string => Boolean(value))
    .sort()
    .reverse();

  return {
    resend_configured: Boolean(process.env.RESEND_API_KEY || apiKeyRow?.setting_value),
    from_email: process.env.RESEND_FROM_EMAIL || fromRow?.setting_value || '',
    lab_notifications_enabled: enabledRow?.setting_value == null ? true : enabledRow.setting_value === 'true',
    updated_at: updatedTimestamps[0] || null,
  };
}

type SaveNotificationSettingsInput = {
  apiKey?: string | null;
  fromEmail?: string | null;
  labNotificationsEnabled?: boolean | null;
};

export async function saveNotificationSettings(input: SaveNotificationSettingsInput, updatedBy: string | null) {
  const rows: Array<{
    setting_key: string;
    setting_value: string;
    setting_type: string;
    description: string;
    updated_by: string | null;
    updated_at: string;
  }> = [];

  const nowIso = new Date().toISOString();

  if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
    rows.push({
      setting_key: RESEND_API_KEY_SETTING,
      setting_value: encryptSettingSecret(input.apiKey.trim(), getEncryptionSecret()),
      setting_type: 'secret',
      description: 'Encrypted Resend API key used for patient notifications',
      updated_by: updatedBy,
      updated_at: nowIso,
    });
  }

  if (typeof input.fromEmail === 'string') {
    rows.push({
      setting_key: RESEND_FROM_EMAIL_SETTING,
      setting_value: input.fromEmail.trim(),
      setting_type: 'text',
      description: 'From address used when sending patient notifications via Resend',
      updated_by: updatedBy,
      updated_at: nowIso,
    });
  }

  if (typeof input.labNotificationsEnabled === 'boolean') {
    rows.push({
      setting_key: LAB_NOTIFICATIONS_ENABLED_SETTING,
      setting_value: input.labNotificationsEnabled ? 'true' : 'false',
      setting_type: 'text',
      description: 'Whether patients are emailed when their lab case reaches a new stage',
      updated_by: updatedBy,
      updated_at: nowIso,
    });
  }

  if (rows.length === 0) {
    return getNotificationSettingsStatus();
  }

  const { error } = await supabaseServer.from('settings').upsert(rows, { onConflict: 'setting_key' });
  if (error) {
    throw new Error(error.message);
  }

  return getNotificationSettingsStatus();
}

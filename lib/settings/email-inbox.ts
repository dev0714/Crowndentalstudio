import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';
import {
  decryptSettingSecret,
  encryptSettingSecret,
  resolveSettingsEncryptionSecret,
} from './secret-vault.ts';

export const IMAP_HOST_SETTING = 'imap_host';
export const IMAP_PORT_SETTING = 'imap_port';
export const IMAP_USER_SETTING = 'imap_user';
export const IMAP_PASSWORD_SETTING = 'imap_password';
export const IMAP_TLS_SETTING = 'imap_tls';
export const IMAP_MAILBOX_SETTING = 'imap_mailbox';

type SettingRow = {
  setting_key: string;
  setting_value?: string | null;
  updated_at?: string | null;
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
    .select('setting_key, setting_value, updated_at')
    .eq('setting_key', key)
    .maybeSingle<SettingRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

export type ImapConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  mailbox: string;
};

export async function getImapConfig(): Promise<ImapConfig | null> {
  const [hostRow, portRow, userRow, passwordRow, tlsRow, mailboxRow] = await Promise.all([
    readSetting(IMAP_HOST_SETTING),
    readSetting(IMAP_PORT_SETTING),
    readSetting(IMAP_USER_SETTING),
    readSetting(IMAP_PASSWORD_SETTING),
    readSetting(IMAP_TLS_SETTING),
    readSetting(IMAP_MAILBOX_SETTING),
  ]);

  const host = process.env.IMAP_HOST || hostRow?.setting_value || '';
  const user = process.env.IMAP_USER || userRow?.setting_value || '';
  const password = process.env.IMAP_PASSWORD
    || (passwordRow?.setting_value ? decryptSettingSecret(passwordRow.setting_value, getEncryptionSecret()) : '');

  if (!host || !user || !password) {
    return null;
  }

  const tls = (process.env.IMAP_TLS || tlsRow?.setting_value || 'true') !== 'false';
  const port = Number(process.env.IMAP_PORT || portRow?.setting_value || (tls ? 993 : 143)) || (tls ? 993 : 143);
  const mailbox = process.env.IMAP_MAILBOX || mailboxRow?.setting_value || 'INBOX';

  return { host, port, user, password, tls, mailbox };
}

export async function getImapConfigStatus() {
  const [hostRow, portRow, userRow, passwordRow, tlsRow, mailboxRow] = await Promise.all([
    readSetting(IMAP_HOST_SETTING),
    readSetting(IMAP_PORT_SETTING),
    readSetting(IMAP_USER_SETTING),
    readSetting(IMAP_PASSWORD_SETTING),
    readSetting(IMAP_TLS_SETTING),
    readSetting(IMAP_MAILBOX_SETTING),
  ]);

  const host = process.env.IMAP_HOST || hostRow?.setting_value || '';
  const user = process.env.IMAP_USER || userRow?.setting_value || '';
  const passwordConfigured = Boolean(process.env.IMAP_PASSWORD || passwordRow?.setting_value);
  const tls = (process.env.IMAP_TLS || tlsRow?.setting_value || 'true') !== 'false';

  const updatedTimestamps = [hostRow, portRow, userRow, passwordRow, tlsRow, mailboxRow]
    .map((row) => row?.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .reverse();

  return {
    configured: Boolean(host && user && passwordConfigured),
    host,
    port: Number(process.env.IMAP_PORT || portRow?.setting_value || (tls ? 993 : 143)) || (tls ? 993 : 143),
    user,
    tls,
    mailbox: process.env.IMAP_MAILBOX || mailboxRow?.setting_value || 'INBOX',
    updated_at: updatedTimestamps[0] || null,
  };
}

type SaveImapConfigInput = {
  host?: string | null;
  port?: number | null;
  user?: string | null;
  password?: string | null;
  tls?: boolean | null;
  mailbox?: string | null;
};

export async function saveImapConfig(input: SaveImapConfigInput, updatedBy: string | null) {
  const rows: Array<{
    setting_key: string;
    setting_value: string;
    setting_type: string;
    description: string;
    updated_by: string | null;
    updated_at: string;
  }> = [];
  const nowIso = new Date().toISOString();

  const push = (key: string, value: string, type: string, description: string) =>
    rows.push({ setting_key: key, setting_value: value, setting_type: type, description, updated_by: updatedBy, updated_at: nowIso });

  if (typeof input.host === 'string') push(IMAP_HOST_SETTING, input.host.trim(), 'text', 'IMAP host for pulling client emails');
  if (typeof input.port === 'number' && Number.isFinite(input.port)) push(IMAP_PORT_SETTING, String(Math.trunc(input.port)), 'text', 'IMAP port');
  if (typeof input.user === 'string') push(IMAP_USER_SETTING, input.user.trim(), 'text', 'IMAP username');
  if (typeof input.password === 'string' && input.password.trim()) {
    push(IMAP_PASSWORD_SETTING, encryptSettingSecret(input.password.trim(), getEncryptionSecret()), 'secret', 'Encrypted IMAP password');
  }
  if (typeof input.tls === 'boolean') push(IMAP_TLS_SETTING, input.tls ? 'true' : 'false', 'text', 'Whether the IMAP connection uses implicit TLS');
  if (typeof input.mailbox === 'string' && input.mailbox.trim()) push(IMAP_MAILBOX_SETTING, input.mailbox.trim(), 'text', 'IMAP mailbox to read');

  if (rows.length === 0) {
    return getImapConfigStatus();
  }

  const { error } = await supabaseServer.from('settings').upsert(rows, { onConflict: 'setting_key' });
  if (error) {
    throw new Error(error.message);
  }

  return getImapConfigStatus();
}

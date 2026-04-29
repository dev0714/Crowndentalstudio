import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';
import {
  decryptSettingSecret,
  encryptSettingSecret,
  resolveSettingsEncryptionSecret,
} from './secret-vault.ts';

export const OPENAI_API_KEY_SETTING = 'openai_api_key';

type OpenAiKeySettingRow = {
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

export async function getStoredOpenAiApiKey() {
  const { data, error } = await supabaseServer
    .from('settings')
    .select('setting_key, setting_value, updated_at, updated_by')
    .eq('setting_key', OPENAI_API_KEY_SETTING)
    .maybeSingle<OpenAiKeySettingRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.setting_value) {
    return null;
  }

  return decryptSettingSecret(data.setting_value, getEncryptionSecret());
}

export async function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY || (await getStoredOpenAiApiKey());
}

export async function getOpenAiApiKeyStatus() {
  const { data, error } = await supabaseServer
    .from('settings')
    .select('setting_key, updated_at, updated_by')
    .eq('setting_key', OPENAI_API_KEY_SETTING)
    .maybeSingle<OpenAiKeySettingRow>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    configured: Boolean(process.env.OPENAI_API_KEY || data?.setting_key),
    updated_at: data?.updated_at || null,
    updated_by: data?.updated_by || null,
  };
}

export async function saveOpenAiApiKey(openaiApiKey: string, updatedBy: string | null) {
  const encryptedValue = encryptSettingSecret(openaiApiKey.trim(), getEncryptionSecret());
  const { error } = await supabaseServer.from('settings').upsert(
    [
      {
        setting_key: OPENAI_API_KEY_SETTING,
        setting_value: encryptedValue,
        setting_type: 'secret',
        description: 'Encrypted OpenAI API key used for voice note transcription',
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'setting_key' },
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    configured: true,
  };
}

import crypto from 'node:crypto';

const ENVELOPE_PREFIX = 'v1';

function deriveKey(secret: string) {
  return crypto.createHash('sha256').update(secret).digest();
}

function encodeBase64Url(value: Buffer) {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function assertSecret(secret: string) {
  if (!secret || !secret.trim()) {
    throw new Error('Settings encryption secret is required');
  }
}

export function encryptSettingSecret(value: string, secret: string) {
  assertSecret(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_PREFIX,
    encodeBase64Url(iv),
    encodeBase64Url(authTag),
    encodeBase64Url(ciphertext),
  ].join(':');
}

export function decryptSettingSecret(encryptedValue: string, secret: string) {
  assertSecret(secret);

  const parts = encryptedValue.split(':');
  if (parts.length !== 4 || parts[0] !== ENVELOPE_PREFIX) {
    throw new Error('Invalid encrypted setting payload');
  }

  const iv = decodeBase64Url(parts[1]);
  const authTag = decodeBase64Url(parts[2]);
  const ciphertext = decodeBase64Url(parts[3]);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(secret), iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

export function resolveSettingsEncryptionSecret() {
  return (
    process.env.SETTINGS_ENCRYPTION_SECRET ||
    process.env.SETTINGS_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

export function maskSecretValue(value: string) {
  if (!value) {
    return '';
  }

  return `${value.slice(0, 4)}${'•'.repeat(Math.max(0, value.length - 8))}${value.slice(-4)}`;
}

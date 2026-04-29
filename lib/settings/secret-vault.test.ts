import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptSettingSecret, encryptSettingSecret } from './secret-vault.ts';

test('encryptSettingSecret round-trips with the same secret', () => {
  const encrypted = encryptSettingSecret('sk-test-123', 'practice-secret-key');
  const decrypted = decryptSettingSecret(encrypted, 'practice-secret-key');

  assert.equal(decrypted, 'sk-test-123');
});

test('decryptSettingSecret rejects tampered payloads', () => {
  const encrypted = encryptSettingSecret('sk-test-123', 'practice-secret-key');
  const tampered = encrypted.replace(/.$/, encrypted.endsWith('A') ? 'B' : 'A');

  assert.throws(() => decryptSettingSecret(tampered, 'practice-secret-key'));
});

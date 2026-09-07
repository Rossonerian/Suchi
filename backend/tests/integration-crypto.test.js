import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret } from '../integrations/crypto.js';

const key = Buffer.alloc(32, 7).toString('base64');

test('integration secrets round-trip through authenticated encryption', () => {
  const encrypted = encryptSecret('refresh-token-value', key);
  assert.notEqual(encrypted, 'refresh-token-value');
  assert.equal(decryptSecret(encrypted, key), 'refresh-token-value');
});

test('integration secrets reject tampering and invalid keys', () => {
  const encrypted = encryptSecret('secret', key);
  assert.throws(() => decryptSecret(`${encrypted}tampered`, key), /Unable to decrypt/);
  assert.throws(() => encryptSecret('secret', 'too-short'), { code: 'INTEGRATION_KEY_INVALID' });
});

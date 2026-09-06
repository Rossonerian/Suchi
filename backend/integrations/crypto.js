const crypto = require('node:crypto');

function decodeKey(value = process.env.INTEGRATION_ENCRYPTION_KEY) {
  if (!value) {
    const error = new Error('INTEGRATION_ENCRYPTION_KEY is required.');
    error.code = 'INTEGRATION_KEY_INVALID';
    throw error;
  }
  const key = Buffer.isBuffer(value)
    ? value
    : /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) {
    const error = new Error('INTEGRATION_ENCRYPTION_KEY must decode to 32 bytes.');
    error.code = 'INTEGRATION_KEY_INVALID';
    throw error;
  }
  return key;
}

function encryptSecret(plaintext, keyInput) {
  const key = decodeKey(keyInput);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

function decryptSecret(payload, keyInput) {
  try {
    const [version, ivValue, tagValue, ciphertextValue] = String(payload).split('.');
    if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) throw new Error('invalid payload');
    const decipher = crypto.createDecipheriv('aes-256-gcm', decodeKey(keyInput), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8');
  } catch (error) {
    if (error.code === 'INTEGRATION_KEY_INVALID') throw error;
    const wrapped = new Error('Unable to decrypt integration secret.');
    wrapped.code = 'INTEGRATION_SECRET_INVALID';
    throw wrapped;
  }
}

module.exports = { decodeKey, encryptSecret, decryptSecret };


class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

function requiredString(value, field, { max = 500 } = {}) {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required.`);
  const normalized = value.trim();
  if (normalized.length > max) throw new ValidationError(`${field} must be ${max} characters or fewer.`);
  return normalized;
}

function optionalString(value, field, { max = 5000 } = {}) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw new ValidationError(`${field} must be text.`);
  const normalized = value.trim();
  if (normalized.length > max) throw new ValidationError(`${field} must be ${max} characters or fewer.`);
  return normalized;
}

function parseObjectId(value, field) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) {
    throw new ValidationError(`${field} must be a valid ID.`);
  }
  return value;
}

function optionalObjectId(value, field) {
  return value == null || value === '' ? null : parseObjectId(value, field);
}

function normalizeHttpUrl(value, field = 'URL') {
  const raw = optionalString(value, field, { max: 2048 });
  if (!raw) return '';
  let url;
  try { url = new URL(raw); } catch { throw new ValidationError(`${field} must be a valid HTTP(S) URL.`); }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ValidationError(`${field} must use http or https.`);
  }
  return url.toString();
}

function parseDate(value, field) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new ValidationError(`${field} must be a valid date.`);
  return date;
}

function parseFutureDate(value) {
  const date = parseDate(value, 'scheduledAt');
  if (date.getTime() <= Date.now()) throw new ValidationError('scheduledAt must be in the future.');
  return date;
}

function parseEmail(value) {
  const email = requiredString(value, 'email', { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('email must be valid.');
  return email;
}

function parseSchema(schema, value, message = 'Request input is invalid.') {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error?.name !== 'ZodError') throw error;
    throw new AppError(message, 400, 'VALIDATION_ERROR', { issues: error.issues || [] });
  }
}

export {
  AppError, ValidationError, requiredString, optionalString, parseObjectId,
  optionalObjectId, normalizeHttpUrl, parseDate, parseFutureDate, parseEmail, parseSchema,
};

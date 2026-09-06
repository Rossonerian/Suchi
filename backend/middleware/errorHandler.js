// Single responsibility: catch errors from any route and return a
// consistent JSON error shape instead of leaking stack traces.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Keep server logs useful without copying database, SMTP, or request data.
  console.error('[error]', err.name || 'Error', err.code || 'UNCLASSIFIED');
  if (err.code === 11000) {
    return res.status(409).json({ error: 'That record already exists.', code: 'CONFLICT' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'One of the supplied IDs is invalid.', code: 'VALIDATION_ERROR' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Request body must be valid JSON.', code: 'VALIDATION_ERROR' });
  }
  // Known operational errors (including a deliberately unavailable optional
  // provider during migration) still use the stable API shape. Internal
  // errors retain the generic response below.
  if (err.status && err.status >= 400 && err.status < 600 && err.code && err.code !== 'INTERNAL_ERROR') {
    const body = { error: err.message, code: err.code || 'REQUEST_ERROR' };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  return res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' });
}

module.exports = { errorHandler };

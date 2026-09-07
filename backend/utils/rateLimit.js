function rateLimitHandler(req, res) { // eslint-disable-line no-unused-vars
  return res.status(429).json({
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  });
}

export { rateLimitHandler };

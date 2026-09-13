export function authErrorMessage(error, mode) {
  if (!error || error.name !== 'BetterAuthError' || error.status === 0 || error.code === 'NETWORK_ERROR') return 'Suchi is unavailable right now. Check your connection and try again.';
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD' || error.code === 'INVALID_PASSWORD' || (mode === 'signin' && error.status === 401)) return 'The email or password is incorrect.';
  if (error.code === 'SOCIAL_PROVIDER_NOT_FOUND' || error.code === 'PROVIDER_NOT_FOUND') return 'Google sign-in is not available in this environment.';
  if (error.code === 'USER_ALREADY_EXISTS' || error.status === 409) return 'An account with this email already exists. Sign in instead.';
  if (error.status >= 400 && error.status < 500) return error.code === 'PASSWORD_TOO_SHORT' ? 'Choose a longer password.' : 'Check the details and try again.';
  return 'We could not complete that request. Please try again.';
}

export function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

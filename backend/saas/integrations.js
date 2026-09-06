const { AppError } = require('../utils/validation');
const { createOAuthState, verifyOAuthState } = require('../integrations/oauth-state');
const { encryptSecret } = require('../integrations/crypto');

function startGoogleCalendar({ provider, context, stateSecret = process.env.INTEGRATION_STATE_SECRET }) {
  if (!context?.organizationId || !context.userId) throw new AppError('An authenticated organization context is required.', 401, 'UNAUTHENTICATED');
  const state = createOAuthState({ organizationId: context.organizationId, userId: context.userId }, stateSecret);
  return { authorizationUrl: provider.getAuthorizationUrl(state) };
}

async function completeGoogleCalendar({ db, provider, state, code, stateSecret = process.env.INTEGRATION_STATE_SECRET, encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY }) {
  const context = verifyOAuthState(state, stateSecret);
  if (!code) throw new AppError('Google authorization code is required.', 400, 'OAUTH_CODE_REQUIRED');
  const tokens = await provider.exchangeCode(code);
  if (!tokens?.access_token) throw new AppError('Google authorization did not return an access token.', 400, 'OAUTH_TOKEN_INVALID');
  const encryptedToken = encryptSecret(JSON.stringify(tokens), encryptionKey);
  provider.setCredentials(tokens);
  const calendars = await provider.listCalendars();
  const connection = await db.$transaction(async (tx) => {
    const saved = await tx.integrationConnection.upsert({
      where: { organizationId_provider: { organizationId: context.organizationId, provider: 'google_calendar' } },
      create: { organizationId: context.organizationId, provider: 'google_calendar', status: 'connected', encryptedToken },
      update: { status: 'connected', encryptedToken },
    });
    await tx.integrationAccount.deleteMany({ where: { connectionId: saved.id } });
    const accounts = (calendars.items || []).filter((calendar) => calendar.id).map((calendar) => ({ connectionId: saved.id, externalId: calendar.id, displayName: calendar.summary || calendar.id }));
    if (accounts.length) await tx.integrationAccount.createMany({ data: accounts });
    return saved;
  });
  return { connectionId: connection.id, calendars: calendars.items || [] };
}

module.exports = { startGoogleCalendar, completeGoogleCalendar };

const test = require('node:test');
const assert = require('node:assert/strict');
const { startGoogleCalendar, completeGoogleCalendar } = require('../saas/integrations');

const stateSecret = 'state-secret';
const encryptionKey = Buffer.alloc(32, 9).toString('base64');
const context = { organizationId: 'org_a', userId: 'user_a' };

test('Google Calendar start returns a signed authorization URL', () => {
  const result = startGoogleCalendar({ provider: { getAuthorizationUrl: (state) => `https://google.test/oauth?state=${state}` }, context, stateSecret });
  assert.match(result.authorizationUrl, /^https:\/\/google\.test\/oauth\?state=/);
  assert.equal(result.authorizationUrl.includes('org_a'), false);
});

test('Google Calendar callback encrypts tokens and returns calendars without secrets', async () => {
  let stored;
  const provider = {
    getAuthorizationUrl: () => '',
    exchangeCode: async () => ({ access_token: 'access', refresh_token: 'refresh', expiry_date: 123 }),
    setCredentials: (tokens) => assert.equal(tokens.refresh_token, 'refresh'),
    listCalendars: async () => ({ items: [{ id: 'primary', summary: 'Work' }] }),
  };
  const db = {
    integrationConnection: {
      upsert: async ({ create }) => { stored = create; return { id: 'connection_a' }; },
    },
    integrationAccount: {
      deleteMany: async () => ({}),
      createMany: async () => ({}),
    },
    $transaction: async (callback) => callback(db),
  };
  const started = startGoogleCalendar({ provider: { getAuthorizationUrl: (state) => state }, context, stateSecret });
  const result = await completeGoogleCalendar({ db, provider, state: started.authorizationUrl, code: 'code', stateSecret, encryptionKey });
  assert.deepEqual(result.calendars, [{ id: 'primary', summary: 'Work' }]);
  assert.equal(result.connectionId, 'connection_a');
  assert.equal(stored.organizationId, 'org_a');
  assert.notEqual(stored.encryptedToken, JSON.stringify({ access_token: 'access', refresh_token: 'refresh', expiry_date: 123 }));
  assert.equal('encryptedToken' in result, false);
});

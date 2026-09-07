import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleCalendarProvider, CALENDAR_SCOPES } from '../integrations/google-calendar.js';

test('Google Calendar adapter requests least-privilege scopes', () => {
  assert.deepEqual(CALENDAR_SCOPES, [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  ]);
});

test('Google Calendar adapter delegates calendar operations without exposing credentials', async () => {
  const calls = [];
  const oauthClient = {
    generateAuthUrl: (options) => { calls.push(['auth', options]); return 'https://accounts.google.test/oauth'; },
    getToken: async (code) => { calls.push(['token', code]); return { tokens: { access_token: 'access', refresh_token: 'refresh' } }; },
    setCredentials: (tokens) => { calls.push(['credentials', tokens]); },
  };
  const calendarClient = {
    calendarList: { list: async () => ({ data: { items: [{ id: 'primary', summary: 'Work' }] } }) },
    events: {
      insert: async (request) => ({ data: { id: 'event_1', ...request.requestBody } }),
      update: async (request) => ({ data: { id: request.eventId, ...request.requestBody } }),
      delete: async (request) => { calls.push(['delete', request]); return { data: {} }; },
    },
  };
  const provider = new GoogleCalendarProvider({ oauthClient, calendarClient });
  assert.equal(provider.getAuthorizationUrl('opaque-state'), 'https://accounts.google.test/oauth');
  assert.deepEqual(await provider.exchangeCode('auth-code'), { access_token: 'access', refresh_token: 'refresh' });
  assert.deepEqual((await provider.listCalendars()).items, [{ id: 'primary', summary: 'Work' }]);
  assert.equal((await provider.createEvent({ calendarId: 'primary', event: { summary: 'Standup' } })).id, 'event_1');
  assert.equal((await provider.updateEvent({ calendarId: 'primary', eventId: 'event_1', event: { summary: 'Updated' } })).summary, 'Updated');
  await provider.cancelEvent({ calendarId: 'primary', eventId: 'event_1' });
  assert.equal(calls.some(([type]) => type === 'delete'), true);
});

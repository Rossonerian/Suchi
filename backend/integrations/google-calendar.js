const { google } = require('googleapis');

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
];

class GoogleCalendarProvider {
  constructor({ clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET, redirectUri = process.env.GOOGLE_REDIRECT_URI, oauthClient, calendarClient } = {}) {
    if (oauthClient) {
      this.oauthClient = oauthClient;
    } else {
      if (!clientId || !clientSecret || !redirectUri) throw new Error('Google Calendar OAuth is not configured.');
      this.oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    }
    this.calendarClient = calendarClient || google.calendar({ version: 'v3', auth: this.oauthClient });
  }

  getAuthorizationUrl(state) {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: CALENDAR_SCOPES,
      state,
    });
  }

  async exchangeCode(code) {
    const { tokens } = await this.oauthClient.getToken(code);
    return tokens;
  }

  setCredentials(tokens) {
    this.oauthClient.setCredentials(tokens);
  }

  async listCalendars({ pageToken, maxResults = 100 } = {}) {
    const { data } = await this.calendarClient.calendarList.list({ pageToken, maxResults, showDeleted: false });
    return data;
  }

  async createEvent({ calendarId = 'primary', event, sendUpdates = 'all' }) {
    const { data } = await this.calendarClient.events.insert({ calendarId, requestBody: event, sendUpdates, conferenceDataVersion: event.conferenceData ? 1 : undefined });
    return data;
  }

  async updateEvent({ calendarId = 'primary', eventId, event, sendUpdates = 'all' }) {
    const { data } = await this.calendarClient.events.update({ calendarId, eventId, requestBody: event, sendUpdates, conferenceDataVersion: event.conferenceData ? 1 : undefined });
    return data;
  }

  async cancelEvent({ calendarId = 'primary', eventId, sendUpdates = 'all' }) {
    await this.calendarClient.events.delete({ calendarId, eventId, sendUpdates });
  }
}

module.exports = { CALENDAR_SCOPES, GoogleCalendarProvider };

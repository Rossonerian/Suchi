import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMeetingEmail } from '../utils/meetingEmail.js';

test('buildMeetingEmail includes title, agenda, and every attendee', () => {
  const { subject, text, html } = buildMeetingEmail({
    title: 'Sprint sync',
    agenda: 'Review SLAM progress',
    scheduledAt: '2026-09-10T10:00:00+05:30',
    inviteeNames: ['Rajeev', 'Priya'],
    organizerName: 'Rajeev',
  });

  assert.match(subject, /Sprint sync/);
  assert.match(text, /Review SLAM progress/);
  assert.match(text, /- Rajeev/);
  assert.match(text, /- Priya/);
  assert.match(html, /Rajeev/);
  assert.match(html, /Priya/);
});

test('buildMeetingEmail escapes HTML in user-provided text', () => {
  const { html } = buildMeetingEmail({
    title: '<script>alert(1)</script>',
    agenda: '',
    scheduledAt: '2026-09-10T10:00:00+05:30',
    inviteeNames: ['Rajeev'],
    organizerName: null,
  });

  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;/);
});

test('buildMeetingEmail escapes quotes in link attributes', () => {
  const { html } = buildMeetingEmail({
    title: 'Review',
    agenda: '',
    meetLink: 'https://example.com/?q=" onmouseover="alert(1)',
    scheduledAt: '2026-09-10T10:00:00+05:30',
    inviteeNames: ['Rajeev'],
    organizerName: null,
  });

  assert.ok(!html.includes('onmouseover="alert(1)'));
  assert.match(html, /&quot;/);
});

test('buildMeetingEmail omits agenda and organizer lines when not provided', () => {
  const { text } = buildMeetingEmail({
    title: 'Quick check-in',
    agenda: '',
    scheduledAt: '2026-09-10T10:00:00+05:30',
    inviteeNames: ['Rajeev'],
    organizerName: null,
  });

  assert.ok(!text.includes('Agenda:'));
  assert.ok(!text.includes('Organized by:'));
});

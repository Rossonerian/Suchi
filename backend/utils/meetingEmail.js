// Single responsibility: build the email subject/body for a meeting invite.
// Pure function — no network, no DB — so it's unit-testable on its own.
function formatDateTime(date) {
  return new Date(date).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

function buildMeetingEmail({ title, agenda, meetLink, scheduledAt, inviteeNames, organizerName }) {
  const when = formatDateTime(scheduledAt);
  const subject = `Meeting: ${title} — ${when}`;

  const attendeeList = inviteeNames.map((n) => `- ${n}`).join('\n');

  const text = [
    `Meeting: ${title}`,
    `When: ${when} (IST)`,
    organizerName ? `Organized by: ${organizerName}` : null,
    meetLink ? `\nJoin: ${meetLink}` : null,
    agenda ? `\nAgenda:\n${agenda}` : null,
    `\nAttendees:\n${attendeeList}`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: sans-serif; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">${escapeHtml(title)}</h2>
      <p style="color: #555; margin-top: 0;">${escapeHtml(when)} (IST)</p>
      ${organizerName ? `<p><strong>Organized by:</strong> ${escapeHtml(organizerName)}</p>` : ''}
      ${meetLink ? `<p><strong>Join link:</strong> <a href="${escapeHtml(meetLink)}">${escapeHtml(meetLink)}</a></p>` : ''}
      ${agenda ? `<p><strong>Agenda:</strong><br/>${escapeHtml(agenda).replace(/\n/g, '<br/>')}</p>` : ''}
      <p><strong>Attendees:</strong></p>
      <ul>${inviteeNames.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { buildMeetingEmail, formatDateTime };

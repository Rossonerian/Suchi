import Meeting from '../models/Meeting.js';
import { sendMail } from './mailer.js';
import { buildMeetingEmail } from '../utils/meetingEmail.js';

async function populateMeeting(meeting) {
  return meeting.populate([
    { path: 'invitees', select: 'name email' },
    { path: 'organizer', select: 'name' },
  ]);
}

// Delivery operates on an existing meeting. It never creates a meeting, so a
// retry can only change notification state and cannot duplicate domain data.
async function deliverMeetingInvite(meeting) {
  await populateMeeting(meeting);
  meeting.emailAttempts = (meeting.emailAttempts || 0) + 1;
  meeting.lastEmailAttemptAt = new Date();
  meeting.emailStatus = 'pending';
  await meeting.save();
  const emails = meeting.invitees.map((invitee) => invitee.email).filter(Boolean);
  try {
    if (!emails.length) throw new Error('No invitee email addresses are available.');
    const { subject, text, html } = buildMeetingEmail({
      title: meeting.title,
      agenda: meeting.agenda,
      meetLink: meeting.meetLink,
      scheduledAt: meeting.scheduledAt,
      inviteeNames: meeting.invitees.map((invitee) => invitee.name),
      organizerName: meeting.organizer?.name || null,
    });
    await sendMail({ to: emails, subject, text, html });
    meeting.emailStatus = 'sent';
  } catch (err) {
    // Do not persist SMTP messages or stack traces; they can contain account
    // and provider details. The API exposes only the safe status.
    console.error('[meetings] email delivery failed (details withheld)');
    meeting.emailStatus = 'failed';
  }
  await meeting.save();
  return meeting;
}

async function populatedMeetingResponse(meeting) {
  const populated = await Meeting.findById(meeting._id)
    .populate('invitees', 'name')
    .populate('organizer', 'name');
  return populated;
}

export { deliverMeetingInvite, populatedMeetingResponse };

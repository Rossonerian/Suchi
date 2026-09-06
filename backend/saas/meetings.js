const { z } = require('zod');
const { AppError } = require('../utils/validation');
const { resolveMembership } = require('./projects');

const meetingFields = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).optional().default(''),
  projectId: z.string().trim().min(1).nullable().optional().default(null),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  timezone: z.string().trim().min(1).max(80).default('UTC'),
  location: z.string().trim().max(2_000).optional().default(''),
  videoUrl: z.string().trim().max(2_000).optional().default(''),
  attendeeMembershipIds: z.array(z.string().trim().min(1)).max(100).optional().default([]),
}).strict();
const meetingInput = meetingFields.superRefine((value, ctx) => {
  if (value.endAt <= value.startAt) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'endAt must be after startAt.' });
});
const updateMeetingInput = meetingFields.partial().strict();

function parseMeetingInput(input) {
  try {
    return meetingInput.parse(input);
  } catch (error) {
    throw new AppError('Meeting input is invalid.', 400, 'VALIDATION_ERROR', { issues: error.issues || [] });
  }
}

function meetingNotFound() {
  return new AppError('Meeting not found.', 404, 'MEETING_NOT_FOUND');
}

async function resolveAttendees(db, organizationId, ids) {
  const uniqueIds = [...new Set(ids || [])];
  if (!uniqueIds.length) return [];
  const memberships = await db.organizationMembership.findMany({ where: { organizationId, id: { in: uniqueIds } } });
  if (memberships.length !== uniqueIds.length) throw new AppError('One or more attendees are not members of this organization.', 400, 'ATTENDEE_INVALID');
  return memberships;
}

async function listMeetings(db, context, filters = {}) {
  await resolveMembership(db, context);
  const where = { organizationId: context.organizationId };
  if (filters.from) where.startAt = { gte: new Date(filters.from) };
  if (filters.to) where.endAt = { lte: new Date(filters.to) };
  return db.meeting.findMany({ where, orderBy: { startAt: 'asc' } });
}

async function createMeeting(db, context, input) {
  const { user } = await resolveMembership(db, context);
  const parsed = parseMeetingInput(input);
  if (parsed.projectId) {
    const project = await db.project.findFirst({ where: { id: parsed.projectId, organizationId: context.organizationId } });
    if (!project) throw new AppError('Project not found in this organization.', 404, 'PROJECT_NOT_FOUND');
  }
  const attendees = await resolveAttendees(db, context.organizationId, parsed.attendeeMembershipIds);
  return db.$transaction(async (tx) => {
    const meeting = await tx.meeting.create({ data: {
      organizationId: context.organizationId,
      projectId: parsed.projectId,
      creatorId: user.id,
      title: parsed.title,
      description: parsed.description,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      timezone: parsed.timezone,
      location: parsed.location,
      videoUrl: parsed.videoUrl,
    } });
    if (attendees.length) {
      await tx.meetingAttendee.createMany({ data: attendees.map((membership) => ({ meetingId: meeting.id, membershipId: membership.id, email: membership.email || '' })) });
      await tx.notification.createMany({ data: attendees.map((membership) => ({ organizationId: context.organizationId, userId: membership.userId, type: 'meeting_created', title: parsed.title, body: `You were invited to ${parsed.title}.`, resourceType: 'meeting', resourceId: meeting.id })) });
    }
    return { ...meeting, attendeeCount: attendees.length };
  });
}

async function cancelMeeting(db, context, meetingId) {
  await resolveMembership(db, context);
  const existing = await db.meeting.findFirst({ where: { id: meetingId, organizationId: context.organizationId } });
  if (!existing) throw meetingNotFound();
  return db.meeting.update({ where: { id: meetingId }, data: { status: 'cancelled', cancelledAt: new Date() } });
}

async function updateMeeting(db, context, meetingId, input) {
  await resolveMembership(db, context);
  const existing = await db.meeting.findFirst({ where: { id: meetingId, organizationId: context.organizationId } });
  if (!existing) throw meetingNotFound();
  let parsed;
  try {
    parsed = updateMeetingInput.parse(input);
  } catch (error) {
    throw new AppError('Meeting input is invalid.', 400, 'VALIDATION_ERROR', { issues: error.issues || [] });
  }
  const { attendeeMembershipIds, ...meetingFields } = parsed;
  const merged = {
    title: existing.title,
    description: existing.description || '',
    projectId: meetingFields.projectId === undefined ? existing.projectId || null : meetingFields.projectId,
    startAt: meetingFields.startAt === undefined ? existing.startAt : meetingFields.startAt,
    endAt: meetingFields.endAt === undefined ? existing.endAt : meetingFields.endAt,
    timezone: meetingFields.timezone === undefined ? existing.timezone : meetingFields.timezone,
    location: meetingFields.location === undefined ? existing.location || '' : meetingFields.location,
    videoUrl: meetingFields.videoUrl === undefined ? existing.videoUrl || '' : meetingFields.videoUrl,
  };
  const validatedInput = parseMeetingInput({ ...merged, ...(meetingFields.title === undefined ? {} : { title: meetingFields.title }) });
  const { attendeeMembershipIds: _unused, ...validated } = validatedInput;
  if (validated.projectId) {
    const project = await db.project.findFirst({ where: { id: validated.projectId, organizationId: context.organizationId } });
    if (!project) throw new AppError('Project not found in this organization.', 404, 'PROJECT_NOT_FOUND');
  }
  const attendees = attendeeMembershipIds === undefined ? null : await resolveAttendees(db, context.organizationId, attendeeMembershipIds);
  return db.$transaction(async (tx) => {
    const meeting = await tx.meeting.update({ where: { id: meetingId }, data: validated });
    if (attendees) {
      await tx.meetingAttendee.deleteMany({ where: { meetingId } });
      if (attendees.length) await tx.meetingAttendee.createMany({ data: attendees.map((membership) => ({ meetingId, membershipId: membership.id, email: membership.email || '' })) });
    }
    return meeting;
  });
}

module.exports = { meetingInput, updateMeetingInput, parseMeetingInput, listMeetings, createMeeting, updateMeeting, cancelMeeting };

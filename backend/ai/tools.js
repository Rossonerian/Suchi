const { z } = require('zod');
const { AppError } = require('../utils/validation');
const { resolveMembership } = require('../saas/projects');
const { listTasks, createTaskInput } = require('../saas/tasks');
const { listMeetings } = require('../saas/meetings');

const toolArguments = {
  list_projects: z.object({}).strict(),
  list_tasks: z.object({ projectId: z.string().min(1).optional(), status: z.string().min(1).optional() }).strict(),
  list_deadlines: z.object({ days: z.number().int().min(1).max(31).optional().default(7) }).strict(),
  list_meetings: z.object({ from: z.string().optional(), to: z.string().optional() }).strict(),
  create_task: createTaskInput,
};

const toolDefinitions = [
  ['list_projects', 'List projects in the active organization.', {}],
  ['list_tasks', 'List authorized tasks, optionally filtered by project or status.', { type: 'object', properties: { projectId: { type: 'string' }, status: { type: 'string' } } }],
  ['list_deadlines', 'List upcoming and overdue authorized task deadlines.', { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 31, default: 7 } } }],
  ['list_meetings', 'List authorized organization meetings in a date range.', { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } }],
  ['create_task', 'Propose a task creation. The application will require confirmation before writing.', { type: 'object', required: ['projectId', 'title'], properties: { projectId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, status: { type: 'string' }, priority: { type: 'string' }, startAt: { type: 'string' }, dueAt: { type: 'string' }, milestoneId: { type: 'string' }, assigneeIds: { type: 'array', items: { type: 'string' } } } }],
].map(([name, description, parameters]) => ({ type: 'function', function: { name, description, parameters } }));

function boundedProject(project) {
  return { id: project.id, organizationId: project.organizationId, name: project.name, description: project.description || '', status: project.status || null, targetDate: project.targetDate || null };
}

function boundedTask(task) {
  return { id: task.id, organizationId: task.organizationId, projectId: task.projectId, title: task.title, description: task.description || '', status: task.status, priority: task.priority, startAt: task.startAt || null, dueAt: task.dueAt || null };
}

function boundedMeeting(meeting) {
  return { id: meeting.id, organizationId: meeting.organizationId, projectId: meeting.projectId || null, title: meeting.title, description: meeting.description || '', startAt: meeting.startAt, endAt: meeting.endAt, timezone: meeting.timezone, status: meeting.status || 'scheduled' };
}

function getToolDefinitions() {
  return toolDefinitions;
}

async function executeToolCall(name, rawArguments, { db, context }) {
  const schema = toolArguments[name];
  if (!schema) throw new AppError('AI tool is not available.', 400, 'AI_TOOL_NOT_FOUND');
  let args;
  try {
    args = schema.parse(rawArguments || {});
  } catch (error) {
    throw new AppError('AI tool arguments are invalid.', 400, 'AI_TOOL_ARGUMENTS_INVALID', { issues: error.issues || [] });
  }

  if (name === 'list_projects') {
    await resolveMembership(db, context);
    const projects = await db.project.findMany({ where: { organizationId: context.organizationId }, orderBy: { updatedAt: 'desc' }, take: 100 });
    return projects.map(boundedProject);
  }
  if (name === 'list_tasks') {
    const tasks = await listTasks(db, context, args);
    return tasks.slice(0, 100).map(boundedTask);
  }
  if (name === 'list_deadlines') {
    const tasks = await listTasks(db, context);
    const cutoff = Date.now() + args.days * 24 * 60 * 60 * 1000;
    return tasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() <= cutoff).slice(0, 100).map(boundedTask);
  }
  if (name === 'list_meetings') {
    const meetings = await listMeetings(db, context, args);
    return meetings.slice(0, 100).map(boundedMeeting);
  }
  if (name === 'create_task') {
    await resolveMembership(db, context);
    const project = await db.project.findFirst({ where: { id: args.projectId, organizationId: context.organizationId } });
    if (!project) throw new AppError('Project not found in this organization.', 404, 'PROJECT_NOT_FOUND');
    return { requiresConfirmation: true, operation: 'create_task', arguments: args };
  }
  throw new AppError('AI tool is not available.', 400, 'AI_TOOL_NOT_FOUND');
}

module.exports = { getToolDefinitions, executeToolCall };

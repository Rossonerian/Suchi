const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const Team = require('../models/Team');
const Member = require('../models/Member');
const Invitation = require('../models/Invitation');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const Meeting = require('../models/Meeting');
const Session = require('../models/Session');
const { hashToken } = require('../utils/auth');
const { hashPassword } = require('../utils/passwords');
const { issueInvitation } = require('../utils/invitations');
const { promoteExistingAdmin } = require('../scripts/create-admin');

let mongo;
let server;
let baseUrl;
let teams;
let alice;
let bob;
let admin;
let disabled;
const password = 'correct horse battery staple';
const originalMailerUser = process.env.GMAIL_USER;
const originalMailerPassword = process.env.GMAIL_APP_PASSWORD;

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  teams = await Team.create([
    { key: 'core-technical', displayName: 'Core Technical' },
    { key: 'design-cad', displayName: 'Design & CAD' },
  ]);
  const passwordHash = await hashPassword(password);
  [alice, bob, admin, disabled] = await Member.create([
    { name: 'Alice Test', email: 'alice@example.com', team: teams[0]._id, role: 'member', status: 'active', passwordHash },
    { name: 'Bob Test', email: 'bob@example.com', team: teams[1]._id, role: 'member', status: 'active', passwordHash },
    { name: 'Admin Test', email: 'admin@example.com', team: teams[0]._id, role: 'admin', status: 'active', passwordHash },
    { name: 'Disabled Test', email: 'disabled@example.com', team: teams[0]._id, role: 'member', status: 'disabled', passwordHash },
  ]);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (originalMailerUser === undefined) delete process.env.GMAIL_USER;
  else process.env.GMAIL_USER = originalMailerUser;
  if (originalMailerPassword === undefined) delete process.env.GMAIL_APP_PASSWORD;
  else process.env.GMAIL_APP_PASSWORD = originalMailerPassword;
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
});

test.beforeEach(async () => {
  await Promise.all([
    Task.deleteMany({}), Plan.deleteMany({}), Meeting.deleteMany({}), Session.deleteMany({}), Invitation.deleteMany({}),
  ]);
  await Member.updateMany({}, { $set: { status: 'active' } });
  await Member.updateOne({ _id: disabled._id }, { $set: { status: 'disabled' } });
  process.env.GMAIL_USER = '';
  process.env.GMAIL_APP_PASSWORD = '';
});

async function request(path, options = {}) {
  const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) };
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

function json(value) { return JSON.stringify(value); }

function cookieFrom(response) {
  return String(response.headers.get('set-cookie') || '').split(';', 1)[0];
}

async function login(email = 'alice@example.com', loginPassword = password) {
  const response = await request('/api/auth/login', {
    method: 'POST', body: json({ email, password: loginPassword }),
  });
  assert.equal(response.status, 200);
  return cookieFrom(response);
}

test('health and security headers are available without a database session', async () => {
  const response = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.ok(response.headers.get('content-security-policy') || response.headers.get('strict-transport-security'));
});

test('SaaS project API stays unavailable until Clerk is explicitly configured', async () => {
  const response = await request('/api/v1/projects');
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'Clerk authentication is not configured.',
    code: 'AUTH_PROVIDER_UNAVAILABLE',
  });
});

test('background job endpoint stays unavailable until Inngest is configured', async () => {
  const response = await request('/api/inngest');
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Background jobs are not configured.', code: 'JOBS_UNAVAILABLE' });
});

test('password login is generic and never serializes password hashes', async () => {
  const valid = await request('/api/auth/login', { method: 'POST', body: json({ email: alice.email, password }) });
  assert.equal(valid.status, 200);
  const body = await valid.json();
  assert.equal(body.member.email, alice.email);
  assert.equal('passwordHash' in body.member, false);
  assert.equal('passwordHash' in body, false);
  assert.match(valid.headers.get('set-cookie') || '', /HttpOnly/i);
  assert.match(valid.headers.get('set-cookie') || '', /SameSite=Lax/i);
  assert.match(valid.headers.get('set-cookie') || '', /Path=\//i);

  const wrong = await request('/api/auth/login', { method: 'POST', body: json({ email: alice.email, password: 'wrong password' }) });
  const unknown = await request('/api/auth/login', { method: 'POST', body: json({ email: 'unknown@example.com', password }) });
  const disabledResponse = await request('/api/auth/login', { method: 'POST', body: json({ email: disabled.email, password }) });
  for (const response of [wrong, unknown, disabledResponse]) {
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
  }
  assert.equal((await request('/api/auth/join', { method: 'POST', body: json({ name: 'Nope' }) })).status, 404);
});

test('production sessions set Secure and cross-site SameSite=None cookie attributes', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSameSite = process.env.SESSION_SAME_SITE;
  process.env.NODE_ENV = 'production';
  delete process.env.SESSION_SAME_SITE;
  try {
    const response = await request('/api/auth/login', { method: 'POST', body: json({ email: alice.email, password }) });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie') || '';
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=None/i);
    assert.match(cookie, /HttpOnly/i);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSameSite === undefined) delete process.env.SESSION_SAME_SITE;
    else process.env.SESSION_SAME_SITE = previousSameSite;
  }
});

test('sessions expire, revoke, and stop working when a member is disabled', async () => {
  const cookie = await login();
  assert.equal((await request('/api/auth/me', { headers: { cookie } })).status, 200);
  const expiredToken = 'expired-test-token';
  await Session.create({ tokenHash: hashToken(expiredToken), member: alice._id, expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await request('/api/auth/me', { headers: { cookie: `nidar_session=${expiredToken}` } })).status, 401);
  assert.equal((await request('/api/auth/me', { headers: { cookie: 'nidar_session=%ZZ' } })).status, 401);
  await Member.updateOne({ _id: alice._id }, { $set: { status: 'disabled' } });
  assert.equal((await request('/api/auth/me', { headers: { cookie } })).status, 401);
  await Member.updateOne({ _id: alice._id }, { $set: { status: 'active' } });
  const teamsResponse = await request('/api/teams', { headers: { cookie: await login() } });
  const teamsBody = await teamsResponse.json();
  assert.equal(teamsBody.flatMap((team) => team.members).some((member) => member.name === disabled.name), false);
  assert.equal((await request('/api/auth/logout', { method: 'POST', headers: { cookie } })).status, 204);
  assert.equal((await request('/api/auth/me', { headers: { cookie } })).status, 401);
});

test('invitation preview, claim, expiry, and one-time use are enforced', async () => {
  const adminCookie = await login(admin.email);
  const created = await request('/api/admin/invites', {
    method: 'POST', headers: { cookie: adminCookie },
    body: json({ name: 'Invited Test', email: 'invited@example.com', team: teams[1]._id, role: 'member' }),
  });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.ok(createdBody.token);
  assert.match(createdBody.claimPath, /^\/claim-invite\?token=/);
  assert.equal('tokenHash' in createdBody, false);
  const preview = await request(`/api/auth/invite/${createdBody.token}`);
  assert.equal(preview.status, 200);
  const previewBody = await preview.json();
  assert.equal(previewBody.invitation.email, 'invited@example.com');
  assert.equal(JSON.stringify(previewBody).includes(createdBody.token), false);
  const claim = await request('/api/auth/claim-invite', { method: 'POST', body: json({ token: createdBody.token, password: 'invited password 123' }) });
  assert.equal(claim.status, 201);
  assert.equal('passwordHash' in (await claim.json()).member, false);
  const reused = await request('/api/auth/claim-invite', { method: 'POST', body: json({ token: createdBody.token, password: 'another password 123' }) });
  assert.equal(reused.status, 400);
  assert.equal((await login('invited@example.com', 'invited password 123')).length > 20, true);
  const expired = await issueInvitation({ name: 'Expired', email: 'expired@example.com', team: teams[0]._id, createdBy: admin._id, expiresAt: new Date(Date.now() - 1000) });
  const expiredClaim = await request('/api/auth/claim-invite', { method: 'POST', body: json({ token: expired.token, password: 'expired password 123' }) });
  assert.equal(expiredClaim.status, 400);
});

test('legacy name-only members can be migrated through reset access', async () => {
  const legacy = new mongoose.Types.ObjectId();
  await Member.collection.insertOne({
    _id: legacy,
    name: 'Legacy Member',
    nameLower: 'legacy member',
    team: teams[0]._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const adminCookie = await login(admin.email);
  const reset = await request(`/api/admin/members/${legacy}/reset-access`, {
    method: 'POST', headers: { cookie: adminCookie },
    body: json({ email: 'legacy@example.com' }),
  });
  assert.equal(reset.status, 201);
  const body = await reset.json();
  assert.ok(body.token);
  const migrated = await Member.findById(legacy).select('+passwordHash');
  assert.equal(migrated.email, 'legacy@example.com');
  assert.equal(migrated.status, 'invited');
  assert.equal(migrated.passwordHash, null);
  await Member.deleteOne({ _id: legacy });
  await Invitation.deleteMany({ email: 'legacy@example.com' });
});

test('admin bootstrap revokes sessions when promoting an existing account', async () => {
  const bootstrapMember = await Member.create({ name: 'Bootstrap User', email: 'bootstrap@example.com', team: teams[0]._id, role: 'member', status: 'active', passwordHash: await hashPassword(password) });
  const oldCookie = await login(bootstrapMember.email);
  await promoteExistingAdmin(bootstrapMember, { name: bootstrapMember.name, team: teams[0], passwordHash: await hashPassword('new bootstrap password') });
  assert.equal((await request('/api/auth/me', { headers: { cookie: oldCookie } })).status, 401);
  await Member.deleteOne({ _id: bootstrapMember._id });
  await Session.deleteMany({ member: bootstrapMember._id });
});

test('only admins can manage members and access changes revoke sessions', async () => {
  const memberCookie = await login();
  assert.equal((await request('/api/admin/members', { headers: { cookie: memberCookie } })).status, 403);
  assert.equal((await request('/api/admin/invites', { method: 'POST', headers: { cookie: memberCookie }, body: json({ name: 'Blocked', email: 'blocked@example.com', team: teams[0]._id }) })).status, 403);
  const adminCookie = await login(admin.email);
  const list = await request('/api/admin/members', { headers: { cookie: adminCookie } });
  assert.equal(list.status, 200);
  const members = await list.json();
  assert.equal(members.some((entry) => entry.email === alice.email), true);
  assert.equal(members.some((entry) => 'passwordHash' in entry), false);
  const bobCookie = await login(bob.email);
  assert.equal((await request(`/api/admin/members/${alice._id}`, { method: 'PATCH', headers: { cookie: memberCookie }, body: json({ role: 'admin' }) })).status, 403);
  assert.equal((await request(`/api/admin/members/${bob._id}`, { method: 'PATCH', headers: { cookie: adminCookie }, body: json({ status: 'disabled' }) })).status, 200);
  assert.equal((await request('/api/auth/me', { headers: { cookie: bobCookie } })).status, 401);
  const aliceCookie = await login();
  assert.equal((await request(`/api/admin/members/${alice._id}/revoke-sessions`, { method: 'POST', headers: { cookie: adminCookie } })).status, 204);
  assert.equal((await request('/api/auth/me', { headers: { cookie: aliceCookie } })).status, 401);
});

test('profile updates are self-scoped and cannot escalate roles', async () => {
  const memberCookie = await login();
  const emailUpdate = await request(`/api/members/${alice._id}`, {
    method: 'PATCH', headers: { cookie: memberCookie },
    body: json({ email: 'alice-renamed@example.com' }),
  });
  assert.equal(emailUpdate.status, 200);
  assert.equal((await emailUpdate.json()).email, 'alice-renamed@example.com');

  const roleEscalation = await request(`/api/members/${alice._id}`, {
    method: 'PATCH', headers: { cookie: memberCookie },
    body: json({ role: 'admin' }),
  });
  assert.equal(roleEscalation.status, 403);

  const otherMemberUpdate = await request(`/api/members/${bob._id}`, {
    method: 'PATCH', headers: { cookie: memberCookie },
    body: json({ email: 'bob-renamed@example.com' }),
  });
  assert.equal(otherMemberUpdate.status, 403);
  await Member.updateOne({ _id: alice._id }, { $set: { email: 'alice@example.com' } });
});

test('protected mutations use the session identity and preserve team authorization', async () => {
  const aliceCookie = await login();
  assert.equal((await request('/api/tasks', { method: 'POST', headers: { cookie: aliceCookie, origin: 'https://evil.example' }, body: json({ title: 'csrf', team: teams[0]._id }) })).status, 403);
  assert.equal((await request('/api/tasks', { method: 'POST', headers: { cookie: aliceCookie }, body: json({ title: 'forged', team: teams[1]._id, createdBy: bob._id, assignee: bob._id }) })).status, 403);
  const own = await request('/api/tasks', { method: 'POST', headers: { cookie: aliceCookie }, body: json({ title: 'owned', team: teams[0]._id, createdBy: bob._id }) });
  assert.equal(own.status, 201);
  const ownBody = await own.json();
  assert.equal(String(ownBody.createdBy._id), String(alice._id));
  const bobCookie = await login(bob.email);
  assert.equal((await request(`/api/tasks/${ownBody._id}`, { method: 'PATCH', headers: { cookie: bobCookie }, body: json({ status: 'done' }) })).status, 403);
  assert.equal((await request(`/api/tasks/${ownBody._id}`, { method: 'DELETE', headers: { cookie: bobCookie } })).status, 403);
  assert.equal((await request(`/api/tasks/${ownBody._id}`, { method: 'DELETE', headers: { cookie: aliceCookie } })).status, 204);
});

test('plans and meetings preserve validation and delivery state', async () => {
  const cookie = await login();
  const unsafe = await request('/api/plans', { method: 'POST', headers: { cookie }, body: json({ team: teams[0]._id, title: 'unsafe', forDate: '2099-09-10', fileUrl: 'javascript:alert(1)' }) });
  assert.equal(unsafe.status, 400);
  assert.equal(await Plan.countDocuments(), 0);
  const forbidden = await request('/api/plans', { method: 'POST', headers: { cookie }, body: json({ team: teams[1]._id, title: 'wrong team', forDate: '2099-09-10' }) });
  assert.equal(forbidden.status, 403);
  const meetingResponse = await request('/api/meetings', { method: 'POST', headers: { cookie }, body: json({ title: 'SMTP outage', scheduledAt: '2099-01-01T10:00:00.000Z', meetLink: 'https://meet.example.test/room', inviteeIds: [bob._id], organizerId: bob._id }) });
  assert.equal(meetingResponse.status, 201);
  const meeting = await meetingResponse.json();
  assert.equal(meeting.emailStatus, 'failed');
  assert.equal(await Meeting.countDocuments(), 1);
  const attempts = meeting.emailAttempts;
  const retry = await request(`/api/meetings/${meeting._id}/notifications/retry`, { method: 'POST', headers: { cookie } });
  assert.equal(retry.status, 200);
  const retried = await retry.json();
  assert.equal(retried.emailStatus, 'failed');
  assert.equal(retried.emailAttempts, attempts + 1);
  assert.equal(await Meeting.countDocuments(), 1);
  const persisted = await Meeting.findById(meeting._id);
  persisted.emailStatus = 'sent';
  await persisted.save();
  const idempotent = await request(`/api/meetings/${meeting._id}/notifications/retry`, { method: 'POST', headers: { cookie } });
  assert.equal(idempotent.status, 200);
  assert.equal((await idempotent.json()).emailAttempts, attempts + 1);

  const invalidDate = await request('/api/meetings', { method: 'POST', headers: { cookie }, body: json({ title: 'bad', scheduledAt: 'yesterday', inviteeIds: [bob._id] }) });
  assert.equal(invalidDate.status, 400);
  const existing = await Meeting.create({ title: 'existing', scheduledAt: new Date('2099-01-01'), invitees: [bob._id], organizer: bob._id });
  assert.equal((await request(`/api/meetings/${existing._id}/notifications/retry`, { method: 'POST', headers: { cookie } })).status, 403);
});

test('login rate limiting is active outside deterministic test mode', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const responses = [];
    for (let index = 0; index < 11; index += 1) {
      responses.push(await request('/api/auth/login', { method: 'POST', body: json({ email: 'unknown@example.com', password }) }));
    }
    assert.equal(responses.slice(0, 10).every((response) => response.status === 401), true);
    assert.equal(responses[10].status, 429);
    assert.deepEqual(await responses[10].json(), { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
  } finally {
    process.env.NODE_ENV = previous;
  }
});

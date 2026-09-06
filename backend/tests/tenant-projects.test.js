const test = require('node:test');
const assert = require('node:assert/strict');
const { listProjects, getProject, createProject } = require('../saas/projects');

const contextA = { userId: 'user_a', organizationId: 'org_a', organizationRole: 'member' };

function fakeDatabase() {
  const projects = [
    { id: 'project_a', organizationId: 'org_a', name: 'A project' },
    { id: 'project_b', organizationId: 'org_b', name: 'B project' },
  ];
  const users = { user_a: { id: 'local_user_a' } };
  const memberships = { 'org_a:local_user_a': { id: 'membership_a', role: 'member' } };
  const db = {
    userProfile: {
      findUnique: async ({ where }) => users[where.clerkUserId] || null,
    },
    organizationMembership: {
      findUnique: async ({ where }) => memberships[`${where.organizationId_userId.organizationId}:${where.organizationId_userId.userId}`] || null,
    },
    project: {
      findMany: async ({ where }) => projects.filter((project) => project.organizationId === where.organizationId),
      findFirst: async ({ where }) => projects.find((project) => project.id === where.id && project.organizationId === where.organizationId) || null,
      create: async ({ data }) => {
        const project = { id: `project_${projects.length + 1}`, ...data };
        projects.push(project);
        return project;
      },
      update: async ({ where, data }) => ({ id: where.id, ...data }),
      delete: async ({ where }) => ({ id: where.id }),
    },
    projectMember: {
      create: async ({ data }) => data,
    },
    $transaction: async (callback) => callback(db),
  };
  return db;
}

test('project reads are always scoped to the active organization', async () => {
  const db = fakeDatabase();
  assert.deepEqual(await listProjects(db, contextA), [{ id: 'project_a', organizationId: 'org_a', name: 'A project' }]);
  assert.deepEqual(await getProject(db, contextA, 'project_b'), null);
});

test('project creation derives owner and organization from context', async () => {
  const project = await createProject(fakeDatabase(), contextA, { name: 'New project', description: 'Scoped' });
  assert.equal(project.organizationId, 'org_a');
  assert.equal(project.ownerId, 'local_user_a');
  assert.equal(project.members[0].membershipId, 'membership_a');
  assert.equal(project.members[0].role, 'owner');
  assert.equal(project.slug, 'new-project');
});

test('project access rejects a user without an organization membership', async () => {
  await assert.rejects(
    () => listProjects(fakeDatabase(), { ...contextA, organizationId: 'org_b' }),
    { code: 'FORBIDDEN', status: 403 },
  );
});

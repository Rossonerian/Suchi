import assert from 'node:assert/strict';
import test from 'node:test';
import { proposalFields, proposalSummary } from './ai-proposals.mjs';

test('proposalFields exposes every consequential argument, not only the title', () => {
  const fields = proposalFields({ arguments: { title: 'Fix launch', priority: 'high', dueAt: '2026-09-10T12:00:00Z', projectId: 'project-1', description: 'Address the release blocker.' } });
  assert.deepEqual(fields.map((field) => field.label), ['Title', 'Priority', 'Due date', 'Project', 'Description']);
  assert.match(proposalSummary({ arguments: { title: 'Fix launch', priority: 'high' } }), /Title: Fix launch/);
  assert.match(proposalSummary({ arguments: { title: 'Fix launch', priority: 'high' } }), /Priority: high/);
});

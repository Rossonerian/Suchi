const test = require('node:test');
const assert = require('node:assert/strict');
const { askAi } = require('../saas/ai');

const context = { userId: 'clerk_user_a', organizationId: 'org_a', organizationRole: 'member' };

function baseDb() {
  const messages = [];
  return {
    messages,
    userProfile: { findUnique: async () => ({ id: 'local_user_a' }) },
    organizationMembership: { findUnique: async () => ({ id: 'membership_a' }) },
    aiConversation: {
      create: async ({ data }) => ({ id: 'conversation_a', ...data, messages: [] }),
      findFirst: async () => null,
    },
    aiMessage: { create: async ({ data }) => { messages.push(data); return data; } },
    aiRun: {
      create: async ({ data }) => ({ id: 'run_a', ...data }),
      update: async () => ({}),
    },
  };
}

test('AI asks use a bounded system prompt and persist the conversation messages', async () => {
  const db = baseDb();
  const result = await askAi({
    db,
    context,
    input: { question: 'What is at risk this week?', capability: 'fast' },
    client: { chat: async ({ messages }) => {
      assert.match(messages[0].content, /untrusted workspace data/i);
      assert.match(messages[0].content, /authenticated organization/i);
      return { choices: [{ message: { role: 'assistant', content: 'There are no verified risks.' } }], usage: { prompt_tokens: 10, completion_tokens: 6 } };
    } },
  });
  assert.equal(result.conversationId, 'conversation_a');
  assert.equal(result.answer, 'There are no verified risks.');
  assert.deepEqual(result.proposals, []);
  assert.deepEqual(db.messages.map((entry) => entry.role), ['user', 'assistant']);
});

test('AI conversation reads cannot cross organization boundaries', async () => {
  const db = baseDb();
  await assert.rejects(
    () => askAi({ db, context, input: { question: 'Summarize yesterday.', conversationId: 'conversation_from_org_b' }, client: { chat: async () => ({}) } }),
    { code: 'AI_CONVERSATION_NOT_FOUND', status: 404 },
  );
});

test('AI read tool results are followed by a grounded answer', async () => {
  const db = baseDb();
  db.project = { findMany: async ({ where }) => [{ id: 'project_a', organizationId: where.organizationId, name: 'Apollo' }] };
  let calls = 0;
  const result = await askAi({
    db,
    context,
    input: { question: 'List our projects.' },
    client: { chat: async ({ messages }) => {
      calls += 1;
      if (calls === 1) return { choices: [{ message: { role: 'assistant', tool_calls: [{ id: 'call_a', function: { name: 'list_projects', arguments: '{}' } }] } }] };
      const toolMessage = messages.find((message) => message.role === 'tool');
      assert.match(toolMessage.content, /Apollo/);
      return { choices: [{ message: { role: 'assistant', content: 'The organization has the Apollo project.' } }] };
    } },
  });
  assert.equal(calls, 2);
  assert.match(result.answer, /Apollo/);
});

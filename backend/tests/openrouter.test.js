const test = require('node:test');
const assert = require('node:assert/strict');
const { OpenRouterClient, modelFor } = require('../ai/openrouter');

test('OpenRouter client requires a server-side API key', () => {
  assert.throws(() => new OpenRouterClient({ apiKey: '' }), { code: 'AI_PROVIDER_UNAVAILABLE' });
});

test('OpenRouter client sends structured chat requests without exposing the key', async () => {
  let request;
  const client = new OpenRouterClient({ apiKey: 'server-only-key', fetchImpl: async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ choices: [{ message: { role: 'assistant', content: 'Answer' } }] }) };
  } });
  const result = await client.chat({ capability: 'fast', messages: [{ role: 'user', content: 'Hello' }], tools: [{ type: 'function', function: { name: 'list_tasks' } }] });
  assert.equal(result.choices[0].message.content, 'Answer');
  assert.equal(request.url.endsWith('/chat/completions'), true);
  assert.equal(request.options.headers.Authorization, 'Bearer server-only-key');
  assert.equal(request.options.body.includes('server-only-key'), false);
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, modelFor('fast'));
  assert.equal(body.messages[0].content, 'Hello');
  assert.equal(body.tools[0].function.name, 'list_tasks');
});

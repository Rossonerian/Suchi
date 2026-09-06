const DEFAULT_MODELS = {
  fast: 'openai/gpt-4o-mini',
  default: 'openai/gpt-4o-mini',
  reasoning: 'openai/gpt-4o',
  summarization: 'openai/gpt-4o-mini',
  structured: 'openai/gpt-4o-mini',
};

function modelFor(capability = 'default') {
  const key = String(capability).toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return process.env[`AI_MODEL_${key}`] || DEFAULT_MODELS[capability] || DEFAULT_MODELS.default;
}

class OpenRouterClient {
  constructor({ apiKey = process.env.OPENROUTER_API_KEY, baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1', fetchImpl = globalThis.fetch } = {}) {
    if (!apiKey) {
      const error = new Error('OpenRouter is not configured.');
      error.code = 'AI_PROVIDER_UNAVAILABLE';
      throw error;
    }
    if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
  }

  async chat({ capability = 'default', messages, tools, toolChoice, maxTokens = 1_000, temperature = 0.2, signal, stream = false }) {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(process.env.OPENROUTER_HTTP_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER } : {}),
        ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {}),
      },
      body: JSON.stringify({ model: modelFor(capability), messages, tools, tool_choice: toolChoice, max_tokens: maxTokens, temperature, stream }),
      signal,
    });
    if (!response.ok) {
      const error = new Error('The AI provider request failed.');
      error.code = 'AI_PROVIDER_ERROR';
      error.status = response.status;
      throw error;
    }
    return response.json();
  }
}

module.exports = { DEFAULT_MODELS, modelFor, OpenRouterClient };

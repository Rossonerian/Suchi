# AI architecture and safety

## Target boundary

OpenRouter is a server-side provider behind an `AiProvider` interface. Model
names are configuration (`fast`, `reasoning`, `summarization`, `structured`),
not strings scattered through UI code. The browser and mobile app call an
authenticated AI application endpoint and never receive `OPENROUTER_API_KEY`.

OpenRouter's current documentation supports OpenAI-compatible requests,
streaming, structured JSON schema output, and tool calling; implementation must
still verify model parameter support and usage reporting at runtime.

References: [OpenRouter quickstart](https://openrouter.ai/docs/quickstart),
[structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs),
[tool calling](https://openrouter.ai/docs/guides/features/tool-calling).

## Context and tools

The request pipeline is:

```text
authenticated user question
  -> intent/capability selection
  -> tenant-scoped retrieval
  -> constrained context assembly
  -> model response or structured tool proposal
  -> server-side authorization + domain service
```

Tools include task/project/meeting reads and carefully scoped creates/updates.
Database text is untrusted data and must never become system instructions.

Read operations can run automatically once authorized. Destructive or
consequential writes return a preview and require explicit confirmation. The
confirmed write reuses the same service, permission, validation, transaction,
and audit path as a human action.

Persist organization/user/capability/model/token/cost/latency/success metadata,
but avoid logging full prompts or secrets. Enforce timeouts, bounded retries,
rate limits, and per-organization usage quotas.

# Nexus IQ providers

Everything in Nexus IQ except the wording is real: insights are computed from the
store's own tables, every turn's token spend is recorded, conversations are
persisted. Nothing is rationed — the ledger reports cost, it does not refuse
work. The provider only turns already-established facts into sentences.

`StubAiProvider` is what runs today. It fills templates from the evidence the
pipeline computed and declines questions it cannot look up, so nothing it says is
invented. `isLive` is `false`, and the API reports that on every response, so the
UI can label stub output instead of implying a model is running.

## Swapping in Claude

Add an implementation of `AiProvider` (`provider.ts`) and select it with
`AI_PROVIDER`. The interface already matches the Messages API shape — a system
prompt, a list of turns, a token ceiling, and usage reported as input/output
tokens — so the adapter is thin.

```
npm install @anthropic-ai/sdk
```

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();          // reads ANTHROPIC_API_KEY

const response = await client.messages.create({
  model: 'claude-opus-5-5',
  max_tokens: 16000,
  system,                                 // the store context, unchanged
  messages: turns,                        // { role, content }, unchanged
});
```

Notes for that implementation:

- **Model.** `claude-opus-5-5` is the current default. Use the exact id; do not
  append a date suffix.
- **Thinking.** Omit the `thinking` parameter — it is always on for this model,
  and `{ type: 'disabled' }` or a token budget returns a 400. Control depth with
  `output_config: { effort: ... }`; the default is `medium`.
- **Usage.** Map `response.usage.input_tokens` / `output_tokens` onto
  `tokensIn` / `tokensOut`. The metering ledger counts whatever the provider
  reports, so real counts flow through without further change.
- **Content.** `response.content` is a discriminated union; narrow on
  `block.type === 'text'` before reading `block.text`.
- **`isLive`.** Return `true`. That is what stops the UI labelling the output as
  a stub.
- **Evidence stays ours.** `writeInsight` receives the computed evidence and must
  only describe it. Do not let the model decide what is true about a store — the
  insight rows record the figures so a merchant can check any claim.
- **Errors.** Catch the SDK's typed errors (`Anthropic.RateLimitError`,
  `Anthropic.APIError`) most-specific first, and let the caller fall back to the
  stub rather than failing the request.

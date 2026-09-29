/**
 * The seam between Nexus IQ and whatever writes its prose.
 *
 * Everything above this interface — metering, the insight pipeline, chat
 * persistence, the API — is real and does not change when the provider does.
 * Only the wording of the output comes from here.
 *
 * The shape deliberately mirrors the Anthropic Messages API (a system prompt, a
 * turn list, a token ceiling; usage reported as input/output tokens) so the real
 * implementation is a thin adapter rather than a rewrite. See ./README.md for
 * what swapping it in involves.
 */

export type AiRole = 'user' | 'assistant';

export interface AiTurn {
  role: AiRole;
  content: string;
}

export interface AiCompletionRequest {
  /** Instructions and the store context the answer must stay inside. */
  system: string;
  turns: AiTurn[];
  maxTokens?: number;
}

export interface AiCompletionResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  provider: string;
  model: string;
}

/** A single fact computed from the store's own data. */
export interface InsightEvidence {
  [key: string]: string | number | boolean | null | InsightEvidence[] | string[];
}

export interface InsightDraft {
  kind:
    | 'LOW_STOCK'
    | 'OUT_OF_STOCK'
    | 'UNFULFILLED_ORDERS'
    | 'REVENUE_TREND'
    | 'TOP_PRODUCTS'
    | 'NO_PRODUCTS';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  /** The facts. Computed from the database, never from the provider. */
  evidence: InsightEvidence;
}

export interface WrittenInsight {
  title: string;
  body: string;
  tokensIn: number;
  tokensOut: number;
  provider: string;
  model: string;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  /**
   * True when a real model produced the text. The UI uses this to label output
   * honestly rather than implying a capability the deployment does not have.
   */
  readonly isLive: boolean;

  /** Answer a merchant's question about their store. */
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;

  /**
   * Phrase an already-computed finding. The provider receives the evidence and
   * may only describe it — it does not decide what is true.
   */
  writeInsight(draft: InsightDraft): Promise<WrittenInsight>;
}

/**
 * A rough token estimate, used by the stub so metering exercises the same code
 * path it will under a real provider. Four characters per token is the usual
 * English approximation; the real provider reports exact counts from its own
 * usage figures, and nothing downstream depends on this being precise.
 */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

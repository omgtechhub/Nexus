import { AiProvider } from './provider.js';
import { StubAiProvider } from './stub.provider.js';
import { logger } from '../../utils/logger.js';

export * from './provider.js';

let provider: AiProvider | null = null;

/**
 * Resolves the configured provider.
 *
 * `AI_PROVIDER` selects it. Only `stub` is implemented; see ./README.md for what
 * a real one has to supply. An unknown value falls back to the stub loudly
 * rather than quietly, because silently serving stub text while the operator
 * believes a model is running is the failure worth avoiding.
 */
export function getAiProvider(): AiProvider {
  if (provider) return provider;

  const configured = (process.env.AI_PROVIDER || 'stub').toLowerCase();

  if (configured !== 'stub') {
    logger.warn({
      msg:
        `AI_PROVIDER is set to "${configured}", which is not implemented. ` +
        `Nexus IQ is serving stub output; responses are labelled accordingly.`,
    });
  }

  provider = new StubAiProvider();
  return provider;
}

/** Test seam. */
export function setAiProvider(next: AiProvider | null): void {
  provider = next;
}

import {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResult,
  InsightDraft,
  WrittenInsight,
  estimateTokens,
} from './provider.js';

/**
 * The provider Nexus IQ runs on until a real model is configured.
 *
 * It does not invent anything. Insight text is a template filled from evidence
 * the pipeline already computed from the store's own tables, and chat answers
 * are assembled from the store context the caller passes in. Where it cannot
 * answer from that context it says so, rather than producing a plausible
 * sentence — a stub that guesses is worse than no stub at all.
 */
export class StubAiProvider implements AiProvider {
  readonly name = 'stub';
  readonly model = 'stub-v1';
  readonly isLive = false;

  async writeInsight(draft: InsightDraft): Promise<WrittenInsight> {
    const { title, body } = renderInsight(draft);
    return {
      title,
      body,
      tokensIn: estimateTokens(JSON.stringify(draft.evidence)),
      tokensOut: estimateTokens(title + body),
      provider: this.name,
      model: this.model,
    };
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const question = [...request.turns].reverse().find(t => t.role === 'user')?.content ?? '';
    const text = answerFromContext(question, request.system);

    return {
      text,
      tokensIn: estimateTokens(request.system + request.turns.map(t => t.content).join('')),
      tokensOut: estimateTokens(text),
      provider: this.name,
      model: this.model,
    };
  }
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function renderInsight(draft: InsightDraft): { title: string; body: string } {
  const e = draft.evidence as Record<string, any>;

  switch (draft.kind) {
    case 'OUT_OF_STOCK':
      return {
        title: `${plural(e.count, 'product')} out of stock`,
        body:
          `${e.count === 1 ? 'One product has' : `${e.count} products have`} no ` +
          `available stock, so ${e.count === 1 ? 'it cannot' : 'they cannot'} be bought right now` +
          (e.examples?.length ? `: ${(e.examples as string[]).join(', ')}.` : '.') +
          ' Restock from Inventory, or hide the product until it returns.',
      };

    case 'LOW_STOCK':
      return {
        title: `${plural(e.count, 'product')} running low`,
        body:
          `${e.count === 1 ? 'One product is' : `${e.count} products are`} at or below ` +
          `the low-stock threshold` +
          (e.examples?.length ? `: ${(e.examples as string[]).join(', ')}.` : '.') +
          ' Reordering now avoids losing the sale later.',
      };

    case 'UNFULFILLED_ORDERS':
      return {
        title: `${plural(e.count, 'order')} waiting to ship`,
        body:
          `${e.count === 1 ? 'One paid order has' : `${e.count} paid orders have`} not been ` +
          `fulfilled` +
          (e.oldestDays != null
            ? `, the oldest placed ${plural(Number(e.oldestDays), 'day')} ago.`
            : '.') +
          ' Fulfilling from Orders creates the shipment and notifies the buyer.',
      };

    case 'REVENUE_TREND': {
      const current = Number(e.currentPeriodRevenue ?? 0);
      const previous = Number(e.previousPeriodRevenue ?? 0);
      const direction = current >= previous ? 'up' : 'down';
      const pct = Number(e.changePercent ?? 0);
      return {
        title:
          previous === 0
            ? `Revenue this period: ${money(current, e.currency)}`
            : `Revenue ${direction} ${Math.abs(pct)}% over the last ${plural(Number(e.windowDays), 'day')}`,
        body:
          `The last ${plural(Number(e.windowDays), 'day')} brought ${money(current, e.currency)} ` +
          `across ${plural(Number(e.currentPeriodOrders ?? 0), 'order')}, against ` +
          `${money(previous, e.currency)} in the ${plural(Number(e.windowDays), 'day')} before that.`,
      };
    }

    case 'TOP_PRODUCTS':
      return {
        title: `${e.topProductTitle} is your best seller`,
        body:
          `${e.topProductTitle} accounts for ${plural(Number(e.topProductUnits), 'unit')} sold ` +
          `in the last ${plural(Number(e.windowDays), 'day')}` +
          (e.runnersUp?.length
            ? `, ahead of ${(e.runnersUp as string[]).join(' and ')}.`
            : '.') +
          ' Keeping it in stock matters more than anything else in the catalogue.',
      };

    case 'NO_PRODUCTS':
      return {
        title: 'Your catalogue is empty',
        body:
          'This store has no products yet, so the storefront has nothing to show and ' +
          'no order can be placed. Adding one product is the first step to selling.',
      };
  }
}

function money(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Answers only from the store context the caller assembled. The context is a
 * block of `key: value` lines; a question that does not match one is declined
 * rather than answered from nothing.
 */
function answerFromContext(question: string, system: string): string {
  const facts = new Map<string, string>();
  for (const line of system.split('\n')) {
    const match = line.match(/^- ([^:]+): (.+)$/);
    if (match) facts.set(match[1].trim().toLowerCase(), match[2].trim());
  }

  const asked = question.toLowerCase();
  const hits: string[] = [];
  for (const [key, value] of facts) {
    const words = key.split(/\s+/).filter(w => w.length > 3);
    if (words.some(w => asked.includes(w))) hits.push(`${key}: ${value}`);
  }

  if (hits.length > 0) {
    return (
      `From your store's current data:\n\n` +
      hits.map(h => `• ${h}`).join('\n') +
      `\n\nNexus IQ is running without a language model configured, so this is a direct ` +
      `lookup rather than an analysis.`
    );
  }

  return (
    `Nexus IQ is running without a language model configured, so it can only report ` +
    `figures it can look up directly, and nothing in your store data matches that ` +
    `question.\n\nIt can currently answer questions about: ` +
    `${[...facts.keys()].join(', ')}.`
  );
}

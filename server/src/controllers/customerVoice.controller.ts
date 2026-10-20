import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { VoicePortal } from '@prisma/client';
import { verifyVoice } from '../services/voice/speaker.service.js';
import { decodeToMono16k, durationOf, peakOf, AudioDecodeError } from '../services/voice/audio.js';
import { transcribe, TranscriptionError } from '../services/voice/stt.service.js';
import { parseUtterance, type ParsedIntent } from '../services/voice/intent.js';
import {
  searchCatalogue,
  getShopProduct,
  spokenPrice,
  spokenList,
  type ShopProduct,
  type SearchOutcome,
} from '../services/ai/shopping.service.js';
import { defaultCurrencyCode } from '../config/currency.js';

/**
 * The shopping assistant.
 *
 * A shopper holds a button, says what they want, and the assistant searches
 * the catalogue, builds a basket and walks them to the payment page. The
 * boundary it will not cross is payment itself: it can create the order and
 * hand back the gateway's URL, and the shopper authenticates the payment.
 *
 * Three rules shape everything below.
 *
 * **The assistant proposes; the cart lives in the browser.** Lines are kept in
 * the shopper's own storage, grouped by merchant, and survive a signed-out
 * visit. So a spoken "add two of those" is answered with a resolved product
 * and a quantity, and the page applies it. The server never holds a cart it
 * would then have to reconcile with the one the shopper can see.
 *
 * **Nothing is bought without a second word.** "Check out" is answered with a
 * summary and a question, never an order. Only a `CONFIRM` carrying the token
 * issued with that summary places anything, and the token is bound to the
 * exact basket it quoted — so a "yes" that arrives after the basket changed
 * buys nothing and says why.
 *
 * **Voice gates activation, not access.** A rejected voice gets no reply, but
 * the session cookie is what protects the account, exactly as on the seller
 * side. Someone at an unlocked machine could click the same buttons.
 */

const SILENCE_PEAK = 0.012;
const MIN_SECONDS = 0.6;
const MAX_SECONDS = 30;

/** An action for the page to apply to its own cart. */
export type CartAction =
  | { type: 'ADD'; product: ShopProduct; variantId: string; quantity: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'CLEAR' }
  /**
   * `SUMMARY` is the read-back that asks for a yes; `GO` is the yes.
   *
   * The page used to tell these apart by looking at the intent — navigate when
   * it was `CONFIRM` — which stopped being true the moment a `CONFIRM` could
   * also answer "shall I check you out?" and produce a summary. Only one of
   * these two turns should move the shopper to payment, so the turn says which
   * one it is rather than leaving the page to infer it.
   */
  | { type: 'CHECKOUT'; merchantId: string; confirmToken: string; stage: 'SUMMARY' | 'GO' };

interface TurnResult {
  transcript: string;
  /** What the assistant says. The page speaks this. */
  reply: string;
  intent: ParsedIntent['kind'];
  /** Products referred to, so the page can show cards beside the answer. */
  results?: ShopProduct[];
  action?: CartAction;
  verification: Awaited<ReturnType<typeof verifyVoice>>;
}

/**
 * What the assistant last showed this shopper, so "the second one" resolves.
 *
 * In memory and short-lived on purpose: it is a conversational convenience,
 * not a record. Losing it to a restart costs the shopper one repeated
 * sentence, where persisting it would mean storing browsing behaviour nobody
 * asked us to keep.
 */
/**
 * The question the assistant last asked, so "yes" has something to mean.
 *
 * Every reply that ends in a question used to be a dead end: the assistant
 * said "Shall I add it to your bag?", the shopper said "yes", and the answer
 * was "There is nothing waiting to be confirmed." `CONFIRM` only ever knew
 * about a pending *checkout*, so the assistant was refusing to honour its own
 * offer — which is the single most unintelligent thing a conversational
 * interface can do.
 *
 * Only offers that cost nothing live here. Spending money still needs
 * `pendingCheckout`, which is bound to the exact basket it quoted.
 */
type PendingOffer =
  | { kind: 'ADD'; productId: string; quantity: number }
  | { kind: 'CHECKOUT' };

interface VoiceContext {
  lastResults: ShopProduct[];
  /** What was searched for last, so "anything cheaper?" can re-run it. */
  lastQuery: string | null;
  pendingCheckout: { token: string; merchantId: string; signature: string; total: number } | null;
  pendingOffer: PendingOffer | null;
  touchedAt: number;
}

const contexts = new Map<string, VoiceContext>();
const CONTEXT_TTL_MS = 20 * 60 * 1000;

/**
 * Exported so the conversation can be tested without a microphone.
 *
 * The turn logic is the part that decides whether a "yes" buys something, and
 * driving it through real audio would mean the tests measure Whisper rather
 * than the rules under test.
 */
export function contextFor(userId: string): VoiceContext {
  const existing = contexts.get(userId);
  const now = Date.now();

  if (existing && now - existing.touchedAt < CONTEXT_TTL_MS) {
    existing.touchedAt = now;
    return existing;
  }

  const fresh: VoiceContext = {
    lastResults: [],
    lastQuery: null,
    pendingCheckout: null,
    pendingOffer: null,
    touchedAt: now,
  };
  contexts.set(userId, fresh);

  // Opportunistic sweep: this map would otherwise grow for the lifetime of the
  // process, one entry per shopper who ever spoke to it.
  if (contexts.size > 500) {
    for (const [key, value] of contexts) {
      if (now - value.touchedAt > CONTEXT_TTL_MS) contexts.delete(key);
    }
  }
  return fresh;
}

/** Cart lines as the page reports them, so the assistant can talk about them. */
interface ClientCartLine {
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  price: number;
  merchantId?: string;
  displayName?: string;
}

/**
 * A fingerprint of the basket a confirmation was issued for.
 *
 * The token alone is not enough: it proves the shopper was asked a question,
 * not that they are answering the one that was asked. Binding the signature to
 * the exact lines and quantities means a basket that changed between the
 * summary and the "yes" fails closed, which is the only safe direction when
 * the next step takes money.
 */
function signCart(lines: ClientCartLine[]): string {
  const canonical = [...lines]
    .map(l => `${l.variantId}:${l.quantity}:${l.price}`)
    .sort()
    .join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

function clipFrom(req: Request): Float32Array {
  const file = req.file;
  if (!file) throw new AudioDecodeError('No audio was uploaded.');

  const samples = decodeToMono16k(file.buffer);
  const seconds = durationOf(samples);

  if (seconds < MIN_SECONDS) {
    throw new AudioDecodeError(
      `That recording was ${seconds.toFixed(1)}s. Hold the button and speak for at least a second.`
    );
  }
  if (seconds > MAX_SECONDS) {
    throw new AudioDecodeError(`That recording was ${Math.round(seconds)}s. Keep it under 30.`);
  }
  if (peakOf(samples) < SILENCE_PEAK) {
    throw new AudioDecodeError('That recording is silent. Check the microphone is not muted.');
  }
  return samples;
}

/**
 * How the assistant opens a result it had to compromise on.
 *
 * "I found 3 that could match" was the old wording for everything, including
 * the case where it had quietly abandoned half the request. A shopper asking
 * for a white wristwatch and being read a list of watches is well served; the
 * same shopper being read that list as though it answered the question is not.
 * So the words that were given up are said out loud.
 */
function caveat(found: SearchOutcome): string {
  if (found.exact) {
    return found.results.length === 1 ? 'I found ' : `I found ${found.results.length}. `;
  }

  if (found.dropped.length > 0) {
    const given = spokenList(found.dropped);
    const some = found.results.length === 1 ? 'is one' : `are ${found.results.length}`;
    return `I could not match ${given}, but here ${some}: `;
  }

  // Only a spelling was relaxed — wristwatch to watch — which is not a
  // compromise worth narrating.
  return found.results.length === 1 ? 'I found ' : `I found ${found.results.length}. `;
}

function describe(product: ShopProduct, currency: string): string {
  const price = spokenPrice(product.price, currency);
  const rating =
    product.rating.count > 0
      ? `, rated ${product.rating.average.toFixed(1)} from ${product.rating.count} review${
          product.rating.count === 1 ? '' : 's'
        }`
      : '';
  return `${product.title} from ${product.merchant.name}, ${price}${rating}`;
}

/**
 * Pick the product a sentence refers to.
 *
 * An ordinal points into what was just read out. Otherwise the phrase is
 * searched, and a single confident hit is used; several hits are *not*
 * guessed between, because picking one and adding it to a basket is a decision
 * the shopper did not make.
 */
async function resolveTarget(
  intent: ParsedIntent,
  context: VoiceContext
): Promise<{ product: ShopProduct | null; candidates: ShopProduct[] }> {
  if (intent.ordinal !== undefined && context.lastResults.length > 0) {
    const index = intent.ordinal === -1 ? context.lastResults.length - 1 : intent.ordinal - 1;
    const product = context.lastResults[index] ?? null;
    return { product, candidates: [] };
  }

  // Pointed back at something already shown. Whatever other words the
  // sentence carried are leftovers, not a product to go looking for.
  if (intent.refersBack && context.lastResults.length > 0) {
    return context.lastResults.length === 1
      ? { product: context.lastResults[0], candidates: [] }
      : { product: null, candidates: context.lastResults };
  }

  if (intent.query) {
    const found = await searchCatalogue(intent.query, { maxPrice: intent.maxPrice, limit: 5 });
    if (found.results.length === 1) return { product: found.results[0], candidates: [] };
    return { product: null, candidates: found.results };
  }

  // No words of its own: "add it" after a single result.
  if (context.lastResults.length === 1) return { product: context.lastResults[0], candidates: [] };
  return { product: null, candidates: context.lastResults };
}

export async function runIntent(
  intent: ParsedIntent,
  context: VoiceContext,
  cart: ClientCartLine[],
  currency: string
): Promise<Pick<TurnResult, 'reply' | 'results' | 'action'>> {
  switch (intent.kind) {
    case 'HELP':
      return {
        reply:
          'Ask me to find something, add it to your bag, or check out. ' +
          'For example: find a wool jumper under fifty, then add two of the first one.',
      };

    case 'SEARCH': {
      if (!intent.query) {
        return { reply: 'What would you like me to look for?' };
      }
      const found = await searchCatalogue(intent.query, { maxPrice: intent.maxPrice, limit: 5 });
      const results = found.results;
      context.lastResults = results;
      context.lastQuery = intent.query;

      if (results.length === 0) {
        return {
          reply: `I could not find anything for ${intent.query}${
            intent.maxPrice ? ` under ${spokenPrice(intent.maxPrice, currency)}` : ''
          }. Try different words.`,
          results: [],
        };
      }

      const top = results.slice(0, 3).map(p => describe(p, currency));

      // Asking "shall I add it?" is only honest if a yes actually adds it.
      if (results.length === 1) {
        context.pendingOffer = { kind: 'ADD', productId: results[0].id, quantity: 1 };
        return { reply: `${caveat(found)}${top[0]}. Shall I add it to your bag?`, results };
      }

      context.pendingOffer = null;
      return {
        reply: `${caveat(found)}${spokenList(top)}. Which would you like?`,
        results,
      };
    }

    /**
     * A question about the thing just shown.
     *
     * "How much is it?" is the most natural sentence in shopping and it used
     * to land in the catch-all. It is answered from the product already
     * resolved rather than by searching again, so the figure quoted is the one
     * the shopper was just read.
     */
    case 'PRODUCT_DETAIL': {
      const index = intent.ordinal
        ? intent.ordinal === -1
          ? context.lastResults.length - 1
          : intent.ordinal - 1
        : 0;
      const product = context.lastResults[index];

      if (!product) {
        return { reply: 'I have not shown you anything yet. What would you like me to look for?' };
      }

      const price = spokenPrice(product.price, currency);

      if (intent.detail === 'price') {
        const was =
          product.comparePrice && product.comparePrice > product.price
            ? ` It was ${spokenPrice(product.comparePrice, currency)}.`
            : '';
        return { reply: `${product.title} is ${price}.${was} Shall I add it to your bag?`, results: [product] };
      }

      if (intent.detail === 'stock') {
        context.pendingOffer = product.inStock
          ? { kind: 'ADD', productId: product.id, quantity: 1 }
          : null;
        return {
          reply: product.inStock
            ? `Yes, ${product.title} is in stock. Shall I add it to your bag?`
            : `${product.title} is out of stock at the moment.`,
          results: [product],
        };
      }

      if (intent.detail === 'rating') {
        return {
          reply:
            product.rating.count > 0
              ? `${product.title} is rated ${product.rating.average.toFixed(1)} out of 5 from ${
                  product.rating.count
                } review${product.rating.count === 1 ? '' : 's'}.`
              : `${product.title} has no reviews yet.`,
          results: [product],
        };
      }

      context.pendingOffer = { kind: 'ADD', productId: product.id, quantity: 1 };
      return {
        reply: `${describe(product, currency)}. ${
          product.description ? product.description.slice(0, 180) + ' ' : ''
        }Shall I add it to your bag?`,
        results: [product],
      };
    }

    /**
     * "Do you have anything cheaper?"
     *
     * A refinement of the last search rather than a new one. Searching the
     * catalogue for the literal words was the old behaviour, and it answered
     * "I could not find anything for anything cheaper" — which is the kind of
     * reply that tells a shopper the thing is not listening.
     */
    case 'REFINE': {
      if (context.lastResults.length === 0 || !context.lastQuery) {
        return { reply: 'Cheaper than what? Tell me what you are looking for first.' };
      }

      const anchor = context.lastResults[0].price;
      const { results } = await searchCatalogue(context.lastQuery, {
        maxPrice:
          intent.direction === 'cheaper' ? (intent.maxPrice ?? anchor * 0.95) : undefined,
        limit: 8,
      });

      const narrowed =
        intent.direction === 'cheaper'
          ? results.filter(p => p.price < anchor)
          : results.filter(p => p.price > anchor);

      if (narrowed.length === 0) {
        return {
          reply:
            intent.direction === 'cheaper'
              ? `That is the cheapest ${context.lastQuery} I have. Shall I add it to your bag?`
              : `I have nothing dearer than that for ${context.lastQuery}.`,
          results: context.lastResults.slice(0, 1),
        };
      }

      const ordered =
        intent.direction === 'cheaper'
          ? [...narrowed].sort((a, b) => a.price - b.price)
          : [...narrowed].sort((a, b) => b.price - a.price);

      context.lastResults = ordered;
      if (ordered.length === 1) {
        context.pendingOffer = { kind: 'ADD', productId: ordered[0].id, quantity: 1 };
        return { reply: `There is ${describe(ordered[0], currency)}. Shall I add it?`, results: ordered };
      }

      context.pendingOffer = null;
      return {
        reply: `${spokenList(ordered.slice(0, 3).map(p => describe(p, currency)))}. Which one?`,
        results: ordered,
      };
    }

    case 'ADD_TO_CART': {
      const { product, candidates } = await resolveTarget(intent, context);

      if (!product) {
        if (candidates.length > 1) {
          context.lastResults = candidates;
          return {
            reply: `I found ${candidates.length} that could match. ${spokenList(
              candidates.slice(0, 3).map(p => describe(p, currency))
            )}. Which one?`,
            results: candidates,
          };
        }
        return { reply: 'I am not sure which product you mean. Try naming it, or search first.' };
      }

      if (!product.inStock) {
        return { reply: `${product.title} is out of stock, so I cannot add it.`, results: [product] };
      }

      const quantity = Math.max(1, intent.quantity ?? 1);
      // Clamped against real stock rather than refused: a shopper asking for
      // ten when six exist wants the six.
      const granted = product.availableStock > 0 ? Math.min(quantity, product.availableStock) : quantity;
      const variantId = product.variants[0]?.id ?? product.id;
      const note =
        granted < quantity
          ? ` That is all the stock there is, so I added ${granted} rather than ${quantity}.`
          : '';

      context.pendingOffer = null;
      return {
        reply: `Added ${granted} ${product.title} to your bag, ${spokenPrice(
          product.price * granted,
          currency
        )}.${note} Anything else?`,
        results: [product],
        action: { type: 'ADD', product, variantId, quantity: granted },
      };
    }

    case 'REVIEW_CART': {
      if (cart.length === 0) return { reply: 'Your bag is empty.' };
      const total = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
      const lines = cart.map(l => `${l.quantity} ${l.title}`);
      context.pendingOffer = { kind: 'CHECKOUT' };
      return {
        reply: `You have ${spokenList(lines)}. That is ${spokenPrice(total, currency)}. Shall I check you out?`,
      };
    }

    case 'REMOVE_FROM_CART': {
      if (cart.length === 0) return { reply: 'Your bag is already empty.' };

      const query = (intent.query ?? '').toLowerCase();
      const line = query
        ? cart.find(l => l.title.toLowerCase().includes(query))
        : cart.length === 1
          ? cart[0]
          : undefined;

      if (!line) {
        return {
          reply: `I could not tell which item to remove. You have ${spokenList(
            cart.map(l => l.title)
          )}.`,
        };
      }
      return {
        reply: `Removed ${line.title} from your bag.`,
        action: { type: 'REMOVE', productId: line.productId },
      };
    }

    case 'CLEAR_CART':
      if (cart.length === 0) return { reply: 'Your bag is already empty.' };
      return { reply: 'I have emptied your bag.', action: { type: 'CLEAR' } };

    case 'CHECKOUT': {
      if (cart.length === 0) return { reply: 'Your bag is empty, so there is nothing to check out.' };

      // One order belongs to one merchant, so a mixed bag has to be split and
      // the shopper told which store they are paying.
      const merchants = [...new Set(cart.map(l => l.merchantId).filter(Boolean))] as string[];
      if (merchants.length > 1) {
        const names = [...new Set(cart.map(l => l.displayName).filter(Boolean))] as string[];
        return {
          reply:
            `Your bag has items from ${merchants.length} merchants — ${spokenList(names)} — and each ` +
            'is paid separately. Say the merchant name you want to pay for first.',
        };
      }

      const merchantId = merchants[0];
      if (!merchantId) {
        return { reply: 'Those items are missing their merchant, so I cannot check out. Open your bag to finish there.' };
      }

      const total = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
      const token = crypto.randomUUID();
      context.pendingCheckout = { token, merchantId, signature: signCart(cart), total };
      context.pendingOffer = null;

      const lines = cart.map(l => `${l.quantity} ${l.title}`);
      return {
        reply:
          `That is ${spokenList(lines)}, ${spokenPrice(total, currency)} before delivery, from ` +
          `${cart[0].displayName ?? 'this merchant'}. Say yes and I will take you to payment, where ` +
          'you authorise it yourself.',
        action: { type: 'CHECKOUT', merchantId, confirmToken: token, stage: 'SUMMARY' },
      };
    }

    case 'CONFIRM': {
      const pending = context.pendingCheckout;

      /*
       * A yes answers the last question asked, whatever it was.
       *
       * Checkout is handled below and is the only one that leads to money.
       * These two cost nothing — one adds a line to a bag the shopper can see,
       * the other reads that bag back — so honouring them is just doing what
       * was offered rather than making the shopper rephrase it as a command.
       */
      if (!pending && context.pendingOffer) {
        const offer = context.pendingOffer;
        context.pendingOffer = null;

        if (offer.kind === 'ADD') {
          const product =
            context.lastResults.find(p => p.id === offer.productId) ??
            (await getShopProduct(offer.productId));

          if (!product) {
            return { reply: 'I have lost track of which one that was. Say its name and I will find it again.' };
          }
          return runIntent(
            { kind: 'ADD_TO_CART', quantity: offer.quantity, ordinal: undefined },
            { ...context, lastResults: [product] },
            cart,
            currency
          );
        }

        if (offer.kind === 'CHECKOUT') {
          return runIntent({ kind: 'CHECKOUT' }, context, cart, currency);
        }
      }

      if (!pending) {
        // The last thing asked was a choice, not a yes-or-no. Saying "I had
        // not asked you anything" would be untrue and unhelpful at once.
        if (context.lastResults.length > 1) {
          return {
            reply:
              'Which one would you like? Say the first, the second or the third, ' +
              'or name it.',
            results: context.lastResults,
          };
        }
        return {
          reply:
            'I had not asked you anything. Tell me what to look for, or say check out ' +
            'when your bag is ready.',
        };
      }
      if (pending.signature !== signCart(cart)) {
        // Fail closed. The basket moved between the question and the answer.
        context.pendingCheckout = null;
        context.pendingOffer = null;
        return {
          reply:
            'Your bag changed since I read it back, so I have not placed anything. ' +
            'Say check out again and I will give you the new total.',
        };
      }

      // Both, not just the checkout: a stale offer left behind here is a
      // question the shopper already answered, and the next "yes" would
      // silently honour it instead of meaning nothing.
      context.pendingCheckout = null;
      context.pendingOffer = null;
      return {
        reply:
          `Taking you to payment for ${spokenPrice(pending.total, currency)}. ` +
          'You will need to authorise the payment yourself.',
        action: {
          type: 'CHECKOUT',
          merchantId: pending.merchantId,
          confirmToken: pending.token,
          stage: 'GO',
        },
      };
    }

    case 'CANCEL': {
      const hadOffer = Boolean(context.pendingCheckout || context.pendingOffer);
      context.pendingCheckout = null;
      context.pendingOffer = null;
      return { reply: hadOffer ? 'Cancelled. Your bag is untouched.' : 'Nothing to cancel.' };
    }

    default:
      return {
        reply:
          'I did not catch what you wanted. You can ask me to find something, ' +
          'add it to your bag, or check out.',
      };
  }
}

/**
 * Replies that only make sense as the last thing said.
 *
 * "Anything else?" is the right way to finish a turn and the wrong way to
 * introduce the next half of one, so it is dropped from every step but the
 * one the shopper is left on.
 */
const TRAILING_OFFER =
  /\s*(Anything else\?|Which would you like\?|Which one\?|Shall I add it( to your bag)?\?|Shall I check you out\?)\s*$/;

/**
 * Run several instructions from one sentence.
 *
 * "Find me a white wristwatch, add it to my bag and take me straight to
 * payment" is three things, and the assistant used to do one of them — at
 * best. Each step runs in order against the context the previous one left
 * behind, so "add it" means the thing just found.
 *
 * Two rules stop a plan running away with a shopper's basket:
 *
 * **One action per turn.** The cart lives in the browser and the page applies
 * what comes back, so a second action in the same reply would be applied to a
 * basket this server has already stopped being able to see. A further step
 * that needs its own action becomes the question the next yes answers.
 *
 * **A step that needs an answer ends the plan.** If the search found four
 * watches, "add it" has nothing to add, so the plan stops on the question
 * rather than guessing which one was meant.
 */
export async function runPlan(
  steps: ParsedIntent[],
  context: VoiceContext,
  cart: ClientCartLine[],
  currency: string
): Promise<Pick<TurnResult, 'reply' | 'results' | 'action'>> {
  if (steps.length <= 1) {
    return runIntent(steps[0] ?? { kind: 'UNKNOWN' }, context, cart, currency);
  }

  const said: string[] = [];
  let carried: Pick<TurnResult, 'reply' | 'results' | 'action'> | null = null;

  for (const step of steps) {
    if (carried?.action) {
      // Already spent this turn's action. Offer the rest rather than dropping
      // it silently or applying it to a basket that has since moved.
      if (step.kind === 'CHECKOUT') {
        context.pendingOffer = { kind: 'CHECKOUT' };
        said.push('Shall I take you to payment?');
      }
      break;
    }

    const outcome = await runIntent(step, context, cart, currency);
    said.push(outcome.reply);
    carried = outcome;

    // Nothing landed, and the next step was going to act on it.
    if (!outcome.action && context.lastResults.length !== 1) break;
  }

  // Every step but the last loses its closing offer, so the reply reads as one
  // answer rather than three stitched together.
  const reply = said
    .map((part, i) => (i < said.length - 1 ? part.replace(TRAILING_OFFER, '') : part))
    .filter(Boolean)
    .join(' ')
    .trim();

  return { reply, results: carried?.results, action: carried?.action };
}

/** POST /api/shop/voice/command */
export async function shopVoiceCommand(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const samples = clipFrom(req);

    // Identity before transcription, so a voice that will not be answered
    // never has its words written down.
    const verification = await verifyVoice(userId, VoicePortal.CUSTOMER, samples);
    if (!verification.accepted) {
      res.status(403).json({
        success: false,
        error: 'That did not sound like the voice registered for this account.',
        data: { verification, spoken: 'Sorry, I do not recognise that voice.' },
      });
      return;
    }

    const transcript = await transcribe(samples);
    if (!transcript || transcript.replace(/[^a-z0-9]/gi, '').length < 2) {
      res.status(422).json({
        success: false,
        error: 'Nothing could be made out in that recording.',
        data: { verification, transcript },
      });
      return;
    }

    let cart: ClientCartLine[] = [];
    try {
      const raw = req.body?.cart;
      if (typeof raw === 'string' && raw) cart = JSON.parse(raw);
    } catch {
      // A malformed cart is treated as an empty one rather than a 400: the
      // shopper spoke, and answering "your bag is empty" beats an error.
      cart = [];
    }

    const currency = typeof req.body?.currency === 'string' ? req.body.currency : defaultCurrencyCode();
    const context = contextFor(userId);
    const steps = parseUtterance(transcript);
    const outcome = await runPlan(steps, context, cart, currency);

    const result: TurnResult = {
      transcript,
      intent: steps[0].kind,
      verification,
      ...outcome,
    };
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof AudioDecodeError) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof TranscriptionError) {
      res.status(503).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * GET /api/shop/voice/product/:id
 *
 * Lets the page re-read a product the assistant named, so a card shows the
 * same figures the order will use rather than a copy that has since drifted.
 */
export async function shopVoiceProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await getShopProduct(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found.' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/shop/assistant/message
 *
 * The same assistant, reached by typing instead of speaking.
 *
 * It runs the identical parse-and-plan path as a spoken turn, so a typed "add
 * two of the first one" and a spoken one cannot drift apart — the turn logic
 * has exactly one implementation and this endpoint only replaces the two steps
 * that are about audio.
 *
 * Those two steps are the voice check and the transcription, and dropping them
 * costs nothing: voice matching was never the access control here (the session
 * cookie is, exactly as the spoken route's own comment says), and typed words
 * need no transcribing. A keyboard is also the only way in for a shopper on a
 * machine with no microphone, or one unwilling to talk to their laptop in a
 * room with other people in it.
 */
export async function shopAssistantMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      res.status(400).json({ success: false, error: 'Type a message first.' });
      return;
    }
    if (message.length > 500) {
      res.status(400).json({ success: false, error: 'That message is too long — keep it short.' });
      return;
    }

    // A malformed cart is an empty one rather than a 400, for the same reason
    // the spoken route treats it that way: the shopper asked a question, and
    // "your bag is empty" is a better answer than an error.
    const cart: ClientCartLine[] = Array.isArray(req.body?.cart) ? req.body.cart : [];
    const currency = typeof req.body?.currency === 'string' ? req.body.currency : defaultCurrencyCode();

    const context = contextFor(userId);
    const steps = parseUtterance(message);
    const outcome = await runPlan(steps, context, cart, currency);

    res.status(200).json({
      success: true,
      data: {
        transcript: message,
        intent: steps[0].kind,
        ...outcome,
      },
    });
  } catch (err) {
    next(err);
  }
}

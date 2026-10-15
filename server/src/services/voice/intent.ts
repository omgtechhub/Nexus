/**
 * Turning a spoken sentence into an action the shopping assistant may take.
 *
 * This is deliberately a parser and not a language model, and the reason is
 * the same one `writeInsight` is built on elsewhere in this codebase: the
 * model may phrase what happened, it may never decide what is true — and here
 * it may never decide what is *bought*. A model that hallucinates a sentence
 * is embarrassing; a model that hallucinates "add fourteen of them" or
 * "confirm the order" spends a shopper's money. Every intent below is matched
 * by rule, every product is resolved against the database, and the only path
 * that creates an order requires a confirmation token issued moments earlier
 * for that exact basket.
 *
 * When a live provider is configured it is handed the resolved facts and asked
 * to word the reply. The action has already been decided by then.
 */

export type IntentKind =
  | 'SEARCH'
  | 'REFINE'
  | 'PRODUCT_DETAIL'
  | 'ADD_TO_CART'
  | 'REVIEW_CART'
  | 'REMOVE_FROM_CART'
  | 'CLEAR_CART'
  | 'CHECKOUT'
  | 'CONFIRM'
  | 'CANCEL'
  | 'HELP'
  | 'UNKNOWN';

export interface ParsedIntent {
  kind: IntentKind;
  /** Free text to search the catalogue with. */
  query?: string;
  /** How many units. Defaults to 1 and is clamped by available stock later. */
  quantity?: number;
  /** 1-based position into the last results ("the second one"). */
  ordinal?: number;
  /** Price ceiling in major units, from "under fifty". */
  maxPrice?: number;
  /** Which way a REFINE moves: "cheaper" or "more expensive". */
  direction?: 'cheaper' | 'dearer';
  /** What a PRODUCT_DETAIL is asking about. */
  detail?: 'price' | 'stock' | 'rating' | 'general';
  /**
   * The sentence pointed at something already shown — "add it", "the second
   * one" — rather than naming it.
   *
   * Worth knowing because the leftover words are then not a search. "Add it to
   * my bag", misheard as "add it to my bug", left "bug" behind as the query
   * and the assistant went looking for a bug. When a sentence refers back,
   * what it refers to is the last result, whatever stray words came with it.
   */
  refersBack?: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100,
};

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4,
  '4th': 4, fifth: 5, '5th': 5, sixth: 6, '6th': 6, last: -1,
};

/**
 * Filler the recogniser reliably produces and the parser must not search for.
 *
 * Whisper transcribes a wake word as part of the sentence, so "Nexus, find me
 * a blue shirt" would otherwise search for the literal phrase including the
 * assistant's own name.
 */
const LEAD_IN = [
  'nexus iq', 'nexus', 'hey nexus', 'ok nexus', 'okay nexus',
  'please', 'could you', 'can you', 'would you', 'i want to', 'i want',
  'i would like to', 'i would like', "i'd like to", "i'd like", 'i need to',
  'i need', 'let me', 'help me',
];

function normalise(text: string): string {
  let out = text
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip lead-ins repeatedly: "Nexus, please could you find..." stacks them.
  let changed = true;
  while (changed) {
    changed = false;
    for (const phrase of LEAD_IN) {
      if (out.startsWith(phrase + ' ')) {
        out = out.slice(phrase.length + 1).trim();
        changed = true;
      }
    }
  }
  return out;
}

/** "two" / "2" → 2. Returns null when the word is not a count. */
function readNumber(word: string): number | null {
  if (/^\d+$/.test(word)) return parseInt(word, 10);
  return NUMBER_WORDS[word] ?? null;
}

function extractQuantity(words: string[]): { quantity: number; rest: string[] } {
  for (let i = 0; i < words.length; i++) {
    const value = readNumber(words[i]);
    if (value === null) continue;

    // "two of them", "2 x", "two blue shirts" — a count only when it is not
    // part of a price ("under 50") or an ordinal ("the 2nd one").
    const previous = words[i - 1];
    if (previous === 'under' || previous === 'below' || previous === 'over' || previous === 'above') {
      continue;
    }
    const rest = [...words];
    rest.splice(i, 1);
    if (rest[i] === 'of' || rest[i] === 'x') rest.splice(i, 1);
    return { quantity: Math.min(Math.max(value, 1), 99), rest };
  }
  return { quantity: 1, rest: words };
}

function extractOrdinal(words: string[]): { ordinal: number | null; rest: string[] } {
  for (let i = 0; i < words.length; i++) {
    const value = ORDINAL_WORDS[words[i]];
    if (value === undefined) continue;
    const rest = [...words];
    rest.splice(i, 1);
    // "the first one" — drop the trailing "one" so it is not searched for.
    if (rest[i] === 'one') rest.splice(i, 1);
    return { ordinal: value, rest };
  }
  return { ordinal: null, rest: words };
}

function extractMaxPrice(words: string[]): { maxPrice: number | null; rest: string[] } {
  for (let i = 0; i < words.length - 1; i++) {
    if (!['under', 'below', 'less'].includes(words[i])) continue;
    const next = words[i + 1] === 'than' ? i + 2 : i + 1;
    const raw = (words[next] || '').replace(/[^\d.]/g, '');
    const value = raw ? parseFloat(raw) : readNumber(words[next] || '');
    if (!value || Number.isNaN(value)) continue;
    const rest = [...words];
    rest.splice(i, next - i + 1);
    return { maxPrice: value, rest };
  }
  return { maxPrice: null, rest: words };
}

/** Phrases that mean a product the shopper has already been shown. */
const REFERS_BACK = /\b(it|that|this|them|those|the (first|second|third|fourth|fifth|last) one)\b/;

/**
 * A follow-up about the thing just shown, rather than a new search.
 *
 * "How much is it?" used to fall through to UNKNOWN, and "do you have anything
 * cheaper?" was worse: it searched the catalogue for the literal words
 * "anything cheaper" and answered "I could not find anything for anything
 * cheaper". Both are the obvious next thing a shopper says after being read a
 * result, and an assistant that cannot follow its own answer is the thing that
 * makes this feel unintelligent.
 */
const DETAIL_PATTERNS: { detail: NonNullable<ParsedIntent['detail']>; pattern: RegExp }[] = [
  { detail: 'price', pattern: /\b(how much|what does it cost|what.s the price|price of|how expensive)\b/ },
  { detail: 'stock', pattern: /\b(in stock|do you have (it|them) in|is it available|any left|still available)\b/ },
  { detail: 'rating', pattern: /\b(any good|rating|reviews?|what do people (say|think)|is it any good)\b/ },
  { detail: 'general', pattern: /\b(tell me (more )?about|what is it|describe|more about|details)\b/ },
];

const REFINE_PATTERNS: { direction: NonNullable<ParsedIntent['direction']>; pattern: RegExp }[] = [
  { direction: 'cheaper', pattern: /\b(cheaper|less expensive|lower price|anything cheaper|something cheaper|too expensive|too much)\b/ },
  { direction: 'dearer', pattern: /\b(more expensive|dearer|higher end|nicer one|better one|premium)\b/ },
];

const RULES: { kind: IntentKind; patterns: RegExp[] }[] = [
  {
    kind: 'CONFIRM',
    patterns: [
      /^(yes|yeah|yep|yup|sure|confirm|confirmed|go ahead|do it|place (the )?order|that'?s right|correct|ok|okay)\b/,
    ],
  },
  {
    kind: 'CANCEL',
    patterns: [/^(no|nope|cancel|stop|wait|never mind|nevermind|forget it|hold on)\b/],
  },
  {
    kind: 'CLEAR_CART',
    patterns: [/\b(empty|clear) (my |the )?(cart|bag|basket)\b/],
  },
  {
    kind: 'REMOVE_FROM_CART',
    patterns: [
      /\b(remove|delete|take (it )?out|get rid of|drop)\b.*\b(cart|bag|basket)\b/,
      /^(remove|delete|drop)\b/,
    ],
  },
  {
    kind: 'REVIEW_CART',
    patterns: [
      /\bwhat('?s| is| have i got)?\b.*\b(in )?(my |the )?(cart|bag|basket)\b/,
      /\b(show|read|check|review|open)\b.*\b(my |the )?(cart|bag|basket)\b/,
      /\b(cart|bag|basket) (total|summary)\b/,
      /\bhow much\b.*\b(cart|bag|basket)\b/,
    ],
  },
  {
    kind: 'CHECKOUT',
    patterns: [
      /\b(check ?out|place (my |the )?order|pay for|pay now|buy (it|them|that|this)|complete (my |the )?(order|purchase))\b/,
      /\b(i'?ll take (it|them)|purchase (it|them|that))\b/,
      // "Take me straight to payment" — and the same sentence with a word
      // misheard in the middle of it, which is most of them.
      /\b(take|bring|get|send)\b.*\bto (the )?(payment|checkout|pay)\b/,
      /\b(go|straight) to (the )?(payment|checkout)\b/,
    ],
  },
  {
    kind: 'ADD_TO_CART',
    patterns: [
      /\badd\b/,
      /\bput\b.*\b(in|into)\b.*\b(cart|bag|basket)\b/,
      /\b(i'?ll have|give me|get me)\b/,
    ],
  },
  {
    kind: 'SEARCH',
    patterns: [
      /\b(find|search|look for|show me|do you (have|sell)|any|browse|looking for|what.*(do you have|have you got))\b/,
    ],
  },
  {
    kind: 'HELP',
    patterns: [/\b(help|what can you do|how does this work|what can i say)\b/],
  },
];

/** Words that carry no search meaning once the intent is known. */
const STOP_WORDS = new Set([
  'add', 'to', 'my', 'the', 'a', 'an', 'cart', 'bag', 'basket', 'please',
  'find', 'me', 'search', 'for', 'look', 'show', 'do', 'you', 'have', 'sell',
  'any', 'some', 'get', 'give', 'want', 'need', 'would', 'like', 'put', 'in',
  'into', 'and', 'of', 'is', 'are', 'there', 'got', 'i', 'll', 'buy', 'them',
  'it', 'that', 'this', 'one', 'ones', 'looking', 'browse', 'what', 'can',
]);

function toQuery(words: string[]): string {
  const kept = words.filter(w => w && !STOP_WORDS.has(w));
  return kept.join(' ').trim();
}

/**
 * Parse a transcript into one intent.
 *
 * Order matters: `CONFIRM` and `CANCEL` are matched first and anchored to the
 * start, so "yes, add two" is a confirmation of whatever is pending rather
 * than a new basket change being smuggled past the confirmation step.
 */
export function parseIntent(transcript: string): ParsedIntent {
  const text = normalise(transcript);
  if (!text) return { kind: 'UNKNOWN' };

  let matched: IntentKind = 'UNKNOWN';
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(text))) {
      matched = rule.kind;
      break;
    }
  }

  if (matched === 'CONFIRM' || matched === 'CANCEL' || matched === 'HELP') {
    return { kind: matched };
  }
  if (matched === 'REVIEW_CART' || matched === 'CLEAR_CART') {
    return { kind: matched };
  }

  /*
   * Follow-ups are checked after the explicit rules and before anything is
   * treated as a fresh search.
   *
   * After the rules, because "add the cheaper one" is an add and must not be
   * hijacked into a refinement. Before the search fallback, because that
   * fallback is what turned "do you have anything cheaper?" into a catalogue
   * search for the words "anything cheaper".
   */
  if (matched === 'UNKNOWN' || matched === 'SEARCH') {
    const refine = REFINE_PATTERNS.find(r => r.pattern.test(text));
    if (refine) {
      const price = extractMaxPrice(text.split(' '));
      return {
        kind: 'REFINE',
        direction: refine.direction,
        maxPrice: price.maxPrice ?? undefined,
      };
    }
  }

  if (matched === 'UNKNOWN') {
    const detail = DETAIL_PATTERNS.find(d => d.pattern.test(text));
    if (detail) {
      const ordinalOnly = extractOrdinal(text.split(' '));
      return {
        kind: 'PRODUCT_DETAIL',
        detail: detail.detail,
        ordinal: ordinalOnly.ordinal ?? undefined,
      };
    }
  }

  let words = text.split(' ');
  const quantityResult = extractQuantity(words);
  words = quantityResult.rest;
  const ordinalResult = extractOrdinal(words);
  words = ordinalResult.rest;
  const priceResult = extractMaxPrice(words);
  words = priceResult.rest;

  const query = toQuery(words);
  const refersBack = REFERS_BACK.test(text) || ordinalResult.ordinal !== null;

  if (matched === 'UNKNOWN') {
    // No verb, but words that name something: treat a bare noun phrase as a
    // search, because "blue running shoes" is obviously a search and refusing
    // it would make the assistant feel broken.
    if (query.length >= 3 && !refersBack) return { kind: 'SEARCH', query, maxPrice: priceResult.maxPrice ?? undefined };
    return { kind: 'UNKNOWN' };
  }

  return {
    kind: matched,
    // A sentence that points back at a result carries no search of its own:
    // whatever words are left are leftovers, not a product name.
    query: refersBack ? undefined : query || undefined,
    quantity: quantityResult.quantity,
    ordinal: ordinalResult.ordinal ?? undefined,
    maxPrice: priceResult.maxPrice ?? undefined,
    refersBack: refersBack || undefined,
  };
}

/**
 * One sentence can hold several instructions.
 *
 * "Find me a white wristwatch, add it to my bag and take me straight to
 * payment" is three, and reading it as one was how the whole sentence became a
 * single search: the parser took the first rule that matched anywhere, then
 * swept every remaining word into the query — including "payment" and whatever
 * the recogniser made of the words between. Splitting first means each clause
 * is answered as what it is.
 *
 * A fragment only starts a new instruction if it opens with a verb that
 * commands one. That is what keeps "a red and white shirt" in one piece while
 * still splitting "find a shirt and check out", and it is deliberately
 * conservative: merging a fragment back is a worse outcome than splitting one
 * that should have been merged.
 */
const INSTRUCTION_OPENER =
  /^(add|put|buy|order|get|give|take|bring|send|show|find|search|look|browse|remove|delete|drop|clear|empty|check ?out|pay|place|confirm|cancel|stop|yes|no|then)\b/;

const CLAUSE_SPLIT = /\s*(?:,|;|\bthen\b|\band then\b|\band\b)\s*/i;

export function parseUtterance(transcript: string): ParsedIntent[] {
  const raw = transcript.trim();
  if (!raw) return [{ kind: 'UNKNOWN' }];

  const fragments = raw
    .split(CLAUSE_SPLIT)
    .map(f => f.trim())
    .filter(Boolean);

  if (fragments.length <= 1) return [parseIntent(raw)];

  // Glue the non-commanding fragments back onto the instruction they belong to.
  const clauses: string[] = [];
  for (const fragment of fragments) {
    if (clauses.length > 0 && !INSTRUCTION_OPENER.test(normalise(fragment))) {
      clauses[clauses.length - 1] += ' and ' + fragment;
      continue;
    }
    clauses.push(fragment);
  }

  const steps = clauses
    .map(clause => parseIntent(clause))
    .filter(step => step.kind !== 'UNKNOWN');

  // Nothing survived as an instruction, so fall back to reading the whole
  // sentence the old way rather than answering nothing at all.
  if (steps.length === 0) return [parseIntent(raw)];

  // A ceiling, so a rambling sentence cannot turn into a long chain of work.
  return steps.slice(0, 3);
}

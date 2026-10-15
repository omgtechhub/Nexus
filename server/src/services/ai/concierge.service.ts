import { ProductStatus, StoreStatus } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { searchCatalogue, spokenList, spokenPrice, type ShopProduct } from './shopping.service.js';

/**
 * Nexus IQ for a visitor nobody has identified yet.
 *
 * The public pages — the landing page, pricing and contact — are read by
 * people who have not signed in and in many cases have not decided whether
 * they want to. An assistant that answers those pages with "sign in first" is
 * answering the wrong question, so this service exists to answer the right
 * one: what Nexus is, what it costs, how a seller lists products, how a
 * shopper buys them, and where a human is.
 *
 * Two boundaries make that safe to leave open.
 *
 * **It reads nothing that belongs to anybody.** No orders, no baskets, no
 * stores, no account of any kind. Every figure it quotes comes either from
 * the published subscription plans or from the same public catalogue an
 * anonymous visitor can already browse at `/products`, and the only writes it
 * performs are none. There is nothing here to protect with a voice, which is
 * exactly why the public surface does not ask for one — see the account-scoped
 * routers (`/iq`, `/shop/voice`) for the surfaces that do.
 *
 * **It answers by rule, not by invention.** Like `intent.ts` and
 * `writeInsight`, the topic is matched by pattern and the facts are resolved
 * from the database. A question it has no answer for is handed to a person
 * rather than guessed at — a marketing page is the worst possible place to
 * confidently state a policy that does not exist.
 */

/** Only published products belonging to a live store are public. */
const PUBLIC_WHERE = {
  status: ProductStatus.ACTIVE,
  store: { status: StoreStatus.ACTIVE },
} as const;

export type ConciergeTopic =
  | 'WHAT_IS_NEXUS'
  | 'SELL_ON_NEXUS'
  | 'PRICING'
  | 'FEES'
  | 'PAYMENTS'
  | 'PAYOUTS'
  | 'DELIVERY'
  | 'TRACK_ORDER'
  | 'MY_ACCOUNT_DATA'
  | 'BUYING'
  | 'CATALOGUE'
  | 'CATEGORIES'
  | 'PRODUCT_SEARCH'
  | 'NEXUS_IQ'
  | 'VOICE'
  | 'ACCOUNTS'
  | 'CONTACT'
  | 'HELP'
  | 'UNKNOWN';

/** Somewhere in the app the answer points at, rendered as a link. */
export interface ConciergeLink {
  label: string;
  to: string;
}

export interface ConciergeAnswer {
  topic: ConciergeTopic;
  reply: string;
  links: ConciergeLink[];
  /** Catalogue hits, when the question was about a product. */
  results?: ShopProduct[];
}

/* ------------------------------------------------------------------ matching */

/**
 * The topic a sentence is about.
 *
 * Ordered, and deliberately so: "how much does it cost to sell on Nexus" is a
 * pricing question even though it says "sell", and "track my order" is about
 * tracking even though it says "order". The first rule that matches wins, so
 * the narrower phrasings sit above the broader ones.
 */
const RULES: { topic: ConciergeTopic; test: RegExp }[] = [
  { topic: 'HELP', test: /^\s*(help|what can you do|who are you|what are you)\b/i },
  { topic: 'TRACK_ORDER', test: /\b(track|tracking|where is)\b.{0,20}\b(order|parcel|package|delivery|item)\b/i },
  /*
   * Questions about the asker's own data, which this surface cannot see.
   *
   * Below TRACK_ORDER, because "where is my order?" *is* answerable without an
   * account and should keep going to the tracking answer. Above everything
   * else, because without it "show me my orders" fell through to the catalogue
   * search and came back "I could not find anything for my orders in the
   * shop" — a reply that reads as the assistant not listening, when the real
   * answer is simply that it is standing outside the account.
   */
  {
    topic: 'MY_ACCOUNT_DATA',
    test: /\bmy\b.{0,20}\b(orders?|bag|basket|cart|revenue|sales|payouts?|balance|customers?|inventory|stock|dashboard|account)\b/i,
  },
  { topic: 'PRICING', test: /\b(pric(e|ing)|plan|plans|subscription|tier|how much.{0,30}(cost|sell|month)|free trial|trial)\b/i },
  { topic: 'FEES', test: /\b(fee|fees|commission|cut|percentage|transaction cost|charge me)\b/i },
  { topic: 'PAYOUTS', test: /\b(payout|payouts|get paid|settle|settlement|when.{0,15}paid)\b/i },
  { topic: 'PAYMENTS', test: /\b(pay(ment|ments)?|card|transfer|bank|paystack|flutterwave|wallet|checkout)\b/i },
  { topic: 'DELIVERY', test: /\b(deliver|delivery|ship|shipping|courier|dispatch|return|refund)\b/i },
  /*
   * Above SELL_ON_NEXUS on purpose. "What do you sell?" is a shopper asking
   * what is in the shop, not a seller asking how to join it, and the word
   * they share would otherwise send them to the wrong answer.
   */
  { topic: 'CATEGORIES', test: /\b(categor(y|ies)|department|what (do|does) you sell|what.{0,15}on sale)\b/i },
  /*
   * `list` is matched as a bare word rather than as "list a product".
   * "How do I list my products on Nexus?" is the single most likely question
   * on the landing page and the narrower pattern missed it: the trailing \b
   * fell after "product", so the plural never matched and the question
   * reached the I-don't-know branch.
   */
  { topic: 'SELL_ON_NEXUS', test: /\b(sell|selling|seller|merchant|vendor|list|listing|listings)\b|\bbecome a\b/i },
  { topic: 'VOICE', test: /\b(voice|speak|talk|microphone|say|spoken|accent)\b/i },
  { topic: 'NEXUS_IQ', test: /\b(nexus ?iq|assistant|ai|artificial intelligence|insight)\b/i },
  { topic: 'ACCOUNTS', test: /\b(account|sign ?in|sign ?up|log ?in|register|password)\b/i },
  { topic: 'CONTACT', test: /\b(contact|support|human|phone|whatsapp|email|address|office|hq|headquarter)\b/i },
  { topic: 'CATALOGUE', test: /\b(how many|catalogue|catalog|inventory|range|selection)\b/i },
  { topic: 'BUYING', test: /\b(buy|shop|shopping|bag|cart|basket|browse|order (something|one))\b/i },
  { topic: 'WHAT_IS_NEXUS', test: /\b(what is nexus|about nexus|who (owns|runs)|marketplace|platform|jumia|shopify|amazon)\b/i },
];

/**
 * Words that make a sentence a catalogue lookup rather than a question about
 * the platform. Checked only after the rules above, so "how much is the Pro
 * plan" stays a pricing question.
 */
const PRODUCT_LOOKUP = /\b(find|looking for|do you (have|sell|stock)|show me|search for|any)\b/i;

export function classify(message: string): ConciergeTopic {
  const text = message.trim();
  if (!text) return 'UNKNOWN';

  for (const rule of RULES) {
    if (rule.test.test(text)) return rule.topic;
  }
  if (PRODUCT_LOOKUP.test(text)) return 'PRODUCT_SEARCH';
  return 'UNKNOWN';
}

/**
 * The phrase to search the catalogue with, once the lead-in is stripped.
 *
 * "Do you have any wireless headphones" should search for wireless headphones,
 * not for the question around them.
 */
function searchPhrase(message: string): string {
  return message
    .replace(/[?.!]+$/g, '')
    .replace(
      /^\s*(hi|hello|hey)?[,\s]*(nexus( iq)?)?[,\s]*(please\s+)?(can you |could you |would you )?(help me )?(find|looking for|look for|do you have|do you sell|do you stock|show me|search for|any|got)\s*(me\s+)?(any\s+)?/i,
      ''
    )
    .trim();
}

/* -------------------------------------------------------------------- facts */

/**
 * The four plans the pricing page advertises.
 *
 * Named explicitly, and this is the important part: `isActive` is not the same
 * thing as "publicly advertised". A plan negotiated for one merchant is active
 * and must never be read out to a stranger, and a plan left behind by a test
 * run is active and is not an offer at all. Asking for "every active plan" got
 * both — on the development database it answered a visitor with thirty-five
 * plans, including a "Custom VIP Plan" at $299 repeated twenty times.
 *
 * So the public surface quotes the public catalogue of plans by code. A new
 * tier becomes quotable by being added here, which is a deliberate act rather
 * than a side effect of a row appearing.
 */
const PUBLIC_PLAN_CODES = ['starter', 'growth', 'pro', 'enterprise'];

/**
 * The published plans, cheapest first.
 *
 * Read from the database rather than restated here so the assistant and the
 * pricing page cannot quote different numbers at the same visitor — which is
 * the failure a hard-coded copy guarantees eventually.
 */
async function planFacts() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true, code: { in: PUBLIC_PLAN_CODES } },
    orderBy: { displayOrder: 'asc' },
    select: {
      name: true,
      description: true,
      monthlyPrice: true,
      annualPrice: true,
      currency: true,
      trialDays: true,
      maxProducts: true,
    },
  });
}

async function catalogueFacts() {
  const [products, stores, categories] = await Promise.all([
    prisma.product.count({ where: PUBLIC_WHERE as any }),
    prisma.store.count({ where: { status: StoreStatus.ACTIVE } }),
    prisma.product.groupBy({
      by: ['category'],
      where: PUBLIC_WHERE as any,
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
      take: 6,
    }),
  ]);

  return {
    products,
    stores,
    categories: categories.map(c => c.category).filter(Boolean) as string[],
  };
}

/* ------------------------------------------------------------------ answers */

const SHOP: ConciergeLink = { label: 'Browse the shop', to: '/products' };
const SELL: ConciergeLink = { label: 'Start selling', to: '/seller/register' };
const PRICING: ConciergeLink = { label: 'See the plans', to: '/pricing' };
const CONTACT: ConciergeLink = { label: 'Contact us', to: '/contact' };
const TRACK: ConciergeLink = { label: 'Track an order', to: '/track' };
const SIGN_IN: ConciergeLink = { label: 'Shopper sign in', to: '/account/login' };

/**
 * Answer a public question.
 *
 * Every branch below says something that is true of this deployment today. The
 * fallback is the important one: it says plainly that it does not know and
 * hands the visitor to a person, because the alternative on a page selling a
 * product is a confident sentence nobody can honour.
 */
export async function answerPublicQuestion(message: string): Promise<ConciergeAnswer> {
  const topic = classify(message);

  switch (topic) {
    case 'HELP':
      return {
        topic,
        reply:
          'I can tell you what Nexus is, what it costs to sell here, how buying and ' +
          'delivery work, and what Nexus IQ does. I can also look something up in the ' +
          'shop for you. Ask by typing, or press Talk and say it out loud.',
        links: [SHOP, PRICING, SELL],
      };

    case 'WHAT_IS_NEXUS': {
      const { products, stores, categories } = await catalogueFacts();
      const scale =
        products > 0
          ? ` Right now there ${products === 1 ? 'is' : 'are'} ${products} product${
              products === 1 ? '' : 's'
            } listed by ${stores} seller${stores === 1 ? '' : 's'}${
              categories.length ? `, across ${spokenList(categories.slice(0, 4))}` : ''
            }.`
          : '';

      return {
        topic,
        reply:
          'Nexus is a marketplace, not a shop-building tool. Independent sellers list ' +
          'their products into one shared shopfront, and Nexus runs the shopfront, the ' +
          'search, the checkout and the delivery rules. Shoppers buy from any seller ' +
          `with a single account and a single bag.${scale}`,
        links: [SHOP, SELL],
      };
    }

    case 'SELL_ON_NEXUS':
      return {
        topic,
        reply:
          'You list products; we bring the shoppers. Create a seller account, add a ' +
          'product with its price, photos and stock, and the listing goes live in the ' +
          'shared shopfront the moment you publish it — there is no storefront to ' +
          'design and no traffic to buy. Orders, stock, shipments and payouts all live ' +
          'in your seller dashboard.',
        links: [SELL, PRICING, { label: 'Seller sign in', to: '/seller/login' }],
      };

    case 'PRICING': {
      const plans = await planFacts();
      if (plans.length === 0) {
        return {
          topic,
          reply:
            'The current plans are listed on the pricing page — I would rather send you ' +
            'to the live figures than quote one I cannot see right now.',
          links: [PRICING, CONTACT],
        };
      }

      const trial = plans.find(p => p.trialDays > 0)?.trialDays ?? 0;
      const lines = plans.map(p => {
        const price = spokenPrice(p.monthlyPrice, p.currency);
        return `${p.name} at ${price} a month`;
      });

      return {
        topic,
        reply:
          `There ${plans.length === 1 ? 'is' : 'are'} ${plans.length} seller plan${
            plans.length === 1 ? '' : 's'
          }: ${spokenList(lines)}. Annual billing is cheaper per month${
            trial > 0 ? `, and every plan starts with a ${trial}-day free trial` : ''
          }. Shopping on Nexus is free — a plan is only for selling.`,
        links: [PRICING, SELL],
      };
    }

    case 'FEES':
      return {
        topic,
        reply:
          'A seller pays a monthly plan, and the plan page lists what each one includes. ' +
          'Payment processing is handled by the platform rather than by you, so you do ' +
          'not set up or pay a gateway separately. For the exact rate that applies to ' +
          'your volume, the team will quote it directly.',
        links: [PRICING, CONTACT],
      };

    case 'PAYMENTS':
      return {
        topic,
        reply:
          'Nexus runs the checkout. A shopper pays by card, bank transfer or wallet ' +
          'through our payment partners, and the money is settled to the seller rather ' +
          'than passing through a gateway the seller has to maintain. Payment is always ' +
          'authorised by the shopper on the checkout page — never by the assistant.',
        links: [SHOP, CONTACT],
      };

    case 'PAYOUTS':
      return {
        topic,
        reply:
          'Payouts are shown in the Payments section of the seller dashboard: what has ' +
          'cleared, what is pending, and the account it was sent to. Sign in as a seller ' +
          'to see yours — I can only talk about the platform in general out here.',
        links: [{ label: 'Seller sign in', to: '/seller/login' }, SELL],
      };

    case 'DELIVERY':
      return {
        topic,
        reply:
          'Delivery is quoted at checkout, per seller, before you pay — so you see the ' +
          'cost against the order rather than after it. Once a seller marks an order ' +
          'fulfilled, tracking is sent to the buyer automatically. For anything about a ' +
          'specific order or a return, our team can look it up with you.',
        links: [TRACK, CONTACT],
      };

    case 'TRACK_ORDER':
      return {
        topic,
        reply:
          'You can track an order without an account — the order number and the email ' +
          'it was placed with are enough. If you do have an account, every order is in ' +
          'your order history.',
        links: [TRACK, SIGN_IN],
      };

    case 'MY_ACCOUNT_DATA':
      return {
        topic,
        reply:
          'Out here I only know about Nexus itself — not about your account, so I cannot read ' +
          'your bag, your orders or your figures from this side. Sign in and Nexus IQ picks ' +
          'exactly that up: a shopper gets their bag and order history, a seller gets their own ' +
          'stock, orders and revenue. You can also track a single order with just its number and ' +
          'the email it was placed with.',
        links: [SIGN_IN, { label: 'Seller sign in', to: '/seller/login' }, TRACK],
      };

    case 'BUYING':
      return {
        topic,
        reply:
          'Browse or search the shop, add what you want to your bag, and check out. You ' +
          'can fill a bag without an account; signing in happens at checkout, where you ' +
          'enter delivery details and authorise the payment yourself. One account covers ' +
          'every seller on Nexus.',
        links: [SHOP, { label: 'All products', to: '/products/browse' }, SIGN_IN],
      };

    case 'CATEGORIES': {
      const { categories, products } = await catalogueFacts();
      if (categories.length === 0) {
        return {
          topic,
          reply:
            'Nothing is listed in the shop at the moment, so I have no categories to ' +
            'read you. The shop page is the place to check — it is built from whatever ' +
            'is live.',
          links: [SHOP],
        };
      }
      return {
        topic,
        reply:
          `The busiest categories right now are ${spokenList(categories)}${
            products > 0 ? `, out of ${products} live listing${products === 1 ? '' : 's'}` : ''
          }. The shop page groups all of them.`,
        links: [SHOP, { label: 'All products', to: '/products/browse' }],
      };
    }

    case 'CATALOGUE': {
      const { products, stores, categories } = await catalogueFacts();
      return {
        topic,
        reply:
          products > 0
            ? `There ${products === 1 ? 'is' : 'are'} ${products} product${
                products === 1 ? '' : 's'
              } live from ${stores} seller${stores === 1 ? '' : 's'}${
                categories.length ? ` across ${spokenList(categories.slice(0, 4))}` : ''
              }. Those figures are the live catalogue, not a brochure number.`
            : 'The shop has no live listings at the moment. Sellers can start listing straight away.',
        links: [SHOP, SELL],
      };
    }

    case 'PRODUCT_SEARCH': {
      const phrase = searchPhrase(message);
      if (phrase.length < 3) {
        return {
          topic,
          reply: 'What would you like me to look for?',
          links: [SHOP],
        };
      }

      const found = await searchCatalogue(phrase, { limit: 4 });
      if (found.results.length === 0) {
        return {
          topic,
          reply:
            `I could not find anything for ${phrase} in the shop. Try different words, ` +
            'or browse the categories.',
          links: [{ label: 'All products', to: '/products/browse' }],
          results: [],
        };
      }

      const named = found.results
        .slice(0, 3)
        .map(p => `${p.title} from ${p.store.name} at ${spokenPrice(p.price)}`);

      return {
        topic,
        reply:
          `${found.results.length === 1 ? 'There is one' : `I found ${found.results.length}`}: ` +
          `${spokenList(named)}. Open the shop to add anything to your bag — out here I can ` +
          'look things up, but your bag needs an account behind it.',
        links: [SHOP, SIGN_IN],
        results: found.results,
      };
    }

    case 'NEXUS_IQ':
      return {
        topic,
        reply:
          'Nexus IQ is the assistant you are talking to. On these public pages it answers ' +
          'questions about Nexus and looks things up in the shop, and anyone can use it. ' +
          'Signed in, it does the work that belongs to your account: for a shopper it ' +
          'searches, fills the bag and walks you to checkout; for a seller it reads that ' +
          "store's own stock, orders and revenue and says what needs attention.",
        links: [SIGN_IN, { label: 'Seller sign in', to: '/seller/login' }],
      };

    case 'VOICE':
      return {
        topic,
        reply:
          'Out here you can just talk — press Talk and say it, in any voice, with no ' +
          'setup. On your own pages it works differently on purpose: a signed-in shopper ' +
          'or seller registers their voice once, and from then on Nexus IQ answers spoken ' +
          'commands only when the voice matches, so nobody else at your desk can tell it ' +
          'to spend your money or read your sales figures.',
        links: [SIGN_IN, { label: 'Seller sign in', to: '/seller/login' }],
      };

    case 'ACCOUNTS':
      return {
        topic,
        reply:
          'There are two kinds of account. A shopper account is free and covers every ' +
          'seller on Nexus — one bag, one order history. A seller account is what you ' +
          'list products with, and it carries a plan. They are separate sign-ins.',
        links: [SIGN_IN, SELL, PRICING],
      };

    case 'CONTACT':
      return {
        topic,
        reply:
          'The contact page has our head office, the phone number and a message form, ' +
          'and the green WhatsApp button in the corner of this page opens a chat with ' +
          'the support team directly.',
        links: [CONTACT],
      };

    default:
      return {
        topic: 'UNKNOWN',
        reply:
          'I am not sure about that one, and I would rather say so than guess. Ask me ' +
          'about selling on Nexus, the plans, buying and delivery, or Nexus IQ itself — ' +
          'or send it to a person on WhatsApp or the contact page.',
        links: [CONTACT, SHOP, PRICING],
      };
  }
}

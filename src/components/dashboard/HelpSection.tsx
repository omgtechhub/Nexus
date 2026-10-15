import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ChevronDown, LifeBuoy, Mail, MessageSquare, ExternalLink,
  BarChart3, Package, ShoppingBag, Truck, CreditCard, Star, Sparkles,
  Settings as SettingsIcon, Keyboard, BookOpen,
} from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * The seller help centre.
 *
 * It used to be a link to Settings, which is not help — a merchant who clicks
 * "Help" has a question, and landing on a form of their own API keys answers
 * none of them. This is its own section at /seller/help.
 *
 * Every answer below describes something the dashboard actually does, and the
 * topic cards deep-link to the section the answer is about, so reading stops
 * at the point where the merchant can act. Nothing here promises a feature
 * Nexus does not have: there is no theme editor, no discount-code manager and
 * no shipping-zone editor, because the platform owns the shopfront, the
 * checkout and the delivery rules.
 */

interface Topic {
  id: string;
  label: string;
  blurb: string;
  icon: typeof Package;
  to: string;
}

const TOPICS: Topic[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    blurb: 'List your first product and take your first order.',
    icon: BookOpen,
    to: '/seller/products',
  },
  {
    id: 'products',
    label: 'Products & inventory',
    blurb: 'Pricing, variants, SKUs and stock counts.',
    icon: Package,
    to: '/seller/products',
  },
  {
    id: 'orders',
    label: 'Orders',
    blurb: 'Reading an order, its status and its history.',
    icon: ShoppingBag,
    to: '/seller/orders',
  },
  {
    id: 'shipments',
    label: 'Shipping & delivery',
    blurb: 'Labels, tracking and delivery exceptions.',
    icon: Truck,
    to: '/seller/shipments',
  },
  {
    id: 'payments',
    label: 'Payments & payouts',
    blurb: 'When money settles and where it lands.',
    icon: CreditCard,
    to: '/seller/payments',
  },
  {
    id: 'reviews',
    label: 'Ratings & reviews',
    blurb: 'What buyers can post and how to reply.',
    icon: Star,
    to: '/seller/reviews',
  },
  {
    id: 'nexus-iq',
    label: 'Nexus IQ',
    blurb: 'Insights, the assistant and talking to it.',
    icon: Sparkles,
    to: '/seller/nexus-iq',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    blurb: 'What each figure is counted from.',
    icon: BarChart3,
    to: '/seller/analytics',
  },
  {
    id: 'account',
    label: 'Account & security',
    blurb: 'Sign-in, team access and API keys.',
    icon: SettingsIcon,
    to: '/seller/settings',
  },
];

interface Article {
  id: string;
  topic: string;
  question: string;
  /** One paragraph per entry. Kept as an array so the layout owns the spacing. */
  answer: string[];
  action?: { label: string; to: string };
}

const ARTICLES: Article[] = [
  {
    id: 'first-product',
    topic: 'getting-started',
    question: 'How do I list my first product?',
    answer: [
      'Open Products and choose Add product. A listing needs a title, a price, a SKU and a stock count; everything else — images, variants, description — can follow later.',
      'Saving it publishes it to the Nexus marketplace straight away, so shoppers can find it in search and on the category pages. If you are not ready for that, set the stock count to zero: the listing stays visible but cannot be bought.',
    ],
    action: { label: 'Go to Products', to: '/seller/products' },
  },
  {
    id: 'where-is-my-storefront',
    topic: 'getting-started',
    question: 'Where is my storefront, and can I change its design?',
    answer: [
      'Nexus is a marketplace rather than a store builder. Your products are listed in the shared shopfront alongside other merchants, and you also get a store page of your own at /storefront/your-store.',
      'There is no theme editor, because the platform owns the shopfront, the checkout and the delivery rules. That is what keeps one checkout, one bag and one set of delivery promises across every merchant — a shopper can buy from four stores in a single order.',
    ],
  },
  {
    id: 'quick-add',
    topic: 'getting-started',
    question: 'Is there a faster way to add things?',
    answer: [
      'The + button in the top bar opens Quick add, which creates a product, an order or a customer without leaving the page you are on.',
      'Press ⌘K — Ctrl K on Windows — to open the command palette and jump to any section by name.',
    ],
  },
  {
    id: 'stock-counts',
    topic: 'products',
    question: 'Why does my stock count differ from what I set?',
    answer: [
      'Stock is reserved the moment an order is placed and released if that order is cancelled, so the figure in Inventory is what is available to sell rather than what is physically on your shelf.',
      'Inventory shows both numbers per variant. If they have drifted apart, the difference is sitting in open orders.',
    ],
    action: { label: 'Go to Inventory', to: '/seller/inventory' },
  },
  {
    id: 'variants',
    topic: 'products',
    question: 'How do variants and SKUs work?',
    answer: [
      'A product holds the shared detail — title, description, images — and each variant carries its own SKU, price and stock count. A shopper buys a variant, never a product.',
      'SKUs must be unique within your store. That is what lets stock, shipments and payouts be traced back to one specific thing you sold.',
    ],
  },
  {
    id: 'low-stock',
    topic: 'products',
    question: 'Can Nexus warn me before something sells out?',
    answer: [
      'Yes. Nexus IQ raises a low-stock insight when a variant is close to running out, and each insight shows the figures it was computed from so you can check it before acting.',
    ],
    action: { label: 'Open Nexus IQ', to: '/seller/nexus-iq' },
  },
  {
    id: 'order-statuses',
    topic: 'orders',
    question: 'What do the order statuses mean?',
    answer: [
      'Pending means the order exists but payment has not been confirmed. Paid means the gateway has confirmed the charge and the money is on its way to you. Fulfilled means you have handed the goods to a carrier, and Cancelled releases the reserved stock back to Inventory.',
      'Nexus never marks an order paid on the strength of a redirect back from the gateway. The status changes only when the gateway itself confirms the charge server-side, which is why a status can lag a shopper saying they have paid.',
    ],
    action: { label: 'Go to Orders', to: '/seller/orders' },
  },
  {
    id: 'order-contains-other-stores',
    topic: 'orders',
    question: 'A buyer says they ordered more than I can see. Why?',
    answer: [
      'One marketplace checkout can span several merchants. The shopper sees a single purchase; each merchant sees only their own lines, their own totals and their own buyer details.',
      'So the order in your dashboard is your part of that purchase. The rest belongs to other stores and is not yours to see.',
    ],
  },
  {
    id: 'cancel-refund',
    topic: 'orders',
    question: 'How do I cancel or refund an order?',
    answer: [
      'Open the order and use Cancel. Cancelling releases the reserved stock immediately so the items go back on sale.',
      'A refund is returned through the gateway that took the payment, which means it follows that provider\'s timetable — usually a few working days before it reaches the buyer\'s bank.',
    ],
  },
  {
    id: 'tracking',
    topic: 'shipments',
    question: 'How do I add tracking to an order?',
    answer: [
      'Open Shipments, create a shipment against the order, and enter the carrier and tracking number. Every status change you make appends an event to the tracking history the buyer sees.',
      'Buyers follow that history at /track with their order number and email, so a guest with no account can still see where their parcel is.',
    ],
    action: { label: 'Go to Shipments', to: '/seller/shipments' },
  },
  {
    id: 'delivery-exception',
    topic: 'shipments',
    question: 'The carrier reported a problem. What should I mark?',
    answer: [
      'Mark the shipment as an Exception. It tells the buyer plainly that the carrier could not complete the delivery, rather than leaving the parcel reading "in transit" while nothing moves.',
      'Once the carrier tries again, move it back to In transit and the history keeps both events.',
    ],
  },
  {
    id: 'shipping-rates',
    topic: 'shipments',
    question: 'Can I set my own shipping rates and zones?',
    answer: [
      'No — delivery rules belong to the platform. A marketplace bag can hold items from several merchants, and a shopper cannot be shown four different sets of rules for one delivery.',
    ],
  },
  {
    id: 'payouts',
    topic: 'payments',
    question: 'When do I get paid?',
    answer: [
      'A charge is confirmed by the payment provider, then settles into your payout balance. Payments shows each charge, each payout and the balance between them.',
      'Settlement timing is the provider\'s, not ours: Paystack and Flutterwave each have their own schedule, and Payments names which provider handled a given charge.',
    ],
    action: { label: 'Go to Payments', to: '/seller/payments' },
  },
  {
    id: 'payment-mismatch',
    topic: 'payments',
    question: 'A payment shows a different amount than the order. Why?',
    answer: [
      'Nexus verifies the amount and currency the gateway actually charged against the order before marking it paid. If they disagree, the order is held rather than fulfilled, and the discrepancy is recorded against the payment.',
      'That is deliberate. A mismatch is either a currency problem or a tampered checkout, and neither should quietly become a shipped parcel.',
    ],
  },
  {
    id: 'review-moderation',
    topic: 'reviews',
    question: 'Can I delete a bad review?',
    answer: [
      'No. Reviews can only be left by a buyer with a confirmed order for that product, and you cannot remove one — a ratings page you can edit is worth nothing to a shopper.',
      'You can reply to any review. A calm, specific reply does more for the next shopper than a missing review would.',
    ],
    action: { label: 'Go to Reviews', to: '/seller/reviews' },
  },
  {
    id: 'iq-insights',
    topic: 'nexus-iq',
    question: 'Where do Nexus IQ insights come from?',
    answer: [
      'They are computed from your own store data — orders, margins, stock and prices — and every insight shows the figures behind it so you can check the reasoning before acting on it.',
      'If no language model is configured, Nexus IQ says so plainly at the top of the section and answers from those same figures rather than writing prose.',
    ],
    action: { label: 'Open Nexus IQ', to: '/seller/nexus-iq' },
  },
  {
    id: 'iq-voice',
    topic: 'nexus-iq',
    question: 'How do I talk to Nexus IQ instead of typing?',
    answer: [
      'Open the Voice tab in Nexus IQ and register your voice once — four short recordings, the last two from where you normally sit. After that, press Start listening and simply talk: the microphone stays open and sends each question when you stop speaking, so there is no button to hold down.',
      'Press Stop listening when you are finished and the microphone is released. Hold to speak is still there if you would rather send one question at a time in a noisy room.',
    ],
  },
  {
    id: 'iq-voice-not-matching',
    topic: 'nexus-iq',
    question: 'Nexus IQ will not answer my voice. What now?',
    answer: [
      'Re-record your voice from where you normally sit. The matching threshold is measured from your own recordings, so a profile built leaning into the microphone will refuse the same question asked from across the room.',
      'Voice matching decides whether Nexus IQ replies. It is not a security check — your sign-in is what protects your store\'s data.',
    ],
  },
  {
    id: 'analytics-figures',
    topic: 'analytics',
    question: 'Which orders are counted in my revenue?',
    answer: [
      'Confirmed ones. Revenue counts orders the gateway has confirmed as paid; pending and cancelled orders are excluded, so the figure does not move when an abandoned checkout expires.',
      'Totals are for your store only, even on an order shared with other merchants.',
    ],
    action: { label: 'Go to Analytics', to: '/seller/analytics' },
  },
  {
    id: 'team-access',
    topic: 'account',
    question: 'How do I give someone else access to my store?',
    answer: [
      'Invite them from Settings. Each member signs in with their own account, so what they did is attributable to them rather than to a shared password.',
    ],
    action: { label: 'Go to Settings', to: '/seller/settings' },
  },
  {
    id: 'api-keys',
    topic: 'account',
    question: 'Where are my API keys?',
    answer: [
      'Settings holds your API keys and webhook endpoints. A key is shown once when it is created and stored hashed afterwards, so you cannot read it back later — create a new one and retire the old one instead.',
    ],
    action: { label: 'Go to Settings', to: '/seller/settings' },
  },
  {
    id: 'close-account',
    topic: 'account',
    question: 'How do I close my store?',
    answer: [
      'Email support and we will walk through it with you. Closing a store has to settle outstanding payouts and open orders first, which is why it is not a button.',
    ],
  },
];

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open the command palette', note: 'Ctrl K on Windows' },
  { keys: ['Esc'], label: 'Close a panel, modal or the palette' },
  { keys: ['Tab'], label: 'Move through a form or a table in order' },
];

export function HelpSection() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return ARTICLES.filter(article => {
      if (topic && article.topic !== topic) return false;
      if (!term) return true;
      return (
        article.question.toLowerCase().includes(term) ||
        article.answer.some(p => p.toLowerCase().includes(term))
      );
    });
  }, [query, topic]);

  const activeTopic = topic ? TOPICS.find(t => t.id === topic) : null;

  return (
    <div className="space-y-6">
      {/* Masthead: the question comes first, so the search field is the
          largest thing on the page rather than a decorative hero. */}
      <section className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--surface-2)] p-5 sm:p-7">
        {/* An h2, not an h1: the dashboard's top bar already carries the page's
            h1, and a second one would leave the section with no outline. */}
        <h2 className="flex items-center gap-2.5 text-xl font-bold leading-tight text-primary sm:text-2xl">
          <LifeBuoy size={20} className="flex-shrink-0 text-[var(--brand-yellow-ink)]" aria-hidden="true" />
          What can we help you with?
        </h2>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-secondary">
          Answers about selling on Nexus, written against what the dashboard actually does.
        </p>

        <div className="relative mt-5 max-w-xl">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search help — payouts, tracking, variants…"
            aria-label="Search help articles"
            className={cn(
              'h-12 w-full rounded-xl border border-[var(--ink)]/12 bg-[var(--surface-base)] pl-10 pr-4',
              'text-sm text-primary placeholder:text-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]'
            )}
          />
        </div>
      </section>

      {/* Topics. Each one is a filter and a way into the section it is about,
          so a merchant can read the answer or just go and do the thing. */}
      <section aria-labelledby="help-topics">
        <h2 id="help-topics" className="mb-3 text-sm font-semibold text-primary">
          Browse by topic
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map(item => {
            const Icon = item.icon;
            const isActive = topic === item.id;
            const count = ARTICLES.filter(a => a.topic === item.id).length;

            return (
              <div
                key={item.id}
                className={cn(
                  'group rounded-2xl border p-4 transition-colors',
                  isActive
                    ? 'border-[#FFBD2E]/50 bg-[#FFBD2E]/5'
                    : 'border-[var(--ink)]/10 bg-[var(--surface-2)] hover:border-[var(--ink)]/20'
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTopic(isActive ? null : item.id);
                    setOpen(null);
                  }}
                  aria-pressed={isActive}
                  className={cn(
                    'flex w-full items-start gap-3 text-left',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-2)]'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl',
                      isActive ? 'bg-[#FFBD2E]/20 text-[var(--brand-yellow-ink)]' : 'bg-[var(--ink)]/[0.06] text-muted'
                    )}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-primary">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                      {item.blurb}
                    </span>
                    <span className="mt-1.5 block text-[11px] text-muted">
                      {count} {count === 1 ? 'answer' : 'answers'}
                    </span>
                  </span>
                </button>
                <Link
                  to={item.to}
                  className={cn(
                    'mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-yellow-ink)] hover:underline',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-2)]'
                  )}
                >
                  Open {item.label.toLowerCase()}
                  <ExternalLink size={11} aria-hidden="true" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Answers */}
      <section aria-labelledby="help-answers">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="help-answers" className="text-sm font-semibold text-primary">
            {activeTopic ? activeTopic.label : 'Common questions'}
          </h2>
          {(topic || query) && (
            <button
              type="button"
              onClick={() => {
                setTopic(null);
                setQuery('');
              }}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold text-secondary hover:bg-[var(--ink)]/5 hover:text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]'
              )}
            >
              Clear filters
            </button>
          )}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {results.length} {results.length === 1 ? 'answer' : 'answers'}
        </p>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--surface-2)] p-8 text-center">
            <MessageSquare size={20} className="mx-auto mb-3 text-muted" aria-hidden="true" />
            <p className="text-sm font-semibold text-primary">Nothing here matches “{query}”.</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-secondary">
              Ask us directly and a person will answer — include your store name and the order
              number if it is about a specific order.
            </p>
            <a
              href="mailto:support@nexus.io"
              className={cn(
                'mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFBD2E] px-4 text-sm font-bold text-slate-950 hover:bg-[#ffc954]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-sunken)]'
              )}
            >
              <Mail size={14} aria-hidden="true" />
              Email support
            </a>
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map(article => {
              const isOpen = open === article.id;
              return (
                <li
                  key={article.id}
                  className="overflow-hidden rounded-2xl border border-[var(--ink)]/10 bg-[var(--surface-2)]"
                >
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : article.id)}
                      aria-expanded={isOpen}
                      aria-controls={`help-answer-${article.id}`}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--ink)]/[0.03]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFBD2E]'
                      )}
                    >
                      <span className="text-sm font-semibold text-primary">{article.question}</span>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={cn(
                          'flex-shrink-0 text-muted transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </h3>
                  <div
                    id={`help-answer-${article.id}`}
                    hidden={!isOpen}
                    className="border-t border-[var(--ink)]/[0.07] px-4 pb-4 pt-3"
                  >
                    {article.answer.map((paragraph, i) => (
                      <p
                        key={i}
                        className={cn('max-w-prose text-sm leading-relaxed text-secondary', i > 0 && 'mt-2.5')}
                      >
                        {paragraph}
                      </p>
                    ))}
                    {article.action && (
                      <Link
                        to={article.action.to}
                        className={cn(
                          'mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-yellow-ink)] hover:underline',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-2)]'
                        )}
                      >
                        {article.action.label}
                        <ExternalLink size={11} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Shortcuts and the way to reach a person. */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section
          aria-labelledby="help-shortcuts"
          className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--surface-2)] p-5"
        >
          <h2 id="help-shortcuts" className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Keyboard size={15} className="text-muted" aria-hidden="true" />
            Keyboard shortcuts
          </h2>
          <dl className="mt-3 space-y-2.5">
            {SHORTCUTS.map(shortcut => (
              <div key={shortcut.label} className="flex items-start justify-between gap-4">
                <dt className="text-sm text-secondary">
                  {shortcut.label}
                  {shortcut.note && (
                    <span className="mt-0.5 block text-[11px] text-muted">{shortcut.note}</span>
                  )}
                </dt>
                <dd className="flex flex-shrink-0 items-center gap-1">
                  {shortcut.keys.map(key => (
                    <kbd
                      key={key}
                      className="rounded-md border border-[var(--ink)]/15 bg-[var(--ink)]/[0.05] px-1.5 py-0.5 text-[11px] font-semibold text-body"
                    >
                      {key}
                    </kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="help-contact"
          className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--surface-2)] p-5"
        >
          <h2 id="help-contact" className="flex items-center gap-2 text-sm font-semibold text-primary">
            <MessageSquare size={15} className="text-muted" aria-hidden="true" />
            Still stuck?
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-secondary">
            Tell us your store name and, if it is about one order, its order number. That is
            usually everything we need to answer in the first reply.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="mailto:support@nexus.io"
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFBD2E] px-4 text-sm font-bold text-slate-950 hover:bg-[#ffc954]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-2)]'
              )}
            >
              <Mail size={14} aria-hidden="true" />
              Email support
            </a>
            <Link
              to="/contact"
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--ink)]/15 px-4 text-sm font-semibold text-secondary hover:bg-[var(--ink)]/5 hover:text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-2)]'
              )}
            >
              Contact the team
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

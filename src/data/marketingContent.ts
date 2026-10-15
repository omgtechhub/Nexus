// Marketing copy rendered by the public homepage sections. Every domain entity
// (users, stores, products, orders, customers, analytics, notifications) now
// comes from the API, so no fixtures live here.
import { PricingPlan } from '../types';
import { getAssetUrl } from '../utils/assetPath';

/*
 * The seller plans, as the billing system holds them.
 *
 * Both figures and features are taken from the `SubscriptionPlan` rows that
 * actually charge a card (see `server/prisma/seed.ts`). Three surfaces used to
 * quote three different prices for the same plan — this file said Growth was
 * $59, the pricing page said $79, and the database billed $79 — so a seller
 * could be charged a number they had never been shown. One source wins, and it
 * has to be the one that takes the money.
 *
 * The feature lists are also off the store-builder pitch they used to carry:
 * theme counts, abandoned-cart flows, multi-store management, white-labelling
 * and a custom checkout. None of those exist here, and on a marketplace most
 * of them would not make sense if they did — the platform owns the shopfront,
 * the checkout and the delivery rules. What a plan actually buys is headroom:
 * how many listings, how many people on the account, how much Nexus IQ, and
 * how fast somebody answers.
 */
export const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    annualPrice: 24,
    description: 'Everything you need to start listing.',
    features: [
      'Up to 50 active listings',
      '2 team members',
      'Standard sales analytics',
      '1,000 Nexus IQ tokens / mo',
      'Listed in the shared shopfront',
      'Checkout & payouts run for you',
      'Email support',
    ],
    highlighted: false,
    cta: 'Start free trial',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    annualPrice: 66,
    description: 'For sellers with real order volume.',
    features: [
      'Up to 500 active listings',
      '5 team members',
      'Advanced analytics & export',
      '10,000 Nexus IQ tokens / mo',
      'Low-stock and restock alerts',
      'Fulfilment & shipment tracking',
      'Priority support',
    ],
    highlighted: false,
    badge: 'Popular',
    cta: 'Start free trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    annualPrice: 166,
    description: 'For established catalogues and teams.',
    features: [
      'Up to 2,500 active listings',
      '15 team members',
      'Full analytics suite + AI insights',
      '100,000 Nexus IQ tokens / mo',
      'Margin and repricing guidance',
      'Multi-warehouse stock tracking',
      'VIP 24/7 support',
    ],
    highlighted: true,
    badge: 'Best Value',
    cta: 'Start free trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    annualPrice: 416,
    description: 'For high-volume and wholesale sellers.',
    features: [
      'Up to 10,000 active listings',
      '50 team members',
      'Unlimited Nexus IQ',
      'Dedicated account manager',
      'Custom integrations',
      'Advanced security & compliance',
      '99.99% uptime SLA',
    ],
    highlighted: false,
    cta: 'Contact sales',
  },
];

export const testimonials = [
  {
    id: 1,
    quote: "Nexus Commerce completely transformed how we run our business. Sales are up 340% since switching, and the AI insights have been a game-changer for our inventory management.",
    author: "Sarah Mitchell",
    title: "Founder & CEO",
    company: "Mitchell Collective",
    avatar: getAssetUrl("/images/avatar-1.jpg"),
    stars: 5,
    revenue: "$2.4M annual revenue",
  },
  {
    id: 2,
    quote: "We've tried every platform out there. Nexus is the only one that feels like it was built for serious merchants. The checkout conversion rate alone paid for itself in the first month.",
    author: "James Watanabe",
    title: "Director of E-commerce",
    company: "Pacific Goods Co.",
    avatar: getAssetUrl("/images/avatar-2.jpg"),
    stars: 5,
    revenue: "50% higher conversions",
  },
  {
    id: 3,
    quote: "We list once and the whole marketplace sees it. No storefront to maintain, no ads to buy — our team of 3 now handles what used to take 20.",
    author: "Isabella Torres",
    title: "Operations Lead",
    company: "Bloom Botanicals",
    avatar: getAssetUrl("/images/avatar-3.jpg"),
    stars: 5,
    revenue: "3 people, 1 catalogue",
  },
];

/*
 * The homepage FAQ.
 *
 * Rewritten off the store-builder answers it used to give — migrating "your
 * existing store" from Shopify, connecting your own domain, 100+ payment
 * gateways including Shop Pay. None of that is what Nexus does or has. Every
 * answer below is true of this platform today; where a figure is involved it
 * matches the plans above, which match the rows that bill.
 */
export const faqs = [
  {
    question: "Is Nexus a marketplace or a store builder?",
    answer: "A marketplace. You list your products and they appear in one shared shopfront alongside other sellers, where shoppers browse and buy with a single account. There is no storefront to design and no traffic to buy — Nexus runs the shopfront, the search, the checkout and the delivery rules. You also get a seller page of your own that collects everything you have listed.",
  },
  {
    question: "Can I try Nexus Commerce for free?",
    answer: "Yes. Every plan comes with a 14-day free trial and full access to the seller dashboard, including Nexus IQ. No credit card is required to start, and you only pay when the trial ends.",
  },
  {
    question: "Do I need my own website or domain?",
    answer: "No. Your listings live on Nexus, so there is nothing to host, design or point a domain at. If you already have a site, you can keep it and use Nexus as another place your products sell.",
  },
  {
    question: "How do shoppers pay, and how do I get paid?",
    answer: "Nexus runs the checkout. Shoppers pay by card, bank transfer or wallet through our payment partners, and you never set up or maintain a gateway yourself. What has cleared, what is pending and where it was sent all show up in the Payments section of your dashboard.",
  },
  {
    question: "What does it cost to sell?",
    answer: "A monthly plan, and nothing else to configure — payment processing is handled by the platform rather than billed to you separately. The plans above are the current prices; for high-volume or wholesale selling, talk to us and we will quote against your figures.",
  },
  {
    question: "Is there a limit on how much I can sell?",
    answer: "There is no cap on revenue or orders. Plans differ in how many active listings you can have at once — 50 on Starter up to 10,000 on Enterprise — so you move up when your catalogue grows, not when your sales do.",
  },
  {
    question: "What is Nexus IQ?",
    answer: "Your own analyst, built into the dashboard. It reads your stock, orders, prices and margins and tells you what to restock, what to reprice and which listings are about to run dry — always showing the figures behind the advice so you can check it before acting. You can also talk to it, and on your own pages it answers only to your registered voice.",
  },
  {
    question: "Do you offer support?",
    answer: "Every plan includes email support. Growth gets priority response times, Pro gets VIP support around the clock, and Enterprise adds a dedicated account manager. There is also a WhatsApp button on every page that reaches a person directly.",
  },
  {
    question: "Is Nexus Commerce PCI compliant?",
    answer: "Yes. Nexus Commerce is Level 1 PCI DSS compliant and SOC 2 Type II certified, and card data is tokenised rather than stored. All data is encrypted in transit and at rest.",
  },
];

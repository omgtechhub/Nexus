// Marketing copy rendered by the public homepage sections. Every domain entity
// (users, stores, products, orders, customers, analytics, notifications) now
// comes from the API, so no fixtures live here.
import { PricingPlan } from '../types';
import { getAssetUrl } from '../utils/assetPath';

export const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    annualPrice: 23,
    description: 'Everything you need to start selling online.',
    features: [
      'Up to 100 products',
      'Basic analytics dashboard',
      '2% transaction fee',
      'Email support (48hr)',
      'Free SSL certificate',
      'Basic themes (10)',
      'Manual order creation',
      'Discount codes',
    ],
    highlighted: false,
    cta: 'Start free trial',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 59,
    annualPrice: 47,
    description: 'Scale your business with powerful tools.',
    features: [
      'Up to 1,000 products',
      'Advanced analytics + reports',
      '1% transaction fee',
      'Priority support (12hr)',
      'Gift cards & coupons',
      'Professional themes (50)',
      'Abandoned cart recovery',
      'Staff accounts (5)',
      'Multi-currency support',
      'API access',
    ],
    highlighted: false,
    badge: 'Popular',
    cta: 'Start free trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    annualPrice: 63,
    description: 'The complete solution for growing brands.',
    features: [
      'Unlimited products',
      'Full analytics suite + AI insights',
      '0.5% transaction fee',
      '24/7 Priority support',
      'Advanced promotions',
      'All themes (100+)',
      'Abandoned cart + email flows',
      'Staff accounts (15)',
      'Multi-currency + tax automation',
      'Full API access',
      'Custom checkout',
      'B2B wholesale tools',
    ],
    highlighted: true,
    badge: 'Best Value',
    cta: 'Start free trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    annualPrice: 239,
    description: 'Custom solutions for large-scale operations.',
    features: [
      'Everything in Pro',
      'Unlimited staff accounts',
      '0% transaction fee',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantees (99.99%)',
      'Advanced security & compliance',
      'Custom reporting',
      'Multi-store management',
      'White-label options',
      'Training & onboarding',
      'Custom contracts',
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
    quote: "The multi-store management and global expansion tools made scaling into 12 new countries effortless. Our team of 3 manages what used to require a team of 20.",
    author: "Isabella Torres",
    title: "Operations Lead",
    company: "Bloom Botanicals",
    avatar: getAssetUrl("/images/avatar-3.jpg"),
    stars: 5,
    revenue: "12 countries, 1 platform",
  },
];

export const faqs = [
  {
    question: "Can I try Nexus Commerce for free?",
    answer: "Yes! Every plan comes with a 14-day free trial with full access to all features. No credit card required to start. You only pay when you're ready to go live.",
  },
  {
    question: "What payment methods does Nexus support?",
    answer: "Nexus Commerce supports 100+ payment gateways including Stripe, PayPal, Square, Apple Pay, Google Pay, Shop Pay, and many regional processors. We handle all the complexity so you don't have to.",
  },
  {
    question: "Can I migrate my existing store to Nexus?",
    answer: "Absolutely. We offer free store migration from Shopify, WooCommerce, BigCommerce, Magento, and more. Our migration team handles everything from products and customers to order history and SEO settings.",
  },
  {
    question: "How does the transaction fee work?",
    answer: "Transaction fees vary by plan: 2% on Starter, 1% on Growth, 0.5% on Pro, and 0% on Enterprise. These fees are waived entirely when using Nexus Payments as your payment processor.",
  },
  {
    question: "Is there a limit on how much I can sell?",
    answer: "No revenue caps — ever. Whether you're selling $100/month or $10M/month, Nexus scales with you. Our infrastructure is built to handle millions of orders with 99.99% uptime.",
  },
  {
    question: "Do you offer technical support?",
    answer: "All plans include email support. Growth and Pro plans get priority support with faster response times. Enterprise customers receive a dedicated account manager and 24/7 phone support.",
  },
  {
    question: "Can I use my own domain name?",
    answer: "Yes! You can connect any existing domain or purchase a new one directly through Nexus. We provide a free SSL certificate and handle all DNS configuration for you.",
  },
  {
    question: "Is Nexus Commerce PCI compliant?",
    answer: "Yes, Nexus Commerce is Level 1 PCI DSS compliant — the highest level of payment security certification. All data is encrypted in transit and at rest, and we're SOC 2 Type II certified.",
  },
];

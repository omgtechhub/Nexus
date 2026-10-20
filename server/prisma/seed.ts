import { PrismaClient, Role, MerchantStatus, ProductStatus, OrderStatus, PaymentStatus, FulfillmentStatus, DiscountType, DiscountStatus, NotificationType, InventoryMovementType, OrderAddressType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { applyCatalogue } from './catalogue.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Nexus Commerce Phase 3 PostgreSQL database...');

  // Clean existing data
  await prisma.subscriptionEvent.deleteMany();
  await prisma.saasWebhookEvent.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.billingTransaction.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.billingCustomer.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.teamInvitation.deleteMany();
  await prisma.trackingEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.shippingMethod.deleteMany();
  await prisma.shippingZone.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderAddress.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.session.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.merchantSettings.deleteMany();
  await prisma.merchantMember.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.user.deleteMany();

  // Create default owner user
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const owner = await prisma.user.create({
    data: {
      id: 'usr_demo_owner',
      email: 'alex@nexuscommerce.io',
      name: 'Sarah Mitchell',
      passwordHash,
      plan: 'pro',
      isVerified: true,
      twoFactorEnabled: false,
    },
  });

  console.log(`User created: ${owner.email}`);

  /*
   * The seeded merchant.
   *
   * Its id keeps the old `str_` prefix deliberately. It is an opaque key that
   * live rows, `catalogue.ts` and `clean-test-data.ts`'s protected-id list all
   * reference; renaming it would orphan the demo catalogue on any database
   * that already has it, which is a real cost for a string nobody sees.
   */
  const merchant = await prisma.merchant.create({
    data: {
      id: 'str_aura_apparel',
      name: 'Aura Apparel',
      currency: 'NGN — Nigerian Naira',
      timezone: 'Africa/Lagos',
      industry: 'Fashion & Apparel',
      status: MerchantStatus.ACTIVE,
      ownerId: owner.id,
    },
  });

  console.log(`Merchant created: ${merchant.name}`);

  await prisma.merchantMember.create({
    data: {
      userId: owner.id,
      merchantId: merchant.id,
      role: Role.OWNER,
    },
  });

  await prisma.merchantSettings.create({
    data: {
      merchantId: merchant.id,
      displayName: merchant.name,
      description: 'Sustainable luxury fashion, designed for modern living.',
      currency: 'NGN — Nigerian Naira',
      industry: 'Fashion & Apparel',
      contactEmail: 'hello@auraapparel.test',
    },
  });

  // Seed Product Categories
  const catApparel = await prisma.productCategory.create({
    data: { merchantId: merchant.id, name: 'Apparel', slug: 'apparel', description: 'Premium garments and streetwear' },
  });
  const catBags = await prisma.productCategory.create({
    data: { merchantId: merchant.id, name: 'Bags & Accessories', slug: 'bags-accessories', description: 'Handcrafted leather goods' },
  });
  const catWatches = await prisma.productCategory.create({
    data: { merchantId: merchant.id, name: 'Watches', slug: 'watches', description: 'Timepieces & luxury watches' },
  });

  // Seed Products with Variants, Images & Inventory
  const p1 = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      title: 'Minimalist Leather Tote',
      name: 'Minimalist Leather Tote',
      slug: 'minimalist-leather-tote',
      description: 'Handcrafted genuine Italian full-grain leather tote bag with interior organizer pockets.',
      price: 189.0,
      comparePrice: 229.0,
      costPrice: 85.0,
      sku: 'SKU-TOT-001',
      barcode: '849201948201',
      status: ProductStatus.ACTIVE,
      category: catBags.name,
      categoryId: catBags.id,
      tags: ['leather', 'bestseller', 'handbag'],
      images: {
        create: [
          { url: '/images/products/bag-leather-tote.jpg', isPrimary: true, position: 0 },
        ],
      },
      variants: {
        create: [
          { title: 'Cognac Brown', sku: 'SKU-TOT-001-BRN', price: 189.0, costPrice: 85.0, inventoryQuantity: 25 },
          { title: 'Matte Black', sku: 'SKU-TOT-001-BLK', price: 189.0, costPrice: 85.0, inventoryQuantity: 20 },
        ],
      },
    },
    include: { variants: true },
  });

  const p2 = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      title: 'Organic Cotton Crewneck',
      name: 'Organic Cotton Crewneck',
      slug: 'organic-cotton-crewneck',
      description: '100% GOTS certified organic heavyweight cotton sweatshirt in neutral tones.',
      price: 68.0,
      comparePrice: 85.0,
      costPrice: 24.0,
      sku: 'SKU-SWT-002',
      barcode: '849201948202',
      status: ProductStatus.ACTIVE,
      category: catApparel.name,
      categoryId: catApparel.id,
      tags: ['sustainable', 'apparel', 'unisex'],
      images: {
        create: [
          { url: '/images/products/apparel-cotton-crewneck.jpg', isPrimary: true, position: 0 },
        ],
      },
      variants: {
        create: [
          { title: 'Small / Oat', sku: 'SKU-SWT-002-S-OAT', price: 68.0, costPrice: 24.0, inventoryQuantity: 40 },
          { title: 'Medium / Oat', sku: 'SKU-SWT-002-M-OAT', price: 68.0, costPrice: 24.0, inventoryQuantity: 50 },
          { title: 'Large / Oat', sku: 'SKU-SWT-002-L-OAT', price: 68.0, costPrice: 24.0, inventoryQuantity: 30 },
        ],
      },
    },
    include: { variants: true },
  });

  const p3 = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      title: 'Anodized Aluminum Chronograph Watch',
      name: 'Anodized Aluminum Chronograph Watch',
      slug: 'anodized-aluminum-chronograph-watch',
      description: 'Precision Japanese movement encased in aircraft-grade anodized aluminum with sapphire crystal glass.',
      price: 340.0,
      comparePrice: 399.0,
      costPrice: 150.0,
      sku: 'SKU-WTC-003',
      barcode: '849201948203',
      status: ProductStatus.ACTIVE,
      category: catWatches.name,
      categoryId: catWatches.id,
      tags: ['accessories', 'luxury'],
      images: {
        create: [
          { url: '/images/products/watch-chronograph.jpg', isPrimary: true, position: 0 },
        ],
      },
      variants: {
        create: [
          { title: 'Space Gray / Leather Strap', sku: 'SKU-WTC-003-GRY', price: 340.0, costPrice: 150.0, inventoryQuantity: 18 },
        ],
      },
    },
    include: { variants: true },
  });

  // Seed InventoryItems & Initial Movements
  for (const prod of [p1, p2, p3]) {
    for (const variant of prod.variants) {
      const invItem = await prisma.inventoryItem.create({
        data: {
          merchantId: merchant.id,
          productId: prod.id,
          variantId: variant.id,
          sku: variant.sku,
          stock: variant.inventoryQuantity,
          availableStock: variant.inventoryQuantity,
          reservedStock: 0,
          lowStockThreshold: 5,
        },
      });

      await prisma.inventoryMovement.create({
        data: {
          merchantId: merchant.id,
          inventoryItemId: invItem.id,
          productId: prod.id,
          variantId: variant.id,
          changeQuantity: variant.inventoryQuantity,
          newQuantity: variant.inventoryQuantity,
          type: InventoryMovementType.INITIAL,
          reason: 'Initial stock import upon product seeding',
        },
      });
    }
  }

  console.log('Seeded Products, Variants & Inventory items');

  // The marketplace homepage lists every live store, so a fresh database needs
  // breadth: several merchants across several categories, each product with a
  // real photograph. See prisma/catalogue.ts.
  await applyCatalogue(prisma, { demoMerchantId: merchant.id, log: msg => console.log(msg) });

  // Seed Customers with Addresses
  const c1 = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: 'Emma Watson',
      email: 'emma.w@example.com',
      phone: '+1 555-0192',
      location: 'San Francisco, CA',
      totalOrders: 2,
      totalSpent: 446.0,
      addresses: {
        create: [
          {
            firstName: 'Emma',
            lastName: 'Watson',
            address1: '450 Mission St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94105',
            country: 'US',
            isDefault: true,
          },
        ],
      },
    },
  });

  const c2 = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: 'Marcus Vance',
      email: 'marcus.v@example.com',
      phone: '+1 555-0148',
      location: 'Austin, TX',
      totalOrders: 1,
      totalSpent: 340.0,
      addresses: {
        create: [
          {
            firstName: 'Marcus',
            lastName: 'Vance',
            address1: '1200 Congress Ave',
            city: 'Austin',
            state: 'TX',
            zip: '78701',
            country: 'US',
            isDefault: true,
          },
        ],
      },
    },
  });

  console.log('Seeded Customers with Addresses');

  // Seed Orders with OrderItems, OrderAddresses & Status History
  const o1 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      orderNumber: '#NX-4921',
      customerId: c1.id,
      customerName: c1.name,
      customerEmail: c1.email,
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      fulfillmentStatus: FulfillmentStatus.FULFILLED,
      subtotal: 257.0,
      tax: 0.0,
      shipping: 0.0,
      discount: 0.0,
      total: 257.0,
      items: {
        create: [
          { productId: p1.id, variantId: p1.variants[0].id, productTitle: p1.title, variantTitle: p1.variants[0].title, sku: p1.variants[0].sku, quantity: 1, price: 189.0, total: 189.0 },
          { productId: p2.id, variantId: p2.variants[0].id, productTitle: p2.title, variantTitle: p2.variants[0].title, sku: p2.variants[0].sku, quantity: 1, price: 68.0, total: 68.0 },
        ],
      },
      addresses: {
        create: [
          { type: OrderAddressType.SHIPPING, firstName: 'Emma', lastName: 'Watson', address1: '450 Mission St', city: 'San Francisco', state: 'CA', zip: '94105', country: 'US' },
        ],
      },
      statusHistory: {
        create: [
          { fromStatus: OrderStatus.PENDING, toStatus: OrderStatus.CONFIRMED, note: 'Payment settled successfully' },
        ],
      },
    },
  });

  const o2 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      orderNumber: '#NX-4922',
      customerId: c2.id,
      customerName: c2.name,
      customerEmail: c2.email,
      status: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.PAID,
      fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
      subtotal: 340.0,
      tax: 0.0,
      shipping: 0.0,
      discount: 0.0,
      total: 340.0,
      items: {
        create: [
          { productId: p3.id, variantId: p3.variants[0].id, productTitle: p3.title, variantTitle: p3.variants[0].title, sku: p3.variants[0].sku, quantity: 1, price: 340.0, total: 340.0 },
        ],
      },
      addresses: {
        create: [
          { type: OrderAddressType.SHIPPING, firstName: 'Marcus', lastName: 'Vance', address1: '1200 Congress Ave', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
        ],
      },
      statusHistory: {
        create: [
          { fromStatus: OrderStatus.PENDING, toStatus: OrderStatus.PROCESSING, note: 'Order in fulfillment queue' },
        ],
      },
    },
  });

  console.log('Seeded Orders with Line Items & Addresses');

  // Seed Discounts & Notifications
  await prisma.discount.createMany({
    data: [
      { merchantId: merchant.id, code: 'SUMMER20', type: DiscountType.PERCENTAGE, value: '20', minOrderAmount: 50.0, redemptions: 142, maxRedemptions: 500, status: DiscountStatus.ACTIVE },
      { merchantId: merchant.id, code: 'WELCOME10', type: DiscountType.FIXED, value: '10', minOrderAmount: 0.0, redemptions: 380, maxRedemptions: 1000, status: DiscountStatus.ACTIVE },
      { merchantId: merchant.id, code: 'FREESHIP', type: DiscountType.SHIPPING, value: '100', minOrderAmount: 0.0, redemptions: 45, maxRedemptions: 200, status: DiscountStatus.ACTIVE },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { merchantId: merchant.id, userId: owner.id, type: NotificationType.SUCCESS, title: 'Order #NX-4922 Confirmed', message: 'Order received for $340.00 from Marcus Vance', read: false },
      { merchantId: merchant.id, userId: owner.id, type: NotificationType.WARNING, title: 'Low Stock Warning', message: 'Anodized Aluminum Chronograph Watch has 18 units remaining.', read: false },
    ],
  });

  // Seed Shipping Zones & Methods
  const zoneUS = await prisma.shippingZone.create({
    data: {
      merchantId: merchant.id,
      name: 'Domestic (United States)',
      countries: ['US', 'CA'],
      methods: {
        create: [
          { merchantId: merchant.id, name: 'Standard Delivery', price: 15.0, freeThreshold: 100.0, estimatedDays: '3-5 business days' },
          { merchantId: merchant.id, name: 'Express Air Courier', price: 35.0, estimatedDays: '1-2 business days' },
        ],
      },
    },
  });

  // Seed Phase 8 SaaS Subscription Plans
  const planStarter = await prisma.subscriptionPlan.create({
    data: {
      code: 'starter',
      name: 'Starter Plan',
      description: 'For a seller finding their first customers.',
      monthlyPrice: 29.0,
      annualPrice: 290.0,
      currency: 'USD',
      trialDays: 14,
      displayOrder: 1,
      maxProducts: 50,
      maxTeamMembers: 2,
      storageMb: 1000,
      advancedAnalyticsAllowed: false,
      aiTokensPerMonth: 1000,
      features: ['Up to 50 active products', '2 team members', 'Custom domain support', 'Standard analytics', 'Email support'],
    },
  });

  const planGrowth = await prisma.subscriptionPlan.create({
    data: {
      code: 'growth',
      name: 'Growth Plan',
      description: 'Designed for scaling commerce brands with high order volume.',
      monthlyPrice: 79.0,
      annualPrice: 790.0,
      currency: 'USD',
      trialDays: 14,
      displayOrder: 2,
      maxProducts: 500,
      maxTeamMembers: 5,
      storageMb: 5000,
      advancedAnalyticsAllowed: true,
      aiTokensPerMonth: 10000,
      features: ['Up to 500 active products', '5 team members', 'Custom domain support', 'Advanced analytics & export', 'Priority support'],
    },
  });

  const planPro = await prisma.subscriptionPlan.create({
    data: {
      code: 'pro',
      name: 'Pro Merchant Plan',
      description: 'Full commerce suite with high limits and dedicated resources.',
      monthlyPrice: 199.0,
      annualPrice: 1990.0,
      currency: 'USD',
      trialDays: 14,
      displayOrder: 3,
      maxProducts: 2500,
      maxTeamMembers: 15,
      storageMb: 25000,
      advancedAnalyticsAllowed: true,
      aiTokensPerMonth: 100000,
      features: ['Up to 2,500 active products', '15 team members', 'Advanced analytics', 'VIP 24/7 support'],
    },
  });

  const planEnterprise = await prisma.subscriptionPlan.create({
    data: {
      code: 'enterprise',
      name: 'Enterprise Plan',
      description: 'Custom limits and dedicated support, agreed case by case.',
      monthlyPrice: 499.0,
      annualPrice: 4990.0,
      currency: 'USD',
      trialDays: 14,
      displayOrder: 4,
      maxProducts: 10000,
      maxTeamMembers: 50,
      storageMb: 100000,
      advancedAnalyticsAllowed: true,
      // Null is the unlimited allowance the pricing page promises this tier.
      aiTokensPerMonth: null,
      features: ['Up to 10,000 active products', '50 team members', 'Dedicated account manager', 'Custom integrations'],
    },
  });

  // Seed Platform Admin User
  const adminUser = await prisma.user.create({
    data: {
      id: 'usr_platform_admin',
      email: 'admin@nexuscommerce.io',
      name: 'Nexus Platform Admin',
      passwordHash,
      plan: 'enterprise',
      platformRole: 'PLATFORM_OWNER',
      isVerified: true,
      twoFactorEnabled: true,
    },
  });

  // Seed Store Active Subscription
  const currentStart = new Date();
  const currentEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const sub = await prisma.subscription.create({
    data: {
      merchantId: merchant.id,
      planId: planGrowth.id,
      billingInterval: 'MONTHLY',
      status: 'ACTIVE',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      providerCustomerId: 'cus_pstk_demo_aura',
      providerSubscriptionId: 'sub_pstk_demo_aura',
    },
  });

  await prisma.billingCustomer.create({
    data: {
      merchantId: merchant.id,
      email: owner.email,
      name: owner.name,
      provider: 'PAYSTACK',
      providerCustomerId: 'cus_pstk_demo_aura',
    },
  });

  // Seed Initial Invoice & Transaction
  const inv = await prisma.invoice.create({
    data: {
      invoiceNumber: 'NX-INV-1001',
      merchantId: merchant.id,
      subscriptionId: sub.id,
      planId: planGrowth.id,
      status: 'PAID',
      subtotal: 79.0,
      tax: 0.0,
      total: 79.0,
      currency: 'USD',
      periodStart: currentStart,
      periodEnd: currentEnd,
      issueDate: currentStart,
      paidAt: currentStart,
      items: {
        create: [
          { description: 'Growth Plan — Monthly Subscription', amount: 79.0, quantity: 1 },
        ],
      },
    },
  });

  await prisma.billingTransaction.create({
    data: {
      merchantId: merchant.id,
      subscriptionId: sub.id,
      invoiceId: inv.id,
      amount: 79.0,
      currency: 'USD',
      type: 'SUBSCRIPTION_CHARGE',
      status: 'SUCCESS',
      provider: 'PAYSTACK',
      providerReference: 'ref_saas_pstk_1001',
    },
  });

  await prisma.subscriptionEvent.create({
    data: {
      subscriptionId: sub.id,
      action: 'SUBSCRIPTION_CREATED',
      toStatus: 'ACTIVE',
      metadata: { planCode: planGrowth.code, amount: 79.0 },
    },
  });

  console.log('Seeded Phase 8 SaaS Subscription Plans, Subscriptions, Platform Admin & Invoices');
  console.log('Phase 8 database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

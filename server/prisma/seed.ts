import { PrismaClient, Role, StoreStatus, ProductStatus, OrderStatus, PaymentStatus, FulfillmentStatus, DiscountType, DiscountStatus, NotificationType, InventoryMovementType, OrderAddressType } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  await prisma.customDomain.deleteMany();
  await prisma.teamInvitation.deleteMany();
  await prisma.navigationMenu.deleteMany();
  await prisma.storePage.deleteMany();
  await prisma.storefrontConfig.deleteMany();
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
  await prisma.storeSettings.deleteMany();
  await prisma.storeMember.deleteMany();
  await prisma.store.deleteMany();
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

  // Create store
  const store = await prisma.store.create({
    data: {
      id: 'str_aura_apparel',
      name: 'Aura Apparel Store',
      domain: 'auraapparel.com',
      currency: 'USD — US Dollar',
      timezone: 'America/New_York',
      industry: 'Fashion & Apparel',
      status: StoreStatus.ACTIVE,
      ownerId: owner.id,
    },
  });

  console.log(`Store created: ${store.name}`);

  await prisma.storeMember.create({
    data: {
      userId: owner.id,
      storeId: store.id,
      role: Role.OWNER,
    },
  });

  await prisma.storeSettings.create({
    data: {
      storeId: store.id,
      storeName: store.name,
      storeUrl: 'auraapparel',
      currency: 'USD — US Dollar',
      industry: 'Fashion & Apparel',
      announcementText: '🎉 Flash Sale: Get 20% off all summer collections with code SUMMER20',
      activeTheme: 'nexus-dark',
      primaryColor: '#FFBD2E',
      customDomain: 'auraapparel.com',
    },
  });

  // Seed Product Categories
  const catApparel = await prisma.productCategory.create({
    data: { storeId: store.id, name: 'Apparel', slug: 'apparel', description: 'Premium garments and streetwear' },
  });
  const catBags = await prisma.productCategory.create({
    data: { storeId: store.id, name: 'Bags & Accessories', slug: 'bags-accessories', description: 'Handcrafted leather goods' },
  });
  const catWatches = await prisma.productCategory.create({
    data: { storeId: store.id, name: 'Watches', slug: 'watches', description: 'Timepieces & luxury watches' },
  });

  // Seed Products with Variants, Images & Inventory
  const p1 = await prisma.product.create({
    data: {
      storeId: store.id,
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
          { url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80', isPrimary: true, position: 0 },
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
      storeId: store.id,
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
          { url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80', isPrimary: true, position: 0 },
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
      storeId: store.id,
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
          { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', isPrimary: true, position: 0 },
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
          storeId: store.id,
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
          storeId: store.id,
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

  // Seed Customers with Addresses
  const c1 = await prisma.customer.create({
    data: {
      storeId: store.id,
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
      storeId: store.id,
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
      storeId: store.id,
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
      storeId: store.id,
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
      { storeId: store.id, code: 'SUMMER20', type: DiscountType.PERCENTAGE, value: '20', minOrderAmount: 50.0, redemptions: 142, maxRedemptions: 500, status: DiscountStatus.ACTIVE },
      { storeId: store.id, code: 'WELCOME10', type: DiscountType.FIXED, value: '10', minOrderAmount: 0.0, redemptions: 380, maxRedemptions: 1000, status: DiscountStatus.ACTIVE },
      { storeId: store.id, code: 'FREESHIP', type: DiscountType.SHIPPING, value: '100', minOrderAmount: 0.0, redemptions: 45, maxRedemptions: 200, status: DiscountStatus.ACTIVE },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { storeId: store.id, userId: owner.id, type: NotificationType.SUCCESS, title: 'Order #NX-4922 Confirmed', message: 'Order received for $340.00 from Marcus Vance', read: false },
      { storeId: store.id, userId: owner.id, type: NotificationType.WARNING, title: 'Low Stock Warning', message: 'Anodized Aluminum Chronograph Watch has 18 units remaining.', read: false },
    ],
  });

  // Seed Shipping Zones & Methods
  const zoneUS = await prisma.shippingZone.create({
    data: {
      storeId: store.id,
      name: 'Domestic (United States)',
      countries: ['US', 'CA'],
      methods: {
        create: [
          { storeId: store.id, name: 'Standard Delivery', price: 15.0, freeThreshold: 100.0, estimatedDays: '3-5 business days' },
          { storeId: store.id, name: 'Express Air Courier', price: 35.0, estimatedDays: '1-2 business days' },
        ],
      },
    },
  });

  // Seed Phase 7: StorefrontConfig, Navigation, Pages, Custom Domain, Audit Logs
  const defaultConfig = {
    theme: 'nexus-dark',
    branding: {
      storeName: 'Aura Apparel Store',
      logoUrl: '',
      faviconUrl: '',
      primaryColor: '#FFBD2E',
      secondaryColor: '#27C93F',
      accentColor: '#FF5F56',
      fontFamily: 'Inter',
      announcementText: '🎉 Flash Sale: Get 20% off all summer collections with code SUMMER20',
    },
    sections: [
      {
        id: 'hero_1',
        type: 'hero',
        title: 'Elevate Your Daily Style',
        subtitle: 'Crafted with sustainable fabrics and timeless minimalist cuts.',
        badge: 'New Collection 2026',
        buttonText: 'Shop Summer Drop',
        buttonLink: '#products',
      },
      {
        id: 'featured_1',
        type: 'product_grid',
        title: 'Featured Collection',
        subtitle: 'Handpicked bestsellers and luxury apparel',
        limit: 6,
      },
      {
        id: 'banner_1',
        type: 'banner',
        title: 'Join the Aura Insider Club',
        subtitle: 'Get 10% off your first order plus exclusive drop access.',
        buttonText: 'Subscribe',
      },
      {
        id: 'faq_1',
        type: 'faq',
        title: 'Frequently Asked Questions',
        items: [
          { q: 'What is your shipping policy?', a: 'We offer free express shipping on orders over $100 within the US.' },
          { q: 'What is your return policy?', a: 'Returns are accepted within 30 days of purchase in original condition.' },
        ],
      },
    ],
  };

  await prisma.storefrontConfig.create({
    data: {
      storeId: store.id,
      activeTheme: 'nexus-dark',
      draftConfig: defaultConfig as any,
      publishedConfig: defaultConfig as any,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  await prisma.navigationMenu.createMany({
    data: [
      {
        storeId: store.id,
        name: 'Main Menu',
        handle: 'main-menu',
        items: [
          { id: 'nav_1', title: 'Shop', type: 'collection', url: '#products' },
          { id: 'nav_2', title: 'About', type: 'page', url: '/pages/about' },
          { id: 'nav_3', title: 'FAQ', type: 'page', url: '/pages/faq' },
        ] as any,
      },
      {
        storeId: store.id,
        name: 'Footer Menu',
        handle: 'footer-menu',
        items: [
          { id: 'fnav_1', title: 'Privacy Policy', type: 'page', url: '/pages/privacy' },
          { id: 'fnav_2', title: 'Returns Policy', type: 'page', url: '/pages/returns' },
          { id: 'fnav_3', title: 'Contact Us', type: 'page', url: '/pages/contact' },
        ] as any,
      },
    ],
  });

  await prisma.storePage.createMany({
    data: [
      {
        storeId: store.id,
        title: 'About Us',
        slug: 'about',
        content: '<h1>About Aura Apparel</h1><p>We craft sustainable luxury fashion designed for modern living.</p>',
        seoTitle: 'About Aura Apparel | Sustainable Luxury Fashion',
        seoDescription: 'Learn about Aura Apparel, our story, mission, and commitment to sustainable fashion.',
        isPublished: true,
      },
      {
        storeId: store.id,
        title: 'FAQ',
        slug: 'faq',
        content: '<h1>Frequently Asked Questions</h1><p>Find answers to common questions about orders, shipping, and returns.</p>',
        seoTitle: 'FAQ | Aura Apparel Help Center',
        seoDescription: 'Frequently asked questions regarding shipping, returns, and ordering.',
        isPublished: true,
      },
      {
        storeId: store.id,
        title: 'Privacy Policy',
        slug: 'privacy',
        content: '<h1>Privacy Policy</h1><p>Your privacy is important to us. We protect your personal data.</p>',
        seoTitle: 'Privacy Policy | Aura Apparel',
        seoDescription: 'Read our official privacy policy.',
        isPublished: true,
      },
    ],
  });

  await prisma.customDomain.create({
    data: {
      storeId: store.id,
      domain: 'auraapparel.com',
      status: 'VERIFIED',
      verificationToken: 'nexus-verify-auraapparel-2026',
      isPrimary: true,
      verifiedAt: new Date(),
    },
  });

  // Seed Phase 8 SaaS Subscription Plans
  const planStarter = await prisma.subscriptionPlan.create({
    data: {
      code: 'starter',
      name: 'Starter Plan',
      description: 'Ideal for early stage stores and boutique merchants.',
      monthlyPrice: 29.0,
      annualPrice: 290.0,
      currency: 'USD',
      trialDays: 14,
      displayOrder: 1,
      maxProducts: 50,
      maxTeamMembers: 2,
      maxStores: 1,
      storageMb: 1000,
      customDomainAllowed: true,
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
      maxStores: 1,
      storageMb: 5000,
      customDomainAllowed: true,
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
      maxStores: 3,
      storageMb: 25000,
      customDomainAllowed: true,
      advancedAnalyticsAllowed: true,
      aiTokensPerMonth: 100000,
      features: ['Up to 2,500 active products', '15 team members', 'Multi-store support', 'Advanced analytics', 'VIP 24/7 support'],
    },
  });

  const planEnterprise = await prisma.subscriptionPlan.create({
    data: {
      code: 'enterprise',
      name: 'Enterprise Plan',
      description: 'Custom infrastructure, unlimited scaling, and SLA guarantee.',
      monthlyPrice: 499.0,
      annualPrice: 4990.0,
      currency: 'USD',
      trialDays: 14,
      displayOrder: 4,
      maxProducts: 10000,
      maxTeamMembers: 50,
      maxStores: 10,
      storageMb: 100000,
      customDomainAllowed: true,
      advancedAnalyticsAllowed: true,
      // Null is the unlimited allowance the pricing page promises this tier.
      aiTokensPerMonth: null,
      features: ['Up to 10,000 active products', '50 team members', 'Dedicated account manager', 'Custom integrations', '99.99% SLA'],
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
      storeId: store.id,
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
      storeId: store.id,
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
      storeId: store.id,
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
      storeId: store.id,
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

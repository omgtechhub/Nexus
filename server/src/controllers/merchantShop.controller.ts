import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { OrderStatus, PaymentStatus, FulfillmentStatus, InventoryMovementType, OrderAddressType, ProductStatus, MerchantStatus } from '@prisma/client';
import { quoteOrder } from '../services/pricing/quote.service.js';
import { defaultCurrencyCode } from '../config/currency.js';
import { defaultCurrencyLabel } from '../config/currency.js';
import { formatMoney } from '../services/email/email.service.js';
import { jobQueue } from '../jobs/jobQueue.js';

const cartItemInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1),
});

const validateCartSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, 'Cart items are required'),
  // Both optional, so an early cart with no address yet still gets a quote —
  // it just falls back to the store's default delivery rather than a zone.
  country: z.string().optional(),
  shippingMethodId: z.string().optional(),
});

const checkoutSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, 'Cart items are required'),
  customer: z.object({
    email: z.string().email('Valid customer email is required'),
    name: z.string().min(1, 'Customer name is required'),
    phone: z.string().optional(),
  }),
  shippingAddress: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    address1: z.string().min(1, 'Address line 1 is required'),
    address2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State/Province is required'),
    zip: z.string().min(1, 'ZIP/Postal code is required'),
    country: z.string().min(1, 'Country is required'),
    phone: z.string().optional(),
  }),
  discountCode: z.string().optional(),
  // The delivery option the shopper picked, from the quote's
  // `shippingOptions`. Omitted, the cheapest option for their zone applies.
  shippingMethodId: z.string().optional(),
});

/**
 * Resolve the merchant a public shop request is about.
 *
 * This used to be a five-step cascade: id, then `Store.domain`, then the
 * CustomDomain table, then `settings.storeUrl`, and finally **every merchant
 * row loaded into memory** and matched on a stripped-down prefix of its name
 * or hostname. That last step was both a full table scan on an unauthenticated
 * route and a correctness hazard -- "aura" matching whichever of several
 * similarly-named merchants happened to come back first.
 *
 * None of those alternatives exist any more. A merchant has no hostname, no
 * handle and no domain of its own, because it is a seller on one marketplace
 * rather than a shopfront. The id is the only identifier, so the lookup is a
 * primary-key read.
 */
async function findMerchantForShop(merchantId: string) {
  if (!merchantId) return null;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { settings: true },
  });

  // A suspended merchant must not serve a listing, quote a price or take an
  // order. Every public shop route passes through here, so the check belongs
  // here rather than in eight handlers.
  if (!merchant || merchant.status === MerchantStatus.SUSPENDED) return null;
  return merchant;
}

/**
 * Public: the merchant behind a listing -- who you are buying from.
 *
 * It used to return a shopfront: a theme, a primary colour, an announcement
 * bar and a custom domain, all of which described a shopfront the seller
 * controlled. On a marketplace the shopfront is Nexus's, so what is left is
 * the merchant's identity and the currency the sale settles in.
 */
export async function getMerchantShopInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantRef } = req.params;
    const merchant = await findMerchantForShop(merchantRef);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    return res.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        settings: {
          displayName: merchant.settings?.displayName || merchant.name,
          description: merchant.settings?.description || '',
          logoUrl: merchant.settings?.logoUrl || null,
          currency: merchant.settings?.currency || defaultCurrencyLabel(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: a merchant's listings on the marketplace (active products only).
 */
export async function getShopProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantRef } = req.params;
    const { category, q, sort = 'newest', page = '1', limit = '24' } = req.query;

    const merchant = await findMerchantForShop(merchantRef);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 24));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      merchantId: merchant.id,
      status: ProductStatus.ACTIVE,
    };

    if (category && category !== 'all') {
      where.category = { equals: category as string, mode: 'insensitive' };
    }

    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { sku: { contains: q as string, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'title_asc') orderBy = { title: 'asc' };

    const [totalCount, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          variants: { orderBy: { price: 'asc' } },
          images: { orderBy: { position: 'asc' } },
          inventoryItems: true,
        },
      }),
    ]);

    const formattedProducts = products.map(p => {
      const primaryImg = p.images.find(img => img.isPrimary) || p.images[0];
      const totalStock = p.inventoryItems.reduce((acc, item) => acc + item.availableStock, 0) +
        p.variants.reduce((acc, v) => acc + v.inventoryQuantity, 0);

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        price: p.price,
        comparePrice: p.comparePrice,
        sku: p.sku,
        category: p.category,
        tags: p.tags,
        images: p.images.map(img => img.url),
        primaryImage: primaryImg ? primaryImg.url : undefined,
        inStock: totalStock > 0 || p.inventoryPolicy === 'CONTINUE',
        availableStock: totalStock,
        rating: { average: p.ratingAverage ?? 0, count: p.ratingCount ?? 0 },
        variants: p.variants.map(v => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          comparePrice: v.comparePrice,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          inventoryQuantity: v.inventoryQuantity,
        })),
      };
    });

    return res.json({
      products: formattedProducts,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: one listing, by its slug.
 */
export async function getShopProductBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantRef, productSlug } = req.params;

    const merchant = await findMerchantForShop(merchantRef);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const product = await prisma.product.findFirst({
      where: {
        merchantId: merchant.id,
        slug: productSlug,
        status: ProductStatus.ACTIVE,
      },
      include: {
        variants: { orderBy: { price: 'asc' } },
        images: { orderBy: { position: 'asc' } },
        inventoryItems: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const primaryImg = product.images.find(img => img.isPrimary) || product.images[0];
    const totalStock = product.inventoryItems.reduce((acc, item) => acc + item.availableStock, 0) +
      product.variants.reduce((acc, v) => acc + v.inventoryQuantity, 0);

    return res.json({
      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        description: product.description,
        price: product.price,
        comparePrice: product.comparePrice,
        sku: product.sku,
        category: product.category,
        tags: product.tags,
        images: product.images.map(img => ({ id: img.id, url: img.url, altText: img.altText, isPrimary: img.isPrimary })),
        primaryImage: primaryImg ? primaryImg.url : undefined,
        inStock: totalStock > 0 || product.inventoryPolicy === 'CONTINUE',
        availableStock: totalStock,
        rating: { average: product.ratingAverage ?? 0, count: product.ratingCount ?? 0 },
        variants: product.variants.map(v => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          comparePrice: v.comparePrice,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          inventoryQuantity: v.inventoryQuantity,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: the categories a merchant's listings fall into.
 */
export async function getShopCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantRef } = req.params;

    const merchant = await findMerchantForShop(merchantRef);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const [dbCategories, distinctProductCategories] = await Promise.all([
      prisma.productCategory.findMany({ where: { merchantId: merchant.id } }),
      prisma.product.findMany({
        where: { merchantId: merchant.id, status: ProductStatus.ACTIVE },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);

    const categoryNames = new Set<string>();
    dbCategories.forEach(c => categoryNames.add(c.name));
    distinctProductCategories.forEach(p => {
      if (p.category) categoryNames.add(p.category);
    });

    return res.json({
      categories: Array.from(categoryNames).sort(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: Server-side Cart Item Price & Stock Validation
 */
export async function validateCart(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantRef } = req.params;
    const payload = validateCartSchema.parse(req.body);
    const { items } = payload;

    const merchant = await findMerchantForShop(merchantRef);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    let subtotal = 0;
    let isValid = true;
    const validatedItems = [];

    for (const item of items) {
      let variant = await prisma.productVariant.findFirst({
        where: { id: item.variantId },
        include: {
          product: {
            include: {
              images: { orderBy: { position: 'asc' } },
              inventoryItems: true,
            },
          },
        },
      });

      let product;
      let title = '';
      let variantTitle = '';
      let price = 0;
      let sku = '';
      let image = '';
      let availableStock = 0;

      if (variant && variant.product.merchantId === merchant.id && variant.product.status === ProductStatus.ACTIVE) {
        product = variant.product;
        title = product.title;
        variantTitle = variant.title;
        price = variant.price;
        sku = variant.sku;
        image = product.images[0]?.url || '';
        availableStock = variant.inventoryQuantity;
      } else {
        const prod = await prisma.product.findFirst({
          where: { id: item.variantId, merchantId: merchant.id, status: ProductStatus.ACTIVE },
          include: {
            images: { orderBy: { position: 'asc' } },
            inventoryItems: true,
          },
        });

        if (prod) {
          product = prod;
          title = prod.title;
          variantTitle = 'Default';
          price = prod.price;
          sku = prod.sku;
          image = prod.images[0]?.url || '';
          availableStock = prod.inventoryItems.reduce((acc, inv) => acc + inv.availableStock, 0);
        }
      }

      if (!product) {
        validatedItems.push({
          variantId: item.variantId,
          valid: false,
          error: 'Item not found or unavailable',
        });
        isValid = false;
        continue;
      }

      const isStockSufficient = availableStock >= item.quantity || product.inventoryPolicy === 'CONTINUE';
      if (!isStockSufficient) {
        isValid = false;
      }

      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        variantId: item.variantId,
        productId: product.id,
        title,
        variantTitle,
        price,
        sku,
        image,
        quantity: item.quantity,
        availableStock,
        valid: isStockSufficient,
        itemTotal,
      });
    }

    /**
     * Priced from the store's own tax and shipping configuration.
     *
     * This was `subtotal * 0.08` plus a flat $15 free over $100 — the same
     * hardcoded figures the checkout below used, in a second copy. Both now
     * call `quoteOrder`, so the quote a shopper sees here and the total they
     * are charged at checkout come from one place and cannot drift.
     */
    const quote = await quoteOrder({
      merchantId: merchant.id,
      subtotal,
      country: payload.country,
      shippingMethodId: payload.shippingMethodId,
    });

    return res.json({
      isValid,
      items: validatedItems,
      subtotal: quote.subtotal,
      taxEstimate: quote.tax,
      shippingEstimate: quote.shipping,
      totalEstimate: quote.total,
      // So the cart can label the line "VAT" rather than "Tax", show nothing
      // at all for a store that charges none, and offer delivery choices.
      taxLabel: quote.taxLabel,
      taxRate: quote.taxRate,
      taxInclusive: quote.taxInclusive,
      currency: quote.currency,
      shippingMethodId: quote.shippingMethodId,
      shippingMethodName: quote.shippingMethodName,
      shippingOptions: quote.shippingOptions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
}

/**
 * Public: Customer Checkout Engine
 * Calculates order pricing & stock validation strictly server-side in a transaction.
 */
export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantRef } = req.params;
    const payload = checkoutSchema.parse(req.body);

    const merchant = await findMerchantForShop(merchantRef);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsToCreate: Array<{
        productId: string;
        variantId?: string;
        productTitle: string;
        variantTitle?: string;
        sku: string;
        quantity: number;
        price: number;
        total: number;
      }> = [];

      for (const item of payload.items) {
        let variant = await tx.productVariant.findFirst({
          where: { id: item.variantId },
          include: {
            product: {
              include: {
                inventoryItems: true,
              },
            },
          },
        });

        let product;
        let title = '';
        let variantTitle = '';
        let price = 0;
        let sku = '';
        let targetVariantId: string | undefined = undefined;

        if (variant && variant.product.merchantId === merchant.id && variant.product.status === ProductStatus.ACTIVE) {
          product = variant.product;
          title = product.title;
          variantTitle = variant.title;
          price = variant.price;
          sku = variant.sku;
          targetVariantId = variant.id;

          /**
           * The decrement IS the stock check.
           *
           * It used to read `variant.inventoryQuantity`, compare it, and then
           * decrement in a separate statement. Prisma runs this transaction at
           * PostgreSQL's default READ COMMITTED, so two checkouts for the last
           * unit both read 1, both passed the comparison, and both
           * decremented — leaving `inventoryQuantity` at -1 and two customers
           * holding the same item. The window is small and entirely real: it
           * is the flash-sale case, which is exactly when it matters.
           *
           * `updateMany` with the quantity in the predicate pushes the
           * comparison into the UPDATE's own row lock, so the second writer
           * matches zero rows and is rejected. A store whose policy is
           * CONTINUE is allowed to go negative, which is what overselling
           * deliberately means.
           */
          const allowOversell = product.inventoryPolicy === 'CONTINUE';

          const claimed = await tx.productVariant.updateMany({
            where: allowOversell
              ? { id: variant.id }
              : { id: variant.id, inventoryQuantity: { gte: item.quantity } },
            data: { inventoryQuantity: { decrement: item.quantity } },
          });

          if (claimed.count !== 1) {
            // Re-read for the message only: the authority was the predicate.
            const current = await tx.productVariant.findUnique({
              where: { id: variant.id },
              select: { inventoryQuantity: true },
            });
            throw new Error(
              `Insufficient stock for "${title} - ${variant.title}". Available: ${current?.inventoryQuantity ?? 0}`
            );
          }

          // Log movement if inventory item exists
          const invItem = await tx.inventoryItem.findFirst({
            where: { merchantId: merchant.id, variantId: variant.id },
          });

          if (invItem) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: {
                availableStock: { decrement: item.quantity },
              },
            });

            await tx.inventoryMovement.create({
              data: {
                merchantId: merchant.id,
                inventoryItemId: invItem.id,
                productId: product.id,
                variantId: variant.id,
                changeQuantity: -item.quantity,
                newQuantity: Math.max(0, invItem.availableStock - item.quantity),
                type: InventoryMovementType.ORDER_PLACED,
                reason: `Order placed by ${payload.customer.email}`,
              },
            });
          }
        } else {
          const prod = await tx.product.findFirst({
            where: { id: item.variantId, merchantId: merchant.id, status: ProductStatus.ACTIVE },
            include: { inventoryItems: true },
          });

          if (!prod) {
            throw new Error(`Item ${item.variantId} is not available for purchase`);
          }

          product = prod;
          title = prod.title;
          variantTitle = 'Default';
          price = prod.price;
          sku = prod.sku;

          const primaryInvItem = prod.inventoryItems[0];
          const totalStock = prod.inventoryItems.reduce((acc, inv) => acc + inv.availableStock, 0);
          const allowOversell = prod.inventoryPolicy === 'CONTINUE';

          if (totalStock < item.quantity && !allowOversell) {
            throw new Error(`Insufficient stock for "${title}". Available: ${totalStock}`);
          }

          if (primaryInvItem) {
            // Same atomic claim as the variant path above: the predicate does
            // the comparison, so two concurrent checkouts cannot both take the
            // last unit. The read-then-compare above stays as the friendly
            // message for the ordinary case; this is what actually enforces it.
            const claimed = await tx.inventoryItem.updateMany({
              where: allowOversell
                ? { id: primaryInvItem.id }
                : { id: primaryInvItem.id, availableStock: { gte: item.quantity } },
              data: { availableStock: { decrement: item.quantity } },
            });

            if (claimed.count !== 1) {
              const current = await tx.inventoryItem.findUnique({
                where: { id: primaryInvItem.id },
                select: { availableStock: true },
              });
              throw new Error(
                `Insufficient stock for "${title}". Available: ${current?.availableStock ?? 0}`
              );
            }

            await tx.inventoryMovement.create({
              data: {
                merchantId: merchant.id,
                inventoryItemId: primaryInvItem.id,
                productId: prod.id,
                changeQuantity: -item.quantity,
                newQuantity: Math.max(0, primaryInvItem.availableStock - item.quantity),
                type: InventoryMovementType.ORDER_PLACED,
                reason: `Order placed by ${payload.customer.email}`,
              },
            });
          }
        }

        const lineTotal = price * item.quantity;
        subtotal += lineTotal;

        orderItemsToCreate.push({
          productId: product.id,
          variantId: targetVariantId,
          productTitle: title,
          variantTitle: variantTitle !== 'Default' ? variantTitle : undefined,
          sku,
          quantity: item.quantity,
          price,
          total: lineTotal,
        });
      }

      // Calculate totals
      let discountAmount = 0;
      if (payload.discountCode) {
        const discountRecord = await tx.discount.findFirst({
          where: {
            merchantId: merchant.id,
            code: payload.discountCode.toUpperCase().trim(),
            status: 'ACTIVE',
          },
        });

        if (discountRecord) {
          if ((discountRecord.type as string) === 'PERCENTAGE' || (discountRecord.type as string) === 'percentage') {
            const pct = parseFloat(discountRecord.value.replace(/[^0-9.]/g, '')) || 0;
            discountAmount = (subtotal * pct) / 100;
          } else {
            discountAmount = parseFloat(discountRecord.value.replace(/[^0-9.]/g, '')) || 0;
          }
          discountAmount = Math.min(subtotal, discountAmount);

          await tx.discount.update({
            where: { id: discountRecord.id },
            data: { redemptions: { increment: 1 } },
          });
        }
      }

      /**
       * The authoritative totals, from the store's own configuration.
       *
       * Was `subtotal * 0.08` tax and a flat $15 free over $100, applied to
       * every store in the platform. `quoteOrder` reads the store's tax
       * settings and its ShippingZone/ShippingMethod records — which checkout
       * never consulted, so a merchant's configured delivery rates had no
       * effect on what anyone was charged.
       *
       * Note this also fixes a quieter arithmetic bug: tax was applied to the
       * subtotal *before* the discount, so a discount code did not reduce the
       * tax it should have. `quoteOrder` takes the discount as input and taxes
       * what is actually owed.
       */
      const quote = await quoteOrder({
        merchantId: merchant.id,
        subtotal,
        discountAmount,
        country: payload.shippingAddress.country,
        shippingMethodId: payload.shippingMethodId,
      });

      const tax = quote.tax;
      const shipping = quote.shipping;
      const total = quote.total;

      // Resolve or create the store's Customer record for this buyer.
      // When the buyer is signed in, stamp their account id so the purchase
      // shows up in their unified cross-store order history immediately
      // rather than waiting to be claimed at next sign-in.
      const buyerUserId = req.user?.id ?? null;

      let customer = await tx.customer.findFirst({
        where: { merchantId: merchant.id, email: payload.customer.email.toLowerCase() },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            merchantId: merchant.id,
            userId: buyerUserId,
            name: payload.customer.name,
            email: payload.customer.email.toLowerCase(),
            phone: payload.customer.phone,
            totalOrders: 1,
            totalSpent: total,
            lastOrderAt: new Date(),
            location: `${payload.shippingAddress.city}, ${payload.shippingAddress.country}`,
          },
        });
      } else {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            // Only ever fill a blank owner; never reassign an existing one.
            ...(buyerUserId && !customer.userId ? { userId: buyerUserId } : {}),
            totalOrders: { increment: 1 },
            totalSpent: { increment: total },
            lastOrderAt: new Date(),
          },
        });
      }

      // Generate order number
      const count = await tx.order.count({ where: { merchantId: merchant.id } });
      const orderNumber = `#NX-${1000 + count + 1}`;

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          merchantId: merchant.id,
          orderNumber,
          customerId: customer.id,
          customerName: payload.customer.name,
          customerEmail: payload.customer.email.toLowerCase(),
          customerPhone: payload.customer.phone,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          subtotal: Number(subtotal.toFixed(2)),
          tax,
          shipping,
          discount: Number(discountAmount.toFixed(2)),
          discountCode: payload.discountCode ? payload.discountCode.toUpperCase().trim() : undefined,
          total,
          currency: defaultCurrencyLabel(),
          items: {
            create: orderItemsToCreate,
          },
          addresses: {
            create: [
              {
                type: OrderAddressType.SHIPPING,
                firstName: payload.shippingAddress.firstName,
                lastName: payload.shippingAddress.lastName,
                address1: payload.shippingAddress.address1,
                address2: payload.shippingAddress.address2,
                city: payload.shippingAddress.city,
                state: payload.shippingAddress.state,
                zip: payload.shippingAddress.zip,
                country: payload.shippingAddress.country,
                phone: payload.shippingAddress.phone,
              },
            ],
          },
          statusHistory: {
            create: [
              {
                fromStatus: OrderStatus.PENDING,
                toStatus: OrderStatus.PENDING,
                note: 'Order placed on the marketplace',
              },
            ],
          },
        },
        include: {
          items: true,
          addresses: true,
          statusHistory: true,
        },
      });

      // Create notification for store owner
      await tx.notification.create({
        data: {
          merchantId: merchant.id,
          userId: merchant.ownerId,
          type: 'SUCCESS',
          title: `New order ${orderNumber}`,
          // Was a hardcoded dollar sign on a platform that bills in naira.
          message: `Order received for ${formatMoney(total, defaultCurrencyLabel())} from ${payload.customer.name}`,
          link: '/orders',
        },
      });

      return newOrder;
    });

    /*
     * Confirm the order to the buyer.
     *
     * `SEND_EMAIL_ORDER_CONFIRMATION` was only ever enqueued from
     * `orders.controller.createOrder` -- the merchant-side endpoint for
     * keying in an order by hand. Every order a real shopper placed through
     * the marketplace checkout went out silently, which is also why a guest
     * had no written record of the order number they need to track it.
     *
     * Outside the transaction, and deliberately not awaited into the
     * response: the order exists either way, and a slow mail provider must
     * not hold up the redirect to payment.
     */
    jobQueue.enqueue('SEND_EMAIL_ORDER_CONFIRMATION', {
      orderNumber: result.orderNumber,
      customerEmail: result.customerEmail,
      customerName: result.customerName,
      total: result.total,
      currency: result.currency || defaultCurrencyLabel(),
      items: result.items.map(item => ({
        productTitle: item.productTitle,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: result.id,
        orderNumber: result.orderNumber,
        customerName: result.customerName,
        customerEmail: result.customerEmail,
        status: result.status,
        paymentStatus: result.paymentStatus,
        total: result.total,
        subtotal: result.subtotal,
        tax: result.tax,
        shipping: result.shipping,
        discount: result.discount,
        discountCode: result.discountCode || undefined,
        items: result.items,
        shippingAddress: result.addresses.find(a => a.type === OrderAddressType.SHIPPING),
        createdAt: result.createdAt,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.message && (error.message.includes('Insufficient stock') || error.message.includes('not available'))) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

/**
 * Public: an order confirmation, by order number.
 */
export async function getShopOrderByNumber(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantRef, orderNumber } = req.params;

    const merchant = await findMerchantForShop(merchantRef);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const order = await prisma.order.findFirst({
      where: {
        merchantId: merchant.id,
        orderNumber: orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`,
      },
      include: {
        items: true,
        addresses: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        discount: order.discount,
        total: order.total,
        items: order.items,
        shippingAddress: order.addresses.find(a => a.type === OrderAddressType.SHIPPING),
        statusHistory: order.statusHistory,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: Track Order by Order Number, Tracking Code, or Customer Email across stores
 */
/**
 * Public: look up a single order for guest tracking.
 *
 * Requires BOTH the exact order number and the email on the order. The previous
 * version matched `orderNumber CONTAINS <query>` OR email across every store
 * with no auth, so "NX" returned other merchants' orders complete with customer
 * names and shipping addresses. It also selected a `slug` column that Store
 * does not have, so every request 500'd.
 */
export async function trackPublicOrder(req: Request, res: Response, next: NextFunction) {
  try {
    // Order numbers are stored with their leading '#', but nobody types it, so
    // both spellings have to match or this endpoint can never find an order.
    const bareNumber = String(req.query.orderNumber ?? req.query.query ?? '').trim().replace(/^#/, '');
    const email = String(req.query.email ?? '').trim().toLowerCase();

    if (!bareNumber || !email) {
      res.status(400).json({
        success: false,
        error: 'Both an order number and the email address used on the order are required.',
      });
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { orderNumber: { equals: bareNumber, mode: 'insensitive' } },
              { orderNumber: { equals: `#${bareNumber}`, mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { customerEmail: { equals: email, mode: 'insensitive' } },
              { customer: { email: { equals: email, mode: 'insensitive' } } },
            ],
          },
        ],
      },
      include: {
        items: true,
        addresses: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        shipments: {
          orderBy: { createdAt: 'desc' },
          select: {
            trackingNumber: true,
            carrier: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
          },
        },
        merchant: { select: { id: true, name: true } },
      },
    });

    if (!order) {
      // Same response whether the order is missing or the email is wrong, so
      // this cannot be used to probe which order numbers exist.
      res.status(404).json({
        success: false,
        error: 'No order matches that order number and email address.',
      });
      return;
    }

    const shipment = order.shipments[0] ?? null;

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        discount: order.discount,
        total: order.total,
        currency: order.currency || defaultCurrencyCode(),
        items: order.items,
        shippingAddress:
          order.addresses.find((a) => a.type === OrderAddressType.SHIPPING) || order.addresses[0] || null,
        statusHistory: order.statusHistory,
        tracking: shipment,
        createdAt: order.createdAt,
        displayName: order.merchant?.name || 'Nexus Merchant',
      },
    });
  } catch (error) {
    next(error);
  }
}

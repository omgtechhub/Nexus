import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { OrderStatus, PaymentStatus, FulfillmentStatus, InventoryMovementType, OrderAddressType, ProductStatus, StoreStatus } from '@prisma/client';

const cartItemInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1),
});

const validateCartSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, 'Cart items are required'),
});

const storefrontCheckoutSchema = z.object({
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
});

/**
 * Helper to resolve store by ID, domain, storeUrl, or name slug
 */
async function findStoreBySlug(storeSlug: string) {
  const store = await resolveStoreBySlug(storeSlug);
  // A suspended store must not serve a public storefront, quote a price or
  // take an order. The lookup is the only place every public storefront route
  // passes through, so the check belongs here rather than in eight handlers.
  if (store && store.status === StoreStatus.SUSPENDED) return null;
  return store;
}

async function resolveStoreBySlug(storeSlug: string) {
  if (!storeSlug) return null;

  // 1. Match by ID
  let store = await prisma.store.findUnique({
    where: { id: storeSlug },
    include: { settings: true, storefrontConfig: true },
  });
  if (store) return store;

  // 2. Match by exact domain
  store = await prisma.store.findUnique({
    where: { domain: storeSlug },
    include: { settings: true, storefrontConfig: true },
  });
  if (store) return store;

  // 3. Match by CustomDomain table
  const customDom = await prisma.customDomain.findFirst({
    where: { domain: storeSlug.toLowerCase().trim() },
    include: { store: { include: { settings: true, storefrontConfig: true } } },
  });
  if (customDom?.store) return customDom.store;

  // 4. Match by settings.storeUrl
  const settings = await prisma.storeSettings.findFirst({
    where: { storeUrl: { equals: storeSlug, mode: 'insensitive' } },
    include: { store: { include: { settings: true, storefrontConfig: true } } },
  });
  if (settings?.store) return settings.store;

  // 5. Flexible match on domain prefix or name slug
  const cleanSearch = storeSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
  const allStores = await prisma.store.findMany({ include: { settings: true, storefrontConfig: true } });

  const matched = allStores.find(s => {
    const sNameSlug = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sDomainClean = s.domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      sDomainClean.startsWith(cleanSearch) ||
      cleanSearch.startsWith(sNameSlug) ||
      sNameSlug === cleanSearch
    );
  });

  return matched || null;
}

/**
 * Public: Get Storefront Info & Published Settings by Store Slug
 */
export async function getStorefrontInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeSlug } = req.params;
    const store = await findStoreBySlug(storeSlug);

    if (!store) {
      return res.status(404).json({ error: 'Storefront not found' });
    }

    const cleanSlug = store.settings?.storeUrl || store.domain.split('.')[0] || store.id;
    const storefrontConfig = store.storefrontConfig;

    // Use publishedConfig if available, else draftConfig or settings
    const activeConfig = (storefrontConfig?.publishedConfig as any) || (storefrontConfig?.draftConfig as any);

    return res.json({
      store: {
        id: store.id,
        name: store.name,
        slug: cleanSlug,
        storefrontConfig: activeConfig || undefined,
        settings: store.settings
          ? {
              storeName: activeConfig?.branding?.storeName || store.settings.storeName || store.name,
              activeTheme: activeConfig?.theme || store.settings.activeTheme || 'nexus-dark',
              primaryColor: activeConfig?.branding?.primaryColor || store.settings.primaryColor || '#FFBD2E',
              announcementText: activeConfig?.branding?.announcementText || store.settings.announcementText || '',
              currency: store.settings.currency || 'USD',
              customDomain: store.settings.customDomain || '',
            }
          : {
              storeName: store.name,
              activeTheme: 'nexus-dark',
              primaryColor: '#FFBD2E',
              announcementText: '',
              currency: 'USD',
              customDomain: '',
            },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: Get Storefront Products Catalog (Active products only)
 */
export async function getStorefrontProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeSlug } = req.params;
    const { category, q, sort = 'newest', page = '1', limit = '24' } = req.query;

    const store = await findStoreBySlug(storeSlug);
    if (!store) {
      return res.status(404).json({ error: 'Storefront not found' });
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 24));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      storeId: store.id,
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
 * Public: Get Single Storefront Product by Slug
 */
export async function getStorefrontProductBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeSlug, productSlug } = req.params;

    const store = await findStoreBySlug(storeSlug);
    if (!store) {
      return res.status(404).json({ error: 'Storefront not found' });
    }

    const product = await prisma.product.findFirst({
      where: {
        storeId: store.id,
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
 * Public: Get Storefront Product Categories
 */
export async function getStorefrontCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeSlug } = req.params;

    const store = await findStoreBySlug(storeSlug);
    if (!store) {
      return res.status(404).json({ error: 'Storefront not found' });
    }

    const [dbCategories, distinctProductCategories] = await Promise.all([
      prisma.productCategory.findMany({ where: { storeId: store.id } }),
      prisma.product.findMany({
        where: { storeId: store.id, status: ProductStatus.ACTIVE },
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
    const { storeSlug } = req.params;
    const { items } = validateCartSchema.parse(req.body);

    const store = await findStoreBySlug(storeSlug);
    if (!store) {
      return res.status(404).json({ error: 'Storefront not found' });
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

      if (variant && variant.product.storeId === store.id && variant.product.status === ProductStatus.ACTIVE) {
        product = variant.product;
        title = product.title;
        variantTitle = variant.title;
        price = variant.price;
        sku = variant.sku;
        image = product.images[0]?.url || '';
        availableStock = variant.inventoryQuantity;
      } else {
        const prod = await prisma.product.findFirst({
          where: { id: item.variantId, storeId: store.id, status: ProductStatus.ACTIVE },
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

    const taxEstimate = Number((subtotal * 0.08).toFixed(2));
    const shippingEstimate = subtotal >= 100 || subtotal === 0 ? 0 : 15.00;
    const totalEstimate = Number((subtotal + taxEstimate + shippingEstimate).toFixed(2));

    return res.json({
      isValid,
      items: validatedItems,
      subtotal: Number(subtotal.toFixed(2)),
      taxEstimate,
      shippingEstimate,
      totalEstimate,
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
    const { storeSlug } = req.params;
    const payload = storefrontCheckoutSchema.parse(req.body);

    const store = await findStoreBySlug(storeSlug);
    if (!store) {
      return res.status(404).json({ error: 'Storefront not found' });
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

        if (variant && variant.product.storeId === store.id && variant.product.status === ProductStatus.ACTIVE) {
          product = variant.product;
          title = product.title;
          variantTitle = variant.title;
          price = variant.price;
          sku = variant.sku;
          targetVariantId = variant.id;

          if (variant.inventoryQuantity < item.quantity && product.inventoryPolicy !== 'CONTINUE') {
            throw new Error(`Insufficient stock for "${title} - ${variant.title}". Available: ${variant.inventoryQuantity}`);
          }

          // Decrement variant stock
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              inventoryQuantity: { decrement: item.quantity },
            },
          });

          // Log movement if inventory item exists
          const invItem = await tx.inventoryItem.findFirst({
            where: { storeId: store.id, variantId: variant.id },
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
                storeId: store.id,
                inventoryItemId: invItem.id,
                productId: product.id,
                variantId: variant.id,
                changeQuantity: -item.quantity,
                newQuantity: Math.max(0, invItem.availableStock - item.quantity),
                type: InventoryMovementType.ORDER_PLACED,
                reason: `Storefront order placed by ${payload.customer.email}`,
              },
            });
          }
        } else {
          const prod = await tx.product.findFirst({
            where: { id: item.variantId, storeId: store.id, status: ProductStatus.ACTIVE },
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

          if (totalStock < item.quantity && prod.inventoryPolicy !== 'CONTINUE') {
            throw new Error(`Insufficient stock for "${title}". Available: ${totalStock}`);
          }

          if (primaryInvItem) {
            await tx.inventoryItem.update({
              where: { id: primaryInvItem.id },
              data: {
                availableStock: { decrement: item.quantity },
              },
            });

            await tx.inventoryMovement.create({
              data: {
                storeId: store.id,
                inventoryItemId: primaryInvItem.id,
                productId: prod.id,
                changeQuantity: -item.quantity,
                newQuantity: Math.max(0, primaryInvItem.availableStock - item.quantity),
                type: InventoryMovementType.ORDER_PLACED,
                reason: `Storefront order placed by ${payload.customer.email}`,
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
            storeId: store.id,
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

      const tax = Number((subtotal * 0.08).toFixed(2));
      const shipping = subtotal >= 100 ? 0 : 15.00;
      const total = Number((subtotal - discountAmount + tax + shipping).toFixed(2));

      // Resolve or create the store's Customer record for this buyer.
      // When the buyer is signed in, stamp their account id so the purchase
      // shows up in their unified cross-store order history immediately
      // rather than waiting to be claimed at next sign-in.
      const buyerUserId = req.user?.id ?? null;

      let customer = await tx.customer.findFirst({
        where: { storeId: store.id, email: payload.customer.email.toLowerCase() },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            storeId: store.id,
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
      const count = await tx.order.count({ where: { storeId: store.id } });
      const orderNumber = `#NX-${1000 + count + 1}`;

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          storeId: store.id,
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
          currency: 'USD',
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
                note: 'Order placed via public storefront',
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
          storeId: store.id,
          userId: store.ownerId,
          type: 'SUCCESS',
          title: `New Storefront Order ${orderNumber}`,
          message: `Order received for $${total.toFixed(2)} from ${payload.customer.name}`,
          link: '/orders',
        },
      });

      return newOrder;
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
 * Public: Get Storefront Order Confirmation by Order Number
 */
export async function getStorefrontOrderByNumber(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeSlug, orderNumber } = req.params;

    const store = await findStoreBySlug(storeSlug);
    if (!store) {
      return res.status(404).json({ error: 'Storefront not found' });
    }

    const order = await prisma.order.findFirst({
      where: {
        storeId: store.id,
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
        store: { select: { id: true, name: true, domain: true } },
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
        currency: order.currency || 'USD',
        items: order.items,
        shippingAddress:
          order.addresses.find((a) => a.type === OrderAddressType.SHIPPING) || order.addresses[0] || null,
        statusHistory: order.statusHistory,
        tracking: shipment,
        createdAt: order.createdAt,
        storeName: order.store?.name || 'Nexus Store',
      },
    });
  } catch (error) {
    next(error);
  }
}

import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

/**
 * The public marketplace catalogue.
 *
 * This is the only surface an unauthenticated visitor touches before they have
 * an account, so the tests assert the two things that make it safe: what it
 * leaves out (anything a merchant would not publish), and what it refuses to
 * list (drafts, archived products, and stores that are not live).
 */
describe('Marketplace: the public cross-store catalogue', () => {
  const stamp = Date.now();
  const password = 'Password123!';

  let storeAId: string;
  let storeBId: string;
  let suspendedStoreId: string;
  let liveSlug: string;
  let draftSlug: string;

  async function createProduct(cookie: string, body: Record<string, unknown>) {
    const res = await request.post('/api/products').set('Cookie', [cookie]).send(body);
    expect(res.status).toBe(201);
    return res.body.data;
  }

  beforeAll(async () => {
    const merchantA = await request.post('/api/auth/register').send({
      name: 'MP Merchant A',
      email: `mp_a_${stamp}@nexus.io`,
      password,
      storeName: `MP Store A ${stamp}`,
    });
    expect(merchantA.status).toBe(201);
    const cookieA = merchantA.headers['set-cookie'][0];
    storeAId = merchantA.body.data.store.id;

    const merchantB = await request.post('/api/auth/register').send({
      name: 'MP Merchant B',
      email: `mp_b_${stamp}@nexus.io`,
      password,
      storeName: `MP Store B ${stamp}`,
    });
    expect(merchantB.status).toBe(201);
    const cookieB = merchantB.headers['set-cookie'][0];
    storeBId = merchantB.body.data.store.id;

    const suspended = await request.post('/api/auth/register').send({
      name: 'MP Merchant S',
      email: `mp_s_${stamp}@nexus.io`,
      password,
      storeName: `MP Store S ${stamp}`,
    });
    expect(suspended.status).toBe(201);
    const cookieS = suspended.headers['set-cookie'][0];
    suspendedStoreId = suspended.body.data.store.id;

    const live = await createProduct(cookieA, {
      title: `MP Live Lamp ${stamp}`,
      price: 120,
      comparePrice: 200,
      sku: `MP-LIVE-${stamp}`,
      category: `MPCat${stamp}`,
      inventory: 7,
      costPrice: 40,
    });
    liveSlug = live.slug;

    const draft = await createProduct(cookieA, {
      title: `MP Draft Lamp ${stamp}`,
      price: 99,
      sku: `MP-DRAFT-${stamp}`,
      category: `MPCat${stamp}`,
      inventory: 5,
      status: 'DRAFT',
    });
    draftSlug = draft.slug;

    await createProduct(cookieB, {
      title: `MP Other Store Chair ${stamp}`,
      price: 300,
      sku: `MP-B-${stamp}`,
      category: `MPCat${stamp}`,
      inventory: 3,
    });

    await createProduct(cookieS, {
      title: `MP Suspended Rug ${stamp}`,
      price: 500,
      sku: `MP-S-${stamp}`,
      category: `MPCat${stamp}`,
      inventory: 9,
    });

    await prisma.store.update({
      where: { id: suspendedStoreId },
      data: { status: 'SUSPENDED' },
    });
  });

  it('lists products from more than one store without a session', async () => {
    const res = await request.get('/api/marketplace/products').query({ category: `MPCat${stamp}` });

    expect(res.status).toBe(200);
    const storeIds = new Set(res.body.products.map((p: any) => p.store.id));
    expect(storeIds.has(storeAId)).toBe(true);
    expect(storeIds.has(storeBId)).toBe(true);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('never exposes a store owner, cost price or settings on a public product', async () => {
    const res = await request.get('/api/marketplace/products').query({ q: `MP Live Lamp ${stamp}` });

    expect(res.status).toBe(200);
    const product = res.body.products[0];
    expect(product).toBeTruthy();

    // The merchant's margin and identity are not shopper-facing.
    expect(product.costPrice).toBeUndefined();
    expect(product.store.ownerId).toBeUndefined();
    expect(product.store.owner).toBeUndefined();
    expect(product.store.settings).toBeUndefined();
    // The whole serialised payload must not carry an owner email either.
    expect(JSON.stringify(res.body)).not.toContain(`mp_a_${stamp}@nexus.io`);
    // What a shopper does need is present.
    expect(product.store.name).toContain(`MP Store A ${stamp}`);
    expect(product.price).toBe(120);
  });

  it('excludes products that are not published', async () => {
    const res = await request.get('/api/marketplace/products').query({ category: `MPCat${stamp}` });

    expect(res.status).toBe(200);
    const titles = res.body.products.map((p: any) => p.title);
    expect(titles).toContain(`MP Live Lamp ${stamp}`);
    expect(titles).not.toContain(`MP Draft Lamp ${stamp}`);
  });

  it('excludes every product belonging to a suspended store', async () => {
    const res = await request.get('/api/marketplace/products').query({ category: `MPCat${stamp}` });

    expect(res.status).toBe(200);
    const storeIds = res.body.products.map((p: any) => p.store.id);
    expect(storeIds).not.toContain(suspendedStoreId);
  });

  it('refuses to serve a suspended store its own public storefront', async () => {
    const info = await request.get(`/api/storefront/${suspendedStoreId}`);
    expect(info.status).toBe(404);

    const products = await request.get(`/api/storefront/${suspendedStoreId}/products`);
    expect(products.status).toBe(404);

    // And it cannot take an order either.
    const checkout = await request.post(`/api/storefront/${suspendedStoreId}/checkout`).send({
      items: [{ variantId: 'anything', quantity: 1 }],
      customer: { email: 'buyer@example.com', name: 'Buyer' },
      shippingAddress: {
        firstName: 'B', lastName: 'Uyer', address1: '1 Way',
        city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
      },
    });
    expect(checkout.status).toBe(404);
  });

  it('searches by title and filters by category and price', async () => {
    const byTitle = await request.get('/api/marketplace/products').query({ q: 'Other Store Chair' });
    expect(byTitle.status).toBe(200);
    expect(byTitle.body.products.some((p: any) => p.title.includes('Other Store Chair'))).toBe(true);

    const byPrice = await request
      .get('/api/marketplace/products')
      .query({ category: `MPCat${stamp}`, minPrice: 250 });
    expect(byPrice.status).toBe(200);
    expect(byPrice.body.products.every((p: any) => p.price >= 250)).toBe(true);
    expect(byPrice.body.products.some((p: any) => p.title.includes('Live Lamp'))).toBe(false);
  });

  it('sorts by price in both directions', async () => {
    const asc = await request
      .get('/api/marketplace/products')
      .query({ category: `MPCat${stamp}`, sort: 'price_asc' });
    const prices = asc.body.products.map((p: any) => p.price);
    expect([...prices].sort((a: number, b: number) => a - b)).toEqual(prices);

    const desc = await request
      .get('/api/marketplace/products')
      .query({ category: `MPCat${stamp}`, sort: 'price_desc' });
    const descPrices = desc.body.products.map((p: any) => p.price);
    expect([...descPrices].sort((a: number, b: number) => b - a)).toEqual(descPrices);
  });

  it('paginates', async () => {
    const res = await request
      .get('/api/marketplace/products')
      .query({ category: `MPCat${stamp}`, limit: 1, page: 1 });

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 1 });
    expect(res.body.pagination.pages).toBeGreaterThanOrEqual(2);
  });

  it('serves a single product by store and slug, with related products', async () => {
    const res = await request.get(`/api/marketplace/products/${storeAId}/${liveSlug}`);

    expect(res.status).toBe(200);
    expect(res.body.product.slug).toBe(liveSlug);
    expect(res.body.product.store.id).toBe(storeAId);
    expect(Array.isArray(res.body.related)).toBe(true);
    // Related products are in the same category and never the product itself.
    expect(res.body.related.every((p: any) => p.id !== res.body.product.id)).toBe(true);
  });

  it('404s for an unpublished product and for the wrong store', async () => {
    const draft = await request.get(`/api/marketplace/products/${storeAId}/${draftSlug}`);
    expect(draft.status).toBe(404);

    const wrongStore = await request.get(`/api/marketplace/products/${storeBId}/${liveSlug}`);
    expect(wrongStore.status).toBe(404);
  });

  it('returns categories with counts, and only ones that have live products', async () => {
    const res = await request.get('/api/marketplace/categories');

    expect(res.status).toBe(200);
    const mine = res.body.categories.find((c: any) => c.name === `MPCat${stamp}`);
    expect(mine).toBeTruthy();
    // Two live products in this category; the draft and the suspended store's
    // product are not counted.
    expect(mine.productCount).toBe(2);
  });

  it('builds the homepage from data that exists', async () => {
    const res = await request.get('/api/marketplace/home');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.newArrivals)).toBe(true);
    expect(Array.isArray(res.body.deals)).toBe(true);
    expect(Array.isArray(res.body.bestsellers)).toBe(true);

    // Every deal is a real saving, not merely a non-null comparePrice.
    for (const deal of res.body.deals) {
      expect(deal.comparePrice).toBeGreaterThan(deal.price);
    }
    // Bestsellers are ranked by units actually ordered.
    for (const seller of res.body.bestsellers) {
      expect(seller.unitsSold).toBeGreaterThan(0);
    }
    const units = res.body.bestsellers.map((p: any) => p.unitsSold);
    expect([...units].sort((a: number, b: number) => b - a)).toEqual(units);

    // No suspended store and no draft leaks into any homepage section.
    const everything = [...res.body.newArrivals, ...res.body.deals, ...res.body.bestsellers];
    expect(everything.every((p: any) => p.store.id !== suspendedStoreId)).toBe(true);
    expect(everything.every((p: any) => !p.title.includes('MP Draft Lamp'))).toBe(true);
  });

  it('accepts no writes', async () => {
    const res = await request.post('/api/marketplace/products').send({ title: 'nope' });
    expect(res.status).toBe(404);
  });
});

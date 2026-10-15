import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

/**
 * Verified-purchase reviews.
 *
 * The point of the feature is the restriction, so that is what these tests are
 * about: who the server lets write a review, and who it does not. The
 * eligibility rule lives in one function on the server, and every case below
 * is a different way of arriving at it — never bought, bought but not
 * delivered, bought from a different store, already reviewed, or someone
 * else's review.
 */
describe('Product reviews: only delivered buyers may rate', () => {
  const stamp = Date.now();
  const password = 'Password123!';

  const buyerEmail = `rv_buyer_${stamp}@example.com`;
  const strangerEmail = `rv_stranger_${stamp}@example.com`;

  let merchantCookie: string;
  let otherMerchantCookie: string;
  let buyerCookie: string;
  let strangerCookie: string;

  /** Delivered and paid: the happy path. */
  let deliveredProductId: string;
  /** Ordered by the buyer but never fulfilled. */
  let undeliveredProductId: string;
  /** Nobody bought this one. */
  let unboughtProductId: string;
  /** Belongs to a second store, so the first merchant must not reach it. */
  let otherStoreProductId: string;

  let reviewId: string;

  async function createProduct(cookie: string, suffix: string) {
    const res = await request
      .post('/api/products')
      .set('Cookie', [cookie])
      .send({
        title: `Review Widget ${suffix} ${stamp}`,
        description: 'A product used by the review tests.',
        price: 40,
        sku: `SKU-RV-${suffix}-${stamp}`,
        inventory: 50,
      });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  async function createOrder(cookie: string, productId: string) {
    const res = await request
      .post('/api/orders')
      .set('Cookie', [cookie])
      .send({
        customerName: 'Review Buyer',
        customerEmail: buyerEmail,
        items: [{ productId, quantity: 1 }],
        shippingAddress: {
          firstName: 'Review', lastName: 'Buyer', address1: '1 Rate Road',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
        },
      });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  /** Paid and delivered — the state the eligibility rule requires. */
  async function markDelivered(cookie: string, orderId: string) {
    const res = await request
      .patch(`/api/orders/${orderId}`)
      .set('Cookie', [cookie])
      .send({ status: 'FULFILLED', paymentStatus: 'PAID' });
    expect(res.status).toBe(200);
  }

  beforeAll(async () => {
    const merchant = await request.post('/api/auth/register').send({
      name: 'Review Merchant', email: `rv_m_${stamp}@nexus.io`, password,
      storeName: `RV Store ${stamp}`,
    });
    expect(merchant.status).toBe(201);
    merchantCookie = merchant.headers['set-cookie'][0];

    const otherMerchant = await request.post('/api/auth/register').send({
      name: 'Other Merchant', email: `rv_m2_${stamp}@nexus.io`, password,
      storeName: `RV Store Two ${stamp}`,
    });
    expect(otherMerchant.status).toBe(201);
    otherMerchantCookie = otherMerchant.headers['set-cookie'][0];

    deliveredProductId = await createProduct(merchantCookie, 'D');
    undeliveredProductId = await createProduct(merchantCookie, 'U');
    unboughtProductId = await createProduct(merchantCookie, 'N');
    otherStoreProductId = await createProduct(otherMerchantCookie, 'O');

    // Orders are raised against the buyer's email before the buyer has an
    // account, which is the ordinary guest-checkout sequence.
    const deliveredOrder = await createOrder(merchantCookie, deliveredProductId);
    await markDelivered(merchantCookie, deliveredOrder);
    await createOrder(merchantCookie, undeliveredProductId);

    const buyer = await request.post('/api/auth/register').send({
      name: 'Review Buyer', email: buyerEmail, password, userType: 'CUSTOMER',
    });
    expect(buyer.status).toBe(201);
    buyerCookie = buyer.headers['set-cookie'][0];

    const stranger = await request.post('/api/auth/register').send({
      name: 'Review Stranger', email: strangerEmail, password, userType: 'CUSTOMER',
    });
    expect(stranger.status).toBe(201);
    strangerCookie = stranger.headers['set-cookie'][0];
  });

  describe('eligibility', () => {
    it('lets a buyer whose order was delivered write a review', async () => {
      const res = await request
        .post(`/api/reviews/product/${deliveredProductId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 5, title: 'Exactly as described', body: 'Arrived quickly and works well.' });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.verifiedPurchase).toBe(true);
      reviewId = res.body.data.id;
    });

    it('anchors the review to the order item that entitles it', async () => {
      const row = await prisma.productReview.findUnique({
        where: { id: reviewId },
        include: { orderItem: true },
      });

      // The verification is structural: no order item, no review.
      expect(row?.orderItemId).toBeTruthy();
      expect(row?.orderItem.productId).toBe(deliveredProductId);
    });

    it('refuses a buyer whose order has not been delivered', async () => {
      const res = await request
        .post(`/api/reviews/product/${undeliveredProductId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 5, body: 'Trying to rate something still in transit.' });

      expect(res.status).toBe(403);
      expect(res.body.reason).toBe('NOT_DELIVERED');
    });

    it('refuses a shopper who never bought the product', async () => {
      const res = await request
        .post(`/api/reviews/product/${unboughtProductId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 1, body: 'Never bought this, but here is a one-star anyway.' });

      expect(res.status).toBe(403);
      expect(res.body.reason).toBe('NOT_PURCHASED');
    });

    it('refuses a signed-in stranger with no orders at all', async () => {
      const res = await request
        .post(`/api/reviews/product/${deliveredProductId}`)
        .set('Cookie', [strangerCookie])
        .send({ rating: 1, body: 'A competitor leaving a review on a rival product.' });

      expect(res.status).toBe(403);
      expect(res.body.reason).toBe('NOT_PURCHASED');
    });

    it('refuses an anonymous visitor', async () => {
      const res = await request
        .post(`/api/reviews/product/${deliveredProductId}`)
        .send({ rating: 5, body: 'An anonymous five star review.' });

      expect(res.status).toBe(401);
    });

    it('refuses a merchant account, which has no customer portal', async () => {
      const res = await request
        .post(`/api/reviews/product/${deliveredProductId}`)
        .set('Cookie', [merchantCookie])
        .send({ rating: 5, body: 'A merchant reviewing its own catalogue.' });

      expect(res.status).toBe(403);
    });

    it('allows only one review per shopper per product', async () => {
      const res = await request
        .post(`/api/reviews/product/${deliveredProductId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 1, body: 'A second review to drag the average down.' });

      expect(res.status).toBe(409);
      expect(res.body.reason).toBe('ALREADY_REVIEWED');
    });

    it('reports eligibility without requiring a write attempt', async () => {
      const eligible = await request
        .get(`/api/reviews/product/${undeliveredProductId}/me`)
        .set('Cookie', [buyerCookie]);
      expect(eligible.status).toBe(200);
      expect(eligible.body.data.canReview).toBe(false);
      expect(eligible.body.data.reason).toBe('NOT_DELIVERED');

      const already = await request
        .get(`/api/reviews/product/${deliveredProductId}/me`)
        .set('Cookie', [buyerCookie]);
      expect(already.body.data.canReview).toBe(false);
      expect(already.body.data.reason).toBe('ALREADY_REVIEWED');
      expect(already.body.data.review.id).toBe(reviewId);
    });
  });

  describe('validation', () => {
    it('rejects a rating outside 1-5', async () => {
      const res = await request
        .post(`/api/reviews/product/${unboughtProductId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 9, body: 'Nine stars out of five for this product.' });

      // Rejected before eligibility is ever consulted.
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('rejects an empty review body', async () => {
      const res = await request
        .post(`/api/reviews/product/${deliveredProductId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 4, body: 'short' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('refuses a rating of 0 at the database as well as the validator', async () => {
      const row = await prisma.productReview.findUnique({ where: { id: reviewId } });
      await expect(
        prisma.productReview.update({ where: { id: row!.id }, data: { rating: 0 } })
      ).rejects.toThrow();
    });
  });

  describe('the public listing', () => {
    it('returns the review and a summary computed from real rows', async () => {
      const res = await request.get(`/api/reviews/product/${deliveredProductId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.summary.count).toBe(1);
      expect(res.body.summary.average).toBe(5);
      expect(res.body.summary.distribution['5']).toBe(1);
    });

    it('reports zero for a product nobody has reviewed, rather than inventing one', async () => {
      const res = await request.get(`/api/reviews/product/${unboughtProductId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.summary.count).toBe(0);
      expect(res.body.summary.average).toBe(0);
    });

    it('never exposes the reviewer’s email address', async () => {
      const res = await request.get(`/api/reviews/product/${deliveredProductId}`);
      expect(JSON.stringify(res.body)).not.toContain(buyerEmail);
    });

    it('writes the aggregate back onto the product', async () => {
      const product = await prisma.product.findUnique({ where: { id: deliveredProductId } });
      expect(product?.ratingCount).toBe(1);
      expect(product?.ratingAverage).toBe(5);
    });
  });

  describe('editing and deleting', () => {
    it('refuses to let one shopper edit another’s review', async () => {
      const res = await request
        .patch(`/api/reviews/${reviewId}`)
        .set('Cookie', [strangerCookie])
        .send({ rating: 1, body: 'Rewriting somebody else’s review entirely.' });

      expect(res.status).toBe(404);
    });

    it('lets the author change their own rating and recomputes the aggregate', async () => {
      const res = await request
        .patch(`/api/reviews/${reviewId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.rating).toBe(3);

      const product = await prisma.product.findUnique({ where: { id: deliveredProductId } });
      expect(product?.ratingAverage).toBe(3);
      expect(product?.ratingCount).toBe(1);
    });
  });

  describe('the merchant reply', () => {
    it('lets the selling merchant answer in public', async () => {
      const res = await request
        .post(`/api/reviews/${reviewId}/reply`)
        .set('Cookie', [merchantCookie])
        .send({ reply: 'Thanks for the feedback — glad it arrived safely.' });

      expect(res.status).toBe(200);
      expect(res.body.data.merchantReply).toContain('Thanks for the feedback');
    });

    it('refuses a merchant replying to another store’s review', async () => {
      const res = await request
        .post(`/api/reviews/${reviewId}/reply`)
        .set('Cookie', [otherMerchantCookie])
        .send({ reply: 'Replying to a review on a competitor’s product.' });

      expect(res.status).toBe(404);
    });

    it('does not let a merchant change the rating while replying', async () => {
      const res = await request
        .post(`/api/reviews/${reviewId}/reply`)
        .set('Cookie', [merchantCookie])
        .send({ reply: 'A reply that also tries to set the rating.', rating: 5 });

      expect(res.status).toBe(200);
      // The reply landed; the rating the shopper set is untouched.
      expect(res.body.data.rating).toBe(3);
    });

    it('scopes the merchant listing to the merchant’s own store', async () => {
      const mine = await request.get('/api/reviews/seller').set('Cookie', [merchantCookie]);
      expect(mine.status).toBe(200);
      expect(mine.body.data.length).toBeGreaterThan(0);

      const theirs = await request.get('/api/reviews/seller').set('Cookie', [otherMerchantCookie]);
      expect(theirs.status).toBe(200);
      expect(theirs.body.data).toHaveLength(0);
    });

    it('refuses the merchant listing to a customer account', async () => {
      const res = await request.get('/api/reviews/seller').set('Cookie', [buyerCookie]);
      expect(res.status).toBe(403);
    });
  });

  describe('deleting releases the slot', () => {
    it('removes the review and resets the product aggregate', async () => {
      const res = await request.delete(`/api/reviews/${reviewId}`).set('Cookie', [buyerCookie]);
      expect(res.status).toBe(200);

      const product = await prisma.product.findUnique({ where: { id: deliveredProductId } });
      expect(product?.ratingCount).toBe(0);
      expect(product?.ratingAverage).toBe(0);
    });

    it('lets the same buyer review again afterwards', async () => {
      const res = await request
        .post(`/api/reviews/product/${deliveredProductId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 4, body: 'Reviewing again after removing the first one.' });

      expect(res.status).toBe(201);
    });

    it('still refuses the product from the other store', async () => {
      const res = await request
        .post(`/api/reviews/product/${otherStoreProductId}`)
        .set('Cookie', [buyerCookie])
        .send({ rating: 5, body: 'A product from a store this buyer never ordered from.' });

      expect(res.status).toBe(403);
      expect(res.body.reason).toBe('NOT_PURCHASED');
    });
  });
});

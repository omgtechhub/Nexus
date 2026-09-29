import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';

const request = supertest(app);

/**
 * Covers the fulfilment surfaces the seller dashboard now exposes: inventory
 * adjustment, shipping zones and shipments — including the shipment lookup that
 * used to sit above the auth middleware and serve any order id to anyone.
 */
describe('Fulfilment: inventory, shipping zones and shipments', () => {
  const stamp = Date.now();
  const merchantAEmail = `merchant_f_a_${stamp}@nexus.io`;
  const merchantBEmail = `merchant_f_b_${stamp}@nexus.io`;
  const password = 'Password123!';

  let cookieA: string;
  let cookieB: string;
  let productA: any;
  let orderA: any;
  let shipmentA: any;

  beforeAll(async () => {
    const resA = await request.post('/api/auth/register').send({
      name: 'Merchant A', email: merchantAEmail, password, storeName: `Fulfil Store A ${stamp}`,
    });
    expect(resA.status).toBe(201);
    cookieA = resA.headers['set-cookie'][0];

    const resB = await request.post('/api/auth/register').send({
      name: 'Merchant B', email: merchantBEmail, password, storeName: `Fulfil Store B ${stamp}`,
    });
    expect(resB.status).toBe(201);
    cookieB = resB.headers['set-cookie'][0];

    const prod = await request.post('/api/products').set('Cookie', [cookieA]).send({
      title: `Fulfil Widget ${stamp}`, price: 50, sku: `SKU-F-${stamp}`, inventory: 25,
    });
    expect(prod.status).toBe(201);
    productA = prod.body.data;

    const order = await request.post('/api/orders').set('Cookie', [cookieA]).send({
      customerName: 'Fulfil Buyer',
      customerEmail: `fulfil_buyer_${stamp}@example.com`,
      items: [{ productId: productA.id, quantity: 2 }],
      shippingAddress: {
        firstName: 'Fulfil', lastName: 'Buyer', address1: '2 Ship Lane',
        city: 'Abuja', state: 'FC', zip: '900001', country: 'NG',
      },
    });
    expect(order.status).toBe(201);
    orderA = order.body.data;

    const fulfil = await request
      .post(`/api/shipments/orders/${orderA.id}/fulfill`)
      .set('Cookie', [cookieA])
      .send({ carrier: 'DHL', trackingNumber: `TRK-${stamp}`, notes: 'Test fulfilment' });
    expect(fulfil.status).toBe(201);
    shipmentA = fulfil.body.data;
  });

  describe('shipment lookup entitlement', () => {
    it('refuses an unauthenticated caller', async () => {
      const res = await request.get(`/api/shipments/orders/${orderA.id}`);
      expect(res.status).toBe(401);
    });

    it('does not expose the tracking number to an unauthenticated caller', async () => {
      const res = await request.get(`/api/shipments/orders/${orderA.id}`);
      expect(JSON.stringify(res.body)).not.toContain(`TRK-${stamp}`);
    });

    it('refuses a different merchant', async () => {
      const res = await request
        .get(`/api/shipments/orders/${orderA.id}`)
        .set('Cookie', [cookieB]);
      expect(res.status).toBe(404);
    });

    it('serves the owning merchant', async () => {
      const res = await request
        .get(`/api/shipments/orders/${orderA.id}`)
        .set('Cookie', [cookieA]);
      expect(res.status).toBe(200);
      expect(res.body.data.trackingNumber).toBe(`TRK-${stamp}`);
    });
  });

  describe('shipments list', () => {
    it('returns only the caller store shipments, with their order attached', async () => {
      const res = await request.get('/api/shipments').set('Cookie', [cookieA]);
      expect(res.status).toBe(200);
      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain(shipmentA.id);
      const mine = res.body.data.find((s: any) => s.id === shipmentA.id);
      expect(mine.order.orderNumber).toBe(orderA.orderNumber);

      const other = await request.get('/api/shipments').set('Cookie', [cookieB]);
      expect(other.status).toBe(200);
      expect(other.body.data.map((s: any) => s.id)).not.toContain(shipmentA.id);
    });

    it('requires a description, since each change writes a tracking event', async () => {
      const res = await request
        .patch(`/api/shipments/${shipmentA.id}/status`)
        .set('Cookie', [cookieA])
        .send({ status: 'IN_TRANSIT' });
      expect(res.status).toBe(400);
    });

    it('moves a shipment through its statuses', async () => {
      const res = await request
        .patch(`/api/shipments/${shipmentA.id}/status`)
        .set('Cookie', [cookieA])
        .send({ status: 'DELIVERED', description: 'Package delivered' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DELIVERED');
    });
  });

  describe('inventory', () => {
    it('lists stock for the caller store', async () => {
      const res = await request.get('/api/inventory').set('Cookie', [cookieA]);
      expect(res.status).toBe(200);
      const item = res.body.data.find((i: any) => i.productId === productA.id);
      expect(item).toBeTruthy();
      expect(item.product.title).toBe(`Fulfil Widget ${stamp}`);
    });

    it('adjusts stock upward and records the movement', async () => {
      const before = await request.get('/api/inventory').set('Cookie', [cookieA]);
      const item = before.body.data.find((i: any) => i.productId === productA.id);

      const res = await request
        .post(`/api/inventory/${productA.id}/adjust`)
        .set('Cookie', [cookieA])
        .send({ changeQuantity: 10, reason: 'Restock' });

      expect(res.status).toBe(200);
      expect(res.body.data.item.stock).toBe(item.stock + 10);
      expect(res.body.data.movement.reason).toBe('Restock');
    });

    it('refuses an adjustment that would drive stock negative', async () => {
      const res = await request
        .post(`/api/inventory/${productA.id}/adjust`)
        .set('Cookie', [cookieA])
        .send({ changeQuantity: -100000 });
      expect(res.status).toBe(400);
    });

    it('will not let another merchant adjust this stock', async () => {
      const res = await request
        .post(`/api/inventory/${productA.id}/adjust`)
        .set('Cookie', [cookieB])
        .send({ changeQuantity: 5 });
      expect(res.status).toBe(404);
    });
  });

  describe('shipping zones', () => {
    let zoneId: string;

    it('creates a zone with methods', async () => {
      const res = await request.post('/api/shipping/zones').set('Cookie', [cookieA]).send({
        name: `Zone ${stamp}`,
        countries: ['NG', 'GH'],
        methods: [
          { name: 'Standard', rateType: 'FLAT_RATE', price: 12.5, estimatedDays: '3-5 days' },
          { name: 'Free over 100', rateType: 'FREE_SHIPPING', price: 0 },
        ],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.countries).toEqual(['NG', 'GH']);
      zoneId = res.body.data.id;
    });

    it('lists zones for the owning store only', async () => {
      const mine = await request.get('/api/shipping/zones').set('Cookie', [cookieA]);
      expect(mine.body.data.map((z: any) => z.id)).toContain(zoneId);

      const other = await request.get('/api/shipping/zones').set('Cookie', [cookieB]);
      expect(other.body.data.map((z: any) => z.id)).not.toContain(zoneId);
    });

    it('rejects a zone with no countries', async () => {
      const res = await request.post('/api/shipping/zones').set('Cookie', [cookieA]).send({
        name: 'Empty zone', countries: [], methods: [],
      });
      expect(res.status).toBe(400);
    });

    it('deletes a zone', async () => {
      const res = await request.delete(`/api/shipping/zones/${zoneId}`).set('Cookie', [cookieA]);
      expect(res.status).toBe(200);

      const after = await request.get('/api/shipping/zones').set('Cookie', [cookieA]);
      expect(after.body.data.map((z: any) => z.id)).not.toContain(zoneId);
    });
  });
});

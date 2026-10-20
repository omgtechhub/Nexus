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
      name: 'Merchant A', email: merchantAEmail, password, displayName: `Fulfil Merchant A ${stamp}`,
    });
    expect(resA.status).toBe(201);
    cookieA = resA.headers['set-cookie'][0];

    const resB = await request.post('/api/auth/register').send({
      name: 'Merchant B', email: merchantBEmail, password, displayName: `Fulfil Merchant B ${stamp}`,
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
    it('returns only the caller merchant shipments, with their order attached', async () => {
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

  /**
   * The chain from a placed order to a delivered parcel.
   *
   * Every link in it was broken. Fulfilling an order moved `fulfillmentStatus`
   * and nothing else, writing a status-history row whose from- and to-status
   * were identical; marking a shipment DELIVERED touched only the shipment
   * table. `OrderStatus.FULFILLED` was therefore unreachable, which in turn
   * meant the review gate -- which reads FULFILLED as "it arrived" -- refused
   * every real buyer, and the admin SLA report counted shipped orders as late
   * in perpetuity.
   */
  describe('order lifecycle from dispatch to delivery', () => {
    let orderId: string;
    let orderNumber: string;
    let shipmentId: string;
    const buyerEmail = `lifecycle_buyer_${stamp}@example.com`;

    beforeAll(async () => {
      const order = await request.post('/api/orders').set('Cookie', [cookieA]).send({
        customerName: 'Lifecycle Buyer',
        customerEmail: buyerEmail,
        items: [{ productId: productA.id, quantity: 1 }],
        shippingAddress: {
          firstName: 'Lifecycle', lastName: 'Buyer', address1: '9 Delivery Road',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
        },
      });
      expect(order.status).toBe(201);
      orderId = order.body.data.id;
      orderNumber = order.body.data.orderNumber;
    });

    it('moves the order to PROCESSING when it is handed to the carrier', async () => {
      const before = await request.get(`/api/orders/${orderId}`).set('Cookie', [cookieA]);
      const fromStatus = before.body.data.status;

      const fulfil = await request
        .post(`/api/shipments/orders/${orderId}/fulfill`)
        .set('Cookie', [cookieA])
        .send({ carrier: 'GIG Logistics', trackingNumber: `TRK-LC-${stamp}` });
      expect(fulfil.status).toBe(201);
      shipmentId = fulfil.body.data.id;
      expect(fulfil.body.data.status).toBe('IN_TRANSIT');
      expect(fulfil.body.data.shippedAt).toBeTruthy();

      const after = await request.get(`/api/orders/${orderId}`).set('Cookie', [cookieA]);
      expect(after.body.data.status).toBe('PROCESSING');
      expect(after.body.data.fulfillmentStatus).toBe('FULFILLED');

      // A real transition, not a row recording a move from a status to itself.
      const dispatch = after.body.data.statusHistory.find(
        (h: any) => h.toStatus === 'PROCESSING'
      );
      expect(dispatch).toBeTruthy();
      expect(dispatch.fromStatus).toBe(fromStatus);
      expect(dispatch.fromStatus).not.toBe(dispatch.toStatus);
    });

    it('closes the order as FULFILLED when the carrier delivers it', async () => {
      const res = await request
        .patch(`/api/shipments/${shipmentId}/status`)
        .set('Cookie', [cookieA])
        .send({ status: 'DELIVERED', description: 'Handed to recipient', location: 'Lagos' });
      expect(res.status).toBe(200);
      expect(res.body.data.deliveredAt).toBeTruthy();

      const after = await request.get(`/api/orders/${orderId}`).set('Cookie', [cookieA]);
      expect(after.body.data.status).toBe('FULFILLED');

      const delivered = after.body.data.statusHistory.find(
        (h: any) => h.toStatus === 'FULFILLED'
      );
      expect(delivered).toBeTruthy();
      expect(delivered.fromStatus).toBe('PROCESSING');
    });

    it('does not rewrite the delivery date when the merchant re-saves the shipment', async () => {
      const first = await request.get(`/api/shipments/orders/${orderId}`).set('Cookie', [cookieA]);
      const deliveredAt = first.body.data.deliveredAt;

      const again = await request
        .patch(`/api/shipments/${shipmentId}/status`)
        .set('Cookie', [cookieA])
        .send({ status: 'DELIVERED', description: 'Confirmed again' });
      expect(again.status).toBe(200);
      expect(again.body.data.deliveredAt).toBe(deliveredAt);
    });

    it('does not reopen a delivered order when the shipment is moved back', async () => {
      const res = await request
        .patch(`/api/shipments/${shipmentId}/status`)
        .set('Cookie', [cookieA])
        .send({ status: 'EXCEPTION', description: 'Recipient reported damage' });
      expect(res.status).toBe(200);

      const after = await request.get(`/api/orders/${orderId}`).set('Cookie', [cookieA]);
      expect(after.body.data.status).toBe('FULFILLED');
    });

    it('shows the buyer the delivery on the public tracking page', async () => {
      const res = await request
        .get('/api/shop/track/search')
        .query({ orderNumber, email: buyerEmail });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('FULFILLED');
      expect(res.body.data.fulfillmentStatus).toBe('FULFILLED');
      expect(res.body.data.tracking.carrier).toBe('GIG Logistics');
      expect(res.body.data.tracking.shippedAt).toBeTruthy();
      expect(res.body.data.tracking.deliveredAt).toBeTruthy();
      expect(res.body.data.statusHistory.some((h: any) => h.toStatus === 'FULFILLED')).toBe(true);
    });

    it('refuses to fulfil a cancelled order', async () => {
      const order = await request.post('/api/orders').set('Cookie', [cookieA]).send({
        customerName: 'Cancelled Buyer',
        customerEmail: `cancelled_buyer_${stamp}@example.com`,
        items: [{ productId: productA.id, quantity: 1 }],
        shippingAddress: {
          firstName: 'Cancelled', lastName: 'Buyer', address1: '1 Void Street',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
        },
      });
      expect(order.status).toBe(201);

      const cancel = await request
        .post(`/api/orders/${order.body.data.id}/cancel`)
        .set('Cookie', [cookieA])
        .send({ reason: 'Buyer changed their mind' });
      expect(cancel.status).toBe(200);

      const fulfil = await request
        .post(`/api/shipments/orders/${order.body.data.id}/fulfill`)
        .set('Cookie', [cookieA])
        .send({ carrier: 'DHL', trackingNumber: `TRK-X-${stamp}` });
      expect(fulfil.status).toBe(400);
    });
  });

  describe('inventory', () => {
    it('lists stock for the caller merchant', async () => {
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

    it('lists zones for the owning merchant only', async () => {
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

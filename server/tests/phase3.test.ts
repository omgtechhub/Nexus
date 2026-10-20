import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 3 Integration Tests', () => {
  const merchantAEmail = `merchantA_${Date.now()}@nexus.io`;
  const merchantBEmail = `merchantB_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let merchantACookie: string;
  let merchantBCookie: string;

  let createdProductId: string;
  let createdVariantId: string;
  let createdCustomerId: string;
  let createdOrderId: string;

  beforeAll(async () => {
    // 1. Register Store A
    const resA = await request.post('/api/auth/register').send({
      name: 'Merchant A Owner',
      email: merchantAEmail,
      password,
      displayName: 'Merchant A',
    });
    expect(resA.status).toBe(201);
    merchantACookie = resA.headers['set-cookie'][0];

    // 2. Register Store B
    const resB = await request.post('/api/auth/register').send({
      name: 'Merchant B Owner',
      email: merchantBEmail,
      password,
      displayName: 'Merchant B',
    });
    expect(resB.status).toBe(201);
    merchantBCookie = resB.headers['set-cookie'][0];
  });

  it('1. Product CRUD: creates product with variants, images & initial inventory', async () => {
    const sku = `SKU-TEST-${Date.now()}`;
    const res = await request
      .post('/api/products')
      .set('Cookie', [merchantACookie])
      .send({
        title: 'Phase 3 Denim Jacket',
        description: 'Heavyweight organic denim jacket',
        price: 120.0,
        sku,
        status: 'ACTIVE',
        category: 'Apparel',
        variants: [
          { title: 'Small / Indigo', sku: `${sku}-S`, price: 120.0, inventoryQuantity: 15 },
          { title: 'Medium / Indigo', sku: `${sku}-M`, price: 120.0, inventoryQuantity: 25 },
        ],
        images: [
          { url: 'https://example.com/denim.jpg', isPrimary: true },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Phase 3 Denim Jacket');
    expect(res.body.data.variants.length).toBe(2);

    createdProductId = res.body.data.id;
    const smallVariant = res.body.data.variants.find((v: any) => v.title.includes('Small'));
    createdVariantId = smallVariant ? smallVariant.id : res.body.data.variants[0].id;
  });

  it('2. Duplicate SKU: rejects duplicate SKU within the same merchant', async () => {
    const p = await prisma.product.findUnique({ where: { id: createdProductId } });
    const res = await request
      .post('/api/products')
      .set('Cookie', [merchantACookie])
      .send({
        title: 'Duplicate SKU Product',
        price: 50.0,
        sku: p!.sku,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Inventory: adjusts stock level and records InventoryMovement', async () => {
    const res = await request
      .post(`/api/inventory/${createdProductId}/adjust`)
      .set('Cookie', [merchantACookie])
      .send({
        variantId: createdVariantId,
        changeQuantity: 10,
        reason: 'Restock shipment received',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.item.stock).toBe(25); // initial 15 + 10 = 25
    expect(res.body.data.movement.changeQuantity).toBe(10);
  });

  it('4. Customer: creates customer with address', async () => {
    const res = await request
      .post('/api/customers')
      .set('Cookie', [merchantACookie])
      .send({
        name: 'Jane Doe',
        email: `jane_${Date.now()}@example.com`,
        phone: '+1 555-0199',
        location: 'Seattle, WA',
        addresses: [
          {
            firstName: 'Jane',
            lastName: 'Doe',
            address1: '100 Pine St',
            city: 'Seattle',
            state: 'WA',
            zip: '98101',
            country: 'US',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Jane Doe');
    expect(res.body.data.addresses.length).toBe(1);

    createdCustomerId = res.body.data.id;
  });

  it('5. Order Engine: creates order, calculates totals, decrements stock atomically', async () => {
    const invBefore = await prisma.inventoryItem.findFirst({
      where: { productId: createdProductId, variantId: createdVariantId },
    });
    const stockBefore = invBefore!.stock;

    const res = await request
      .post('/api/orders')
      .set('Cookie', [merchantACookie])
      .send({
        customerEmail: 'jane.order@example.com',
        customerName: 'Jane Doe',
        items: [
          { productId: createdProductId, variantId: createdVariantId, quantity: 2 },
        ],
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Doe',
          address1: '100 Pine St',
          city: 'Seattle',
          state: 'WA',
          zip: '98101',
          country: 'US',
        },
        tax: 10.0,
        shipping: 15.0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(120.0 * 2 + 10.0 + 15.0); // 265.00

    createdOrderId = res.body.data.id;

    // Verify stock decremented by 2
    const invAfter = await prisma.inventoryItem.findFirst({
      where: { productId: createdProductId, variantId: createdVariantId },
    });
    expect(invAfter!.stock).toBe(stockBefore - 2);

    // Verify movement log recorded
    const movement = await prisma.inventoryMovement.findFirst({
      where: { referenceId: createdOrderId },
    });
    expect(movement).toBeDefined();
    expect(movement!.changeQuantity).toBe(-2);
  });

  it('6. Order Cancellation: restores inventory stock atomically', async () => {
    const invBefore = await prisma.inventoryItem.findFirst({
      where: { productId: createdProductId, variantId: createdVariantId },
    });
    const stockBefore = invBefore!.stock;

    const res = await request
      .post(`/api/orders/${createdOrderId}/cancel`)
      .set('Cookie', [merchantACookie])
      .send({ reason: 'Customer requested cancellation' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');

    // Verify stock restored by 2
    const invAfter = await prisma.inventoryItem.findFirst({
      where: { productId: createdProductId, variantId: createdVariantId },
    });
    expect(invAfter!.stock).toBe(stockBefore + 2);
  });

  it('7. Multi-Tenancy Isolation: Merchant B user cannot access or cancel Merchant A orders/products', async () => {
    const resGet = await request
      .get(`/api/orders/${createdOrderId}`)
      .set('Cookie', [merchantBCookie]);

    expect(resGet.status).toBe(404);

    const resCancel = await request
      .post(`/api/orders/${createdOrderId}/cancel`)
      .set('Cookie', [merchantBCookie])
      .send({ reason: 'Malicious cancel attempt' });

    expect(resCancel.status).toBe(404);
  });
});

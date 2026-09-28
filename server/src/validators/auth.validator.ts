import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  storeName: z.string().optional(),
  userType: z.enum(['CUSTOMER', 'SELLER']).optional().default('SELLER'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  price: z.number().min(0, 'Price must be non-negative'),
  comparePrice: z.number().optional(),
  sku: z.string().optional(),
  inventory: z.number().int().min(0).default(0),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
  category: z.string().default('General'),
  images: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  location: z.string().optional(),
});

export const orderSchema = z.object({
  orderNumber: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Customer email is required'),
  items: z.array(z.any()).default([]),
  total: z.number().min(0),
  subtotal: z.number().optional(),
  tax: z.number().optional().default(0),
  shipping: z.number().optional().default(0),
  discount: z.number().optional().default(0),
  shippingAddress: z.any().optional().default({}),
});

export const discountSchema = z.object({
  code: z.string().min(2, 'Discount code required'),
  type: z.enum(['PERCENTAGE', 'FIXED', 'SHIPPING']).default('PERCENTAGE'),
  value: z.string().min(1, 'Value required'),
  maxRedemptions: z.number().int().min(1).default(100),
});

export const settingsSchema = z.object({
  storeName: z.string().min(1),
  storeUrl: z.string().min(1),
  currency: z.string().min(1),
  industry: z.string().min(1),
  announcementText: z.string().optional(),
  activeTheme: z.string().optional(),
  primaryColor: z.string().optional(),
  customDomain: z.string().optional(),
});

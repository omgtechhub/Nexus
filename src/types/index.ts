// Core Application Types for Nexus Commerce

export type AccountType = 'CUSTOMER' | 'SELLER';
export type PlatformRole = 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT';

/**
 * Mirrors the `User` row the API returns (the Prisma model minus `passwordHash`).
 * `accountType` and `platformRole` are the stored, authoritative portal
 * assignment — never infer a portal from `plan` or from having a store.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  phone?: string | null;
  accountType: AccountType;
  platformRole?: PlatformRole | null;
  /** Billing tier code, e.g. "pro". Says nothing about which portal a user belongs to. */
  plan: string;
  isVerified: boolean;
  emailVerifiedAt?: string | null;
  twoFactorEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: Date;
  /** Store-scoped membership role, present only when resolved from a StoreMember. */
  role?: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER';
  /** Client-side preference set; not part of the User row. */
  notificationPrefs?: NotificationPrefs;
  billing?: BillingInfo;
}

export interface NotificationPrefs {
  emailOrders: boolean;
  emailMarketing: boolean;
  emailReports: boolean;
  pushNotifications: boolean;
  smsAlerts: boolean;
}

export interface BillingInfo {
  planId: string;
  status: 'active' | 'trial' | 'past_due' | 'cancelled';
  trialEndsAt?: Date;
  nextBillingDate?: Date;
  amount: number;
  currency: string;
}

export interface Store {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  currency: string;
  timezone: string;
  industry: string;
  status: 'active' | 'paused' | 'suspended';
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  comparePrice?: number;
  sku: string;
  inventory: number;
  status: 'active' | 'draft' | 'archived';
  images: string[];
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'PAID'
  | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type FulfillmentStatus = 'UNFULFILLED' | 'PARTIAL' | 'FULFILLED';

/**
 * Mirrors the `Order` row the API returns. The three status fields are database
 * enums and arrive uppercase; the customer name and email are stored flat on the
 * order so it survives the CRM record being deleted, with `customer` set only
 * while that record still exists.
 */
export interface Order {
  id: string;
  orderNumber: string;
  customer?: Customer | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  currency?: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  discountCode?: string | null;
  notes?: string | null;
  shippingAddress?: Address;
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  avatar?: string;
  location?: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface AnalyticsData {
  revenue: number;
  orders: number;
  customers: number;
  conversionRate: number;
  avgOrderValue: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  conversionChange: number;
  chartData: ChartDataPoint[];
  topProducts: TopProduct[];
  recentActivity: ActivityItem[];
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
  visitors: number;
}

export interface TopProduct {
  id: string;
  title: string;
  revenue: number;
  units: number;
  image?: string;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'customer' | 'product' | 'payment';
  message: string;
  time: string;
  icon: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  cta: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED' | 'SHIPPING';
export type DiscountStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED';

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: string;
  redemptions: number;
  maxRedemptions: number;
  status: DiscountStatus;
  minOrderAmount?: number | null;
  allowedCategory?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  storeUrl: string;
  currency: string;
  industry: string;
  announcementText: string;
  activeTheme: string;
  primaryColor: string;
  customDomain: string;
}

export type Theme = 'dark' | 'light';

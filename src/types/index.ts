// Core Application Types for Nexus Commerce

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'staff' | 'viewer';
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  createdAt: Date;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  notificationPrefs: NotificationPrefs;
  billing: BillingInfo;
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

export interface Order {
  id: string;
  orderNumber: string;
  customer: Customer;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  shippingAddress: Address;
  createdAt: Date;
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled';
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

export type Theme = 'dark' | 'light';
export type View = 'marketing' | 'auth' | 'dashboard' | 'admin' | 'online-store' | 'pos' | 'payments' | 'ai-assistant' | 'startups' | 'enterprises' | 'd2c' | 'b2b' | 'pricing' | 'resources' | 'capital' | 'shipping' | 'markets' | 'shop-pay' | 'small-business' | 'marketplaces' | 'retail' | 'international' | 'docs' | 'blog' | 'help-center' | 'partners' | 'app-store' | 'changelog' | 'status-page' | 'community' | 'privacy' | 'terms' | 'cookies' | 'sitemap' | 'about' | 'careers' | 'press' | 'investors' | 'contact';

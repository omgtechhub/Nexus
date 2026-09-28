import { apiClient } from './client';

export interface StorefrontInfo {
  id: string;
  name: string;
  slug: string;
  settings: {
    storeName: string;
    activeTheme: string;
    primaryColor: string;
    announcementText: string;
    currency: string;
    customDomain: string;
  };
}

export interface StorefrontProductVariant {
  id: string;
  title: string;
  sku: string;
  price: number;
  comparePrice?: number;
  option1?: string;
  option2?: string;
  option3?: string;
  inventoryQuantity: number;
}

export interface StorefrontProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  sku: string;
  category: string;
  tags?: string[];
  images: string[];
  primaryImage?: string;
  inStock: boolean;
  availableStock: number;
  variants: StorefrontProductVariant[];
}

export interface CartItemValidation {
  variantId: string;
  productId: string;
  title: string;
  variantTitle?: string;
  price: number;
  sku: string;
  image: string;
  quantity: number;
  availableStock: number;
  valid: boolean;
  itemTotal: number;
  error?: string;
}

export interface CartValidationResult {
  isValid: boolean;
  items: CartItemValidation[];
  subtotal: number;
  taxEstimate: number;
  shippingEstimate: number;
  totalEstimate: number;
}

export interface CheckoutPayload {
  items: { variantId: string; quantity: number }[];
  customer: {
    email: string;
    name: string;
    phone?: string;
  };
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  discountCode?: string;
}

export interface CheckoutResult {
  success: boolean;
  message: string;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    status: string;
    paymentStatus: string;
    total: number;
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    items: any[];
    shippingAddress: any;
    createdAt: string;
  };
}

export async function fetchStorefrontInfoApi(storeSlug: string): Promise<{ store: StorefrontInfo }> {
  return apiClient<{ store: StorefrontInfo }>(`/storefront/${storeSlug}`);
}

export async function fetchStorefrontProductsApi(
  storeSlug: string,
  params?: { category?: string; q?: string; sort?: string; page?: number; limit?: number }
): Promise<{ products: StorefrontProduct[]; pagination: any }> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.q) query.append('q', params.q);
  if (params?.sort) query.append('sort', params.sort);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient<{ products: StorefrontProduct[]; pagination: any }>(`/storefront/${storeSlug}/products${queryString}`);
}

export async function fetchStorefrontProductBySlugApi(
  storeSlug: string,
  productSlug: string
): Promise<{ product: StorefrontProduct }> {
  return apiClient<{ product: StorefrontProduct }>(`/storefront/${storeSlug}/products/${productSlug}`);
}

export async function fetchStorefrontCategoriesApi(storeSlug: string): Promise<{ categories: string[] }> {
  return apiClient<{ categories: string[] }>(`/storefront/${storeSlug}/categories`);
}

export async function validateCartApi(
  storeSlug: string,
  items: { variantId: string; quantity: number }[]
): Promise<CartValidationResult> {
  return apiClient<CartValidationResult>(`/storefront/${storeSlug}/cart/validate`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function processCheckoutApi(
  storeSlug: string,
  payload: CheckoutPayload
): Promise<CheckoutResult> {
  return apiClient<CheckoutResult>(`/storefront/${storeSlug}/checkout`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchStorefrontOrderApi(
  storeSlug: string,
  orderNumber: string
): Promise<{ order: CheckoutResult['order'] }> {
  const cleanNum = orderNumber.startsWith('#') ? orderNumber.substring(1) : orderNumber;
  return apiClient<{ order: CheckoutResult['order'] }>(`/storefront/${storeSlug}/orders/${cleanNum}`);
}

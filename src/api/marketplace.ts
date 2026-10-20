import { apiClient } from './client';
import type { ShopProduct } from './shop';

/**
 * The public marketplace catalogue: products from every live merchant, which is
 * what the Nexus homepage and `/products` browse the shopper through.
 *
 * The payload is the same shape the per-merchant shop API returns, plus the
 * selling merchant, so `ProductCard` and the cart work against one type.
 */

export interface MarketplaceMerchantRef {
  id: string;
  name: string;
}

export interface MarketplaceProduct extends ShopProduct {
  merchant?: MarketplaceMerchantRef;
  createdAt?: string;
  /** Present only on bestsellers, where it is a real sum of order quantities. */
  unitsSold?: number;
}

export interface MarketplaceCategory {
  name: string;
  productCount: number;
}

export interface MarketplacePagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MarketplaceProductsResult {
  products: MarketplaceProduct[];
  pagination: MarketplacePagination;
}

export interface MarketplaceHomeResult {
  newArrivals: MarketplaceProduct[];
  deals: MarketplaceProduct[];
  bestsellers: MarketplaceProduct[];
  categories: MarketplaceCategory[];
}

export interface MarketplaceProductsParams {
  q?: string;
  category?: string;
  merchantId?: string;
  sort?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
}

export async function fetchMarketplaceHomeApi(): Promise<MarketplaceHomeResult> {
  return apiClient<MarketplaceHomeResult>('/marketplace/home');
}

export async function fetchMarketplaceCategoriesApi(): Promise<{ categories: MarketplaceCategory[] }> {
  return apiClient<{ categories: MarketplaceCategory[] }>('/marketplace/categories');
}

export async function fetchMarketplaceProductsApi(
  params: MarketplaceProductsParams = {}
): Promise<MarketplaceProductsResult> {
  const query = new URLSearchParams();
  if (params.q) query.append('q', params.q);
  if (params.category && params.category !== 'all') query.append('category', params.category);
  if (params.merchantId) query.append('merchantId', params.merchantId);
  if (params.sort) query.append('sort', params.sort);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.minPrice !== undefined) query.append('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) query.append('maxPrice', String(params.maxPrice));

  const qs = query.toString();
  return apiClient<MarketplaceProductsResult>(`/marketplace/products${qs ? `?${qs}` : ''}`);
}

export async function fetchMarketplaceProductApi(
  productSlug: string
): Promise<{ product: MarketplaceProduct; related: MarketplaceProduct[] }> {
  return apiClient<{ product: MarketplaceProduct; related: MarketplaceProduct[] }>(
    `/marketplace/products/${encodeURIComponent(productSlug)}`
  );
}

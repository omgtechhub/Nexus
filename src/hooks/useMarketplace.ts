import { useQuery } from '@tanstack/react-query';
import {
  fetchMarketplaceHomeApi,
  fetchMarketplaceCategoriesApi,
  fetchMarketplaceProductsApi,
  fetchMarketplaceProductApi,
  MarketplaceProductsParams,
} from '../api/marketplace';

export const marketplaceQueryKeys = {
  home: () => ['marketplace', 'home'] as const,
  categories: () => ['marketplace', 'categories'] as const,
  products: (params: MarketplaceProductsParams) => ['marketplace', 'products', params] as const,
  product: (storeId: string, slug: string) => ['marketplace', 'product', storeId, slug] as const,
};

export function useMarketplaceHomeQuery() {
  return useQuery({
    queryKey: marketplaceQueryKeys.home(),
    queryFn: fetchMarketplaceHomeApi,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarketplaceCategoriesQuery() {
  return useQuery({
    queryKey: marketplaceQueryKeys.categories(),
    queryFn: fetchMarketplaceCategoriesApi,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketplaceProductsQuery(params: MarketplaceProductsParams = {}) {
  return useQuery({
    queryKey: marketplaceQueryKeys.products(params),
    queryFn: () => fetchMarketplaceProductsApi(params),
    // A filter change should not blank the grid out from under the shopper.
    placeholderData: previous => previous,
  });
}

export function useMarketplaceProductQuery(storeId?: string, productSlug?: string) {
  return useQuery({
    queryKey: marketplaceQueryKeys.product(storeId || '', productSlug || ''),
    queryFn: () => fetchMarketplaceProductApi(storeId!, productSlug!),
    enabled: Boolean(storeId) && Boolean(productSlug),
  });
}

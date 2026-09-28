import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStorefrontInfoApi,
  fetchStorefrontProductsApi,
  fetchStorefrontProductBySlugApi,
  fetchStorefrontCategoriesApi,
  validateCartApi,
  processCheckoutApi,
  fetchStorefrontOrderApi,
  CheckoutPayload,
} from '../api/storefront';

export const storefrontQueryKeys = {
  info: (storeSlug: string) => ['storefront', storeSlug, 'info'] as const,
  products: (storeSlug: string, params?: any) => ['storefront', storeSlug, 'products', params] as const,
  product: (storeSlug: string, productSlug: string) => ['storefront', storeSlug, 'product', productSlug] as const,
  categories: (storeSlug: string) => ['storefront', storeSlug, 'categories'] as const,
  order: (storeSlug: string, orderNumber: string) => ['storefront', storeSlug, 'order', orderNumber] as const,
};

export function useStorefrontInfoQuery(storeSlug: string, enabled = true) {
  return useQuery({
    queryKey: storefrontQueryKeys.info(storeSlug),
    queryFn: () => fetchStorefrontInfoApi(storeSlug),
    enabled: Boolean(storeSlug) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStorefrontProductsQuery(
  storeSlug: string,
  params?: { category?: string; q?: string; sort?: string; page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: storefrontQueryKeys.products(storeSlug, params),
    queryFn: () => fetchStorefrontProductsApi(storeSlug, params),
    enabled: Boolean(storeSlug) && enabled,
  });
}

export function useStorefrontProductQuery(storeSlug: string, productSlug: string, enabled = true) {
  return useQuery({
    queryKey: storefrontQueryKeys.product(storeSlug, productSlug),
    queryFn: () => fetchStorefrontProductBySlugApi(storeSlug, productSlug),
    enabled: Boolean(storeSlug) && Boolean(productSlug) && enabled,
  });
}

export function useStorefrontCategoriesQuery(storeSlug: string, enabled = true) {
  return useQuery({
    queryKey: storefrontQueryKeys.categories(storeSlug),
    queryFn: () => fetchStorefrontCategoriesApi(storeSlug),
    enabled: Boolean(storeSlug) && enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useValidateCartMutation(storeSlug: string) {
  return useMutation({
    mutationFn: (items: { variantId: string; quantity: number }[]) => validateCartApi(storeSlug, items),
  });
}

export function useCheckoutMutation(storeSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => processCheckoutApi(storeSlug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront', storeSlug] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useStorefrontOrderQuery(storeSlug: string, orderNumber: string, enabled = true) {
  return useQuery({
    queryKey: storefrontQueryKeys.order(storeSlug, orderNumber),
    queryFn: () => fetchStorefrontOrderApi(storeSlug, orderNumber),
    enabled: Boolean(storeSlug) && Boolean(orderNumber) && enabled,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMerchantShopInfoApi,
  fetchShopProductsApi,
  fetchShopProductBySlugApi,
  fetchShopCategoriesApi,
  validateCartApi,
  processCheckoutApi,
  fetchShopOrderApi,
  CheckoutPayload,
} from '../api/shop';

export const shopQueryKeys = {
  info: (merchantRef: string) => ['shop', merchantRef, 'info'] as const,
  products: (merchantRef: string, params?: any) => ['shop', merchantRef, 'products', params] as const,
  product: (merchantRef: string, productSlug: string) => ['shop', merchantRef, 'product', productSlug] as const,
  categories: (merchantRef: string) => ['shop', merchantRef, 'categories'] as const,
  order: (merchantRef: string, orderNumber: string) => ['shop', merchantRef, 'order', orderNumber] as const,
};

export function useMerchantShopQuery(merchantRef: string, enabled = true) {
  return useQuery({
    queryKey: shopQueryKeys.info(merchantRef),
    queryFn: () => fetchMerchantShopInfoApi(merchantRef),
    enabled: Boolean(merchantRef) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShopProductsQuery(
  merchantRef: string,
  params?: { category?: string; q?: string; sort?: string; page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: shopQueryKeys.products(merchantRef, params),
    queryFn: () => fetchShopProductsApi(merchantRef, params),
    enabled: Boolean(merchantRef) && enabled,
  });
}

export function useShopProductQuery(merchantRef: string, productSlug: string, enabled = true) {
  return useQuery({
    queryKey: shopQueryKeys.product(merchantRef, productSlug),
    queryFn: () => fetchShopProductBySlugApi(merchantRef, productSlug),
    enabled: Boolean(merchantRef) && Boolean(productSlug) && enabled,
  });
}

export function useShopCategoriesQuery(merchantRef: string, enabled = true) {
  return useQuery({
    queryKey: shopQueryKeys.categories(merchantRef),
    queryFn: () => fetchShopCategoriesApi(merchantRef),
    enabled: Boolean(merchantRef) && enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useValidateCartMutation(merchantRef: string) {
  return useMutation({
    mutationFn: (items: { variantId: string; quantity: number }[]) => validateCartApi(merchantRef, items),
  });
}

export function useCheckoutMutation(merchantRef: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => processCheckoutApi(merchantRef, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', merchantRef] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useShopOrderQuery(merchantRef: string, orderNumber: string, enabled = true) {
  return useQuery({
    queryKey: shopQueryKeys.order(merchantRef, orderNumber),
    queryFn: () => fetchShopOrderApi(merchantRef, orderNumber),
    enabled: Boolean(merchantRef) && Boolean(orderNumber) && enabled,
  });
}

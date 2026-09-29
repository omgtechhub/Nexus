import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductsApi, createProductApi, updateProductApi, deleteProductApi } from '../api/products';
import { getCustomersApi, createCustomerApi, updateCustomerApi, deleteCustomerApi } from '../api/customers';
import { getOrdersApi, createOrderApi, updateOrderApi, cancelOrderApi } from '../api/orders';
import { getDiscountsApi, createDiscountApi, deleteDiscountApi } from '../api/discounts';
import { getAnalyticsApi } from '../api/analytics';
import { getNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from '../api/notifications';
import { getStoreSettingsApi, updateStoreSettingsApi } from '../api/settings';
import { getInventoryApi, adjustStockApi } from '../api/inventory';
import { uploadImageApi } from '../api/upload';
import { Product, Customer, Order, DiscountCode, StoreSettings } from '../types';

export const queryKeys = {
  authMe: ['auth', 'me'] as const,
  products: (params?: any) => ['products', params] as const,
  customers: (params?: any) => ['customers', params] as const,
  orders: (params?: any) => ['orders', params] as const,
  inventory: ['inventory'] as const,
  discounts: ['discounts'] as const,
  analytics: (range?: string, startDate?: string, endDate?: string) => ['analytics', range, startDate, endDate] as const,
  notifications: ['notifications'] as const,
  settings: ['settings'] as const,
};

import { AuthService } from '../services/authService';

// Auth Hooks
export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.authMe,
    queryFn: () => AuthService.fetchCurrentSession(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// Products Hooks
export function useProductsQuery(enabled = true, params?: { q?: string; category?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => getProductsApi(params),
    enabled,
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: Partial<Product>) => createProductApi(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) => updateProductApi(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProductApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// Inventory Hooks
export function useInventoryQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory,
    queryFn: getInventoryApi,
    enabled,
  });
}

export function useAdjustInventoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, changeQuantity, reason, variantId }: { productId: string; changeQuantity: number; reason?: string; variantId?: string }) =>
      adjustStockApi(productId, changeQuantity, reason, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Upload Hook
export function useUploadImageMutation() {
  return useMutation({
    mutationFn: (file: File) => uploadImageApi(file),
  });
}

// Customers Hooks
export function useCustomersQuery(enabled = true, params?: { q?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: () => getCustomersApi(params),
    enabled,
  });
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (c: Partial<Customer>) => createCustomerApi(c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Customer> }) => updateCustomerApi(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomerApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// Orders Hooks
export function useOrdersQuery(enabled = true, params?: { q?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => getOrdersApi(params),
    enabled,
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (o: Partial<Order>) => createOrderApi(o),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Order> }) => updateOrderApi(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelOrderApi(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

// Discounts Hooks
export function useDiscountsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.discounts,
    queryFn: getDiscountsApi,
    enabled,
  });
}

export function useCreateDiscountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (d: Partial<DiscountCode>) => createDiscountApi(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });
}

export function useDeleteDiscountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDiscountApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });
}

// Analytics Hook
export function useAnalyticsQuery(range?: string, startDate?: string, endDate?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics(range, startDate, endDate),
    queryFn: () => getAnalyticsApi(range, startDate, endDate),
    enabled,
  });
}

// Notifications Hooks
export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: getNotificationsApi,
    enabled,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsReadApi(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Settings Hooks
export function useStoreSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: getStoreSettingsApi,
    enabled,
  });
}

export function useUpdateStoreSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (s: Partial<StoreSettings>) => updateStoreSettingsApi(s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

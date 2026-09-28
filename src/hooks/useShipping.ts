import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getShippingZonesApi,
  createShippingZoneApi,
  deleteShippingZoneApi,
  calculateShippingRatesApi,
  fulfillOrderApi,
  getShipmentsApi,
  getOrderShipmentApi,
  FulfillOrderParams,
} from '../api/shipping';

export const shippingQueryKeys = {
  zones: ['shipping', 'zones'] as const,
  shipments: ['shipments'] as const,
  rates: (storeSlug: string, country: string, subtotal: number) => ['shipping', 'rates', storeSlug, country, subtotal] as const,
  orderShipment: (orderId: string) => ['shipments', 'order', orderId] as const,
};

export function useShippingZonesQuery(enabled = true) {
  return useQuery({
    queryKey: shippingQueryKeys.zones,
    queryFn: getShippingZonesApi,
    enabled,
  });
}

export function useCreateShippingZoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (zone: any) => createShippingZoneApi(zone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'zones'] });
    },
  });
}

export function useDeleteShippingZoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShippingZoneApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'zones'] });
    },
  });
}

export function useCalculateShippingRatesQuery(storeSlug: string, country: string, subtotal: number, enabled = true) {
  return useQuery({
    queryKey: shippingQueryKeys.rates(storeSlug, country, subtotal),
    queryFn: () => calculateShippingRatesApi(storeSlug, country, subtotal),
    enabled: Boolean(storeSlug) && enabled,
  });
}

export function useFulfillOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: FulfillOrderParams }) => fulfillOrderApi(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useShipmentsQuery(enabled = true) {
  return useQuery({
    queryKey: shippingQueryKeys.shipments,
    queryFn: getShipmentsApi,
    enabled,
  });
}

export function useOrderShipmentQuery(orderId: string, enabled = true) {
  return useQuery({
    queryKey: shippingQueryKeys.orderShipment(orderId),
    queryFn: () => getOrderShipmentApi(orderId),
    enabled: Boolean(orderId) && enabled,
  });
}
